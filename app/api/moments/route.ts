import { NextRequest, NextResponse } from "next/server";
import { getMomentsByVideoId } from "@/lib/airtable";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId parameter required" },
      { status: 400 }
    );
  }

  try {
    const moments = await getMomentsByVideoId(videoId);
    return NextResponse.json({ moments });
  } catch (error) {
    console.error("Fetch moments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch moments" },
      { status: 500 }
    );
  }
}
