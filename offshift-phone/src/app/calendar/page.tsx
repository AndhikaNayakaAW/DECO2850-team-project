import CalendarExperience from "@/components/board/CalendarExperience";
import SyncProvider from "@/lib/sync";
export const metadata = { title: "Offshift · Your week" };
export default function CalendarPage() {
  return <><CalendarExperience/><SyncProvider/></>;
}
