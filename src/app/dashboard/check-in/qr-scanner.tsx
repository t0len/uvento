"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useI18n } from "@/components/i18n/i18n-provider";

function readQr(data: Uint8ClampedArray, width: number, height: number) {
  return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

export function QrScanner({
  onCode,
  busy,
}: {
  onCode: (code: string) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const busyRef = useRef(busy);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);

  onCodeRef.current = onCode;
  busyRef.current = busy;

  useEffect(() => {
    if (!running) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let lastCode = "";
    let missed = 0;
    let lastScan = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function openCamera() {
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: true, audio: false },
      ];
      let lastError: unknown;
      for (const constraints of attempts) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const now = performance.now();
      if (video && ctx && video.readyState >= 2 && now - lastScan > 150) {
        lastScan = now;
        const scale = video.videoWidth > 640 ? 640 / video.videoWidth : 1;
        canvas.width = Math.max(1, Math.floor(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.floor(video.videoHeight * scale));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = readQr(image.data, image.width, image.height);
        if (code) {
          missed = 0;
          if (code !== lastCode && !busyRef.current) {
            lastCode = code;
            onCodeRef.current(code);
          }
        } else if (++missed > 8) {
          lastCode = "";
        }
      }
      frame = requestAnimationFrame(tick);
    }

    openCamera()
      .then(async (next) => {
        if (stopped) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = next;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        frame = requestAnimationFrame(tick);
      })
      .catch((error: unknown) => {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") setError(t.dashboard.cameraDenied);
        else if (name === "NotFoundError" || name === "OverconstrainedError") setError(t.dashboard.cameraMissing);
        else setError(t.dashboard.cameraFailed);
        setRunning(false);
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [running, t.dashboard.cameraDenied, t.dashboard.cameraFailed, t.dashboard.cameraMissing]);

  async function onImage(file: File) {
    setImageNote(null);
    setError(null);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = readQr(image.data, image.width, image.height);
    bitmap.close();
    if (!code) {
      setImageNote(t.dashboard.qrUnreadable);
      return;
    }
    onCodeRef.current(code);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRunning((value) => !value);
          }}
          className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          {running ? t.dashboard.stopScan : t.dashboard.scanQr}
        </button>
        <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t.dashboard.readImage}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onImage(file);
            }}
          />
        </label>
      </div>

      {running && (
        <div>
          <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-xl bg-black" />
          <p className="mt-2 text-sm text-gray-500">{t.dashboard.scanHint}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {imageNote && <p className="text-sm text-red-600">{imageNote}</p>}
    </div>
  );
}
