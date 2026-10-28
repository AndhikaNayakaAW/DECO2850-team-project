import { watchRoutes } from "@/lib/api-routes";

export const dynamic = "force-dynamic";

/** The participant's watch: what it shows, and the answers, ratings and readings it sends back. */
const routes = watchRoutes("live");
export const GET = routes.GET;
export const POST = routes.POST;
