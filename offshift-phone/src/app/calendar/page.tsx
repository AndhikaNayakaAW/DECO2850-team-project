import CalendarBoard from "@/components/board/CalendarBoard";
import SyncProvider from "@/lib/sync";

export const metadata = { title: "Offshift · Calendar" };

export default function CalendarPage() {
  return (
    <>
      <CalendarBoard />
      <SyncProvider />
    </>
  );
}
