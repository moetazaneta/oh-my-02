import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { logger } from "../../lib/logger.js";
import { AniListProvider } from "../../providers/anilist/index.js";
import type { CommandHandler } from "../types.js";

export const untrackCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("untrack")
    .setDescription("Stop tracking a user on a supported platform")
    .addStringOption((option) =>
      option
        .setName("provider")
        .setDescription("The platform to untrack the user from")
        .setRequired(true)
        .addChoices({ name: "AniList", value: "anilist" }),
    )
    .addStringOption((option) =>
      option.setName("username").setDescription("The username to untrack").setRequired(true),
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

    if (provider !== "anilist") {
      await interaction.editReply("❌ Only AniList is currently supported.");
      return;
    }

    let providerUserId: string;
    try {
      const anilistProvider = new AniListProvider();
      providerUserId = await anilistProvider.resolveUserId(username);
    } catch (error) {
      logger.error("Failed to resolve AniList user:", error);
      await interaction.editReply(`❌ AniList user '${username}' not found.`);
      return;
    }

    const trackedUser = await convex.query(
      "queries/trackedUsers:getTrackedUser" as unknown as FunctionReference<"query">,
      {
        guildId: interaction.guildId,
        providerType: "anilist",
        providerUserId,
      },
    );

    if (!trackedUser) {
      await interaction.editReply(`⚠️ That user wasn't being tracked on AniList in this server.`);
      return;
    }

    await convex.mutation(
      "mutations/trackedUsers:removeTrackedUser" as unknown as FunctionReference<"mutation">,
      {
        id: trackedUser._id,
      },
    );

    await interaction.editReply(`✅ Stopped tracking **${username}** on AniList.`);
  },
};
