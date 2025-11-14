"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@kit/ui/button";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { cn } from "@kit/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@kit/ui/dialog";

export interface MediaItem {
  id: number | string;
  url: string;
  fileName: string;
  contentType?: string;
  comment?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  thumbnailPosition?: "left" | "bottom";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialIndex?: number;
}

export function MediaGallery({
  media,
  thumbnailPosition = "bottom",
  open,
  onOpenChange,
  initialIndex = 0
}: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const currentMedia = media[selectedIndex];

  // Update selected index when initialIndex changes
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < media.length) {
      setSelectedIndex(initialIndex);
    }
  }, [initialIndex, media.length]);

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape" && open && onOpenChange) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, handlePrevious, handleNext]);

  // Scroll selected thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current && open) {
      const thumbnailElement = thumbnailContainerRef.current.children[selectedIndex] as HTMLElement;
      if (thumbnailElement) {
        thumbnailElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }, [selectedIndex, open]);

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  // Mouse drag/swipe support
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!thumbnailContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - thumbnailContainerRef.current.offsetLeft);
    setScrollLeft(thumbnailContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !thumbnailContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - thumbnailContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    thumbnailContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (media.length === 0) {
    return null;
  }

  const isImage = currentMedia?.contentType?.startsWith("image/");
  const isVertical = thumbnailPosition === "left";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0",
          "translate-x-[-50%] translate-y-[-50%]",
          "bg-background/95 backdrop-blur-sm border border-border"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Media Gallery - {currentMedia?.fileName || "Viewing media"}
        </DialogTitle>
        <div
          className={cn(
            "relative w-full h-full flex",
            isVertical ? "flex-row gap-4" : "flex-col gap-4",
            "p-4"
          )}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-foreground hover:bg-muted"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Thumbnails */}
          <div
            ref={thumbnailContainerRef}
            className={cn(
              "flex gap-2 overflow-x-auto overflow-y-hidden",
              "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded",
              "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50",
              isVertical
                ? "flex-col w-24 h-full"
                : "flex-row h-24"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {media.map((item, index) => {
              const isSelected = index === selectedIndex;
              const itemIsImage = item.contentType?.startsWith("image/");

              return (
                <button
                  key={item.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={cn(
                "flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all",
                "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary",
                isSelected
                  ? "border-primary shadow-lg shadow-primary/50"
                  : "border-border opacity-60 hover:opacity-80",
                    isVertical ? "w-20 h-20" : "w-20 h-20"
                  )}
                >
                  {itemIsImage && item.url ? (
                    <img
                      src={item.url}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground text-center px-1">
                    {item.fileName}
                  </span>
                </div>
              )}
                </button>
              );
            })}
          </div>

          {/* Main Image/Media Display */}
          <div className={cn("relative flex-1 flex items-center justify-center", isVertical ? "min-h-0" : "min-h-[calc(95vh-8rem)]")}>
            {isImage && currentMedia?.url ? (
              <div className="relative w-full h-full flex items-center justify-center group">
                <img
                  src={currentMedia.url}
                  alt={currentMedia.fileName}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />

                {/* Navigation Buttons */}
                {media.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                      onClick={handlePrevious}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                      onClick={handleNext}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}

                {/* Image Info and Actions */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    <div className="text-foreground">
                      {currentMedia.comment && (
                        <p className="text-sm font-semibold mb-1">{currentMedia.comment}</p>
                      )}
                      <p className="text-sm font-medium truncate">{currentMedia.fileName}</p>
                      <p className="text-xs text-muted-foreground">{currentMedia.contentType}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={currentMedia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 flex items-center justify-center text-foreground hover:bg-muted rounded-md transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Image Counter */}
                {media.length > 1 && (
                  <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm text-foreground px-3 py-1.5 rounded text-sm border border-border">
                    {selectedIndex + 1} / {media.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <p className="text-sm font-medium mb-2 text-foreground">{currentMedia?.fileName}</p>
                <p className="text-xs text-muted-foreground mb-4">{currentMedia?.contentType}</p>
                {currentMedia?.url && (
                  <a
                    href={currentMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open file
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
