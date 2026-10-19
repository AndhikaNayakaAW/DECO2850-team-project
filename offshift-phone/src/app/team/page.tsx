import TeamConsole from "@/components/team/TeamConsole";

export const metadata = { title: "Offshift · Team", robots: { index: false, follow: false } };

/** For the research team only: run the session and play the manager. Not linked from the worker's screens. */
export default function TeamPage() {
  return <TeamConsole />;
}
