"use node";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const pollAll = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[pollAll] Starting polling cycle");

    const trackedUsers = await ctx.runQuery(internal.queries.trackedUsers.listAllTrackedUsers);

    console.log(`[pollAll] Polling ${trackedUsers.length} users`);

    for (let i = 0; i < trackedUsers.length; i += 1) {
      const user = trackedUsers[i];
      if (!user) {
        continue;
      }

      await ctx.scheduler.runAfter(i * 2000, internal.actions.pollUser.pollUser, {
        trackedUserId: user._id,
      });
    }

    console.log(`[pollAll] Scheduled ${trackedUsers.length} poll tasks`);
  },
});
