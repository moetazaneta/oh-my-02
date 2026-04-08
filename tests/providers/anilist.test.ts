import { describe, expect, it } from "bun:test";
import { AniListClient } from "../../src/providers/anilist/client.js";
import { mapAniListActivityToUnified } from "../../src/providers/anilist/mapper.js";
import type {
  AniListListActivityFragment,
  AniListTextActivityFragment,
} from "../../src/providers/anilist/schemas.js";

// ============================================================================
// MAPPER TESTS
// ============================================================================

describe("AniList Mapper", () => {
  describe("mapAniListActivityToUnified", () => {
    it("should map ListActivity to UnifiedActivity (progress type)", () => {
      const mockListActivity: AniListListActivityFragment = {
        __typename: "ListActivity",
        id: 12345,
        type: "ANIME_LIST",
        status: "watched episode",
        progress: "5",
        createdAt: 1234567890, // seconds
        media: {
          id: 1,
          type: "ANIME",
          title: {
            romaji: "Test Anime Romaji",
            english: "Test Anime EN",
            native: "テスト",
          },
          coverImage: { large: "https://example.com/cover.jpg" },
          siteUrl: "https://anilist.co/anime/1",
          episodes: 24,
          chapters: null,
        },
        user: {
          id: 999,
          name: "testuser",
          avatar: { large: "https://example.com/avatar.jpg" },
          siteUrl: "https://anilist.co/user/testuser",
        },
      };

      const result = mapAniListActivityToUnified(mockListActivity);

      expect(result.providerType).toBe("anilist");
      expect(result.providerUserId).toBe("999");
      expect(result.providerActivityId).toBe("12345");
      expect(result.activityType).toBe("progress");
      expect(result.mediaType).toBe("ANIME");
      expect(result.mediaTitle).toBe("Test Anime EN");
      expect(result.mediaCoverUrl).toBe("https://example.com/cover.jpg");
      expect(result.mediaUrl).toBe("https://anilist.co/anime/1");
      expect(result.activityUrl).toBe("https://anilist.co/activity/12345");
      expect(result.status).toBe("CURRENT");
      expect(result.progress).toBe(5);
      expect(result.progressMax).toBe(24);
      expect(result.occurredAt).toBe(1234567890 * 1000); // Converted to ms
    });

    it("should map TextActivity to UnifiedActivity", () => {
      const mockTextActivity: AniListTextActivityFragment = {
        __typename: "TextActivity",
        id: 67890,
        userId: 999,
        text: "This is a test status update",
        createdAt: 1234567890,
        user: {
          id: 999,
          name: "testuser",
          avatar: { large: "https://example.com/avatar.jpg" },
          siteUrl: "https://anilist.co/user/testuser",
        },
      };

      const result = mapAniListActivityToUnified(mockTextActivity);

      expect(result.providerType).toBe("anilist");
      expect(result.providerUserId).toBe("999");
      expect(result.providerActivityId).toBe("67890");
      expect(result.activityType).toBe("text");
      expect(result.mediaType).toBe("ANIME");
      expect(result.mediaTitle).toBe("Text Activity");
      expect(result.text).toBe("This is a test status update");
      expect(result.activityUrl).toBe("https://anilist.co/activity/67890");
      expect(result.occurredAt).toBe(1234567890 * 1000);
    });

    it("should handle null title.english fallback to romaji", () => {
      const mockListActivity: AniListListActivityFragment = {
        __typename: "ListActivity",
        id: 12345,
        type: "ANIME_LIST",
        status: "watched episode",
        progress: "5",
        createdAt: 1234567890,
        media: {
          id: 1,
          type: "ANIME",
          title: {
            romaji: "Test Anime Romaji",
            english: null,
            native: "テスト",
          },
          coverImage: { large: "https://example.com/cover.jpg" },
          siteUrl: "https://anilist.co/anime/1",
          episodes: 24,
          chapters: null,
        },
        user: {
          id: 999,
          name: "testuser",
          avatar: { large: "https://example.com/avatar.jpg" },
          siteUrl: "https://anilist.co/user/testuser",
        },
      };

      const result = mapAniListActivityToUnified(mockListActivity);
      expect(result.mediaTitle).toBe("Test Anime Romaji");
    });

    it("should handle MANGA type with chapters instead of episodes", () => {
      const mockListActivity: AniListListActivityFragment = {
        __typename: "ListActivity",
        id: 54321,
        type: "MANGA_LIST",
        status: "read chapter",
        progress: "12",
        createdAt: 1234567890,
        media: {
          id: 2,
          type: "MANGA",
          title: {
            romaji: "Test Manga",
            english: "Test Manga EN",
            native: "テストマンガ",
          },
          coverImage: { large: "https://example.com/manga-cover.jpg" },
          siteUrl: "https://anilist.co/manga/2",
          episodes: null,
          chapters: 50,
        },
        user: {
          id: 888,
          name: "mangareader",
          avatar: { large: "https://example.com/avatar2.jpg" },
          siteUrl: "https://anilist.co/user/mangareader",
        },
      };

      const result = mapAniListActivityToUnified(mockListActivity);

      expect(result.mediaType).toBe("MANGA");
      expect(result.progressMax).toBe(50);
      expect(result.progress).toBe(12);
    });

    it("should map status_change activity when progress is null", () => {
      const mockListActivity: AniListListActivityFragment = {
        __typename: "ListActivity",
        id: 99999,
        type: "ANIME_LIST",
        status: "plans to watch",
        progress: null,
        createdAt: 1234567890,
        media: {
          id: 3,
          type: "ANIME",
          title: {
            romaji: "Future Anime",
            english: "Future Anime EN",
            native: "未来",
          },
          coverImage: { large: "https://example.com/future.jpg" },
          siteUrl: "https://anilist.co/anime/3",
          episodes: 12,
          chapters: null,
        },
        user: {
          id: 777,
          name: "planner",
          avatar: { large: "https://example.com/avatar3.jpg" },
          siteUrl: "https://anilist.co/user/planner",
        },
      };

      const result = mapAniListActivityToUnified(mockListActivity);

      expect(result.activityType).toBe("status_change");
      expect(result.status).toBe("PLANNING");
      expect(result.progress).toBeUndefined();
    });
  });
});

