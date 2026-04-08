import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const upsertActivity = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_provider_activity", (q) =>
        q.eq("providerType", args.providerType).eq("providerActivityId", args.providerActivityId),
      )
      .first();

    if (existing) {
      console.debug(`Activity ${args.providerActivityId} already exists, skipping`);
      return existing._id;
    }

    return await ctx.db.insert("activities", {
      providerType: args.providerType,
      providerUserId: args.providerUserId,
      providerActivityId: args.providerActivityId,
      activityType: args.activityType,
      mediaType: args.mediaType,
      mediaTitle: args.mediaTitle,
      mediaCoverUrl: args.mediaCoverUrl,
      mediaUrl: args.mediaUrl,
      activityUrl: args.activityUrl,
      status: args.status,
      progress: args.progress,
      progressMax: args.progressMax,
      score: args.score,
      text: args.text,
      occurredAt: args.occurredAt,
    });
  },
});
