import type { z } from "zod";
import { logger } from "../../lib/logger.js";
import {
  AniListActivityPageResponse,
  AniListUserActivityQueryVariables,
  AniListUserIdResponse,
} from "./schemas.js";

// ============================================================================
// GRAPHQL QUERY CONSTANTS
// ============================================================================

/**
 * GraphQL query to fetch user activities with pagination
 * Fetches both ListActivity and TextActivity types with all required fields
 */
const USER_ACTIVITIES_QUERY = `
query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    activities(userId: $userId, sort: ID_DESC) {
      ... on ListActivity {
        __typename
        id
        type
        status
        progress
        createdAt
        media {
          id
          type
          title { romaji english native }
          coverImage { large }
          siteUrl
          episodes
          chapters
        }
        user {
          id
          name
          avatar { large }
          siteUrl
        }
      }
      ... on TextActivity {
        __typename
        id
        userId
        text
        createdAt
        user {
          id
          name
          avatar { large }
          siteUrl
        }
      }
    }
  }
}
`;

/**
 * GraphQL query to resolve username to numeric user ID
 */
const RESOLVE_USER_ID_QUERY = `
query ($search: String) {
  User(search: $search) {
    id
  }
}
`;

// ============================================================================
// ANILIST CLIENT
// ============================================================================

/**
 * AniList GraphQL API client with rate limiting and retry logic
 *
 * Rate Limiting:
 * - Enforces 1 request per 3 seconds (conservative limit for 30/min degraded rate)
 * - Tracks last request timestamp and throttles before each request
 *
 * Retry Logic:
 * - 429 (Rate Limit): Reads Retry-After header and waits with 1s buffer, max 3 retries
 * - 5xx (Server Error): Exponential backoff (1s, 2s, 4s), max 3 attempts
 *
 * Response Validation:
 * - All responses validated through Zod schemas from ./schemas.js
 * - Throws on schema validation failures
 *
 * Debug Logging:
 * - Logs X-RateLimit-Remaining header when present
 * - Logs throttle delays and retry attempts
 */
export class AniListClient {
  private lastRequestAt = 0;
  private readonly minIntervalMs = 3000; // 1 request per 3 seconds
  private readonly apiUrl = "https://graphql.anilist.co";

  /**
   * Fetch user activities with pagination
   *
   * @param userId - Numeric user ID (as string)
   * @param page - Page number (default: 1)
   * @returns Activity page response with activities and pagination info
   */
  async fetchUserActivities(userId: string, page = 1): Promise<AniListActivityPageResponse> {
    const variables = AniListUserActivityQueryVariables.parse({
      userId: Number.parseInt(userId, 10),
      page,
      perPage: 50, // AniList max is 50
    });

    return this.request(USER_ACTIVITIES_QUERY, variables, AniListActivityPageResponse);
  }

  /**
   * Resolve username or user ID to numeric user ID
   *
   * Optimization: If input is already numeric (e.g., "12345"), returns as-is without querying
   *
   * @param usernameOrId - Username string or numeric ID string
   * @returns Numeric user ID as string
   * @throws Error if user not found
   */
  async resolveUserId(usernameOrId: string): Promise<string> {
    // Optimization: If already numeric, return as-is
    if (/^\d+$/.test(usernameOrId)) {
      return usernameOrId;
    }

    const variables = { search: usernameOrId };
    const response = await this.request(RESOLVE_USER_ID_QUERY, variables, AniListUserIdResponse);

    if (!response.data.User) {
      throw new Error(`AniList user not found: ${usernameOrId}`);
    }

    return response.data.User.id.toString();
  }

  /**
   * Throttle requests to enforce rate limit (1 request per 3 seconds)
   * Waits until minimum interval has elapsed since last request
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const waitMs = Math.max(0, this.minIntervalMs - elapsed);

    if (waitMs > 0) {
      logger.debug(`[AniListClient] Throttling: waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.lastRequestAt = Date.now();
  }

  /**
   * Execute GraphQL request with retry logic and response validation
   *
   * Retry Logic:
   * - 429: Reads Retry-After header, waits with 1s buffer, max 3 retries
   * - 5xx: Exponential backoff (1s, 2s, 4s), max 3 attempts
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @param schema - Zod schema to validate response
   * @returns Validated response data
   * @throws Error on non-retryable errors or retry exhaustion
   */
  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      await this.throttle();

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });

      // Log rate limit info
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        logger.debug(`[AniListClient] Rate limit remaining: ${remaining}`);
      }

      // 429: Read Retry-After and wait
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 + 1000 : 5000;
        logger.debug(`[AniListClient] 429 received, retrying after ${waitMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        attempt++;
        continue;
      }

      // 5xx: Exponential backoff
      if (response.status >= 500) {
        const waitMs = 2 ** attempt * 1000;
        logger.error(`[AniListClient] ${response.status} error, retrying after ${waitMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        attempt++;
        continue;
      }

      // Success: parse and validate
      if (response.ok) {
        const data = await response.json();
        return schema.parse(data);
      }

      // Other errors: throw
      throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
    }

    throw new Error(`AniList API request failed after ${maxRetries} retries`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AniListClient;
