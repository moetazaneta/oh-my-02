import { z } from "zod";

// ============================================================================
// NESTED SCHEMAS (Bottom-up: leaf types first)
// ============================================================================

/**
 * Media title with multiple language variants
 * romaji: Romanized title
 * english: English title (can be null if not available)
 * native: Native language title (can be null if not available)
 */
export const AniListMediaTitle = z.object({
  romaji: z.string(),
  english: z.string().nullable(),
  native: z.string().nullable(),
});
export type AniListMediaTitle = z.infer<typeof AniListMediaTitle>;

/**
 * Cover image with large variant URL
 */
export const AniListCoverImage = z.object({
  large: z.string(),
});
export type AniListCoverImage = z.infer<typeof AniListCoverImage>;

/**
 * User avatar with large variant URL
 */
export const AniListAvatar = z.object({
  large: z.string(),
});
export type AniListAvatar = z.infer<typeof AniListAvatar>;

/**
 * Media object (anime/manga)
 * Matches GraphQL media fragment with all required fields
 */
export const AniListMedia = z.object({
  id: z.number(),
  type: z.enum(["ANIME", "MANGA", "NOVEL", "ONE_SHOT", "SPECIAL", "MOVIE", "MUSIC"]),
  title: AniListMediaTitle,
  coverImage: AniListCoverImage,
  siteUrl: z.string(),
  episodes: z.number().nullable(),
  chapters: z.number().nullable(),
});
export type AniListMedia = z.infer<typeof AniListMedia>;

/**
 * User object (activity author)
 * Minimal fields needed for activity attribution and linking
 */
export const AniListUser = z.object({
  id: z.number(),
  name: z.string(),
  avatar: AniListAvatar,
  siteUrl: z.string(),
});
export type AniListUser = z.infer<typeof AniListUser>;

// ============================================================================
// ACTIVITY FRAGMENTS (Discriminated union variants)
// ============================================================================

// AniList API quirk: `status` is a human-readable action label ("watched episode", "completed"),
// not a list-status enum. `progress` is a string ("27") or null, not a number.
// mapper.ts converts both to our internal types.
export const AniListListActivityFragment = z.object({
  __typename: z.literal("ListActivity"),
  id: z.number(),
  type: z.enum(["ANIME_LIST", "MANGA_LIST"]),
  status: z.string(),
  progress: z.string().nullable(),
  createdAt: z.number(),
  media: AniListMedia,
  user: AniListUser,
});
export type AniListListActivityFragment = z.infer<typeof AniListListActivityFragment>;

/**
 * TextActivity fragment
 * Represents text-based activities (status posts, forum posts, etc)
 * No media association; just user text content
 */
export const AniListTextActivityFragment = z.object({
  __typename: z.literal("TextActivity"),
  id: z.number(),
  userId: z.number(),
  text: z.string(),
  createdAt: z.number(), // Unix timestamp in seconds
  user: AniListUser,
});
export type AniListTextActivityFragment = z.infer<typeof AniListTextActivityFragment>;

// ============================================================================
// DISCRIMINATED UNION (Activity variants)
// ============================================================================

/**
 * AniListActivitySchema
 * Discriminated union on __typename field to differentiate ListActivity vs TextActivity
 * This ensures type narrowing works properly in consuming code
 */
export const AniListActivitySchema = z.discriminatedUnion("__typename", [
  AniListListActivityFragment,
  AniListTextActivityFragment,
]);
export type AniListActivitySchema = z.infer<typeof AniListActivitySchema>;

export const AniListRawActivitySchema = z.union([
  AniListActivitySchema,
  z.object({ __typename: z.string().optional() }).passthrough(),
]);
export type AniListRawActivitySchema = z.infer<typeof AniListRawActivitySchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * GraphQL query variables for fetching user activities
 * userId: Required - the AniList user ID to fetch activities for
 * page: Optional - pagination page number (defaults to 1 server-side)
 * perPage: Optional - results per page (defaults to 25 server-side)
 */
export const AniListUserActivityQueryVariables = z.object({
  userId: z.number(),
  page: z.number().optional(),
  perPage: z.number().optional(),
});
export type AniListUserActivityQueryVariables = z.infer<typeof AniListUserActivityQueryVariables>;

/**
 * Full API response for user activity query
 * Wraps the Page.activities array in the standard GraphQL response envelope
 */
export const AniListActivityPageResponse = z.object({
  data: z.object({
    Page: z.object({
      pageInfo: z.object({
        hasNextPage: z.boolean(),
      }),
      activities: z.array(AniListRawActivitySchema),
    }),
  }),
});
export type AniListActivityPageResponse = z.infer<typeof AniListActivityPageResponse>;

/**
 * Response from username → userId resolution query
 * Used to convert a username string to numeric userId before fetching activities
 * User field is nullable if username not found
 */
export const AniListUserIdResponse = z.object({
  data: z.object({
    User: z
      .object({
        id: z.number(),
      })
      .nullable(),
  }),
});
export type AniListUserIdResponse = z.infer<typeof AniListUserIdResponse>;
