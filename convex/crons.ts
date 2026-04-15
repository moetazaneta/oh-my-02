import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const POLL_INTERVAL_SECONDS = Number(process.env.POLL_INTERVAL_SECONDS) || 300;

const crons = cronJobs();

crons.interval("poll all providers", { seconds: POLL_INTERVAL_SECONDS }, internal.actions.poll.pollAll);

export default crons;
