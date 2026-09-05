import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

type FacingMode = "user" | "environment";

type Props = {
  open: boolean;
  facingMode: FacingMode;
  title: string;
  onCapture: (file: File) => void;
  onCancel: () => void;
  // Called once if the camera can't be opened at all (no getUserMedia support, permission
  // denied, no camera present, insecure context, etc). The caller is expected to fall back
  // to the native <input type="file" capture"> flow when this fires.
  onUnavailable: () => void;
};

// Renders a full-screen live camera viewfinder using getUserMedia instead of handing the
// whole screen to the OS camera app via <input capture>. This is the fix for photos going
// missing on low-memory Android phones: with <input capture>, the OS launches a separate
// camera Activity and backgrounds the browser tab to do it, and on a memory-constrained
// device Android is free to kill that backgrounded tab outright to reclaim RAM. When the
// driver returns from the camera, the page reloads from scratch and the pending capture
// result — which was supposed to arrive as a change event on the file input — is lost
// forever, because the JS context that would have received it no longer exists.
//
// Streaming the camera into a <video> element inside this component means the tab is never
// backgrounded and never handed off to another process. The frame is grabbed onto a canvas
// and turned into a File entirely within the still-running page, so there's no round trip
// for the OS to interrupt.
export default function CameraCapture({ open, facingMode, title, onCapture, onCancel, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unavailableFiredRef = useRef(false);
  const [activeFacing, setActiveFacing] = useState(facingMode);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const reportUnavailable = () => {
    if (unavailableFiredRef.current) return;
    unavailableFiredRef.current = true;
    stopStream();
    onUnavailable();
  };

  const startStream = async (mode: FacingMode) => {
    setReady(false);
    setStarting(true);
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      reportUnavailable();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStarting(false);
      setReady(true);
    } catch {
      // Permission denied, no camera hardware, or an embedding context that blocks camera
      // access entirely — bail out to the native camera-app fallback rather than stranding
      // the driver on a viewfinder that will never produce a frame.
      reportUnavailable();
    }
  };

  useEffect(() => {
    if (!open) { stopStream(); return; }
    unavailableFiredRef.current = false;
    setActiveFacing(facingMode);
    void startStream(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode]);

  // Release the camera hardware the instant the tab backgrounds. A held camera lock is
  // itself a resource the OS may want back, and there's no reason to keep it open once the
  // driver isn't looking at the viewfinder.
  useEffect(() => {
    if (!open) return;
    const onHide = () => { if (document.visibilityState === "hidden") stopStream(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [open]);

  const flip = () => {
    const next: FacingMode = activeFacing === "user" ? "environment" : "user";
    setActiveFacing(next);
    void startStream(next);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopStream();
      onCapture(file);
    }, "image/jpeg", 0.92);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={`${title} camera`}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
        <button
          type="button"
          onClick={() => { stopStream(); onCancel(); }}
          aria-label="Close camera"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {starting && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-semibold text-white">
            Starting camera…
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-10 bg-black px-4 py-6">
        <button
          type="button"
          onClick={flip}
          aria-label="Switch camera"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          aria-label="Capture photo"
          className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>
        <div className="h-11 w-11" aria-hidden />
      </div>
      {!starting && <div className="sr-only" aria-live="polite">Camera ready. {title}.</div>}
    </div>
  );
}
