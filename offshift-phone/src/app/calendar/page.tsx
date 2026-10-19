import { Suspense } from "react";
import CalendarExperience from "@/components/watch/CalendarExperience";
import SyncProvider from "@/lib/sync";
export const metadata = { title: "Offshift · Your week" };
export default function CalendarPage() {
  return <><Suspense fallback={<p className="daily-empty">Opening your calendar…</p>}><CalendarExperience/></Suspense><SyncProvider/></>;
}
