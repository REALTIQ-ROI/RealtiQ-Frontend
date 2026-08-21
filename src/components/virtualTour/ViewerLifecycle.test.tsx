import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MpSdk, SetupSdkOptions } from '@matterport/sdk';
import type { VirtualViewerProps } from './viewerTypes';
import MatterportViewer from './MatterportViewer';
import RealseeViewer from './RealseeViewer';

const matterportMocks = vi.hoisted(() => ({ setupSdk: vi.fn(), cancel: vi.fn() }));
const realseeMocks = vi.hoisted(() => ({ constructed: vi.fn(), disposed: vi.fn(), changedMode: vi.fn(), host: null as HTMLElement | null }));

vi.mock('@matterport/sdk', () => ({ setupSdk: matterportMocks.setupSdk }));
vi.mock('three', () => ({}));
vi.mock('@realsee/five', () => ({
  parseWork: (value: unknown) => value,
  Five: class {
    constructor() { realseeMocks.constructed(); }
    appendTo(host: HTMLElement) {
      realseeMocks.host = host;
      host.appendChild(document.createElement('canvas'));
    }
    load() { return Promise.resolve(); }
    refresh() { return undefined; }
    changeMode(mode: string) { realseeMocks.changedMode(mode); return Promise.resolve(); }
    moveToPano() { return Promise.resolve(); }
    dispose() { realseeMocks.disposed(); }
  },
}));

class ResizeObserverMock {
  observe() { return undefined; }
  disconnect() { return undefined; }
  unobserve() { return undefined; }
}

const baseProps: VirtualViewerProps = {
  mode: 'tour',
  rooms: [],
  floors: [],
  measurementsEnabled: false,
  floorPlanEnabled: false,
  tagsEnabled: false,
  guidedTourEnabled: false,
  onError: vi.fn(),
};

describe('provider viewer lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realseeMocks.host = null;
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'work' }) }));
  });

  it('keeps one Realsee Five canvas through mode updates and disposes it on unmount', async () => {
    const view = render(<RealseeViewer {...baseProps} workDataUrl="https://work.test/work.json" />);
    await waitFor(() => expect(realseeMocks.constructed).toHaveBeenCalledTimes(1));
    const host = realseeMocks.host;
    expect(host?.querySelectorAll('canvas')).toHaveLength(1);

    view.rerender(<RealseeViewer {...baseProps} mode="model" workDataUrl="https://work.test/work.json" />);
    await waitFor(() => expect(realseeMocks.changedMode).toHaveBeenCalledWith('Model'));
    expect(realseeMocks.constructed).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(realseeMocks.disposed).toHaveBeenCalledTimes(1);
    expect(host?.childElementCount).toBe(0);
  });

  it('keeps one Matterport SDK iframe and cancels subscriptions on unmount', async () => {
    const hostRef: { current: HTMLElement | null } = { current: null };
    matterportMocks.setupSdk.mockImplementation(async (_sdkKey: string, options?: SetupSdkOptions) => {
      hostRef.current = options?.container instanceof HTMLElement ? options.container : null;
      hostRef.current?.appendChild(document.createElement('iframe'));
      return {
        Mode: { Mode: { INSIDE: 'inside', DOLLHOUSE: 'dollhouse', FLOORPLAN: 'floorplan' }, moveTo: vi.fn().mockResolvedValue(undefined) },
        Measurements: { toggleMode: vi.fn().mockResolvedValue(undefined) },
        Room: { data: { subscribe: vi.fn(() => ({ cancel: matterportMocks.cancel })) } },
        Tour: { getData: vi.fn().mockResolvedValue([]), start: vi.fn(), stop: vi.fn() },
        Mattertag: { getData: vi.fn().mockResolvedValue([]), navigateToTag: vi.fn(), Transition: { FLY: 'fly' } },
        Floor: { moveTo: vi.fn().mockResolvedValue(undefined) },
        Camera: { lookAt: vi.fn().mockResolvedValue(undefined) },
      } as unknown as MpSdk;
    });

    const view = render(<MatterportViewer {...baseProps} modelSid="SxQL3iGyoDo" showcaseUrl="https://my.matterport.com/show/?m=SxQL3iGyoDo" sdkKey="public-domain-key" />);
    await waitFor(() => expect(matterportMocks.setupSdk).toHaveBeenCalledTimes(1));
    expect(matterportMocks.setupSdk.mock.calls[0][0]).toBe('public-domain-key');
    expect(hostRef.current?.querySelectorAll('iframe')).toHaveLength(1);

    view.rerender(<MatterportViewer {...baseProps} mode="model" modelSid="SxQL3iGyoDo" showcaseUrl="https://my.matterport.com/show/?m=SxQL3iGyoDo" sdkKey="public-domain-key" />);
    expect(matterportMocks.setupSdk).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(matterportMocks.cancel).toHaveBeenCalledTimes(1);
    expect(hostRef.current?.childElementCount).toBe(0);
  });
});
