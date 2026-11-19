import type { NextConfig } from "next";

process.env.COPILOTKIT_TELEMETRY_DISABLED = "true";
process.env.DO_NOT_TRACK = "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/sqlite-runner", "better-sqlite3"],
  env: {
    COPILOTKIT_TELEMETRY_DISABLED: "true",
    DO_NOT_TRACK: "1",
  },
};

export default nextConfig;
