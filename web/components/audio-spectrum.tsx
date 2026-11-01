"use client";
import { useEffect, useRef } from "react";
import { spectrumBands } from "../lib/spectrum";
export function AudioSpectrum({ read, enabled, compact = false }: { read: () => Uint8Array | undefined; enabled: boolean; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!element || !context) return;
    const width = compact ? 52 : 126, height = compact ? 19 : 25;
    context.setTransform(2,0,0,2,0,0);
    let frame = 0, previous = 0;
    let smoothed = Array(9).fill(0) as number[];
    const paint = (time: number) => {
      if (time - previous >= 45 || !enabled) {
        previous = time;
        let data: Uint8Array | undefined;
        try { if (enabled) data = read(); } catch { /* Return to silence after disconnection. */ }
        const bands = spectrumBands(data, enabled);
        smoothed = smoothed.map((v, i) => enabled ? v * 0.55 + bands[i] * 0.45 : 0);
        element.dataset.audioLevel = Math.max(...bands).toFixed(3);
        context.clearRect(0, 0, width, height);
        context.lineWidth = compact ? 2 : 3;
        context.lineCap = "round";
        smoothed.forEach((value, i) => {
          const x = (i + 0.5) * width / 9, h = 2 + value * (height - 4);
          context.strokeStyle = value > 0.04 ? "#25d366" : "#54717e";
          context.beginPath(); context.moveTo(x, (height-h)/2); context.lineTo(x, (height+h)/2); context.stroke();
        });
      }
      if (enabled) frame = requestAnimationFrame(paint);
    };
    paint(0);
    return () => cancelAnimationFrame(frame);
  }, [read, enabled, compact]);
  const width = compact ? 52 : 126, height = compact ? 19 : 25;
  return <canvas ref={canvas} className={compact ? "audio-spectrum compact" : "audio-spectrum"} width={width*2} height={height*2} style={{ width, height }} role="img" aria-label="Call audio waveform" />;
}
