import PerformancePlannerEmbed from "./components/PerformancePlannerEmbed";

export default function KJPerformancePlanner() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/performance-planner";
  return (
    <PerformancePlannerEmbed
      brandName="KJ Performance"
      apiBaseUrl={apiBaseUrl}
      sourceTag="homepage"
      ctaUrl="#"
      monetizationLinks={{
        detailedPlanUrl: "#",
      }}
    />
  );
}
