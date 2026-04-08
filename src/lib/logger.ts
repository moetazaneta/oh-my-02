import { appendFileSync, mkdirSync } from "node:fs";

const LOG_DIR = "logs";
const LOG_FILE = `${LOG_DIR}/bot.log`;

const IS_BUN = typeof process !== "undefined" && "versions" in process && !!process.versions.bun;

let dirReady = false;

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function write(level: LogLevel, msg: string, ...args: unknown[]): void {
  if (!IS_BUN) {
    return;
  }

  if (!dirReady) {
    mkdirSync(LOG_DIR, { recursive: true });
    dirReady = true;
  }

  const timestamp = new Date().toISOString();
  const extra =
    args.length > 0
      ? ` ${args.map((a) => (a instanceof Error ? (a.stack ?? a.message) : JSON.stringify(a))).join(" ")}`
      : "";
  const line = `[${timestamp}] ${level}: ${msg}${extra}\n`;
  appendFileSync(LOG_FILE, line, "utf8");
}

export const logger = {
  debug(msg: string, ...args: unknown[]): void {
    write("DEBUG", msg, ...args);
    console.debug(msg, ...args);
  },
  info(msg: string, ...args: unknown[]): void {
    write("INFO", msg, ...args);
    console.log(msg, ...args);
  },
  warn(msg: string, ...args: unknown[]): void {
    write("WARN", msg, ...args);
    console.warn(msg, ...args);
  },
  error(msg: string, ...args: unknown[]): void {
    write("ERROR", msg, ...args);
    console.error(msg, ...args);
  },
};
