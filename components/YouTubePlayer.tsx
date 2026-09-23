"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number }) => void;
            onPlaybackRateChange?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

const YT_PLAYING = 1;
const YT_PAUSED = 2;

export interface YouTubePlayerHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  play: () => void;
}

interface YouTubePlayerProps {
  youtubeId: string;
  playing: boolean;
  playbackRate?: number;
  onReady?: (duration: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    { youtubeId, playing, playbackRate = 1, onReady, onPlayStateChange },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const readyRef = useRef(false);
    const playingRef = useRef(playing);
    const rateRef = useRef(playbackRate);
    const onPlayStateChangeRef = useRef(onPlayStateChange);
    const onReadyRef = useRef(onReady);
    const unmutedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () =>
        readyRef.current ? (playerRef.current?.getCurrentTime() ?? 0) : 0,
      getDuration: () =>
        readyRef.current ? (playerRef.current?.getDuration() ?? 0) : 0,
      seekTo: (seconds: number) => {
        if (readyRef.current) playerRef.current?.seekTo(seconds, true);
      },
      setPlaybackRate: (rate: number) => {
        rateRef.current = rate;
        if (readyRef.current) playerRef.current?.setPlaybackRate(rate);
      },
      getPlaybackRate: () =>
        readyRef.current ? (playerRef.current?.getPlaybackRate() ?? 1) : 1,
      play: () => {
        const player = playerRef.current;
        if (!readyRef.current || !player) return;
        playingRef.current = true;
        if (!unmutedRef.current) {
          player.unMute();
          unmutedRef.current = true;
        }
        player.playVideo();
        applyRate();
      },
    }));

    const applyRate = () => {
      const player = playerRef.current;
      if (!readyRef.current || !player) return;
      player.setPlaybackRate(rateRef.current);
    };

    const applyState = () => {
      const player = playerRef.current;
      if (!readyRef.current || !player) return;
      if (playingRef.current) {
        if (!unmutedRef.current) {
          player.unMute();
          unmutedRef.current = true;
        }
        player.playVideo();
        // YouTube drops a rate set while paused and often resets to 1× on
        // playVideo() — apply after the play call, and again on PLAYING.
        applyRate();
      } else {
        player.pauseVideo();
      }
    };

    useEffect(() => {
      onPlayStateChangeRef.current = onPlayStateChange;
      onReadyRef.current = onReady;
    }, [onPlayStateChange, onReady]);

    useEffect(() => {
      let cancelled = false;
      readyRef.current = false;

      loadYouTubeApi().then(() => {
        if (cancelled || !containerRef.current) return;
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: youtubeId,
          playerVars: {
            controls: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            mute: 1,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event: { target: YTPlayerInstance }) => {
              readyRef.current = true;
              event.target.mute();
              const iframe = event.target.getIframe();
              if (iframe) {
                Object.assign(iframe.style, {
                  position: "absolute",
                  inset: "0",
                  width: "100%",
                  height: "100%",
                  border: "none",
                });
              }
              onReadyRef.current?.(event.target.getDuration());
              applyState();
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === YT_PLAYING) {
                applyRate();
                onPlayStateChangeRef.current?.(true);
              } else if (event.data === YT_PAUSED) {
                // seekTo() often emits PAUSED even when we immediately
                // play() in the same gesture — don't treat that as a
                // user pause or the row-tap play is cancelled.
                if (playingRef.current) {
                  playerRef.current?.playVideo();
                  applyRate();
                  return;
                }
                onPlayStateChangeRef.current?.(false);
              }
            },
            onPlaybackRateChange: (event: { data: number }) => {
              if (event.data !== rateRef.current) applyRate();
            },
          },
        });
      });

      return () => {
        cancelled = true;
        readyRef.current = false;
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [youtubeId]);

    useEffect(() => {
      playingRef.current = playing;
      applyState();
    }, [playing]);

    useEffect(() => {
      rateRef.current = playbackRate;
      applyRate();
    }, [playbackRate]);

    return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
  }
);
