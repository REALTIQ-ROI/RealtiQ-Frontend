import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { propertyService } from '../../services/propertyService';
import MediaUploader from './MediaUploader';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../../services/propertyService', () => ({ propertyService: { uploadMedia: vi.fn() } }));

describe('MediaUploader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets an owner change the ordered media list without losing media records', () => {
    const media = [
      { url: 'https://cdn.test/one.jpg', public_id: 'one', type: 'image' as const },
      { url: 'https://cdn.test/two.jpg', public_id: 'two', type: 'image' as const },
    ];
    const onChange = vi.fn();
    render(<MediaUploader value={media} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move media 2 earlier' }));

    expect(onChange).toHaveBeenCalledWith([media[1], media[0]]);
  });

  it('withholds media upload batches larger than the documented ten-file limit', async () => {
    render(<MediaUploader value={[]} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from({ length: 11 }, (_, index) => new File([String(index)], `image-${index}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(input, { target: { files } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Upload no more than 10 media files at a time.'));
    expect(propertyService.uploadMedia).not.toHaveBeenCalled();
  });

  it('opens the media picker from the keyboard-accessible drop zone', () => {
    render(<MediaUploader value={[]} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Select image or video files' }), { key: 'Enter' });

    expect(click).toHaveBeenCalledOnce();
  });
});
