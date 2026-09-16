"use client";

import OffshiftApp from "@/components/apps/offshift/OffshiftApp";
import WorkerApp from "@/components/apps/WorkerApp";
import ManagerApp from "@/components/apps/ManagerApp";
import MyUQApp from "@/components/apps/MyUQApp";
import SettingsApp from "@/components/apps/SettingsApp";
import StatusBar from "./StatusBar";
import type { AppId } from "@/lib/types";

const LIGHT_HEADS: AppId[] = ["pandora", "mcd", "myuq", "pandora-manager", "mcd-manager"];

export default function AppWindow({ app, closing }: { app: AppId; closing: boolean }) {
  let body: React.ReactNode = null;
  switch (app) {
    case "offshift":
      body = <OffshiftApp />;
      break;
    case "pandora":
    case "mcd":
      body = <WorkerApp employer={app} />;
      break;
    case "pandora-manager":
      body = <ManagerApp employer="pandora" />;
      break;
    case "mcd-manager":
      body = <ManagerApp employer="mcd" />;
      break;
    case "myuq":
      body = <MyUQApp />;
      break;
    case "settings":
      body = <SettingsApp />;
      break;
  }
  const tint = LIGHT_HEADS.includes(app);
  const bg = tint ? `var(--${app === "pandora-manager" ? "pandora-deep" : app === "mcd-manager" ? "mcd-deep" : app === "myuq" ? "uq" : app})` : undefined;
  return (
    <div className={`appwin${closing ? " closing" : ""}`} key={app}>
      <div style={bg ? { background: bg, color: "#fff" } : undefined}>
        <StatusBar tone={tint ? "light" : "default"} />
      </div>
      {body}
    </div>
  );
}
