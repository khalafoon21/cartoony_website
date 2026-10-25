"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Icon } from "@/components/icon";
import { useGoogleCast } from "@/lib/use-google-cast";

export type VideoPlayerProps = {
  src: string;
  poster?: string | null;
  title?: string;
  subtitleUrl?: string | null;
  subtitleLang?: string;
  subtitleLabel?: string;
  accentColor?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
  contentId?: string;
  contentType?: "movie" | "episode";
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function VideoPlayer({
  src,
  poster,
  title,
  subtitleUrl,
  subtitleLang = "ar",
  subtitleLabel = "العربية",
  accentColor = "#F5A623",
  autoPlay = false,
  onEnded,
  className = "",
  contentId,
  contentType,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedStartRef = useRef(false);

  const trackPlaybackStart = useCallback(() => {
    if (hasTrackedStartRef.current || !contentId || !contentType) return;
    hasTrackedStartRef.current = true;
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [levels, setLevels] = useState<Array<{ id: number; label: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [mp4Quality, setMp4Quality] = useState<string>("auto");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(Boolean(subtitleUrl));
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const isHls = /\.m3u8($|\?)/i.test(src);

  const cast = useGoogleCast({
    src,
    title,
    poster,
    subtitleUrl,
    subtitleLang,
    subtitleLabel,
    isHls,
    getCurrentTime: () => (videoRef.current ? videoRef.current.currentTime : currentTime),
    onLocalPauseNeeded: () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    },
    onSyncLocalTime: (syncedTime: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = syncedTime;
      }
      setCurrentTime(syncedTime);
    },
  });

  const activeIsPlaying = cast.isCasting ? !cast.isRemotePaused : isPlaying;
  const activeCurrentTime = cast.isCasting ? cast.remoteCurrentTime : currentTime;
  const activeDuration = cast.isCasting ? cast.remoteDuration || duration : duration;
  const activeVolume = cast.isCasting ? cast.remoteVolume : volume;
  const activeIsMuted = cast.isCasting ? cast.isRemoteMuted : isMuted;

  // Initialize playback and HLS if needed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsLoading(true);
    setHasStarted(false);
    setIsPlaying(false);

    let activeHls: any = null;

    if (isHls) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS (Safari, iOS)
        video.src = src;
      } else {
        // Dynamically load hls.js
        let isCancelled = false;
        import("hls.js")
          .then(({ default: Hls }) => {
            if (isCancelled) return;
            if (Hls.isSupported()) {
              activeHls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
              });
              hlsRef.current = activeHls;
              activeHls.loadSource(src);
              activeHls.attachMedia(video);

              activeHls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
                const parsedLevels = (data.levels || []).map((lvl: any, idx: number) => ({
                  id: idx,
                  label: lvl.height ? `${lvl.height}p` : `جودة ${idx + 1}`,
                }));
                setLevels(parsedLevels);
                setIsLoading(false);
              });

              activeHls.on(Hls.Events.ERROR, (_: any, data: any) => {
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      activeHls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      activeHls.recoverMediaError();
                      break;
                    default:
                      activeHls.destroy();
                      setError("تعذر تشغيل مصدر الفيديو. يرجى التحقق من الرابط.");
                      setIsLoading(false);
                      break;
                  }
                }
              });
            } else {
              setError("المتصفح لا يدعم تقنية بث HLS المباشر.");
              setIsLoading(false);
            }
          })
          .catch(() => {
            setError("تعذر تحميل مشغل الفيديو.");
            setIsLoading(false);
          });

        return () => {
          isCancelled = true;
          if (activeHls) {
            activeHls.destroy();
            hlsRef.current = null;
          }
        };
      }
    } else {
      // Direct MP4
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, isHls]);

  // Sync subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      track.mode = subtitlesEnabled ? "showing" : "disabled";
    }
  }, [subtitlesEnabled, subtitleUrl]);

  // Handle auto-hide controls
  const handleActivity = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSubtitleMenu(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      handleActivity();
    }
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, handleActivity]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (cast.isCasting) {
      if (cast.isRemotePaused) {
        cast.remotePlay();
        trackPlaybackStart();
      } else {
        cast.remotePause();
      }
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(() => {
        // Autoplay/play prevented
      });
      setHasStarted(true);
    } else {
      video.pause();
    }
  }, [cast]);

  const handleSeek = (newTime: number) => {
    if (cast.isCasting) {
      cast.remoteSeek(newTime);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(newTime, duration || 0));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleVolumeChange = (newVol: number) => {
    if (cast.isCasting) {
      cast.remoteSetVolume(newVol);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(newVol, 1));
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    if (cast.isCasting) {
      cast.remoteToggleMute();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          // Fallback to iOS video fullscreen
          if (video && (video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
          }
        });
      } else if (video && (video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSpeedSelect = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const handleQualitySelect = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      setCurrentLevel(levelId);
    }
    setShowQualityMenu(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Prevent interfering with text inputs if any
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === "input" || targetTag === "textarea") return;

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault();
        togglePlay();
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "m":
      case "M":
        e.preventDefault();
        toggleMute();
        break;
      case "ArrowLeft":
        e.preventDefault();
        handleSeek(activeCurrentTime - 5);
        break;
      case "ArrowRight":
        e.preventDefault();
        handleSeek(activeCurrentTime + 5);
        break;
      case "ArrowUp":
        e.preventDefault();
        handleVolumeChange(Math.min(activeVolume + 0.1, 1));
        break;
      case "ArrowDown":
        e.preventDefault();
        handleVolumeChange(Math.max(activeVolume - 0.1, 0));
        break;
    }
    handleActivity();
  };

  return (
    <div
      ref={containerRef}
      className={`cartoony-player-wrap ${isFullscreen ? "is-fullscreen" : ""} ${className}`}
      onMouseMove={handleActivity}
      onTouchStart={handleActivity}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`مشغل الفيديو: ${title || "كارتوني"}`}
      style={{ "--player-accent": accentColor } as React.CSSProperties}
    >
      <video
        ref={videoRef}
        className="cartoony-video-element"
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        onClick={togglePlay}
        onPlay={() => {
          setIsPlaying(true);
          setHasStarted(true);
          trackPlaybackStart();
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime);
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onError={() => {
          setIsLoading(false);
          setError("تعذر تحميل الفيديو. قد يكون الرابط منتهي الصلاحية أو غير متاح.");
        }}
      >
        {subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang={subtitleLang}
            label={subtitleLabel}
            default={subtitlesEnabled}
          />
        )}
      </video>

      {/* Poster Preview before play */}
      {!hasStarted && poster && !error && !cast.isCasting && (
        <div
          className="cartoony-player-poster"
          style={{ backgroundImage: `url(${poster})` }}
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label="بدء تشغيل الفيديو"
        >
          <div className="cartoony-poster-backdrop-fade" />
          <button
            type="button"
            className="cartoony-big-play-btn"
            aria-label="تشغيل"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            <Icon name="play" size={36} />
          </button>
          {title && <span className="cartoony-poster-title">{title}</span>}
        </div>
      )}

      {/* Active Google Cast Overlay */}
      {cast.isCasting && (
        <div className="cartoony-casting-overlay" role="status">
          <div className="cartoony-casting-badge-box">
            <div className="cartoony-casting-pulse">
              <Icon name="castConnected" size={36} />
            </div>
            <div className="cartoony-casting-info">
              <span className="cartoony-casting-status">جاري العرض على الشاشة</span>
              <h3 className="cartoony-casting-title">{title || "كارتوني"}</h3>
              <p className="cartoony-casting-device">
                متصل بـ <strong>{cast.castDeviceName || "Chromecast"}</strong>
              </p>
            </div>
            <button
              type="button"
              className="cartoony-stop-cast-btn"
              onClick={cast.stopCast}
            >
              إنهاء البث والمشاهدة هنا
            </button>
          </div>
        </div>
      )}

      {/* Cast Error Toast */}
      {cast.castError && (
        <div className="cartoony-cast-toast" role="alert">
          <span>{cast.castError}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !error && !cast.isCasting && (
        <div className="cartoony-player-loading-overlay" aria-label="جاري التحميل...">
          <div className="cartoony-spinner" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="cartoony-player-error-overlay" role="alert">
          <div className="cartoony-player-error-card">
            <span className="cartoony-error-icon" aria-hidden="true">⚠️</span>
            <h3>تعذر تشغيل هذا المقطع</h3>
            <p>{error}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Video Overlay Controls */}
      <div
        className={`cartoony-player-controls ${
          controlsVisible || !isPlaying ? "is-visible" : "is-hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with title */}
        {title && (
          <div className="cartoony-player-top-bar">
            <span className="cartoony-player-title">{title}</span>
          </div>
        )}

        {/* Center play icon tap indicator (optional feedback) */}

        {/* Bottom bar */}
        <div className="cartoony-player-bottom-bar">
          {/* Progress / Timeline Bar */}
          <div className="cartoony-scrub-container">
            <div className="cartoony-scrub-track">
              {/* Buffered progress */}
              <div
                className="cartoony-scrub-buffer"
                style={{
                  width: `${activeDuration > 0 ? (bufferedEnd / activeDuration) * 100 : 0}%`,
                }}
              />
              {/* Played progress */}
              <div
                className="cartoony-scrub-played"
                style={{
                  width: `${activeDuration > 0 ? (activeCurrentTime / activeDuration) * 100 : 0}%`,
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={activeDuration || 100}
              step={0.1}
              value={activeCurrentTime}
              aria-label="شريط التقدم"
              className="cartoony-scrub-slider"
              onChange={(e) => handleSeek(Number(e.target.value))}
            />
          </div>

          <div className="cartoony-controls-row">
            {/* Right group in RTL: Play, Volume, Time */}
            <div className="cartoony-controls-group is-start">
              <button
                type="button"
                className="cartoony-control-btn"
                onClick={togglePlay}
                aria-label={activeIsPlaying ? "إيقاف مؤقت" : "تشغيل"}
                title={activeIsPlaying ? "إيقاف مؤقت (Space)" : "تشغيل (Space)"}
              >
                <Icon name={activeIsPlaying ? "close" : "play"} size={20} />
              </button>

              {/* Volume & Mute */}
              <div className="cartoony-volume-widget">
                <button
                  type="button"
                  className="cartoony-control-btn"
                  onClick={toggleMute}
                  aria-label={activeIsMuted || activeVolume === 0 ? "إلغاء الكتم" : "كتم الصوت"}
                  title={activeIsMuted ? "إلغاء الكتم (M)" : "كتم الصوت (M)"}
                >
                  <Icon name={activeIsMuted || activeVolume === 0 ? "volumeMute" : "volume"} size={19} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={activeIsMuted ? 0 : activeVolume}
                  aria-label="مستوى الصوت"
                  className="cartoony-volume-slider"
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                />
              </div>

              {/* Time display */}
              <div className="cartoony-time-display" dir="ltr">
                <span>{formatTime(activeCurrentTime)}</span>
                <span className="cartoony-time-divider">/</span>
                <span>{formatTime(activeDuration)}</span>
              </div>
            </div>

            {/* Left group in RTL: Subtitles, Quality, Speed, Fullscreen */}
            <div className="cartoony-controls-group is-end">
              {/* Subtitles Menu */}
              <div className="cartoony-menu-wrap">
                <button
                  type="button"
                  className={`cartoony-control-btn ${subtitlesEnabled && subtitleUrl ? "is-active-btn" : ""}`}
                  onClick={() => {
                    setShowSubtitleMenu((prev) => !prev);
                    setShowQualityMenu(false);
                    setShowSpeedMenu(false);
                  }}
                  aria-label="الترجمة"
                  title="الترجمة والشرح"
                >
                  <Icon name="subtitles" size={19} />
                  <span className="cartoony-badge-text">CC</span>
                </button>

                {showSubtitleMenu && (
                  <div className="cartoony-dropdown-menu is-subtitles" role="menu">
                    {subtitleUrl ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${!subtitlesEnabled ? "is-active" : ""}`}
                          onClick={() => {
                            setSubtitlesEnabled(false);
                            setShowSubtitleMenu(false);
                          }}
                        >
                          إيقاف الترجمة
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${subtitlesEnabled ? "is-active" : ""}`}
                          onClick={() => {
                            setSubtitlesEnabled(true);
                            setShowSubtitleMenu(false);
                          }}
                        >
                          {subtitleLabel || "العربية"} (مفعلة)
                        </button>
                      </>
                    ) : (
                      <div className="cartoony-menu-empty-note">
                        <span>الترجمة غير متوفرة لهذا المقطع</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quality Menu */}
              <div className="cartoony-menu-wrap">
                <button
                  type="button"
                  className="cartoony-control-btn cartoony-text-btn"
                  onClick={() => {
                    setShowQualityMenu((prev) => !prev);
                    setShowSubtitleMenu(false);
                    setShowSpeedMenu(false);
                  }}
                  aria-label="جودة الفيديو"
                  title="جودة الفيديو"
                >
                  <span>
                    {levels.length > 0
                      ? currentLevel === -1
                        ? "تلقائي"
                        : levels[currentLevel]?.label || "تلقائي"
                      : mp4Quality === "auto"
                      ? "تلقائي"
                      : mp4Quality}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="cartoony-dropdown-menu is-quality" role="menu">
                    {levels.length > 0 ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${currentLevel === -1 ? "is-active" : ""}`}
                          onClick={() => handleQualitySelect(-1)}
                        >
                          تلقائي (Auto)
                        </button>
                        {levels.map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            role="menuitem"
                            className={`cartoony-menu-item ${
                              currentLevel === lvl.id ? "is-active" : ""
                            }`}
                            onClick={() => handleQualitySelect(lvl.id)}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${mp4Quality === "auto" ? "is-active" : ""}`}
                          onClick={() => {
                            setMp4Quality("auto");
                            setShowQualityMenu(false);
                          }}
                        >
                          تلقائي (الأفضل)
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${mp4Quality === "1080p" ? "is-active" : ""}`}
                          onClick={() => {
                            setMp4Quality("1080p");
                            setShowQualityMenu(false);
                          }}
                        >
                          1080p FHD (أصلية)
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`cartoony-menu-item ${mp4Quality === "720p" ? "is-active" : ""}`}
                          onClick={() => {
                            setMp4Quality("720p");
                            setShowQualityMenu(false);
                          }}
                        >
                          720p HD (قياسية)
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Speed Menu */}
              <div className="cartoony-menu-wrap">
                <button
                  type="button"
                  className="cartoony-control-btn cartoony-text-btn"
                  onClick={() => {
                    setShowSpeedMenu((prev) => !prev);
                    setShowSubtitleMenu(false);
                    setShowQualityMenu(false);
                  }}
                  aria-label="سرعة التشغيل"
                  title="سرعة التشغيل"
                >
                  <span>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</span>
                </button>

                {showSpeedMenu && (
                  <div className="cartoony-dropdown-menu" role="menu">
                    {SPEEDS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        role="menuitem"
                        className={`cartoony-menu-item ${
                          playbackRate === spd ? "is-active" : ""
                        }`}
                        onClick={() => handleSpeedSelect(spd)}
                      >
                        {spd === 1 ? "عادي (1x)" : `${spd}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Cast / Chromecast button */}
              <div className="cartoony-menu-wrap">
                <button
                  type="button"
                  className={`cartoony-control-btn ${cast.isCasting ? "is-active-btn" : ""}`}
                  onClick={cast.isCasting ? cast.stopCast : cast.requestCast}
                  aria-label={
                    cast.isCasting
                      ? `إنهاء البث من ${cast.castDeviceName || "Chromecast"}`
                      : "بث إلى الشاشة (Google Cast / Chromecast)"
                  }
                  title={
                    cast.isCasting
                      ? `جاري البث إلى ${cast.castDeviceName || "الشاشة"} (اضغط للإنهاء)`
                      : "بث إلى الشاشة (Google Cast / Chromecast)"
                  }
                >
                  <Icon name={cast.isCasting ? "castConnected" : "cast"} size={19} />
                </button>
              </div>

              {/* Fullscreen button */}
              <button
                type="button"
                className="cartoony-control-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
                title={isFullscreen ? "إنهاء ملء الشاشة (F)" : "ملء الشاشة (F)"}
              >
                <Icon name={isFullscreen ? "minimize" : "maximize"} size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
