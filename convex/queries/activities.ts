import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const wasPostedToGuild = internalQuery({
  args: {
    activityId: v.id("activities"),
    guildId: v.id("guilds"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postedActivities")
      .withIndex("by_activity_guild", (q) =>
        q.eq("activityId", args.activityId).eq("guildId", args.guildId),
      )
      .first();
    return existing !== null;
  },
});
