require("../config/env");

const { ensureDatabaseSchema } = require("../config/postgres");
const { ensureAnalyticsSchema } = require("./analyticsService");
const { ensureFunnelSchema } = require("./funnelService");
const { ensureProfilesSchema } = require("./profileService");
const { ensureUserColumns } = require("./userService");

async function runStartupSchemaBootstrap() {
  await ensureDatabaseSchema();

  const tasks = [
    { name: "users", run: ensureUserColumns },
    { name: "profiles", run: ensureProfilesSchema },
    { name: "analytics", run: ensureAnalyticsSchema },
    { name: "funnel", run: ensureFunnelSchema },
  ];

  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  const failures = results
    .map((result, index) => ({ result, task: tasks[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, task }) => ({
      name: task.name,
      error: result.reason,
    }));

  return {
    ok: failures.length === 0,
    failures,
  };
}

module.exports = {
  runStartupSchemaBootstrap,
};
