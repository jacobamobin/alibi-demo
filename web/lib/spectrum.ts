import type { Participant } from "./roster.ts";
import { speakerLabel } from "./transcript.ts";
export function spectrumBands(data?: Uint8Array, audible = true): number[] {
  const count = 9;
  if (!audible || !data?.length) return Array(count).fill(0);
  return Array.from({ length: count }, (_, band) => {
    const start = Math.floor(band * data.length / count), end = Math.floor((band + 1) * data.length / count);
    let energy = 0;
    for (let i = start; i < end; i++) energy += (data[i] / 255) ** 2;
    return Math.min(1, Math.sqrt(energy / Math.max(1, end - start)) * 1.6);
  });
}
export function attributedPersonId(text: string, people: Participant[]): string {
  const label = speakerLabel(text);
  return label === "cast" ? "" : people.find(p => p.voice.label === label)?.id || "";
}
