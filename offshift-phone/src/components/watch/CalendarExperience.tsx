"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import DailyReflection from "./DailyReflection";
import { useStore } from "@/lib/store";
const CalendarBoard = dynamic(() => import("@/components/board/CalendarBoard"), { ssr: false, loading: () => <p className="daily-empty">Opening your week…</p> });
/** The 3D week is always the main screen; ?view=day opens the daily reflection for a date. */
export default function CalendarExperience() {
  const params = useSearchParams();
  // Keyed by session: a new participant's board starts with no undo, transcript or open ask from the last one.
  const session = useStore((s) => s.sessionStartedAt);
  return params.get("view") === "day" ? <DailyReflection/> : <CalendarBoard key={session}/>;
}
