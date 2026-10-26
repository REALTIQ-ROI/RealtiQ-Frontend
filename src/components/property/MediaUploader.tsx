import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { propertyService } from '../../services/propertyService';
import type { MediaItem } from '../../types';
import { MAX_PUBLIC_MEDIA_FILES_PER_UPLOAD, moveMediaItem, validatePublicMediaBatch } from '../../utils/projectMedia';

interface MediaUploaderProps {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  error?: string;
  disabled?: boolean;
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

const MediaUploader = ({ value, onChange, error, disabled = false }: MediaUploaderProps) => {
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
    if (disabled || fileArray.length === 0) return;
    const validationError = validatePublicMediaBatch(fileArray);
    if (validationError) {
      toast.error(validationError);
      return;
    }
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
    if (disabled) return;
    void handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
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
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled && !uploading) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="Select image or video files"
        aria-disabled={disabled || uploading}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-primary bg-primary/5'
            : error
              ? 'border-error/50 bg-error/5'
              : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low'
        } ${uploading || disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          disabled={disabled}
          multiple
          accept="image/*,video/*"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onClick={(event) => event.stopPropagation()}
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
            <p className="text-xs text-secondary">Images and videos supported · Up to {MAX_PUBLIC_MEDIA_FILES_PER_UPLOAD} files per upload</p>
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
                disabled={uploading || disabled}
                className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                Retry upload
              </button>
              <button
                type="button"
                onClick={clearPendingFiles}
                disabled={uploading || disabled}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
              >
                Remove saved files
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || disabled}
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
                  <video src={item.previewUrl} controls muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label="Preview selected video" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/65 p-1 text-[10px] text-white">
                  <p className="truncate">{item.file.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePending(item.id)}
                  disabled={uploading || disabled}
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
            <div key={item.public_id || item.url || i} className="relative aspect-square rounded-lg overflow-hidden group bg-surface-container-low">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Upload ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video src={item.url} controls muted playsInline preload="metadata" className="w-full h-full object-cover" aria-label="Preview uploaded video" />
              )}

              {/* Type badge */}
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black/60 text-white">
                {item.isCover ? 'Cover' : item.type}
              </span>

              {!disabled && value.length > 1 ? <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onChange(moveMediaItem(value, i, -1))}
                  disabled={i === 0}
                  className="rounded bg-black/65 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                  aria-label={`Move media ${i + 1} earlier`}
                >↑</button>
                <button
                  type="button"
                  onClick={() => onChange(moveMediaItem(value, i, 1))}
                  disabled={i === value.length - 1}
                  className="rounded bg-black/65 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                  aria-label={`Move media ${i + 1} later`}
                >↓</button>
              </div> : null}

              {/* Remove button */}
              {!disabled ? <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button> : null}
            </div>
          ))}

          {/* Add more */}
          {!disabled ? <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-outline-variant/30 flex items-center justify-center hover:border-primary/50 hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant/50">add</span>
          </button> : null}
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
