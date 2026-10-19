import type { OfferStatus } from "./types";

/** How an ask's status reads, on the calendar and on the team page. */
export const STATUS: Record<OfferStatus, string> = {
  pending: "Waiting on you",
  deferred: "Deciding later",
  accepted: "Taken",
  declined: "Declined",
  countered: "Another time offered",
  "alt-confirmed": "Another time confirmed",
  "swap-requested": "Swap offered",
  swapped: "Swapped",
};

/** The same statuses as the manager sees them on the team page: never whether the worker is deciding later. */
export const TEAM_STATUS: Record<OfferStatus, string> = {
  pending: "Waiting for a reply",
  deferred: "Waiting for a reply",
  accepted: "Taken",
  declined: "Declined",
  countered: "Another time offered",
  "alt-confirmed": "Another time confirmed",
  "swap-requested": "Swap offered",
  swapped: "Swapped",
};
