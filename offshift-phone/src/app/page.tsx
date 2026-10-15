import Link from "next/link";
import PhoneFrame from "@/components/phone/PhoneFrame";
import SyncProvider from "@/lib/sync";

export default function Page() {
  return (
    <main className="stage-wrap">
      <nav className="phone-view-nav" aria-label="Prototype views"><Link href="/watch">Watch ↗</Link><Link href="/calendar">Daily reflection ↗</Link></nav>
      <PhoneFrame />
      <SyncProvider />
    </main>
  );
}
