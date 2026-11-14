import type { NextConfig } from "next";

process.env.COPILOTKIT_TELEMETRY_DISABLED = "true";
process.env.DO_NOT_TRACK = "1";

const nextConfig: NextConfig = {
  env: {
    COPILOTKIT_TELEMETRY_DISABLED: "true",
    DO_NOT_TRACK: "1",
  },
};

export default nextConfig;
