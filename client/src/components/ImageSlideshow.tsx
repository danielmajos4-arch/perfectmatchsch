import { useState, useEffect } from 'react';

interface ImageSlideshowProps {
  images: string[];
  interval?: number; // Time in milliseconds between transitions
  transitionDuration?: number; // Duration of the fade transition
  className?: string;
}

export function ImageSlideshow({
  images,
  interval = 5000, // 5 seconds default
  transitionDuration = 3000, // 3 seconds fade transition for slow-mo effect
  className = '',
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {images.map((image, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            transitionDuration: `${transitionDuration}ms`,
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0,
          }}
        >
          <img
            src={image}
            alt={`Slideshow image ${index + 1}`}
            className="w-full h-full object-cover object-center"
            style={{ transform: 'scale(1)', objectPosition: 'center' }}
          />
        </div>
      ))}
    </div>
  );
}

