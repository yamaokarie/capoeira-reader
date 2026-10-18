import { NextRequest, NextResponse } from "next/server";
import { getMomentsByVideoId } from "@/lib/airtable";
import { parseAudience } from "@/lib/audience";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");
  const audience = parseAudience(request.nextUrl.searchParams.get("audience"));

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId parameter required" },
      { status: 400 }
    );
  }

  try {
    const moments = await getMomentsByVideoId(videoId, audience);
    return NextResponse.json({ moments });
  } catch (error) {
    console.error("Fetch moments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch moments" },
      { status: 500 }
    );
  }
}
