import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";

export const getGuild = query({
  args: { guildId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("guilds")
      .withIndex("by_guild_id", (q) => q.eq("guildId", args.guildId))
      .first();
  },
});

export const listGuilds = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("guilds").collect();
  },
});

export const getGuildById = internalQuery({
  args: { id: v.id("guilds") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
