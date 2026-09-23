"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { tagLabel } from "@/lib/taxonomy";
import { clusterKey, formatPreciseTime, formatTime } from "@/lib/time";
import { PAUSE_WINDOW_SECONDS, type Moment, type Video } from "@/lib/types";

const SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.25];

function formatSpeed(rate: number) {
  return `${rate % 1 === 0 ? rate.toFixed(0) : rate}×`;
}

interface WatchScreenProps {
  video: Video;
  onBack: () => void;
}

function nearbyMoments(moments: Moment[], time: number): Moment[] {
  return moments.filter(
    (moment) => Math.abs(moment.timestamp - time) < PAUSE_WINDOW_SECONDS
  );
}

function formatMeta(video: Video): string {
  return [video.style, video.context].filter(Boolean).join(" · ");
}

export function WatchScreen({ video, onBack }: WatchScreenProps) {
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const seenRef = useRef(new Set<string>());
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState<Moment[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/moments?videoId=${encodeURIComponent(video.videoId)}`
        );
        const data = await response.json();
        if (data.moments) setMoments(data.moments);
      } catch (error) {
        console.error("Error loading moments:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [video.videoId]);

  useEffect(() => {
    if (!playing || dragging) return;

    const id = window.setInterval(() => {
      const time = playerRef.current?.getCurrentTime() ?? 0;
      setCurrentTime(time);

      const hits = nearbyMoments(moments, time);
      if (hits.length === 0) return;
      const key = clusterKey(hits);
      if (seenRef.current.has(key)) return;

      seenRef.current.add(key);
      setActive(hits);
      setPlaying(false);
      setPlaybackRate(0.25);
    }, 200);

    return () => window.clearInterval(id);
  }, [playing, dragging, moments]);

  const openCluster = (seed: Moment, playhead = seed.timestamp) => {
    const hits = nearbyMoments(moments, seed.timestamp);
    const cluster = hits.length > 0 ? hits : [seed];
    seenRef.current.add(clusterKey(cluster));
    playerRef.current?.seekTo(playhead);
    setCurrentTime(playhead);
    setActive(cluster);
    setPlaying(false);
    setPlaybackRate(0.25);
  };

  const playCluster = (seed: Moment) => {
    const hits = nearbyMoments(moments, seed.timestamp);
    const cluster = hits.length > 0 ? hits : [seed];
    seenRef.current.add(clusterKey(cluster));
    playerRef.current?.seekTo(seed.timestamp);
    playerRef.current?.setPlaybackRate(0.25);
    playerRef.current?.play();
    setCurrentTime(seed.timestamp);
    setActive(cluster);
    setPlaybackRate(0.25);
    setPlaying(true);
  };

  const cycleSpeed = () => {
    const index = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(index === -1 ? 0 : index + 1) % SPEEDS.length];
    setPlaybackRate(next);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (active) {
      setPlaybackRate(0.25);
      playerRef.current?.setPlaybackRate(0.25);
    }
    setPlaying(true);
  };

  const seekFromScrub = (time: number) => {
    const clamped = Math.max(0, Math.min(duration || time, time));
    playerRef.current?.seekTo(clamped);
    setCurrentTime(clamped);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeIds = useMemo(
    () => new Set((active ?? []).map((moment) => moment.id)),
    [active]
  );

  return (
    <div className="page">
      <div className="watch-page-inner">
        <div className="watch-top">
          <button type="button" className="watch-back" onClick={onBack}>
            ← All games
          </button>
          <span className="count-pill">
            <span className="count-pill-dot" aria-hidden />
            {moments.length} annotated moment{moments.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="watch-shell">
          <div className="watch-video-col">
            <div className="watch-frame-wrap">
              <YouTubePlayer
                ref={playerRef}
                youtubeId={video.youtubeId}
                playing={playing}
                playbackRate={playbackRate}
                onReady={setDuration}
                onPlayStateChange={(next) => {
                  if (next && active) setPlaybackRate(0.25);
                  setPlaying(next);
                }}
              />
            </div>

            <div className="watch-transport-wrap">
              <button
                type="button"
                className="watch-speed"
                aria-label="Change playback speed"
                onClick={cycleSpeed}
              >
                {formatSpeed(playbackRate)}
              </button>
              <div className="watch-transport">
                <button
                  type="button"
                  className="watch-nudge"
                  onClick={() => seekFromScrub(currentTime - 5)}
                >
                  −5s
                </button>
                <button
                  type="button"
                  className="watch-play"
                  data-paused={playing ? "false" : "true"}
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={togglePlay}
                >
                  {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                </button>
                <button
                  type="button"
                  className="watch-nudge"
                  onClick={() => seekFromScrub(currentTime + 5)}
                >
                  +5s
                </button>
              </div>
            </div>

            <div className="watch-scrub">
              <span className="watch-time">{formatTime(currentTime)}</span>
              <div className="watch-track">
                <div className="watch-track-line" />
                <div
                  className="watch-thumb"
                  style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
                {duration > 0 &&
                  moments.map((moment) => (
                    <button
                      key={moment.id}
                      type="button"
                      className="watch-dot"
                      style={{
                        left: `${Math.min(100, Math.max(0, (moment.timestamp / duration) * 100))}%`,
                      }}
                      aria-label={`Moment at ${formatPreciseTime(moment.timestamp)}`}
                      onClick={() => openCluster(moment)}
                    />
                  ))}
                <input
                  className="watch-range"
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onPointerDown={() => setDragging(true)}
                  onPointerUp={() => setDragging(false)}
                  onChange={(event) =>
                    seekFromScrub(parseFloat(event.target.value))
                  }
                />
              </div>
              <span className="watch-time" style={{ textAlign: "right" }}>
                {formatTime(duration)}
              </span>
            </div>

            {formatMeta(video) && <div className="watch-meta">{formatMeta(video)}</div>}
            <h1 className="watch-title">{video.videoTitle}</h1>
          </div>

          <aside className="watch-panel">
            {active ? (
              <div className="watch-panel-read">
                {active.map((moment) => (
                  <div key={moment.id} className="panel-block">
                    <div className="panel-by">
                      {moment.annotatorName
                        ? `${moment.annotatorName} · ${formatPreciseTime(moment.timestamp)}`
                        : formatPreciseTime(moment.timestamp)}
                    </div>
                    <p className="panel-why">
                      {moment.whyText || "No explanation recorded."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="watch-panel-idle">
                <h2 className="panel-idle-title">Annotated moments</h2>
                <p className="panel-idle-copy">
                  Play the jogo — we&rsquo;ll pause at each mark so you can read
                  why it matters.
                </p>
              </div>
            )}

            <div className="watch-panel-list">
              <div className="moments-head">
                <h2>{active ? "All moments" : "Jump to a mark"}</h2>
                <span className="moments-head-kicker">Tap to read</span>
              </div>

              {loading ? (
                <p className="status-message" style={{ marginTop: 16 }}>
                  Loading moments…
                </p>
              ) : moments.length === 0 ? (
                <p className="status-message" style={{ marginTop: 16 }}>
                  No annotations on this jogo yet.
                </p>
              ) : (
                moments.map((moment) => {
                  const title =
                    moment.whyText.trim() ||
                    moment.momentLabel ||
                    "Untitled moment";
                  return (
                    <button
                      key={moment.id}
                      type="button"
                      className={`moment-compact${activeIds.has(moment.id) ? " is-active" : ""}`}
                      onClick={() => playCluster(moment)}
                    >
                      <span className="moment-time">
                        <span className="moment-time-dot" aria-hidden />
                        {formatPreciseTime(moment.timestamp)}
                      </span>
                      <span className="moment-compact-title">{title}</span>
                      {moment.annotatorName && (
                        <span className="moment-annotator">
                          Annotated by {moment.annotatorName}
                        </span>
                      )}
                      {moment.tags.length > 0 && (
                        <span className="moment-tags">
                          {moment.tags.map((tag) => (
                            <span key={tag} className="tag-pill">
                              {tagLabel(tag)}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
