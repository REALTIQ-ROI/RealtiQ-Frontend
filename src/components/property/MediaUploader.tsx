import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { propertyService } from '../../services/propertyService';
import type { MediaItem } from '../../types';

interface MediaUploaderProps {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  error?: string;
}

interface PendingUploadFile {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

const createPendingUploadFile = (file: File): PendingUploadFile => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
  file,
  previewUrl: URL.createObjectURL(file),
  type: file.type.startsWith('video/') ? 'video' : 'image',
});

const MediaUploader = ({ value, onChange, error }: MediaUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<PendingUploadFile[]>([]);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const clearPendingFiles = () => {
    setPendingFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const savePendingFiles = (files: File[]) => {
    setPendingFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return files.map(createPendingUploadFile);
    });
  };

  const uploadFiles = async (fileArray: File[]) => {
    if (fileArray.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      const result = await propertyService.uploadMedia(fileArray, setProgress);
      onChange([...value, ...result.media]);
      clearPendingFiles();
      toast.success('Media uploaded successfully');
    } catch (err) {
      savePendingFiles(fileArray);
      toast.error(err instanceof Error ? err.message : 'Media upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const retryPendingUpload = async () => {
    await uploadFiles(pendingFiles.map((item) => item.file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
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

      {pendingFiles.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900">Upload did not complete</p>
              <p className="text-xs text-amber-800">
                {pendingFiles.length} selected {pendingFiles.length === 1 ? 'file is' : 'files are'} saved temporarily on this form.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void retryPendingUpload()}
                disabled={uploading}
                className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                Retry upload
              </button>
              <button
                type="button"
                onClick={clearPendingFiles}
                disabled={uploading}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
              >
                Remove saved files
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
              >
                Reselect
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pendingFiles.map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-white">
                {item.type === 'image' ? (
                  <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/60">videocam</span>
                    <span className="text-[10px] uppercase tracking-wider text-secondary">Video</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/65 p-1 text-[10px] text-white">
                  <p className="truncate">{item.file.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePending(item.id)}
                  disabled={uploading}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-100 shadow-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${item.file.name}`}
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
