"use client";
import dynamic from "next/dynamic";
// Three.js needs the browser, as on the calendar.
const FieldTestBoard = dynamic(() => import("@/components/board/FieldTestBoard"), { ssr: false, loading: () => <p className="board-loading">Opening the field-test week…</p> });
export default function FieldTestView() {
  return <FieldTestBoard />;
}
