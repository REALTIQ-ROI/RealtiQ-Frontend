import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { propertyService } from '../../services/propertyService';
import type { MediaItem } from '../../types';

interface MediaUploaderProps {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  error?: string;
}

const MediaUploader = ({ value, onChange, error }: MediaUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setUploading(true);
    setProgress(0);
    try {
      const result = await propertyService.uploadMedia(fileArray, setProgress);
      onChange([...value, ...result.media]);
      toast.success('Media uploaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Media upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-primary bg-primary/5'
            : error
              ? 'border-error/50 bg-error/5'
              : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-secondary font-medium">Uploading… {progress}%</p>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              cloud_upload
            </span>
            <p className="text-sm font-semibold text-on-surface-variant">
              Drag & drop or{' '}
              <span className="text-primary underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-secondary">Images and videos supported</p>
          </div>
        )}
      </div>

      {error && <p className="text-error text-xs">{error}</p>}

      {/* Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((item, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group bg-surface-container-low">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Upload ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant/60">
                    videocam
                  </span>
                  <span className="text-[10px] text-secondary uppercase tracking-wider">Video</span>
                </div>
              )}

              {/* Type badge */}
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black/60 text-white">
                {item.type}
              </span>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          ))}

          {/* Add more */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-outline-variant/30 flex items-center justify-center hover:border-primary/50 hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant/50">add</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
