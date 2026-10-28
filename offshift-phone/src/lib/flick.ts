/** Throwing a block off the calendar with a quick flick of the mouse or a finger, to remove it (with Undo). */

/**
 * How fast a pointer was moving as it let go, in pixels per millisecond: only the tenth of a second before the release counts.
 * A pause before letting go (a mouse held still sends no moves) gives no samples there, so it reads as a drop, not a throw.
 */
export function throwSpeed(samples: { x: number; y: number; t: number }[], releasedAt: number): number {
  const recent = samples.filter((p) => releasedAt - p.t <= 100);
  if (recent.length < 2) return 0;
  const a = recent[0];
  const b = recent[recent.length - 1];
  return Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, releasedAt - a.t);
}
