"use client";

import { useEffect, useState } from "react";
import { nowIn, type Now } from "./time";

/** The clock in the worker's zone, ticking every 20 seconds. */
export function useNow(timeZone: string): Now {
  const [now, setNow] = useState(() => nowIn(timeZone));
  useEffect(() => {
    setNow(nowIn(timeZone));
    const t = setInterval(() => setNow(nowIn(timeZone)), 20_000);
    return () => clearInterval(t);
  }, [timeZone]);
  return now;
}
