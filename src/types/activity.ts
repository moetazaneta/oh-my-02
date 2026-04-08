export type MediaType = "ANIME" | "MANGA" | "NOVEL" | "ONE_SHOT" | "SPECIAL" | "MOVIE" | "MUSIC";
export type ActivityType = "progress" | "status_change" | "score" | "text";
export type MediaStatus = "CURRENT" | "COMPLETED" | "PAUSED" | "DROPPED" | "PLANNING" | "REPEATING";

export interface UnifiedActivity {
  providerType: string; // "anilist", "myanimelist", etc.
  providerUserId: string; // username/ID on that provider
  providerActivityId: string; // unique ID on the provider
  activityType: ActivityType;
  mediaType: MediaType;
  mediaTitle: string; // romanized or English title
  mediaCoverUrl?: string;
  mediaUrl?: string; // link to media page on provider
  activityUrl?: string; // link to this specific activity
  status?: MediaStatus;
  progress?: number; // current episode/chapter
  progressMax?: number; // total episodes/chapters (for "ep 5/24")
  score?: number; // 0–10 or provider scale
  text?: string; // for text activities
  occurredAt: number; // Unix timestamp ms from provider

  // Display-only fields (not persisted to DB)
  rawStatusLabel?: string; // raw AniList status label ("watched episode", "completed", etc.)
  rawProgress?: string; // raw progress string from AniList ("11", "10 - 11", etc.)
  providerUserName?: string; // AniList username
  providerUserAvatarUrl?: string; // AniList user avatar URL
}
