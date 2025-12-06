import { useState, useEffect, memo } from 'react';

interface ImageSlideshowProps {
  images: string[];
  interval?: number; // Time in milliseconds between transitions
  transitionDuration?: number; // Duration of the fade transition
  className?: string;
}

export const ImageSlideshow = memo(function ImageSlideshow({
  images,
  interval = 5000, // 5 seconds default
  transitionDuration = 3000, // 3 seconds fade transition for slow-mo effect
  className = '',
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Preload first image

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        // Preload next image
        setLoadedImages(prev => new Set([...prev, nextIndex, (nextIndex + 1) % images.length]));
        return nextIndex;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  // Preload first few images on mount
  useEffect(() => {
    const preloadCount = Math.min(2, images.length);
    const indicesToLoad = new Set<number>();
    for (let i = 0; i < preloadCount; i++) {
      indicesToLoad.add(i);
    }
    setLoadedImages(indicesToLoad);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {images.map((image, index) => {
        const isActive = index === currentIndex;
        const shouldLoad = loadedImages.has(index) || isActive;
        
        return (
          <div
            key={index}
            className="absolute inset-0 transition-opacity ease-in-out will-change-opacity"
            style={{
              transitionDuration: `${transitionDuration}ms`,
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 1 : 0,
            }}
          >
            {shouldLoad && (
              <img
                src={image}
                alt={`Slideshow image ${index + 1}`}
                className="w-full h-full object-cover object-center"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === 0 ? "high" : "low"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
})

