"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

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
  poster,
  accentColor = "#F5A623",
  className = "",
  contentId,
  contentType,
  onLoad,
}: IframePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasTrackedRef = useRef(false);

  // Track playback start analytics once per session/mount
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
    setIsLoading(true);
  }, [src, reloadKey]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Ignore fullscreen rejection
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleIframeLoaded = () => {
    setIsLoading(false);
    trackStart();
    if (onLoad) onLoad();
  };

  return (
    <div
      ref={containerRef}
      className={`cartoony-iframe-container ${isFullscreen ? "is-fullscreen" : ""} ${className}`}
      style={{ "--player-accent": accentColor } as React.CSSProperties}
      aria-label={`مشغل التضمين: ${title || "كارتوني"}`}
    >
      {/* Top Utility Bar */}
      <div className="cartoony-iframe-topbar">
        <span className="cartoony-iframe-title" title={title}>
          <span className="live-dot" />
          <span>{title || "مشغل العرض الخارجي"}</span>
        </span>
        <div className="cartoony-iframe-actions">
          <button
            type="button"
            className="cartoony-iframe-btn"
            onClick={handleReload}
            title="إعادة تحميل المشغل"
            aria-label="إعادة تحميل المشغل"
          >
            <Icon name="sparkles" size={14} />
            <span>تحديث</span>
          </button>
          <button
            type="button"
            className="cartoony-iframe-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
            aria-label={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
          >
            <span>{isFullscreen ? "تصغير" : "ملء الشاشة"}</span>
          </button>
        </div>
      </div>

      {/* Frame Wrapper */}
      <div className="cartoony-iframe-aspect-box">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="cartoony-iframe-loader" aria-live="polite">
            <div className="cartoony-spinner" />
            <p>جارٍ تحميل المشغل...</p>
          </div>
        )}

        <iframe
          key={reloadKey}
          src={src}
          title={title || "مشغل الفيديو"}
          className={`cartoony-iframe-element ${isLoading ? "is-loading" : "is-loaded"}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleIframeLoaded}
        />
      </div>
    </div>
  );
}
