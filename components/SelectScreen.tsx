"use client";

import { useEffect, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import { excerpt, formatPreciseTime } from "@/lib/time";
import type { Video } from "@/lib/types";

interface SelectScreenProps {
  onSelect: (video: Video) => void;
}

function formatMeta(video: Video): string {
  return [video.style, video.context].filter(Boolean).join(" · ");
}

export function SelectScreen({ onSelect }: SelectScreenProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/videos");
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Failed to load videos");
          return;
        }
        setVideos(data.videos ?? []);
      } catch {
        setError("Failed to reach the server");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-inner">
        <header className="home-header">
          <div className="kicker">Capoeira · Annotated rodas</div>
          <h1 className="display-title">Study the moment</h1>
          <p className="home-subhead">
            Games annotated by mestres and professores — frozen at the instants
            where the jogo turns.
          </p>
        </header>

        {loading ? (
          <p className="status-message">Loading jogos…</p>
        ) : error ? (
          <p className="status-message">{error}</p>
        ) : videos.length === 0 ? (
          <p className="status-message">No annotated jogos yet.</p>
        ) : (
          <div className="home-list">
            {videos.map((video) => (
              <button
                key={video.videoId}
                type="button"
                className="home-card"
                onClick={() => onSelect(video)}
              >
                <span className="home-thumb">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt="" />
                  ) : (
                    <span className="home-thumb-label">Roda thumbnail</span>
                  )}
                  <span className="home-chips">
                    {video.durationLabel && (
                      <span className="home-chip home-chip-duration">
                        {video.durationLabel}
                      </span>
                    )}
                    <span className="home-chip home-chip-count">
                      {video.momentCount} annotated moment
                      {video.momentCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
                <span className="home-body">
                  {formatMeta(video) && (
                    <div className="home-meta">{formatMeta(video)}</div>
                  )}
                  <h2 className="home-title">{video.videoTitle}</h2>
                  {video.featured?.whyText && (
                    <p className="home-quote">“{excerpt(video.featured.whyText, 160)}”</p>
                  )}
                  {video.featured && (
                    <div className="home-byline">
                      {[video.featured.annotatorName, formatPreciseTime(video.featured.timestamp)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  <span className="home-cta">
                    Study the moments <ArrowIcon size={15} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
