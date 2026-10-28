import { stateRoutes } from "@/lib/api-routes";
import { emptyData } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The participant's week for the calendar. Starting over gives an empty session. */
const routes = stateRoutes("live", () => emptyData());
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
