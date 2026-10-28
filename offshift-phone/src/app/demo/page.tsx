import DemoExperience from "@/components/board/DemoExperience";
export const metadata = { title: "Offshift · Exhibition demo" };
/** The exhibition demo: its own week, reset each time the page opens, followed by the demo watch build. */
export default function DemoPage() {
  return <DemoExperience />;
}
