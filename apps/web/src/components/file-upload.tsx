"use client";

import { useState, useRef } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Progress } from "@kit/ui/progress";
import { Upload, X, File, FileText, Loader2, Image } from "lucide-react";
import { toast } from "@kit/hooks";
import { cn } from "@kit/lib/utils";

interface FileUploadProps {
  onUploadComplete: (fileId: number, fileName: string) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  multiple?: boolean;
  className?: string;
}

interface UploadedFile {
  id: number;
  name: string;
  size: number;
  type: string;
  url?: string;
  previewUrl?: string; // For image preview
  file?: File; // Store file object for upload
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

export function FileUpload({
  onUploadComplete,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*'],
  maxSize = 10, // 10MB default
  multiple = false,
  className = ""
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const newFiles: UploadedFile[] = [];
    
    Array.from(selectedFiles).forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "File Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      // Create preview URL for images
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      const uploadedFile: UploadedFile = {
        id: Date.now() + index,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        file,
        status: 'uploading',
        progress: 0
      };

      newFiles.push(uploadedFile);
    });

    if (newFiles.length > 0) {
      setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles);
      uploadFiles(newFiles);
    }
  };

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    for (const fileInfo of filesToUpload) {
      try {
        if (!fileInfo.file) continue;

        // Simulate file upload with progress
        const formData = new FormData();
        formData.append('file', fileInfo.file);
        formData.append('metadata', JSON.stringify({
          name: fileInfo.name,
          type: fileInfo.type,
          size: fileInfo.size
        }));

        // Simulate upload progress
        const uploadProgress = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileInfo.id 
              ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) }
              : f
          ));
        }, 200);

        // Simulate API call
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(uploadProgress);

        if (response.ok) {
          const result = await response.json();
          setFiles(prev => prev.map(f => 
            f.id === fileInfo.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100, 
                  url: result.url,
                  id: result.fileId 
                }
              : f
          ));
          
          onUploadComplete(result.fileId, fileInfo.name);
          
          toast({
            title: "Upload Successful",
            description: `${fileInfo.name} uploaded successfully`,
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        ));
        
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${fileInfo.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const removeFile = (fileId: number) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      // Clean up preview URL if it exists
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      const newFiles = prev.filter(f => f.id !== fileId);
      if (!multiple && newFiles.length === 0) {
        onUploadComplete(0, '');
      }
      return newFiles;
    });
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

  const getFilePreview = (file: UploadedFile) => {
    if (file.type.startsWith('image/') && (file.previewUrl || file.url)) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-muted">
          <img 
            src={file.previewUrl || file.url} 
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        {file.type === 'application/pdf' ? (
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
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Dropzone - Always visible */}
      <div
        className={cn(
          "border border-dashed rounded-md transition-colors cursor-pointer mb-3",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-3 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload {multiple ? 'files' : 'file'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            {maxSize}MB max • {acceptedTypes.join(', ')}
          </p>
        </div>
      </div>

      {/* Thumbnail Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group border rounded-md overflow-hidden bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Thumbnail/Preview */}
              <div className="aspect-square">
                {getFilePreview(file)}
              </div>

              {/* File Info */}
              <div className="p-1.5 space-y-0.5">
                <p className="text-[10px] font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                
                {/* Upload Progress */}
                {file.status === 'uploading' && (
                  <div className="space-y-0.5">
                    <Progress value={file.progress} className="h-0.5" />
                    <div className="flex items-center gap-0.5">
                      <Loader2 className="h-2 w-2 animate-spin text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{file.progress}%</span>
                    </div>
                  </div>
                )}
                
                {/* Error State */}
                {file.status === 'error' && (
                  <p className="text-[10px] text-destructive truncate">{file.error || 'Error'}</p>
                )}
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(file.id)}
                disabled={file.status === 'uploading'}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
