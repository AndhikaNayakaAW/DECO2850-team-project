import PhoneFrame from "@/components/phone/PhoneFrame";
import SyncProvider from "@/lib/sync";

export default function Page() {
  return (
    <main className="stage-wrap">
      <PhoneFrame />
      <SyncProvider />
    </main>
  );
}
