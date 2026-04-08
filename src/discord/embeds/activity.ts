import { EmbedBuilder } from "discord.js";
import type { UnifiedActivity } from "../../types/activity.js";

export function createActivityEmbed(activity: UnifiedActivity): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(getEmbedColor(activity))
    .setTimestamp(activity.occurredAt);

  if (activity.mediaCoverUrl) {
    embed.setThumbnail(activity.mediaCoverUrl);
  }

  switch (activity.activityType) {
    case "progress":
      return buildProgressEmbed(embed, activity);
    case "status_change":
      return buildStatusChangeEmbed(embed, activity);
    case "score":
      return buildScoreEmbed(embed, activity);
    case "text":
      return buildTextEmbed(embed, activity);
  }
}

function getEmbedColor(activity: UnifiedActivity): number {
  if (activity.status === "COMPLETED") return 0x00ff00;
  if (activity.status === "CURRENT") return 0x3b88c3;
  if (activity.status === "PAUSED") return 0xffa500;
  if (activity.status === "DROPPED") return 0xff0000;
  if (activity.status === "PLANNING") return 0x808080;
  return 0x3b88c3;
}

function buildProgressEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  const title = activity.mediaTitle;
  const progressText = activity.progressMax
    ? `${activity.progress} / ${activity.progressMax}`
    : `${activity.progress}`;

  const unit = activity.mediaType === "ANIME" ? "Episode" : "Chapter";

  embed.setTitle(title);
  embed.setDescription(`Watched ${unit} ${progressText}`);

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  embed.setFooter({ text: `${activity.providerType} • ${activity.mediaType}` });

  return embed;
}

function buildStatusChangeEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  const statusEmoji = getStatusEmoji(activity.status);
  const statusText = formatStatus(activity.status);

  embed.setTitle(activity.mediaTitle);
  embed.setDescription(`${statusEmoji} Status changed to **${statusText}**`);

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  embed.setFooter({ text: `${activity.providerType} • ${activity.mediaType}` });

  return embed;
}

function buildScoreEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  embed.setTitle(activity.mediaTitle);
  embed.setDescription(`⭐ Rated **${activity.score}/10**`);

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  embed.setFooter({ text: `${activity.providerType} • ${activity.mediaType}` });

  return embed;
}

function buildTextEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  embed.setDescription(activity.text ?? "No text content");

  if (activity.activityUrl) {
    embed.setURL(activity.activityUrl);
  }

  embed.setFooter({ text: activity.providerType });

  return embed;
}

function getStatusEmoji(status?: string): string {
  switch (status) {
    case "CURRENT":
      return "▶️";
    case "COMPLETED":
      return "✅";
    case "PAUSED":
      return "⏸️";
    case "DROPPED":
      return "❌";
    case "PLANNING":
      return "📝";
    case "REPEATING":
      return "🔁";
    default:
      return "📊";
  }
}

function formatStatus(status?: string): string {
  switch (status) {
    case "CURRENT":
      return "Watching";
    case "COMPLETED":
      return "Completed";
    case "PAUSED":
      return "Paused";
    case "DROPPED":
      return "Dropped";
    case "PLANNING":
      return "Planning";
    case "REPEATING":
      return "Rewatching";
    default:
      return "Unknown";
  }
}
