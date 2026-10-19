"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { homePathFor, type Audience } from "@/lib/audience";
import { tagLabel } from "@/lib/taxonomy";
import { formatPreciseTime, formatTime } from "@/lib/time";
import { PAUSE_WINDOW_SECONDS, type Moment, type Video } from "@/lib/types";

const SPEEDS = [0.25, 0.5, 1, 1.25, 1.5, 2];

// Matches .panel-swap.is-leaving's transition in globals.css.
const PANEL_EXIT_MS = 140;

function formatSpeed(rate: number) {
  return `${rate % 1 === 0 ? rate.toFixed(0) : rate}×`;
}

interface WatchScreenProps {
  video: Video;
  audience?: Audience;
}

// The one moment to highlight at `time`: the closest mark within the pause
// window. A tie goes to `current`, so a moment picked by hand keeps the slot.
function nearestMoment(
  moments: Moment[],
  time: number,
  current: Moment | null
): Moment | null {
  let best: Moment | null = null;
  let bestDistance = PAUSE_WINDOW_SECONDS;
  for (const moment of moments) {
    const distance = Math.abs(moment.timestamp - time);
    if (
      distance < bestDistance ||
      (best !== null && distance === bestDistance && moment.id === current?.id)
    ) {
      best = moment;
      bestDistance = distance;
    }
  }
  return best;
}

function formatMeta(video: Video): string {
  return [video.style, video.context].filter(Boolean).join(" · ");
}

export function WatchScreen({ video, audience = "expert" }: WatchScreenProps) {
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const seenRef = useRef(new Set<string>());
  const cuedRef = useRef(false);
  const playerReadyRef = useRef(false);
  const startedRef = useRef(false);
  const momentsRef = useRef<Moment[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Only ever one highlighted moment, however close together the marks sit.
  const [active, setActive] = useState<Moment | null>(null);
  // What the top of the panel is showing. Trails `active` by the exit
  // animation, so the outgoing annotation can leave before the next enters.
  const [shown, setShown] = useState<Moment | null>(null);
  const shownKey = shown?.id ?? "";
  const leaving = (active?.id ?? "") !== shownKey;

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => setShown(active), PANEL_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving, active]);

  // Land on the first annotated moment: cued and shown, but not playing.
  // Runs once, as soon as both the player and the moments are in.
  const cueFirstMoment = useCallback(() => {
    const list = momentsRef.current;
    if (cuedRef.current || !playerReadyRef.current || list.length === 0) return;
    cuedRef.current = true;
    if (startedRef.current) return;

    const first = list.reduce((a, b) => (b.timestamp < a.timestamp ? b : a));
    seenRef.current.add(first.id);
    playerRef.current?.cueAt(first.timestamp);
    setCurrentTime(first.timestamp);
    setActive(first);
    setPlaybackRate(0.25);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/moments?videoId=${encodeURIComponent(video.videoId)}&audience=${audience}`
        );
        const data = await response.json();
        if (data.moments) {
          setMoments(data.moments);
          momentsRef.current = data.moments;
          cueFirstMoment();
        }
      } catch (error) {
        console.error("Error loading moments:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [video.videoId, audience, cueFirstMoment]);

  useEffect(() => {
    if (!playing || dragging) return;

    const id = window.setInterval(() => {
      const time = playerRef.current?.getCurrentTime() ?? 0;
      setCurrentTime(time);

      // Approaching the next mark swaps it into the highlight slot; the
      // first time through, playback also pauses there.
      const next = nearestMoment(moments, time, active);
      if (!next || next.id === active?.id) return;
      setActive(next);
      if (seenRef.current.has(next.id)) return;

      seenRef.current.add(next.id);
      setPlaying(false);
      setPlaybackRate(0.25);
    }, 200);

    return () => window.clearInterval(id);
  }, [playing, dragging, moments, active]);

  const openMoment = (moment: Moment) => {
    seenRef.current.add(moment.id);
    playerRef.current?.seekTo(moment.timestamp);
    setCurrentTime(moment.timestamp);
    setActive(moment);
    setPlaying(false);
    setPlaybackRate(0.25);
  };

  const playMoment = (moment: Moment) => {
    seenRef.current.add(moment.id);
    playerRef.current?.seekTo(moment.timestamp);
    playerRef.current?.setPlaybackRate(0.25);
    playerRef.current?.play();
    setCurrentTime(moment.timestamp);
    setActive(moment);
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

  return (
    <div className="page">
      <div className="watch-page-inner">
        <div className="watch-top">
          <Link href={homePathFor(audience)} className="watch-back">
            ← All games
          </Link>
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
                onReady={(nextDuration) => {
                  setDuration(nextDuration);
                  playerReadyRef.current = true;
                  cueFirstMoment();
                }}
                onPlayStateChange={(next) => {
                  if (next) startedRef.current = true;
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
                      onClick={() => openMoment(moment)}
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
            <div
              key={shownKey}
              className={`panel-swap${leaving ? " is-leaving" : ""}`}
            >
              {shown ? (
                <div className="watch-panel-read">
                  <div className="panel-by">
                    {shown.annotatorName
                      ? `${shown.annotatorName} · ${formatPreciseTime(shown.timestamp)}`
                      : formatPreciseTime(shown.timestamp)}
                  </div>
                  <p className="panel-why">
                    {shown.whyText || "No explanation recorded."}
                  </p>
                </div>
              ) : (
                <div className="watch-panel-idle">
                  <h2 className="panel-idle-title">Annotated moments</h2>
                  <p className="panel-idle-copy">
                    Play the jogo — we&rsquo;ll pause at each mark so you can
                    read why it matters.
                  </p>
                </div>
              )}
            </div>

            <div className="watch-panel-list">
              <div className="moments-head">
                <h2>{shown ?"All moments" : "Jump to a mark"}</h2>
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
                      className={`moment-compact${active?.id === moment.id ? " is-active" : ""}`}
                      onClick={() => playMoment(moment)}
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
