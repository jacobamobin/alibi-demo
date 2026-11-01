"use client";
import { useEffect, useRef, useState } from "react";
import type { RealtimeConnection } from "@elevenlabs/react";
import { SceneCapture } from "./scene";
import { MediaScope } from "./media";
import { elevenRequest } from "./agent";
type Operation = {
  epoch: number;
  preflight?: MediaStream;
  scope?: MediaScope;
  connection?: RealtimeConnection;
};
export function useSceneMicrophone(onScene: (text: string) => void) {
  const [status, setStatus] = useState<
    "off" | "connecting" | "listening" | "error"
  >("off");
  const [error, setError] = useState("");
  const buffer = useRef(new SceneCapture());
  const operation = useRef<Operation | null>(null);
  const changed = useRef(onScene);
  changed.current = onScene;
  function release(op: Operation) {
    op.connection?.close();
    op.scope?.cancel();
    op.scope?.finishStartup();
    op.preflight?.getTracks().forEach((t) => t.stop());
  }
  function stop(render = true) {
    buffer.current.stop();
    const old = operation.current;
    operation.current = null;
    if (old) release(old);
    if (render) setStatus("off");
  }
  useEffect(() => {
    const hide = () => stop();
    const visibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", visibility);
      stop(false);
    };
  }, []);
  async function start(key: string, baseScene?: string) {
    if (!key.trim()) {
      setError(
        "Enter your ElevenLabs key in Settings to turn on the scene microphone.",
      );
      return false;
    }
    stop();
    if (baseScene !== undefined) buffer.current.replace(baseScene);
    const op: Operation = { epoch: buffer.current.begin() };
    operation.current = op;
    setError("");
    setStatus("connecting");
    const accepts = () =>
      operation.current === op && buffer.current.accepts(op.epoch);
    try {
      op.preflight = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!accepts()) {
        release(op);
        return false;
      }
      const [{ Scribe, RealtimeEvents, CommitStrategy }, token] =
        await Promise.all([
          import("@elevenlabs/react"),
          elevenRequest<{ token: string }>(
            "/v1/single-use-token/realtime_scribe",
            key.trim(),
            undefined,
            "POST",
          ),
        ]);
      if (!accepts()) {
        release(op);
        return false;
      }
      op.scope = new MediaScope(navigator.mediaDevices);
      op.scope.install();
      const connection = Scribe.connect({
        token: token.token,
        modelId: "scribe_v2_realtime",
        languageCode: "en",
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 0.8,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      op.connection = connection;
      connection.on(RealtimeEvents.AUDIO_STARTED, () => {
        op.scope?.finishStartup();
        op.preflight?.getTracks().forEach((t) => t.stop());
        op.preflight = undefined;
        if (accepts()) setStatus("listening");
      });
      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
        if (!accepts()) return;
        buffer.current.partial(op.epoch, data.text);
        changed.current(buffer.current.text);
      });
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
        if (!accepts()) return;
        buffer.current.commit(op.epoch, data.text);
        changed.current(buffer.current.text);
      });
      connection.on(RealtimeEvents.ERROR, (data) => {
        if (!accepts()) return;
        stop();
        setStatus("error");
        setError(
          `Scene microphone failed (${data.message_type}). Check Speech-to-Text access and your ElevenLabs balance, then try again.`,
        );
      });
      connection.on(RealtimeEvents.CLOSE, () => {
        if (accepts()) {
          stop();
        }
      });
      return true;
    } catch (e) {
      if (accepts()) {
        stop();
        setStatus("error");
        setError(
          e instanceof Error ? e.message : "Could not start scene capture.",
        );
      } else release(op);
      return false;
    }
  }
  function replace(text: string) {
    buffer.current.replace(text);
    changed.current(text);
  }
  return {
    status,
    error,
    start,
    stop,
    replace,
    clearError: () => setError(""),
  };
}
