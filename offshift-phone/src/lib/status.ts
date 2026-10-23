import type { OfferStatus } from "./types";

/** How an ask's status reads, on the calendar and in the team view. */
export const STATUS: Record<OfferStatus, string> = {
  pending: "Waiting on you",
  deferred: "Kept for later",
  accepted: "Taken",
  declined: "Declined",
};

/** The same statuses as the manager sees them in the team view: never whether the worker is deciding later. */
export const TEAM_STATUS: Record<OfferStatus, string> = {
  pending: "Waiting for a reply",
  deferred: "Waiting for a reply",
  accepted: "Taken",
  declined: "Declined",
};
