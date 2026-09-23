import { formatTime } from "./time";
import { Moment, Video } from "./types";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ANNOTATIONS_TABLE =
  process.env.AIRTABLE_ANNOTATIONS_TABLE || "Annotations";
const VIDEOS_TABLE = process.env.AIRTABLE_VIDEOS_TABLE || "Videos";

const BASE_URL = "https://api.airtable.com/v0";

interface AirtableRecord<T> {
  id: string;
  fields: T;
}

interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

interface VideoFields {
  videoId?: string;
  videoTitle?: string;
  youtubeId?: string;
  style?: string;
  context?: string;
  durationLabel?: string;
  duration?: string | number;
}

interface AnnotationFields {
  videoId?: string;
  videoTitle?: string;
  momentTimestamp?: number;
  momentLabel?: string;
  annotatorName?: string;
  whyMode?: string;
  transcript?: string;
  whyText?: string;
  tags?: string[];
}

function durationLabelFrom(fields: VideoFields): string | undefined {
  if (typeof fields.durationLabel === "string" && fields.durationLabel.trim()) {
    return fields.durationLabel.trim();
  }
  if (typeof fields.duration === "string" && fields.duration.trim()) {
    return fields.duration.trim();
  }
  if (typeof fields.duration === "number" && Number.isFinite(fields.duration)) {
    return formatTime(fields.duration);
  }
  return undefined;
}

async function youtubeDurationLabel(youtubeId: string): Promise<string | undefined> {
  if (!youtubeId) return undefined;
  try {
    const response = await fetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return undefined;
    const html = await response.text();
    const match = html.match(/"lengthSeconds":"(\d+)"/);
    if (!match) return undefined;
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
    return formatTime(seconds);
  } catch {
    return undefined;
  }
}

function thumbnailUrlFor(youtubeId: string | undefined): string | undefined {
  return youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : undefined;
}

function whyFromFields(fields: AnnotationFields): string {
  if (fields.whyMode === "voice") {
    return (fields.transcript || fields.whyText || "").trim();
  }
  return (fields.whyText || fields.transcript || "").trim();
}

function toMoment(record: AirtableRecord<AnnotationFields>): Moment | null {
  const timestamp = record.fields.momentTimestamp;
  if (typeof timestamp !== "number" || !record.fields.videoId) return null;

  return {
    id: record.id,
    videoId: record.fields.videoId,
    timestamp,
    momentLabel: record.fields.momentLabel || "",
    annotatorName: record.fields.annotatorName || "",
    whyText: whyFromFields(record.fields),
    tags: record.fields.tags || [],
  };
}

async function fetchAllRecords<T>(
  table: string,
  filterFormula?: string
): Promise<AirtableRecord<T>[]> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error("Airtable credentials missing");
  }

  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `${BASE_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`
    );
    url.searchParams.set("pageSize", "100");
    if (filterFormula) url.searchParams.set("filterByFormula", filterFormula);
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data: AirtableListResponse<T> = await response.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function getVideos(): Promise<Video[]> {
  const [videoRecords, annotationRecords] = await Promise.all([
    fetchAllRecords<VideoFields>(VIDEOS_TABLE),
    fetchAllRecords<AnnotationFields>(ANNOTATIONS_TABLE),
  ]);

  const momentsByVideo = new Map<string, Moment[]>();
  for (const record of annotationRecords) {
    const moment = toMoment(record);
    if (!moment) continue;
    const list = momentsByVideo.get(moment.videoId) ?? [];
    list.push(moment);
    momentsByVideo.set(moment.videoId, list);
  }

  const videos = await Promise.all(
    videoRecords.map(async (record) => {
      const youtubeId = record.fields.youtubeId || "";
      const videoId = record.fields.videoId || youtubeId || record.id;
      const moments = (momentsByVideo.get(videoId) ?? []).sort(
        (a, b) => a.timestamp - b.timestamp
      );
      const featured = moments[0];
      const durationLabel =
        durationLabelFrom(record.fields) ??
        (await youtubeDurationLabel(youtubeId));

      return {
        videoId,
        videoTitle: record.fields.videoTitle || "Untitled jogo",
        youtubeId,
        style: record.fields.style,
        context: record.fields.context,
        thumbnailUrl: thumbnailUrlFor(youtubeId),
        durationLabel,
        momentCount: moments.length,
        featured: featured
          ? {
              timestamp: featured.timestamp,
              annotatorName: featured.annotatorName,
              whyText: featured.whyText,
            }
          : null,
      } satisfies Video;
    })
  );

  return videos.filter((video) => video.youtubeId);
}

export async function getMomentsByVideoId(videoId: string): Promise<Moment[]> {
  const escaped = videoId.replace(/'/g, "\\'");
  const records = await fetchAllRecords<AnnotationFields>(
    ANNOTATIONS_TABLE,
    `{videoId} = '${escaped}'`
  );

  return records
    .map(toMoment)
    .filter((moment): moment is Moment => moment !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}
