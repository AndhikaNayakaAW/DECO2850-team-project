"use client";

import type { FaceBox, HandFrame, HandInfo } from "./gestures";

/**
 * Webcam hand tracking with MediaPipe Hand Landmarker, served from /public/mediapipe so it works offline.
 * Frames never leave the browser; nothing is stored. No face, identity or emotion analysis.
 */
export interface HandTracker {
  stop: () => void;
}

interface Pt3 {
  x: number;
  y: number;
  z: number;
}

function d(a: Pt3, b: Pt3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function landmarksToHand(lm: Pt3[], handedness: "Left" | "Right"): HandInfo {
  const wrist = lm[0];
  const size = Math.max(0.02, d(wrist, lm[9]));
  const extended = (tip: number, pip: number) => d(lm[tip], wrist) > d(lm[pip], wrist) * 1.08;
  const fingers = [extended(8, 6), extended(12, 10), extended(16, 14), extended(20, 18)];
  const n = fingers.filter(Boolean).length;
  // a pinch brings the thumb to an index finger that is still pointing out; in a fist the index is curled into the palm
  const indexCurled = d(lm[8], wrist) < d(lm[6], wrist) * 0.95;
  const pinch = !indexCurled && d(lm[4], lm[8]) < size * 0.38;
  // thumb out sideways from the fist, pointing clearly up or down in the image
  const thumbOut = d(lm[4], lm[17]) > d(lm[2], lm[17]) * 1.15;
  const thumb: "up" | "down" | null = n === 0 && thumbOut && !pinch ? (lm[4].y < lm[2].y - size * 0.35 ? "up" : lm[4].y > lm[2].y + size * 0.35 ? "down" : null) : null;
  const i = lm[5];
  const p = lm[17];
  const cross = (i.x - wrist.x) * (p.y - wrist.y) - (i.y - wrist.y) * (p.x - wrist.x);
  const palmFacing = handedness === "Right" ? cross < 0 : cross > 0;
  const cx = (wrist.x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
  const cy = (wrist.y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
  const m = (a: Pt3, b: Pt3) => ({ x: 1 - (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  return {
    handedness,
    open: n >= 3,
    closed: n <= 1 && !pinch && !thumbOut,
    pinch,
    palmFacing,
    fingers: n,
    thumb,
    center: { x: 1 - cx, y: cy },
    index: { x: 1 - lm[8].x, y: lm[8].y },
    pinchPoint: m(lm[4], lm[8]),
    size,
  };
}

export async function startHandTracking(video: HTMLVideoElement, onFrame: (f: HandFrame) => void, onStatus?: (s: string) => void): Promise<HandTracker> {
  onStatus?.("Asking for the camera…");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  onStatus?.("Loading hand tracking…");
  const { FilesetResolver, HandLandmarker, FaceDetector } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const make = (delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
  let landmarker;
  try {
    landmarker = await make("GPU");
  } catch {
    landmarker = await make("CPU");
  }
  // presence only: a bounding box that says someone is there. No landmarks, no identity, no expression.
  let faces: Awaited<ReturnType<typeof FaceDetector.createFromOptions>> | null = null;
  try {
    faces = await FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "GPU" }, runningMode: "VIDEO", minDetectionConfidence: 0.5 });
  } catch {
    try {
      faces = await FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "CPU" }, runningMode: "VIDEO", minDetectionConfidence: 0.5 });
    } catch {
      faces = null;
    }
  }
  onStatus?.("Camera on");
  let running = true;
  let raf = 0;
  let lastTime = -1;
  let avgMs = 0;
  let skip = false;
  let frameNo = 0;
  let face: FaceBox | null = null;
  const loop = () => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    if (avgMs > 45 && (skip = !skip)) return; // slow device: halve the inference rate
    const t0 = performance.now();
    let res;
    try {
      res = landmarker.detectForVideo(video, t0);
    } catch {
      return;
    }
    avgMs = avgMs * 0.9 + (performance.now() - t0) * 0.1;
    frameNo += 1;
    if (faces && frameNo % 6 === 0) {
      try {
        const fr = faces.detectForVideo(video, t0 + 0.5);
        const d = fr.detections?.[0]?.boundingBox;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        face = d ? { x: 1 - (d.originX + d.width) / vw, y: d.originY / vh, w: d.width / vw, h: d.height / vh } : null;
      } catch {
        face = null;
      }
    }
    const hands: HandInfo[] = [];
    const lms = res.landmarks || [];
    for (let i = 0; i < lms.length; i++) {
      const label = (res.handedness?.[i]?.[0]?.categoryName as "Left" | "Right") || "Right";
      hands.push(landmarksToHand(lms[i] as Pt3[], label));
    }
    hands.sort((a, b) => a.center.x - b.center.x);
    onFrame({ t: t0, hands, face });
  };
  raf = requestAnimationFrame(loop);
  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      try {
        landmarker.close();
      } catch {}
      try {
        faces?.close();
      } catch {}
      stream.getTracks().forEach((tr) => tr.stop());
      video.srcObject = null;
      onStatus?.("Camera off");
    },
  };
}
