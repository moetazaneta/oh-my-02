import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { logger } from "../../lib/logger.js";
import { AniListProvider } from "../../providers/anilist/index.js";
import type { CommandHandler } from "../types.js";

export const trackCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("track")
    .setDescription("Track a user on a supported platform")
    .addStringOption((option) =>
      option
        .setName("provider")
        .setDescription("The platform to track the user on")
        .setRequired(true)
        .addChoices({ name: "AniList", value: "anilist" }),
    )
    .addStringOption((option) =>
      option.setName("username").setDescription("The username to track").setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where this user's updates will be posted (optional)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction, convex: ConvexHttpClient) => {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guildId) {
      await interaction.editReply("❌ This command can only be used in a server.");
      return;
    }

    const provider = interaction.options.getString("provider", true);
    const username = interaction.options.getString("username", true);
    const channel = interaction.options.getChannel("channel", false);

    if (provider !== "anilist") {
      await interaction.editReply("❌ Only AniList is currently supported.");
      return;
    }

    let providerUserId: string;
    let latestActivityId: string | undefined;
    try {
      const anilistProvider = new AniListProvider();
      providerUserId = await anilistProvider.resolveUserId(username);

      // Fetch the user's latest activity so we only post NEW entries going forward
      const recentActivities = await anilistProvider.fetchRecentActivities(providerUserId);
      const latestActivity = recentActivities[0];
      if (latestActivity) {
        latestActivityId = latestActivity.providerActivityId;
      }
    } catch (error) {
      logger.error("Failed to resolve AniList user:", error);
      await interaction.editReply(`❌ AniList user '${username}' not found.`);
      return;
    }

    let guild = await convex.query(
      "queries/guilds:getGuild" as unknown as FunctionReference<"query">,
      {
        guildId: interaction.guildId,
      },
    );

    if (!guild) {
      await convex.mutation(
        "mutations/guilds:addGuild" as unknown as FunctionReference<"mutation">,
        {
          guildId: interaction.guildId,
        },
      );
      guild = await convex.query(
        "queries/guilds:getGuild" as unknown as FunctionReference<"query">,
        {
          guildId: interaction.guildId,
        },
      );
      if (!guild) {
        await interaction.editReply("❌ Failed to create guild record. Please try again.");
        return;
      }
    }

    try {
      await convex.mutation(
        "mutations/trackedUsers:addTrackedUser" as unknown as FunctionReference<"mutation">,
        {
          guildId: guild._id,
          providerType: "anilist",
          providerUserId,
          channelId: channel?.id,
          lastSeenActivityId: latestActivityId,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("already tracked")) {
        await interaction.editReply(`⚠️ Already tracking ${username} on AniList in this server.`);
        return;
      }
      throw error;
    }

    const channelMention = channel ? `<#${channel.id}>` : "the default channel";
    await interaction.editReply(
      `✅ Now tracking **${username}** on AniList. Updates will post to ${channelMention}.`,
    );
  },
};
