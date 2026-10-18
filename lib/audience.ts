// Which library a page shows: expert annotations at `/` or student
// annotations at `/student`. Each reads its own pair of Airtable tables in
// the same base, matching what the annotation app writes.
export type Audience = "expert" | "student";

// Anything other than "student" falls back to "expert", so a caller can
// never steer a route at an arbitrary table name.
export function parseAudience(value: string | null | undefined): Audience {
  return value === "student" ? "student" : "expert";
}

export function tableFor(audience: Audience, kind: "videos" | "annotations"): string {
  if (audience === "student") {
    return kind === "videos"
      ? process.env.AIRTABLE_STUDENT_VIDEOS_TABLE || "StudentVideos"
      : process.env.AIRTABLE_STUDENT_ANNOTATIONS_TABLE || "StudentAnnotations";
  }
  return kind === "videos"
    ? process.env.AIRTABLE_VIDEOS_TABLE || "Videos"
    : process.env.AIRTABLE_ANNOTATIONS_TABLE || "Annotations";
}

// Where a library's list lives; video pages hang off it.
export function homePathFor(audience: Audience): string {
  return audience === "student" ? "/student" : "/";
}

export function videoPathFor(audience: Audience, videoId: string): string {
  const prefix = audience === "student" ? "/student" : "";
  return `${prefix}/videos/${encodeURIComponent(videoId)}`;
}
