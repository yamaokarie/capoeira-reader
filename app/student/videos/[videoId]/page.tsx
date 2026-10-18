import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchScreen } from "@/components/WatchScreen";
import { getVideoById } from "@/lib/airtable";

interface StudentVideoPageProps {
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
}: StudentVideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const video = await getVideoById(videoIdFromParam(videoId), "student");
  if (!video) return { title: "Roda not found" };
  return { title: video.videoTitle };
}

export default async function StudentVideoPage({ params }: StudentVideoPageProps) {
  const { videoId } = await params;
  const video = await getVideoById(videoIdFromParam(videoId), "student");
  if (!video) notFound();
  return <WatchScreen video={video} audience="student" />;
}
