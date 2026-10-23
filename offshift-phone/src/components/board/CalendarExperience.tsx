"use client";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
const CalendarBoard = dynamic(() => import("@/components/board/CalendarBoard"), { ssr: false, loading: () => <p className="board-loading">Opening your week…</p> });
/** The 3D week is the whole website. */
export default function CalendarExperience() {
  // Keyed by session: a new participant's board starts with no undo, transcript or open ask from the last one.
  const session = useStore((s) => s.sessionStartedAt);
  return <CalendarBoard key={session}/>;
}
