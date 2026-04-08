import { describe, expect, it } from "bun:test";
import { createActivityEmbed } from "../../../src/discord/embeds/activity.js";
import type { UnifiedActivity } from "../../../src/types/activity.js";

describe("createActivityEmbed", () => {
  describe("range progress", () => {
    it("should display 'Watched episode 10 - 11' for range progress", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "77777",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Some Anime",
        mediaCoverUrl: "https://example.com/cover.jpg",
        mediaUrl: "https://anilist.co/anime/5",
        status: "CURRENT",
        progress: 11,
        progressMax: 23,
        occurredAt: Date.now(),
        rawStatusLabel: "watched episode",
        rawProgress: "10 - 11",
        providerUserName: "testuser",
        providerUserAvatarUrl: "https://example.com/avatar.jpg",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.description).toBe("Watched episode 10 - 11");
    });

    it("should display 'Watched episode 9' for single progress", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "77778",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Oshi no Ko 3rd Season",
        mediaUrl: "https://anilist.co/anime/5",
        status: "CURRENT",
        progress: 9,
        progressMax: 12,
        occurredAt: Date.now(),
        rawStatusLabel: "watched episode",
        rawProgress: "9",
        providerUserName: "Nyashka(not)",
        providerUserAvatarUrl: "https://example.com/avatar.jpg",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.description).toBe("Watched episode 9");
    });

    it("should not include progressMax in description", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "77779",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Test Anime",
        mediaUrl: "https://anilist.co/anime/5",
        status: "CURRENT",
        progress: 5,
        progressMax: 24,
        occurredAt: Date.now(),
        rawStatusLabel: "watched episode",
        rawProgress: "5",
        providerUserName: "testuser",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.description).toBe("Watched episode 5");
      expect(json.description).not.toContain("/ 24");
    });
  });

  describe("status change", () => {
    it("should display 'Completed' without emoji prefix", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "88888",
        activityType: "status_change",
        mediaType: "ANIME",
        mediaTitle: "Finished Anime",
        mediaUrl: "https://anilist.co/anime/10",
        status: "COMPLETED",
        occurredAt: Date.now(),
        rawStatusLabel: "completed",
        providerUserName: "testuser",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.description).toBe("Completed");
    });

    it("should display 'Plans to watch' for planning status", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "88889",
        activityType: "status_change",
        mediaType: "ANIME",
        mediaTitle: "Future Anime",
        mediaUrl: "https://anilist.co/anime/11",
        status: "PLANNING",
        occurredAt: Date.now(),
        rawStatusLabel: "plans to watch",
        providerUserName: "testuser",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.description).toBe("Plans to watch");
    });
  });

  describe("author", () => {
    it("should set author with provider user name and avatar", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "99999",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Test Anime",
        status: "CURRENT",
        progress: 1,
        occurredAt: Date.now(),
        rawStatusLabel: "watched episode",
        rawProgress: "1",
        providerUserName: "Nyashka(not)",
        providerUserAvatarUrl: "https://example.com/avatar.jpg",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.author?.name).toBe("Nyashka(not)");
      expect(json.author?.icon_url).toBe("https://example.com/avatar.jpg");
    });
  });

  describe("no footer or timestamp", () => {
    it("should not include footer or timestamp", () => {
      const activity: UnifiedActivity = {
        providerType: "anilist",
        providerUserId: "555",
        providerActivityId: "11111",
        activityType: "progress",
        mediaType: "ANIME",
        mediaTitle: "Test Anime",
        status: "CURRENT",
        progress: 3,
        occurredAt: Date.now(),
        rawStatusLabel: "watched episode",
        rawProgress: "3",
        providerUserName: "testuser",
      };

      const embed = createActivityEmbed(activity);
      const json = embed.toJSON();

      expect(json.footer).toBeUndefined();
      expect(json.timestamp).toBeUndefined();
    });
  });
});
