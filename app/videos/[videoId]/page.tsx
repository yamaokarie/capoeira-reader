import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchScreen } from "@/components/WatchScreen";
import { getVideoById } from "@/lib/airtable";

interface VideoPageProps {
  params: Promise<{ videoId: string }>;
}

function videoIdFromParam(videoId: string): string {
  try {
    return decodeURIComponent(videoId);
  } catch {
    return videoId;
  }
}

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const video = await getVideoById(videoIdFromParam(videoId));
  if (!video) return { title: "Jogo not found" };
  return { title: video.videoTitle };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = await params;
  const video = await getVideoById(videoIdFromParam(videoId));
  if (!video) notFound();
  return <WatchScreen video={video} />;
}
