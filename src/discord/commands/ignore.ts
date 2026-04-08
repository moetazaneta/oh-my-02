import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { ActivityFilter } from "../../core/activity-filter.js";
import { logger } from "../../lib/logger.js";
import type { CommandHandler } from "../types.js";

export const ignoreCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("ignore")
    .setDescription("Configure activity filters to ignore specific types")
    .addStringOption((option) =>
      option
        .setName("scope")
        .setDescription("Apply filter to guild or user")
        .setRequired(true)
        .addChoices({ name: "guild", value: "guild" }, { name: "user", value: "user" }),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of activity to ignore")
        .setRequired(true)
        .addChoices(
          { name: "planning", value: "planning" },
          { name: "progress", value: "progress" },
          { name: "score", value: "score" },
          { name: "status_change", value: "status_change" },
        ),
    ) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction, convex: ConvexHttpClient) => {
    const scope = interaction.options.getString("scope", true);
    const type = interaction.options.getString("type", true);

    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guildId) {
      await interaction.editReply("❌ This command can only be used in a server.");
      return;
    }

    if (scope === "user") {
      await interaction.editReply(
        "⚠️ Per-user filters are not yet supported via slash commands. Please contact your server admin.",
      );
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply(
        '❌ You need the "Manage Server" permission to configure guild filters.',
      );
      return;
    }

    try {
      const guild = await convex.query(
        "queries/guilds:getGuild" as unknown as FunctionReference<"query">,
        { guildId: interaction.guildId },
      );

      if (!guild) {
        await convex.mutation(
          "mutations/guilds:addGuild" as unknown as FunctionReference<"mutation">,
          { guildId: interaction.guildId },
        );
      }

      const currentFilter: ActivityFilter = guild?.defaultActivityFilter ?? {};

      let updatedFilter: ActivityFilter;

      if (type === "planning") {
        const existing = currentFilter.ignoredMediaStatuses ?? [];
        const updated = Array.from(new Set([...existing, "PLANNING"]));
        updatedFilter = {
          ...currentFilter,
          ignoredMediaStatuses: updated as ActivityFilter["ignoredMediaStatuses"],
        };
      } else {
        const existing = currentFilter.ignoredActivityTypes ?? [];
        const updated = Array.from(
          new Set([...existing, type as "progress" | "score" | "status_change"]),
        );
        updatedFilter = {
          ...currentFilter,
          ignoredActivityTypes: updated as ActivityFilter["ignoredActivityTypes"],
        };
      }

      await convex.mutation(
        "mutations/guilds:updateGuild" as unknown as FunctionReference<"mutation">,
        {
          guildId: interaction.guildId,
          defaultActivityFilter: updatedFilter,
        },
      );

      await interaction.editReply(`✅ **${type}** activities will now be ignored for this server.`);
    } catch (error) {
      logger.error("Error updating guild filter:", error);
      await interaction.editReply(
        "❌ Failed to update filter. Please try again or contact support.",
      );
    }
  },
};
