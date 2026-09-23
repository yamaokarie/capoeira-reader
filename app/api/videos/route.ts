import { NextResponse } from "next/server";
import { getVideos } from "@/lib/airtable";

export async function GET() {
  try {
    const videos = await getVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Fetch videos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
