import type { CommandHandler } from "../types.js";
import { ignoreCommand } from "./ignore.js";
import { setupCommand } from "./setup.js";
import { statusCommand } from "./status.js";
import { trackCommand } from "./track.js";
import { untrackCommand } from "./untrack.js";

export const commandRegistry = new Map<string, CommandHandler>();

export function registerCommand(handler: CommandHandler): void {
  const commandName = handler.data.name;
  commandRegistry.set(commandName, handler);
}

export function getCommand(name: string): CommandHandler | undefined {
  return commandRegistry.get(name);
}

registerCommand(setupCommand);
registerCommand(trackCommand);
registerCommand(untrackCommand);
registerCommand(ignoreCommand);
registerCommand(statusCommand);
