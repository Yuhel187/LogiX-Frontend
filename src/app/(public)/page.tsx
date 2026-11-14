import type { Metadata } from "next";
import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "LogiX — Enterprise Logistics & Supply Chain Operations Platform",
  description:
    "Multi-tenant enterprise platform unifying order lifecycle, real-time inventory reservation, wave fulfillment, OR-Tools route optimization, Meta Prophet demand forecasting, and human-approved AI Copilot.",
};

export default function PublicLandingPage() {
  return <LandingPage />;
}
