"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type IframePlayerProps = {
  src: string;
  title?: string;
  poster?: string | null;
  accentColor?: string;
  className?: string;
  contentId?: string;
  contentType?: "movie" | "episode";
  onLoad?: () => void;
};

export function IframePlayer({
  src,
  title,
  accentColor = "#F5A623",
  className = "",
  contentId,
  contentType,
  onLoad,
}: IframePlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const hasTrackedRef = useRef(false);

  const trackStart = useCallback(() => {
    if (hasTrackedRef.current || !contentId || !contentType) return;
    hasTrackedRef.current = true;
    try {
      fetch("/api/analytics/playback-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, contentType }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, [contentId, contentType]);

  useEffect(() => {
    setIsLoaded(false);
    trackStart();
    // Fallback timer in case iframe load event fired before hydration or is cross-origin silent
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [src, trackStart]);

  const handleIframeLoaded = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div
      className={`cartoony-iframe-container ${className}`}
      style={{ "--player-accent": accentColor } as React.CSSProperties}
      aria-label={`مشغل الفيديو: ${title || "كارتوني"}`}
    >
      <div className="cartoony-iframe-aspect-box">
        {!isLoaded && (
          <div className="cartoony-iframe-loader" aria-hidden="true">
            <div className="cartoony-spinner" />
          </div>
        )}

        <iframe
          src={src}
          title={title || "مشغل الفيديو"}
          className="cartoony-iframe-element"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleIframeLoaded}
        />
      </div>
    </div>
  );
}
