import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("poll all providers", { seconds: 10 }, internal.actions.poll.pollAll);

export default crons;
