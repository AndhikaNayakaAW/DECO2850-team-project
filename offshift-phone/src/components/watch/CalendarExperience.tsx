"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import DailyReflection from "./DailyReflection";
const CalendarBoard = dynamic(() => import("@/components/board/CalendarBoard"), { ssr: false, loading: () => <p className="daily-empty">Opening the 3D week…</p> });
export default function CalendarExperience() {
  const params = useSearchParams();
  return params.get("view") === "3d" || params.get("immersive") === "1" ? <CalendarBoard/> : <DailyReflection/>;
}
