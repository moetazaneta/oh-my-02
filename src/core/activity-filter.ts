import { z } from "zod";
import type { UnifiedActivity } from "../types/activity.js";

// Re-export Zod schema matching the Convex validator
export const ActivityFilterSchema = z.object({
  ignoredActivityTypes: z.array(z.enum(["progress", "status_change", "score", "text"])).optional(),
  ignoredMediaStatuses: z
    .array(z.enum(["CURRENT", "COMPLETED", "PAUSED", "DROPPED", "PLANNING", "REPEATING"]))
    .optional(),
  ignoredMediaTypes: z
    .array(z.enum(["ANIME", "MANGA", "NOVEL", "ONE_SHOT", "SPECIAL", "MOVIE", "MUSIC"]))
    .optional(),
});

export type ActivityFilter = z.infer<typeof ActivityFilterSchema>;

// Default bot-wide filter: show all statuses including PLANNING
export const DEFAULT_ACTIVITY_FILTER: ActivityFilter = {};

// Merge: user > guild > bot default (later overrides earlier, but undefined = inherit)
export function mergeFilters(
  botDefault: ActivityFilter,
  guildFilter?: ActivityFilter,
  userFilter?: ActivityFilter,
): ActivityFilter {
  return {
    ignoredActivityTypes:
      userFilter?.ignoredActivityTypes ??
      guildFilter?.ignoredActivityTypes ??
      botDefault.ignoredActivityTypes,
    ignoredMediaStatuses:
      userFilter?.ignoredMediaStatuses ??
      guildFilter?.ignoredMediaStatuses ??
      botDefault.ignoredMediaStatuses,
    ignoredMediaTypes:
      userFilter?.ignoredMediaTypes ??
      guildFilter?.ignoredMediaTypes ??
      botDefault.ignoredMediaTypes,
  };
}

// Returns true if the activity should be POSTED (not filtered out)
export function shouldPostActivity(activity: UnifiedActivity, filter: ActivityFilter): boolean {
  if (filter.ignoredActivityTypes?.includes(activity.activityType)) return false;
  if (activity.status && filter.ignoredMediaStatuses?.includes(activity.status)) return false;
  if (filter.ignoredMediaTypes?.includes(activity.mediaType)) return false;
  return true;
}
