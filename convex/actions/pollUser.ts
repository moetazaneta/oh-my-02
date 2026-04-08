"use node";

import { v } from "convex/values";
import {
  DEFAULT_ACTIVITY_FILTER,
  mergeFilters,
  shouldPostActivity,
} from "../../src/core/activity-filter.js";
import { createActivityEmbed } from "../../src/discord/embeds/activity.js";
import { AniListProvider } from "../../src/providers/anilist/index.js";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

function getHigherActivityId(current?: string, next?: string): string | undefined {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }

  const currentInt = Number.parseInt(current, 10);
  const nextInt = Number.parseInt(next, 10);

  if (Number.isNaN(currentInt) || Number.isNaN(nextInt)) {
    return current;
  }

  return nextInt > currentInt ? next : current;
}

export const pollUser = internalAction({
  args: { trackedUserId: v.id("trackedUsers") },
  handler: async (ctx, args) => {
    try {
      const trackedUser = await ctx.runQuery(internal.queries.trackedUsers.getTrackedUserById, {
        id: args.trackedUserId,
      });

      if (!trackedUser) {
        console.error(`[pollUser] TrackedUser ${args.trackedUserId} not found`);
        return;
      }

      const guild = await ctx.runQuery(internal.queries.guilds.getGuildById, {
        id: trackedUser.guildId,
      });

      if (!guild) {
        console.error(`[pollUser] Guild ${trackedUser.guildId} not found`);
        return;
      }

      const channelId = trackedUser.channelId ?? guild.defaultChannelId;
      if (!channelId) {
        console.debug(
          `[pollUser] No channel configured for user ${trackedUser.providerUserId}, skipping`,
        );
        return;
      }

      if (trackedUser.providerType !== "anilist") {
        console.debug(
          `[pollUser] Unsupported provider ${trackedUser.providerType} for user ${trackedUser.providerUserId}, skipping`,
        );
        return;
      }

      console.debug(
        `[pollUser] Fetching activities for ${trackedUser.providerType}:${trackedUser.providerUserId}`,
      );

      const provider = new AniListProvider();
      const activities = await provider.fetchRecentActivities(
        trackedUser.providerUserId,
        trackedUser.lastSeenActivityId ?? undefined,
      );

      if (activities.length === 0) {
        console.debug(`[pollUser] No new activities for ${trackedUser.providerUserId}`);
        return;
      }

      console.debug(`[pollUser] Found ${activities.length} new activities`);

      const reversed = [...activities].reverse();
      const mergedFilter = mergeFilters(
        DEFAULT_ACTIVITY_FILTER,
        guild.defaultActivityFilter ?? undefined,
        trackedUser.activityFilter ?? undefined,
      );

      let newestActivityId = trackedUser.lastSeenActivityId;

      for (const activity of reversed) {
        const activityId = await ctx.runMutation(
          internal.mutations.activities.upsertActivity,
          activity,
        );

        await ctx.runMutation(internal.mutations.anilistRawActivities.insertRawActivity, {
          providerActivityId: activity.providerActivityId,
          providerUserId: activity.providerUserId,
          rawData: activity,
        });

        const alreadyPosted = await ctx.runQuery(internal.queries.activities.wasPostedToGuild, {
          activityId,
          guildId: guild._id,
        });

        if (alreadyPosted) {
          console.debug(
            `[pollUser] Activity ${activity.providerActivityId} already posted to guild ${guild.guildId}`,
          );
          newestActivityId = getHigherActivityId(newestActivityId, activity.providerActivityId);
          continue;
        }

        if (!shouldPostActivity(activity, mergedFilter)) {
          console.debug(`[pollUser] Activity ${activity.providerActivityId} filtered out`);
          newestActivityId = getHigherActivityId(newestActivityId, activity.providerActivityId);
          continue;
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
          console.error(
            `[pollUser] DISCORD_BOT_TOKEN not set, cannot post activity ${activity.providerActivityId}`,
          );
          continue;
        }

        let memberName: string | undefined;
        let memberAvatarUrl: string | undefined;
        if (trackedUser.discordUserId) {
          try {
            const memberRes = await fetch(
              `https://discord.com/api/v10/guilds/${guild.guildId}/members/${trackedUser.discordUserId}`,
              {
                headers: { Authorization: `Bot ${botToken}` },
              },
            );
            if (memberRes.ok) {
              const member = (await memberRes.json()) as {
                nick?: string;
                avatar?: string;
                user?: { id?: string; username?: string; avatar?: string };
              };
              memberName = member.nick ?? member.user?.username;
              const avatarHash = member.avatar ?? member.user?.avatar;
              if (avatarHash && member.user?.id) {
                memberAvatarUrl = member.avatar
                  ? `https://cdn.discordapp.com/guilds/${guild.guildId}/users/${member.user.id}/avatars/${member.avatar}.webp`
                  : `https://cdn.discordapp.com/avatars/${member.user.id}/${avatarHash}.webp`;
              }
            }
          } catch (error) {
            console.warn(
              `[pollUser] Failed to fetch member info for user ${trackedUser.discordUserId}:`,
              error,
            );
          }
        }

        const embed = createActivityEmbed(activity);
        if (memberName) {
          embed.setAuthor(
            memberAvatarUrl ? { name: memberName, iconURL: memberAvatarUrl } : { name: memberName },
          );
        }

        const postUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
        let postRes = await fetch(postUrl, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [embed.toJSON()] }),
        });

        if (postRes.status === 429) {
          const retryAfter = postRes.headers.get("retry-after");
          const waitMs = retryAfter ? Number.parseFloat(retryAfter) * 1000 + 500 : 2000;
          console.warn(
            `[pollUser] Rate limited posting to channel ${channelId}, retrying in ${waitMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));

          postRes = await fetch(postUrl, {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ embeds: [embed.toJSON()] }),
          });
        }

        if (!postRes.ok) {
          const errorBody = await postRes.text();
          console.error(
            `[pollUser] Failed to post activity ${activity.providerActivityId} to channel ${channelId}: ${postRes.status} ${errorBody}`,
          );
          continue;
        }

        const responseData = (await postRes.json()) as { id?: string };
        const discordMessageId = responseData.id;
        if (!discordMessageId) {
          console.error(
            `[pollUser] Discord response missing message ID for activity ${activity.providerActivityId}`,
          );
          continue;
        }

        await ctx.runMutation(internal.mutations.postedActivities.recordPostedActivity, {
          activityId,
          guildId: guild._id,
          discordMessageId,
          channelId,
        });

        console.log(
          `[pollUser] Posted activity ${activity.providerActivityId} to channel ${channelId} (message ${discordMessageId})`,
        );

        newestActivityId = getHigherActivityId(newestActivityId, activity.providerActivityId);
      }

      if (newestActivityId && newestActivityId !== trackedUser.lastSeenActivityId) {
        await ctx.runMutation(internal.mutations.trackedUsers.updateLastSeenActivity, {
          id: args.trackedUserId,
          lastSeenActivityId: newestActivityId,
        });
        console.log(`[pollUser] Updated lastSeenActivityId to ${newestActivityId}`);
      }
    } catch (error) {
      console.error(
        `[pollUser] Error polling user ${args.trackedUserId}:`,
        error instanceof Error ? `${error.message}\n${error.stack}` : error,
      );
      throw error;
    }
  },
});
