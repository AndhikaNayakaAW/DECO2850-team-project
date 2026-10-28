import { teamRoutes } from "@/lib/api-routes";

export const dynamic = "force-dynamic";

/** The demo page's Test offer: an ask sent to the demo week only. */
const routes = teamRoutes("demo");
export const GET = routes.GET;
export const POST = routes.POST;
