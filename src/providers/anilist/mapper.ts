import type { ActivityType, MediaStatus, UnifiedActivity } from "../../types/activity.js";
import type { AniListListActivityFragment, AniListTextActivityFragment } from "./schemas.js";

const STATUS_LABEL_MAP: Record<string, MediaStatus> = {
  "watched episode": "CURRENT",
  "read chapter": "CURRENT",
  "rewatched episode": "REPEATING",
  "reread chapter": "REPEATING",
  rewatched: "REPEATING",
  completed: "COMPLETED",
  "plans to watch": "PLANNING",
  "plans to read": "PLANNING",
  dropped: "DROPPED",
  "paused watching": "PAUSED",
  "paused reading": "PAUSED",
};

const PROGRESS_STATUS_LABELS = new Set([
  "watched episode",
  "read chapter",
  "rewatched episode",
  "reread chapter",
]);

export function mapAniListActivityToUnified(
  raw: AniListListActivityFragment | AniListTextActivityFragment,
): UnifiedActivity {
  if (raw.__typename === "ListActivity") {
    const progressNum = raw.progress !== null ? Number(raw.progress) : 0;
    return {
      providerType: "anilist",
      providerUserId: raw.user.id.toString(),
      providerActivityId: raw.id.toString(),
      activityType: determineActivityType(raw.status),
      mediaType: raw.media.type,
      mediaTitle:
        raw.media.title.english ?? raw.media.title.romaji ?? raw.media.title.native ?? "Unknown",
      mediaCoverUrl: raw.media.coverImage.large,
      mediaUrl: raw.media.siteUrl,
      activityUrl: `https://anilist.co/activity/${raw.id}`,
      status: parseStatusLabel(raw.status),
      progress: progressNum > 0 ? progressNum : undefined,
      progressMax:
        raw.media.type === "ANIME"
          ? (raw.media.episodes ?? undefined)
          : (raw.media.chapters ?? undefined),
      occurredAt: raw.createdAt * 1000,
    };
  }

  return {
    providerType: "anilist",
    providerUserId: raw.user.id.toString(),
    providerActivityId: raw.id.toString(),
    activityType: "text",
    mediaType: "ANIME",
    mediaTitle: "Text Activity",
    text: raw.text,
    activityUrl: `https://anilist.co/activity/${raw.id}`,
    occurredAt: raw.createdAt * 1000,
  };
}

function determineActivityType(statusLabel: string): ActivityType {
  return PROGRESS_STATUS_LABELS.has(statusLabel) ? "progress" : "status_change";
}

function parseStatusLabel(statusLabel: string): MediaStatus {
  return STATUS_LABEL_MAP[statusLabel] ?? "CURRENT";
}
