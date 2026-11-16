import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { DEFAULT_NEWS_PHOTO_URL, resolveNewsImage } from '@/src/lib/editorial';

interface NewsCoverImageProps {
  src?: string;
  category?: string;
  alt: string;
  className?: string;
  onFallbackTriggered?: (didFail: boolean) => void;
}

export default function NewsCoverImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  onFallbackTriggered,
}: NewsCoverImageProps) {
  const [imgSrc, setImgSrc] = useState(() => resolveNewsImage(src));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(resolveNewsImage(src));
    setFailed(false);
    onFallbackTriggered?.(false);
  }, [src]);

  const handleError = () => {
    if (imgSrc !== DEFAULT_NEWS_PHOTO_URL) {
      setImgSrc(DEFAULT_NEWS_PHOTO_URL);
      onFallbackTriggered?.(true);
    } else {
      setFailed(true);
      onFallbackTriggered?.(true);
    }
  };

  if (failed) {
    return (
      <div className="w-full h-full bg-stone-100 dark:bg-slate-800 flex flex-col items-center justify-center p-4 text-center gap-1.5">
        <Newspaper className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[200px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
