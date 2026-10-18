import { NextRequest, NextResponse } from "next/server";
import { parseAudience } from "@/lib/audience";
import { getVideos } from "@/lib/airtable";

export async function GET(request: NextRequest) {
  const audience = parseAudience(request.nextUrl.searchParams.get("audience"));

  try {
    const videos = await getVideos(audience);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Fetch videos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
