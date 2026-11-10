export interface Video {
  videoId: string;
  videoTitle: string;
  youtubeId: string;
  style?: string;
  context?: string;
  thumbnailUrl?: string;
  durationLabel?: string;
  momentCount: number;
  annotators: string[];
  featured?: FeaturedMoment | null;
}

export interface FeaturedMoment {
  timestamp: number;
  annotatorName: string;
  whyText: string;
}

export interface Moment {
  id: string;
  videoId: string;
  timestamp: number;
  // Optional out point; when set, the moment is a span rather than a mark.
  endTimestamp?: number;
  momentLabel: string;
  annotatorName: string;
  whyText: string;
  tags: string[];
}

export const PAUSE_WINDOW_SECONDS = 3;

// Playback speed outside and inside an annotated section.
export const NORMAL_RATE = 1;
export const SECTION_RATE = 0.5;
