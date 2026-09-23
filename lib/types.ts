export interface Video {
  videoId: string;
  videoTitle: string;
  youtubeId: string;
  style?: string;
  context?: string;
  thumbnailUrl?: string;
  durationLabel?: string;
  momentCount: number;
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
  momentLabel: string;
  annotatorName: string;
  whyText: string;
  tags: string[];
}

export const PAUSE_WINDOW_SECONDS = 3;