// ============================================================================
// CLIENT TESTS
// ============================================================================

describe("AniList Client", () => {
  describe("Rate Limiting", () => {
    it("should throttle requests to 1 per 3 seconds", async () => {
      const client = new AniListClient();

      // Mock fetch to avoid real API calls
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                pageInfo: { hasNextPage: false },
                activities: [],
              },
            },
          }),
          { status: 200 },
        );
      };

      const start = Date.now();

      // Make 2 rapid requests
      await client.fetchUserActivities("12345", 1);
      await client.fetchUserActivities("12345", 1);

      const elapsed = Date.now() - start;

      // Restore fetch
      globalThis.fetch = originalFetch;

      // Second request should be delayed by ~3000ms
      expect(elapsed).toBeGreaterThanOrEqual(3000);
    }, 10000); // 10s timeout for this test

    it("should retry on 429 with Retry-After header", async () => {
      const client = new AniListClient();

      const originalFetch = globalThis.fetch;
      let attemptCount = 0;

      globalThis.fetch = async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ errors: [{ message: "Rate limit exceeded" }] }), {
            status: 429,
            headers: { "Retry-After": "2" },
          });
        }
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                pageInfo: { hasNextPage: false },
                activities: [],
              },
            },
          }),
          { status: 200 },
        );
      };

      const start = Date.now();
      const result = await client.fetchUserActivities("12345", 1);
      const elapsed = Date.now() - start;

      globalThis.fetch = originalFetch;

      expect(result.data.Page.activities).toBeDefined();
      expect(result.data.Page.activities.length).toBe(0);
      expect(elapsed).toBeGreaterThanOrEqual(3000);
      expect(attemptCount).toBe(2);
    }, 15000);
  });
});
