import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ActivityFilter validator (NO v.any() — explicit fields)
const activityFilterValidator = v.object({
  ignoredActivityTypes: v.optional(
    v.array(
      v.union(
        v.literal("progress"),
        v.literal("status_change"),
        v.literal("score"),
        v.literal("text"),
      ),
    ),
  ),
  ignoredMediaStatuses: v.optional(
    v.array(
      v.union(
        v.literal("CURRENT"),
        v.literal("COMPLETED"),
        v.literal("PAUSED"),
        v.literal("DROPPED"),
        v.literal("PLANNING"),
        v.literal("REPEATING"),
      ),
    ),
  ),
  ignoredMediaTypes: v.optional(
    v.array(
      v.union(
        v.literal("ANIME"),
        v.literal("MANGA"),
        v.literal("NOVEL"),
        v.literal("ONE_SHOT"),
        v.literal("SPECIAL"),
        v.literal("MOVIE"),
        v.literal("MUSIC"),
      ),
    ),
  ),
});

export default defineSchema({
  guilds: defineTable({
    guildId: v.string(), // Discord guild (server) snowflake ID
    defaultChannelId: v.optional(v.string()), // Discord channel snowflake
    defaultActivityFilter: v.optional(activityFilterValidator),
    addedAt: v.number(),
  }).index("by_guild_id", ["guildId"]),

  trackedUsers: defineTable({
    guildId: v.id("guilds"),
    discordUserId: v.optional(v.string()), // linked Discord member (optional)
    providerType: v.string(), // "anilist"
    providerUserId: v.string(), // AniList username/ID
    channelId: v.optional(v.string()), // channel override for this user
    activityFilter: v.optional(activityFilterValidator),
    lastSeenActivityId: v.optional(v.string()), // last polled activity ID
    addedAt: v.number(),
  })
    .index("by_guild", ["guildId"])
    .index("by_provider_user", ["providerType", "providerUserId"])
    .index("by_guild_provider_user", ["guildId", "providerType", "providerUserId"]),

  activities: defineTable({
    providerType: v.string(),
    providerUserId: v.string(),
    providerActivityId: v.string(),
    activityType: v.union(
      v.literal("progress"),
      v.literal("status_change"),
      v.literal("score"),
      v.literal("text"),
    ),
    mediaType: v.union(
      v.literal("ANIME"),
      v.literal("MANGA"),
      v.literal("NOVEL"),
      v.literal("ONE_SHOT"),
      v.literal("SPECIAL"),
      v.literal("MOVIE"),
      v.literal("MUSIC"),
    ),
    mediaTitle: v.string(),
    mediaCoverUrl: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    activityUrl: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("CURRENT"),
        v.literal("COMPLETED"),
        v.literal("PAUSED"),
        v.literal("DROPPED"),
        v.literal("PLANNING"),
        v.literal("REPEATING"),
      ),
    ),
    progress: v.optional(v.number()),
    progressMax: v.optional(v.number()),
    score: v.optional(v.number()),
    text: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index("by_provider_activity", ["providerType", "providerActivityId"]) // dedup
    .index("by_provider_user_occurred", ["providerType", "providerUserId", "occurredAt"]),

  anilistRawActivities: defineTable({
    providerActivityId: v.string(),
    providerUserId: v.string(),
    rawData: v.any(), // raw GraphQL response — v.any() OK here, this IS the raw store
    fetchedAt: v.number(),
  }).index("by_provider_activity_id", ["providerActivityId"]),

  postedActivities: defineTable({
    activityId: v.id("activities"),
    guildId: v.id("guilds"),
    discordMessageId: v.string(),
    channelId: v.string(),
    postedAt: v.number(),
  })
    .index("by_activity_guild", ["activityId", "guildId"]) // dedup: was it posted to this guild?
    .index("by_guild", ["guildId"]),
});
