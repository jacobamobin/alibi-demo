import { SessionFence } from "./roster.ts";
export class SceneUpdatePermission {
  private explicitText = false;
  typed() { this.explicitText = true; }
  allows(muted: boolean) { return !muted || this.explicitText; }
  completed() { this.explicitText = false; }
  reset() { this.explicitText = false; }
}
export class SceneCapture {
  private fence = new SessionFence();
  private committed = "";
  private interim = "";
  begin() {
    return this.fence.begin();
  }
  accepts(epoch: number) {
    return this.fence.accepts(epoch);
  }
  get text() {
    return [this.committed, this.interim]
      .filter(Boolean)
      .join(" ")
      .slice(-4000);
  }
  partial(epoch: number, text: string) {
    if (this.accepts(epoch)) this.interim = text.trim().slice(0, 4000);
  }
  commit(epoch: number, text: string) {
    if (!this.accepts(epoch)) return;
    this.committed = [this.committed, text.trim()]
      .filter(Boolean)
      .join(" ")
      .slice(-4000);
    this.interim = "";
  }
  stop() {
    this.committed = this.text;
    this.interim = "";
    this.fence.end();
  }
  replace(text: string) {
    this.committed = text.slice(-4000);
    this.interim = "";
  }
}
export function mergeScene(
  current: string,
  fact: string,
  replacement?: string,
) {
  if (replacement?.trim()) return replacement.trim().slice(0, 4000);
  const clean = fact.trim();
  return !clean || current.includes(clean)
    ? current
    : [current, clean].filter(Boolean).join("\n").slice(-4000);
}
