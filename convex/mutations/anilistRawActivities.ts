import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const insertRawActivity = internalMutation({
  args: {
    providerActivityId: v.string(),
    providerUserId: v.string(),
    rawData: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("anilistRawActivities", {
      providerActivityId: args.providerActivityId,
      providerUserId: args.providerUserId,
      rawData: args.rawData,
      fetchedAt: Date.now(),
    });
  },
});
