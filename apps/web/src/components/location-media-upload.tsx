"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@smartlogbook/ui/button";
import { Input } from "@smartlogbook/ui/input";
import { Textarea } from "@smartlogbook/ui/textarea";
import { Label } from "@smartlogbook/ui/label";
import { Upload, X, File, FileText, Image } from "lucide-react";
import { cn } from "@smartlogbook/lib/utils";
import { LocationMedia } from "@smartlogbook/lib/api/locations";

interface MediaItem {
  id: string | number; // Use string for new files, number for existing
  file?: File; // Only for new files
  name: string;
  comment: string;
  url?: string;
  contentType?: string;
  createdAt?: string;
  isExisting?: boolean; // true if this is an existing media from the API
}

interface LocationMediaUploadProps {
  existingMedias?: LocationMedia[];
  onMediasChange: (medias: MediaItem[]) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
}

export function LocationMediaUpload({
  existingMedias = [],
  onMediasChange,
  acceptedTypes = ['image/*', 'application/pdf'],
  maxSize = 10,
  className = ""
}: LocationMediaUploadProps) {
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Initialize with existing medias once
  useEffect(() => {
    if (!initializedRef.current && existingMedias.length > 0) {
      const existing: MediaItem[] = existingMedias.map((media) => ({
        id: media.id,
        name: media.fileName,
        comment: "", // Comments not stored in existing media, user can add
        url: media.url,
        contentType: media.contentType,
        createdAt: media.createdAt,
        isExisting: true
      }));
      setMedias(existing);
      initializedRef.current = true;
    }
  }, [existingMedias]);

  // Notify parent of changes
  useEffect(() => {
    onMediasChange(medias);
  }, [medias, onMediasChange]);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newMedias: MediaItem[] = [];
    
    Array.from(selectedFiles).forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        // Could show toast here
        console.error(error);
        return;
      }

      const mediaItem: MediaItem = {
        id: `new-${Date.now()}-${index}`,
        file,
        name: file.name,
        comment: "",
        contentType: file.type,
        isExisting: false
      };

      newMedias.push(mediaItem);
    });

    if (newMedias.length > 0) {
      setMedias(prev => [...prev, ...newMedias]);
    }
  };

  const removeMedia = (id: string | number) => {
    setMedias(prev => {
      const media = prev.find(m => m.id === id);
      // Clean up preview URL if it exists for new files
      if (media?.file && media.file.type.startsWith('image/')) {
        // URL would be created when displaying
      }
      return prev.filter(m => m.id !== id);
    });
  };

  const updateComment = (id: string | number, comment: string) => {
    setMedias(prev => 
      prev.map(m => m.id === id ? { ...m, comment } : m)
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFilePreview = (media: MediaItem) => {
    if (media.contentType?.startsWith('image/') && (media.url || (media.file && URL.createObjectURL(media.file)))) {
      const previewUrl = media.url || (media.file ? URL.createObjectURL(media.file) : null);
      if (previewUrl) {
        return (
          <div className="relative w-full h-full overflow-hidden bg-muted">
            <img 
              src={previewUrl} 
              alt={media.name}
              className="w-full h-full object-cover"
            />
          </div>
        );
      }
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        {media.contentType === 'application/pdf' ? (
          <FileText className="h-6 w-6 text-muted-foreground" />
        ) : (
          <File className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Dropzone */}
      <div
        className={cn(
          "border border-dashed rounded-md transition-colors cursor-pointer mb-4",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-muted-foreground">
            {maxSize}MB max • {acceptedTypes.join(', ')}
          </p>
        </div>
      </div>

      {/* Media List */}
      {medias.length > 0 && (
        <div className="space-y-4">
          {medias.map((media) => (
            <div
              key={media.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 rounded border overflow-hidden bg-muted">
                  {getFilePreview(media)}
                </div>

                {/* File Info and Comment */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{media.name}</p>
                      {media.file && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(media.file.size)}
                        </p>
                      )}
                      {media.isExisting && (
                        <p className="text-xs text-muted-foreground">
                          Existing media
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeMedia(media.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Comment Field */}
                  <div className="space-y-1">
                    <Label htmlFor={`comment-${media.id}`} className="text-xs">
                      Comment
                    </Label>
                    <Textarea
                      id={`comment-${media.id}`}
                      value={media.comment}
                      onChange={(e) => updateComment(media.id, e.target.value)}
                      placeholder="Enter a comment for this file..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

