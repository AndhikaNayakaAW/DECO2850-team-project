import { teamRoutes } from "@/lib/api-routes";

export const dynamic = "force-dynamic";

/** The research team's view of the participant's session, and the calendar's Test offer. */
const routes = teamRoutes("live");
export const GET = routes.GET;
export const POST = routes.POST;
