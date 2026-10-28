import { stateRoutes } from "@/lib/api-routes";
import { demoWeek } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** The exhibition demo's week. Starting over (each time /demo opens) gives the demo scenario. */
const routes = stateRoutes("demo", () => demoWeek());
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
