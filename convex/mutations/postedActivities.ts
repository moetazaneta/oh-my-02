import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const recordPostedActivity = internalMutation({
  args: {
    activityId: v.id("activities"),
    guildId: v.id("guilds"),
    discordMessageId: v.string(),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postedActivities")
      .withIndex("by_activity_guild", (q) =>
        q.eq("activityId", args.activityId).eq("guildId", args.guildId),
      )
      .first();

    if (existing) {
      console.debug(
        `Activity ${args.activityId} already posted to guild ${args.guildId}, skipping`,
      );
      return existing._id;
    }

    return await ctx.db.insert("postedActivities", {
      activityId: args.activityId,
      guildId: args.guildId,
      discordMessageId: args.discordMessageId,
      channelId: args.channelId,
      postedAt: Date.now(),
    });
  },
});
