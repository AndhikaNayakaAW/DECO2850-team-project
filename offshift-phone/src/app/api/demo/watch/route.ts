import { watchRoutes } from "@/lib/api-routes";

export const dynamic = "force-dynamic";

/** The demo watch build's endpoint, reached as /demo/api/watch. */
const routes = watchRoutes("demo");
export const GET = routes.GET;
export const POST = routes.POST;
