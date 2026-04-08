import { z } from "zod";
import type { ActivityType, MediaStatus, MediaType } from "./activity.js";

export interface ActivityFilter {
  ignoredActivityTypes?: ActivityType[];
  ignoredMediaStatuses?: MediaStatus[]; // e.g. ["PLANNING"] to skip "added to list"
  ignoredMediaTypes?: MediaType[];
}

export const ActivityFilterSchema = z.object({
  ignoredActivityTypes: z.array(z.enum(["progress", "status_change", "score", "text"])).optional(),
  ignoredMediaStatuses: z
    .array(z.enum(["CURRENT", "COMPLETED", "PAUSED", "DROPPED", "PLANNING", "REPEATING"]))
    .optional(),
  ignoredMediaTypes: z
    .array(z.enum(["ANIME", "MANGA", "NOVEL", "ONE_SHOT", "SPECIAL", "MOVIE", "MUSIC"]))
    .optional(),
});
