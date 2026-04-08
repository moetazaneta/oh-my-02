import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

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

export const addTrackedUser = mutation({
  args: {
    guildId: v.id("guilds"),
    discordUserId: v.optional(v.string()),
    providerType: v.string(),
    providerUserId: v.string(),
    channelId: v.optional(v.string()),
    activityFilter: v.optional(activityFilterValidator),
    lastSeenActivityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trackedUsers")
      .withIndex("by_guild_provider_user", (q) =>
        q
          .eq("guildId", args.guildId)
          .eq("providerType", args.providerType)
          .eq("providerUserId", args.providerUserId),
      )
      .first();

    if (existing) {
      throw new Error(
        `User ${args.providerUserId} (${args.providerType}) already tracked in this guild`,
      );
    }

    return await ctx.db.insert("trackedUsers", {
      guildId: args.guildId,
      discordUserId: args.discordUserId,
      providerType: args.providerType,
      providerUserId: args.providerUserId,
      channelId: args.channelId,
      activityFilter: args.activityFilter,
      lastSeenActivityId: args.lastSeenActivityId,
      addedAt: Date.now(),
    });
  },
});

export const updateTrackedUser = mutation({
  args: {
    id: v.id("trackedUsers"),
    discordUserId: v.optional(v.string()),
    channelId: v.optional(v.string()),
    activityFilter: v.optional(activityFilterValidator),
  },
  handler: async (ctx, args) => {
    const updates: {
      discordUserId?: string;
      channelId?: string;
      activityFilter?: typeof args.activityFilter;
    } = {};

    if (args.discordUserId !== undefined) {
      updates.discordUserId = args.discordUserId;
    }

    if (args.channelId !== undefined) {
      updates.channelId = args.channelId;
    }

    if (args.activityFilter !== undefined) {
      updates.activityFilter = args.activityFilter;
    }

    return await ctx.db.patch(args.id, updates);
  },
});

export const updateLastSeenActivity = internalMutation({
  args: {
    id: v.id("trackedUsers"),
    lastSeenActivityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      lastSeenActivityId: args.lastSeenActivityId,
    });
  },
});

export const removeTrackedUser = mutation({
  args: { id: v.id("trackedUsers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
