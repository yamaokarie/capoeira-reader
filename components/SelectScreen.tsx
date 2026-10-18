"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { homePathFor, videoPathFor, type Audience } from "@/lib/audience";
import { excerpt } from "@/lib/time";
import type { Video } from "@/lib/types";

const INSTRUMENT_ICONS = [
  "/instruments/agogo.svg",
  "/instruments/atabaque.svg",
  "/instruments/berimbau.svg",
  "/instruments/caxixi.svg",
  "/instruments/pandeiro.svg",
  "/instruments/reco-reco.svg",
];

function iconFor(videoId: string): string {
  let hash = 0;
  for (const char of videoId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return INSTRUMENT_ICONS[hash % INSTRUMENT_ICONS.length];
}

function displayTitle(title: string): string {
  return title.replace(/#\S+/g, " ").replace(/\s+/g, " ").trim();
}

function annotatorLabel(video: Video): string {
  return video.annotators.filter(Boolean).join(", ");
}

const COPY: Record<
  Audience,
  { kicker: string; title: string; subhead: string; empty: string }
> = {
  expert: {
    kicker: "Capoeira · Annotated rodas",
    title: "Study the moment",
    subhead:
      "Games annotated by mestres and professores — frozen at the instants where the jogo turns.",
    empty: "No annotated jogos yet.",
  },
  student: {
    kicker: "Capoeira · Student rodas",
    title: "Study the moment",
    subhead:
      "Our own rodas, annotated by teachers and students — what each of us saw in the jogo.",
    empty: "No annotated student rodas yet.",
  },
};

const VIEWS: { audience: Audience; label: string }[] = [
  { audience: "expert", label: "Mestres" },
  { audience: "student", label: "Student rodas" },
];

interface SelectScreenProps {
  audience?: Audience;
}

export function SelectScreen({ audience = "expert" }: SelectScreenProps) {
  const copy = COPY[audience];
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/videos?audience=${audience}`);
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
  }, [audience]);

  return (
    <div className="page">
      <div className="page-inner">
        <header className="home-header">
          <nav className="library-switch" aria-label="Library">
            {VIEWS.map((view) => (
              <Link
                key={view.audience}
                href={homePathFor(view.audience)}
                className="library-switch-option"
                aria-current={view.audience === audience ? "page" : undefined}
              >
                {view.label}
              </Link>
            ))}
          </nav>
          <div className="kicker">{copy.kicker}</div>
          <h1 className="display-title">{copy.title}</h1>
          <p className="home-subhead">{copy.subhead}</p>
        </header>

        {loading ? (
          <p className="status-message">Loading jogos…</p>
        ) : error ? (
          <p className="status-message">{error}</p>
        ) : videos.length === 0 ? (
          <p className="status-message">{copy.empty}</p>
        ) : (
          <div className="home-list">
            {videos.map((video) => {
              const annotator = annotatorLabel(video);
              return (
              <Link
                key={video.videoId}
                href={videoPathFor(audience, video.videoId)}
                className="home-card"
              >
                <span className="home-thumb">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt="" />
                  ) : (
                    <span className="home-thumb-label">Roda thumbnail</span>
                  )}
                  <span className="home-thumb-shade" aria-hidden />
                  <span className="home-annotator">
                    <span className="home-avatar" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={iconFor(video.videoId)} alt="" />
                    </span>
                    <span className="home-annotator-copy">
                      {annotator && (
                        <span className="home-annotator-name">{annotator}</span>
                      )}
                      <span className="home-annotator-count">
                        {`${video.momentCount} annotated moment${video.momentCount === 1 ? "" : "s"}`}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="home-body">
                  <h2 className="home-title">{displayTitle(video.videoTitle)}</h2>
                  {video.featured?.whyText && (
                    <p className="home-quote">{excerpt(video.featured.whyText, 160)}</p>
                  )}
                  <span className="home-cta">
                    Study the moments <ArrowIcon size={15} />
                  </span>
                </span>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
