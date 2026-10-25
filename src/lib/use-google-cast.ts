"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type UseGoogleCastOptions = {
  src: string;
  title?: string;
  poster?: string | null;
  subtitleUrl?: string | null;
  subtitleLang?: string;
  subtitleLabel?: string;
  isHls?: boolean;
  getCurrentTime?: () => number;
  onLocalPauseNeeded?: () => void;
  onSyncLocalTime?: (time: number) => void;
};

export type UseGoogleCastResult = {
  isCastAvailable: boolean;
  isCastSupported: boolean;
  isCasting: boolean;
  castDeviceName: string | null;
  remoteCurrentTime: number;
  remoteDuration: number;
  isRemotePaused: boolean;
  isRemoteMuted: boolean;
  remoteVolume: number;
  castError: string | null;
  requestCast: () => Promise<void>;
  stopCast: () => void;
  remotePlay: () => void;
  remotePause: () => void;
  remoteSeek: (time: number) => void;
  remoteSetVolume: (vol: number) => void;
  remoteToggleMute: () => void;
};

export function useGoogleCast({
  src,
  title,
  poster,
  subtitleUrl,
  subtitleLang = "ar",
  subtitleLabel = "العربية",
  isHls = false,
  getCurrentTime,
  onLocalPauseNeeded,
  onSyncLocalTime,
}: UseGoogleCastOptions): UseGoogleCastResult {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isCastSupported, setIsCastSupported] = useState(true);
  const [isCasting, setIsCasting] = useState(false);
  const [castDeviceName, setCastDeviceName] = useState<string | null>(null);
  const [remoteCurrentTime, setRemoteCurrentTime] = useState(0);
  const [remoteDuration, setRemoteDuration] = useState(0);
  const [isRemotePaused, setIsRemotePaused] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [castError, setCastError] = useState<string | null>(null);

  const remotePlayerRef = useRef<any>(null);
  const remoteControllerRef = useRef<any>(null);
  const optionsRef = useRef({
    src,
    title,
    poster,
    subtitleUrl,
    subtitleLang,
    subtitleLabel,
    isHls,
  });

  useEffect(() => {
    optionsRef.current = {
      src,
      title,
      poster,
      subtitleUrl,
      subtitleLang,
      subtitleLabel,
      isHls,
    };
  }, [src, title, poster, subtitleUrl, subtitleLang, subtitleLabel, isHls]);

  const loadMediaToReceiver = useCallback((startPosition?: number) => {
    if (typeof window === "undefined") return;
    const cast = (window as any).cast;
    const chrome = (window as any).chrome;
    if (!cast?.framework || !chrome?.cast) return;

    const session = cast.framework.CastContext.getInstance().getCurrentSession();
    if (!session) return;

    const device = session.getCastDevice();
    setCastDeviceName(device?.friendlyName || "شاشة الاستقبال (Chromecast)");

    const opts = optionsRef.current;
    if (!opts.src) return;

    const mimeType = opts.isHls ? "application/x-mpegurl" : "video/mp4";
    const mediaInfo = new chrome.cast.media.MediaInfo(opts.src, mimeType);
    mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;

    const metadata = new chrome.cast.media.GenericMediaMetadata();
    metadata.title = opts.title || "كارتوني";
    if (opts.poster) {
      metadata.images = [new chrome.cast.Image(opts.poster)];
    }
    mediaInfo.metadata = metadata;

    if (opts.subtitleUrl) {
      const track = new chrome.cast.media.Track(1, chrome.cast.media.TrackType.TEXT);
      track.trackContentId = opts.subtitleUrl;
      track.trackContentType = "text/vtt";
      track.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
      track.name = opts.subtitleLabel || "العربية";
      track.language = opts.subtitleLang || "ar";
      mediaInfo.tracks = [track];
    }

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    const initialTime =
      typeof startPosition === "number"
        ? startPosition
        : (getCurrentTime ? getCurrentTime() : 0);
    request.currentTime = initialTime;
    request.autoplay = true;

    if (opts.subtitleUrl) {
      request.activeTrackIds = [1];
    }

    session.loadMedia(request).catch((err: any) => {
      // Receiver load error
      if (err) {
        setCastError("تعذر تحميل الفيديو على جهاز البث.");
      }
    });
  }, [getCurrentTime]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isSubscribed = true;

    const initCastFramework = () => {
      try {
        const cast = (window as any).cast;
        const chrome = (window as any).chrome;
        if (!cast?.framework || !chrome?.cast || !isSubscribed) return;

        const castContext = cast.framework.CastContext.getInstance();
        castContext.setOptions({
          receiverApplicationId:
            chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID || "CC1AD845",
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });

        setIsCastAvailable(true);
        setIsCastSupported(true);

        const currentState = castContext.getCastState();
        setIsCasting(currentState === cast.framework.CastState.CONNECTED);

        const player = new cast.framework.RemotePlayer();
        const controller = new cast.framework.RemotePlayerController(player);
        remotePlayerRef.current = player;
        remoteControllerRef.current = controller;

        const onCastStateChanged = (event: any) => {
          if (!isSubscribed) return;
          const state = event.castState;
          setIsCasting(state === cast.framework.CastState.CONNECTED);
        };

        const onConnectedChanged = () => {
          if (!isSubscribed) return;
          const connected = player.isConnected;
          setIsCasting(connected);
          if (connected) {
            onLocalPauseNeeded?.();
            const currTime = getCurrentTime ? getCurrentTime() : 0;
            loadMediaToReceiver(currTime);
          } else {
            setCastDeviceName(null);
            if (player.currentTime > 0) {
              onSyncLocalTime?.(player.currentTime);
            }
          }
        };

        const onCurrentTimeChanged = () => {
          if (!isSubscribed) return;
          setRemoteCurrentTime(player.currentTime);
        };

        const onDurationChanged = () => {
          if (!isSubscribed) return;
          setRemoteDuration(player.duration);
        };

        const onIsPausedChanged = () => {
          if (!isSubscribed) return;
          setIsRemotePaused(player.isPaused);
        };

        const onVolumeLevelChanged = () => {
          if (!isSubscribed) return;
          setRemoteVolume(player.volumeLevel);
        };

        const onIsMutedChanged = () => {
          if (!isSubscribed) return;
          setIsRemoteMuted(player.isMuted);
        };

        castContext.addEventListener(
          cast.framework.CastContextEventType.CAST_STATE_CHANGED,
          onCastStateChanged
        );

        controller.addEventListener(
          cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
          onConnectedChanged
        );
        controller.addEventListener(
          cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
          onCurrentTimeChanged
        );
        controller.addEventListener(
          cast.framework.RemotePlayerEventType.DURATION_CHANGED,
          onDurationChanged
        );
        controller.addEventListener(
          cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
          onIsPausedChanged
        );
        controller.addEventListener(
          cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
          onVolumeLevelChanged
        );
        controller.addEventListener(
          cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED,
          onIsMutedChanged
        );
      } catch (err) {
        // Cast SDK not supported or blocked in this environment
      }
    };

    if ((window as any).cast?.framework) {
      initCastFramework();
    } else {
      (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable && isSubscribed) {
          initCastFramework();
        }
      };

      if (!document.querySelector('script[src*="cast_sender.js"]')) {
        const script = document.createElement("script");
        script.src =
          "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [loadMediaToReceiver, getCurrentTime, onLocalPauseNeeded, onSyncLocalTime]);

  const requestCast = useCallback(async () => {
    if (typeof window === "undefined") return;
    const cast = (window as any).cast;
    if (!cast?.framework) {
      setCastError("ميزة البث (Google Cast) تتطلب متصفحاً مثل Chrome أو Edge وتفعيل الشبكة المحلية.");
      return;
    }
    setCastError(null);
    try {
      const castContext = cast.framework.CastContext.getInstance();
      await castContext.requestSession();
    } catch (err: any) {
      if (err !== "cancel" && err?.code !== "cancel") {
        setCastError("تعذر بدء الاتصال بجهاز البث. تأكد من أن جهاز الاستقبال متصل بنفس الشبكة.");
      }
    }
  }, []);

  const stopCast = useCallback(() => {
    if (typeof window === "undefined") return;
    const cast = (window as any).cast;
    if (!cast?.framework) return;
    try {
      const castContext = cast.framework.CastContext.getInstance();
      castContext.endCurrentSession(true);
      setIsCasting(false);
      setCastDeviceName(null);
    } catch {
      // Ignore
    }
  }, []);

  const remotePlay = useCallback(() => {
    if (remotePlayerRef.current?.isPaused && remoteControllerRef.current) {
      remoteControllerRef.current.playOrPause();
    }
  }, []);

  const remotePause = useCallback(() => {
    if (!remotePlayerRef.current?.isPaused && remoteControllerRef.current) {
      remoteControllerRef.current.playOrPause();
    }
  }, []);

  const remoteSeek = useCallback((time: number) => {
    if (remotePlayerRef.current && remoteControllerRef.current) {
      remotePlayerRef.current.currentTime = time;
      remoteControllerRef.current.seek();
    }
  }, []);

  const remoteSetVolume = useCallback((vol: number) => {
    if (remotePlayerRef.current && remoteControllerRef.current) {
      remotePlayerRef.current.volumeLevel = Math.max(0, Math.min(vol, 1));
      remoteControllerRef.current.setVolumeLevel();
    }
  }, []);

  const remoteToggleMute = useCallback(() => {
    if (remoteControllerRef.current) {
      remoteControllerRef.current.muteOrUnmute();
    }
  }, []);

  return {
    isCastAvailable,
    isCastSupported,
    isCasting,
    castDeviceName,
    remoteCurrentTime,
    remoteDuration,
    isRemotePaused,
    isRemoteMuted,
    remoteVolume,
    castError,
    requestCast,
    stopCast,
    remotePlay,
    remotePause,
    remoteSeek,
    remoteSetVolume,
    remoteToggleMute,
  };
}
