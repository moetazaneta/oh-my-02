import { mutation } from "../_generated/server";
import { v } from "convex/values";

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

export const addGuild = mutation({
  args: {
    guildId: v.string(),
    defaultChannelId: v.optional(v.string()),
    defaultActivityFilter: v.optional(activityFilterValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();

    if (existing) {
      throw new Error(`Guild ${args.guildId} already exists`);
    }

    return await ctx.db.insert("guilds", {
      guildId: args.guildId,
      defaultChannelId: args.defaultChannelId,
      defaultActivityFilter: args.defaultActivityFilter,
      addedAt: Date.now(),
    });
  },
});

export const updateGuild = mutation({
  args: {
    guildId: v.string(),
    defaultChannelId: v.optional(v.string()),
    defaultActivityFilter: v.optional(activityFilterValidator),
  },
  handler: async (ctx, args) => {
    const guild = await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();

    if (!guild) {
      throw new Error(`Guild ${args.guildId} not found`);
    }

    const updates: {
      defaultChannelId?: string;
      defaultActivityFilter?: typeof args.defaultActivityFilter;
    } = {};

    if (args.defaultChannelId !== undefined) {
      updates.defaultChannelId = args.defaultChannelId;
    }

    if (args.defaultActivityFilter !== undefined) {
      updates.defaultActivityFilter = args.defaultActivityFilter;
    }

    return await ctx.db.patch(guild._id, updates);
  },
});

export const removeGuild = mutation({
  args: { guildId: v.string() },
  handler: async (ctx, args) => {
    const guild = await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();

    if (!guild) {
      throw new Error(`Guild ${args.guildId} not found`);
    }

    await ctx.db.delete(guild._id);
  },
});
