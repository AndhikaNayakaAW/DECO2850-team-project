import AccessForm from "@/components/AccessForm";
import { safeNext } from "@/lib/access";

export const metadata = { title: "Offshift", robots: { index: false, follow: false } };

/** Shown only when the deployment has an access code and this browser hasn't entered it yet. */
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { next } = await searchParams;
  return <AccessForm next={safeNext(next)} />;
}
