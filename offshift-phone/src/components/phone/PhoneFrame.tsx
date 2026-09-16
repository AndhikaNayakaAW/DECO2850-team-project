"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/sync";
import AppIcon from "./AppIcon";
import AppWindow from "./AppWindow";
import HomeScreen from "./HomeScreen";
import LockScreen from "./LockScreen";
import GlobalSheet from "./Sheet";
import { useStore } from "@/lib/store";
import type { AppId } from "@/lib/types";

function Banner() {
  const banner = useStore((s) => s.banner);
  const dismiss = useStore((s) => s.dismissBanner);
  const openApp = useStore((s) => s.openApp);
  const dismissNotification = useStore((s) => s.dismissNotification);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(dismiss, 5200);
    return () => clearTimeout(t);
  }, [banner, dismiss]);
  if (!banner) return null;
  return (
    <button
      className="banner"
      key={banner.id}
      onClick={() => {
        dismissNotification(banner.id);
        openApp(banner.app, banner.offerId && banner.app === "offshift" ? { screen: "offer", offerId: banner.offerId } : undefined);
      }}
    >
      <AppIcon id={banner.app} size="sm" />
      <div>
        <div className="t">
          {banner.title}
          <span>now</span>
        </div>
        <p>{banner.body}</p>
      </div>
    </button>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const toastKey = useStore((s) => s.toastKey);
  const clear = useStore((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [toast, toastKey, clear]);
  if (!toast) return null;
  return (
    <div className="toast" key={toastKey} role="status">
      {toast}
    </div>
  );
}

export default function PhoneFrame() {
  const hydrated = useHydrated();
  const locked = useStore((s) => s.locked);
  const app = useStore((s) => s.app);
  const unlock = useStore((s) => s.unlock);
  const goHome = useStore((s) => s.goHome);
  const [shown, setShown] = useState<AppId | null>(null);
  const [closing, setClosing] = useState(false);

  // keep the last app mounted for the close animation
  useEffect(() => {
    if (app) {
      setShown(app);
      setClosing(false);
      return;
    }
    if (shown) {
      setClosing(true);
      const t = setTimeout(() => {
        setShown(null);
        setClosing(false);
      }, 230);
      return () => clearTimeout(t);
    }
  }, [app, shown]);

  useEffect(() => {
    const t = setInterval(() => useStore.getState().fireReminders(), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && app) goHome();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app, goHome]);

  return (
    <div className="device" aria-label="Phone prototype">
      <div className="island" aria-hidden="true" />
      <div className="screen-root">
        {hydrated && (
          <>
            <HomeScreen />
            {shown && <AppWindow app={shown} closing={closing} />}
            {locked && <LockScreen onUnlocked={unlock} />}
            {!locked && <GlobalSheet />}
            {!locked && <Banner />}
            <Toast />
            {!locked && (
              <button className="home-ind" aria-label={app ? "Go to home screen" : "Home"} onClick={() => app && goHome()}>
                <i />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
