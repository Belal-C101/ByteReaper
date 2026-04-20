"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecorded: (file: File, durationSec: number) => void;
  disabled?: boolean;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [slideCancelArmed, setSlideCancelArmed] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const stopOnStartRef = useRef<"stop" | "cancel" | null>(null);
  const shouldCancelOnReleaseRef = useRef(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    recorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
    chunksRef.current = [];
    activePointerIdRef.current = null;
    stopOnStartRef.current = null;
    shouldCancelOnReleaseRef.current = false;
    setRecording(false);
    setElapsedSec(0);
    setLevel(0);
    setSlideCancelArmed(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const startRecording = async () => {
    setSlideCancelArmed(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level meter
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function updateLevel() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();

      // Choose best supported MIME
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const durationSec = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
        onRecorded(file, Math.round(durationSec));
        cleanup();
      };

      startTimeRef.current = Date.now();
      recorder.start(250); // collect chunks every 250ms
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSec((Date.now() - startTimeRef.current) / 1000);
      }, 200);

      if (stopOnStartRef.current === "cancel") {
        stopOnStartRef.current = null;
        cancelRecording();
      } else if (stopOnStartRef.current === "stop") {
        stopOnStartRef.current = null;
        stopRecording();
      }
    } catch (err) {
      const domErr = err instanceof DOMException ? err : null;
      const errName = domErr?.name || (err instanceof Error ? err.name : "");
      if (errName === "NotAllowedError") {
        showToast("Microphone permission denied. Enable mic access and try again.");
      } else if (errName === "NotFoundError") {
        showToast("No microphone found on this device.");
      } else if (errName === "SecurityError") {
        showToast("Microphone requires a secure HTTPS context.");
      } else {
        const message = err instanceof Error ? err.message : "Failed to start recording.";
        showToast(message);
      }
      cleanup();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (recorderRef.current?.state === "recording") {
      // Remove the onstop handler so it doesn't trigger onRecorded
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanup();
  };

  // Handle Escape to cancel
  useEffect(() => {
    if (!recording) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelRecording();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const beginHoldRecording = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || recording || activePointerIdRef.current !== null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    shouldCancelOnReleaseRef.current = false;
    await startRecording();
  };

  const endHoldRecording = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release failures for stale pointers.
    }
    activePointerIdRef.current = null;

    if (!recording) {
      stopOnStartRef.current = shouldCancelOnReleaseRef.current ? "cancel" : "stop";
      return;
    }

    if (shouldCancelOnReleaseRef.current) {
      cancelRecording();
    } else {
      stopRecording();
    }
  };

  const cancelPointerRecording = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    shouldCancelOnReleaseRef.current = true;
    setSlideCancelArmed(true);

    if (!recording) {
      stopOnStartRef.current = "cancel";
      return;
    }

    cancelRecording();
  };

  const trackPointerPosition = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !recording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    shouldCancelOnReleaseRef.current = outside;
    setSlideCancelArmed(outside);
  };

  return (
    <div className="relative flex items-center gap-2">
      {recording && (
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-destructive/10 border border-destructive/20">
          <div
            className="h-2 w-2 rounded-full bg-destructive animate-pulse"
            style={{ transform: `scale(${0.5 + level * 1.5})` }}
          />
          <span className="text-xs font-mono text-destructive tabular-nums">
            {formatTime(elapsedSec)}
          </span>
          {slideCancelArmed && (
            <span className="text-[10px] text-destructive/80">Release to cancel</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={cancelRecording}
            title="Cancel (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={stopRecording}
            title="Stop recording"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onPointerDown={beginHoldRecording}
        onPointerUp={endHoldRecording}
        onPointerCancel={cancelPointerRecording}
        onPointerLeave={cancelPointerRecording}
        onPointerMove={trackPointerPosition}
        disabled={disabled}
        title="Hold to record voice message"
        aria-label="Hold to record voice message"
        style={{ touchAction: "none" }}
      >
        <Mic className="h-4 w-4" />
      </Button>

      {toastMessage && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] rounded-lg bg-destructive text-destructive-foreground px-3 py-2 text-xs shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// ─── Voice bubble for playback ─────────────────────────────

interface VoiceBubbleProps {
  url: string;
  durationSec?: number;
}

export function VoiceBubble({ url, durationSec }: VoiceBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Use the recorded durationSec as the authoritative source —
  // WebM metadata often reports Infinity until fully buffered.
  const [duration, setDuration] = useState(durationSec || 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {
        // iOS Safari requires user gesture — silently ignore,
        // the user will tap again.
      });
    }
  };

  const cycleSpeed = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // Force stop when currentTime reaches the recorded duration.
  // This handles the case where onEnded never fires (WebM with Infinity duration).
  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const t = el.currentTime;
    const cap = durationSec || duration;
    if (cap > 0 && t >= cap) {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
      return;
    }
    setCurrentTime(t);
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration;
          // Only update from metadata if it's a finite value and we don't
          // already have a recording-time duration.
          if (d && isFinite(d) && !durationSec) setDuration(d);
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Square className="h-3 w-3" />
        ) : (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M4 2l10 6-10 6z" />
          </svg>
        )}
      </Button>

      {/* Scrubber */}
      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={durationSec || duration || 1}
          step={0.1}
          value={Math.min(currentTime, durationSec || duration || 1)}
          onChange={(e) => {
            const cap = durationSec || duration || 1;
            const t = Math.min(parseFloat(e.target.value), cap);
            if (audioRef.current) audioRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full h-1 accent-primary cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 tabular-nums">
          <span>{formatTime(Math.min(currentTime, durationSec || duration))}</span>
          <span>{formatTime(durationSec || duration)}</span>
        </div>
      </div>

      {/* Speed toggle */}
      <button
        onClick={cycleSpeed}
        className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-1"
        title="Playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
