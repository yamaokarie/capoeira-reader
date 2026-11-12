"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { homePathFor, type Audience } from "@/lib/audience";
import { tagLabel } from "@/lib/taxonomy";
import { formatTime } from "@/lib/time";
import {
  NORMAL_RATE,
  PAUSE_WINDOW_SECONDS,
  SECTION_RATE,
  type Moment,
  type Video,
} from "@/lib/types";

const SPEEDS = [0.25, 0.5, 1, 1.25, 1.5, 2];

// Matches .panel-swap.is-leaving's transition in globals.css.
const PANEL_EXIT_MS = 140;

function formatSpeed(rate: number) {
  return `${rate % 1 === 0 ? rate.toFixed(0) : rate}×`;
}

interface WatchScreenProps {
  video: Video;
  audience?: Audience;
  // Where to annotate this video in the annotation tool; no link if absent.
  annotateUrl?: string | null;
}

// The stretch of video a moment covers: its own span when it has an end
// point, otherwise the pause window either side of the mark.
function sectionOf(moment: Moment): [number, number] {
  if (moment.endTimestamp !== undefined)
    return [moment.timestamp, moment.endTimestamp];
  return [
    Math.max(0, moment.timestamp - PAUSE_WINDOW_SECONDS),
    moment.timestamp + PAUSE_WINDOW_SECONDS,
  ];
}

function inAnySection(moments: Moment[], time: number): boolean {
  return moments.some((moment) => {
    const [start, end] = sectionOf(moment);
    return time >= start && time <= end;
  });
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
    const [start, end] = sectionOf(moment);
    // Anywhere inside a span counts as on it.
    const distance =
      moment.endTimestamp !== undefined && time >= start && time <= end
        ? 0
        : Math.abs(moment.timestamp - time);
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

export function WatchScreen({
  video,
  audience = "expert",
  annotateUrl,
}: WatchScreenProps) {
  const playerRef = useRef<YouTubePlayerHandle>(null);
  // Whether playback is currently inside an annotated section. Speed only
  // changes when this flips, so a speed picked by hand sticks until the
  // next section boundary.
  const inSectionRef = useRef(false);
  // Where the last seek was sent. YouTube's getCurrentTime() keeps reporting
  // the pre-seek time for a moment after seekTo(), so the poll ignores
  // readings far from this until the player catches up (or it times out).
  const seekTargetRef = useRef<{ time: number; until: number } | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(NORMAL_RATE);
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

  // Half speed inside an annotated section, normal speed outside it.
  const syncSpeed = useCallback(
    (time: number) => {
      const inside = inAnySection(moments, time);
      if (inside === inSectionRef.current) return;
      inSectionRef.current = inside;
      const rate = inside ? SECTION_RATE : NORMAL_RATE;
      setPlaybackRate(rate);
      playerRef.current?.setPlaybackRate(rate);
    },
    [moments]
  );

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/moments?videoId=${encodeURIComponent(video.videoId)}&audience=${audience}`
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
  }, [video.videoId, audience]);

  useEffect(() => {
    if (!playing || dragging) return;

    const id = window.setInterval(() => {
      const time = playerRef.current?.getCurrentTime() ?? 0;
      const target = seekTargetRef.current;
      if (target) {
        if (Math.abs(time - target.time) > 1 && Date.now() < target.until) return;
        seekTargetRef.current = null;
      }
      setCurrentTime(time);
      syncSpeed(time);

      // Approaching the next mark swaps it into the highlight slot.
      const next = nearestMoment(moments, time, active);
      if (next && next.id !== active?.id) setActive(next);
    }, 200);

    return () => window.clearInterval(id);
  }, [playing, dragging, moments, active, syncSpeed]);

  const seekPlayer = useCallback((time: number) => {
    seekTargetRef.current = { time, until: Date.now() + 1500 };
    playerRef.current?.seekTo(time);
  }, []);

  const openMoment = (moment: Moment) => {
    seekPlayer(moment.timestamp);
    setCurrentTime(moment.timestamp);
    syncSpeed(moment.timestamp);
    setActive(moment);
    setPlaying(false);
  };

  // Jumps to the moment's mark and plays it at section speed (0.5×), even
  // if a different speed was picked by hand.
  const playMoment = (moment: Moment) => {
    const time = moment.timestamp;
    seekPlayer(time);
    inSectionRef.current = inAnySection(moments, time);
    setPlaybackRate(SECTION_RATE);
    playerRef.current?.setPlaybackRate(SECTION_RATE);
    playerRef.current?.play();
    setCurrentTime(time);
    setActive(moment);
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
    syncSpeed(currentTime);
    setPlaying(true);
  };

  const seekFromScrub = (time: number) => {
    const clamped = Math.max(0, Math.min(duration || time, time));
    seekPlayer(clamped);
    setCurrentTime(clamped);
    syncSpeed(clamped);
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
                onReady={setDuration}
                onPlayStateChange={setPlaying}
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
                      aria-label={`Moment at ${formatTime(moment.timestamp)}`}
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
                      ? `${shown.annotatorName} · ${formatTime(shown.timestamp)}`
                      : formatTime(shown.timestamp)}
                  </div>
                  <p className="panel-why">
                    {shown.whyText || "No explanation recorded."}
                  </p>
                </div>
              ) : (
                <div className="watch-panel-idle">
                  <h2 className="panel-idle-title">Annotated moments</h2>
                  <p className="panel-idle-copy">
                    Play the jogo — it slows to half speed at each mark so you
                    can read why it matters.
                  </p>
                  {annotateUrl && (
                    <p className="watch-annotate">
                      Want to make notes or give feedback?{" "}
                      <a href={annotateUrl}>Try the annotation tool</a>
                    </p>
                  )}
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
                    moment.whyText.trim() || formatTime(moment.timestamp);
                  return (
                    <button
                      key={moment.id}
                      type="button"
                      className={`moment-compact${active?.id === moment.id ? " is-active" : ""}`}
                      onClick={() => playMoment(moment)}
                    >
                      <span className="moment-time">
                        <span className="moment-time-dot" aria-hidden />
                        {formatTime(moment.timestamp)}
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
