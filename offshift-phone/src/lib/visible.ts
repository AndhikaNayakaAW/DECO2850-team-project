/** Waits `ms`, or less if the page comes back into view: polling pauses while a page is hidden and catches up when shown. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onShow);
      resolve();
    };
    const onShow = () => {
      if (document.visibilityState === "visible") done();
    };
    const t = setTimeout(done, ms);
    document.addEventListener("visibilitychange", onShow);
  });
}

export function hidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
