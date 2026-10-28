import FieldTestView from "@/components/board/FieldTestView";
export const metadata = { title: "Offshift · Field test F1" };
/** The field-test week, read only. No sync: it never touches the live session. */
export default function FieldTestingPage() {
  return <FieldTestView />;
}
