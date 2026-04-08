import { describe, expect, it } from "bun:test";
import {
  DEFAULT_ACTIVITY_FILTER,
  mergeFilters,
  shouldPostActivity,
} from "../../src/core/activity-filter.js";
import type { UnifiedActivity } from "../../src/types/activity.js";

describe("ActivityFilter", () => {
  describe("DEFAULT_ACTIVITY_FILTER", () => {
    it("should allow PLANNING status by default", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "user123",
        providerActivityId: "activity456",
        activityType: "status_change",
        mediaType: "ANIME",
        mediaTitle: "Test Anime",
        status: "PLANNING",
        occurredAt: Date.now(),
      };

      const shouldPost = shouldPostActivity(activity, DEFAULT_ACTIVITY_FILTER);
      expect(shouldPost).toBe(true);
    });
  });

  describe("mergeFilters", () => {
    it("should apply user filter override over guild filter", () => {
      const botDefault: { ignoredActivityTypes?: string[] } = {
        ignoredActivityTypes: ["progress"],
      };
      const guildFilter: { ignoredActivityTypes?: string[] } = {
        ignoredActivityTypes: ["score"],
      };
      const userFilter: { ignoredActivityTypes?: string[] } = {
        ignoredActivityTypes: ["text"],
      };

      const merged = mergeFilters(botDefault, guildFilter, userFilter);
      expect(merged.ignoredActivityTypes).toEqual(["text"]);
    });
  });

  describe("shouldPostActivity", () => {
    it("should return true when activity passes all filters", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "user123",
        providerActivityId: "activity456",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Test Anime",
        status: "CURRENT",
        progress: 5,
        occurredAt: Date.now(),
      };

      const filter = { ignoredMediaStatuses: ["PLANNING"] };
      const shouldPost = shouldPostActivity(activity, filter);
      expect(shouldPost).toBe(true);
    });
  });
});
