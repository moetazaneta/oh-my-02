import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

export const getTrackedUser = query({
  args: {
    guildId: v.string(),
    providerType: v.string(),
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const guild = await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();

    if (!guild) {
      return null;
    }

    return await ctx.db
      .query("trackedUsers")
      .withIndex("by_guild_provider_user", (q) =>
        q
          .eq("guildId", guild._id)
          .eq("providerType", args.providerType)
          .eq("providerUserId", args.providerUserId),
      )
      .first();
  },
});

export const listTrackedUsers = query({
  args: { guildId: v.string() },
  handler: async (ctx, args) => {
    const guild = await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();

    if (!guild) {
      return [];
    }

    return await ctx.db
      .query("trackedUsers")
      .withIndex("by_guild", (q) => q.eq("guildId", guild._id))
      .collect();
  },
});

export const listAllTrackedUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("trackedUsers").collect();
  },
});

export const getTrackedUserById = internalQuery({
  args: { id: v.id("trackedUsers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
