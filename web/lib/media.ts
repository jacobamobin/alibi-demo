/**
 * The provider SDK does not expose cancellation during startup. Capture every
 * stream it acquires in this app's single audio flow, including late permission
 * results. Restore the native method once startup settles; keep streams until end.
 */
export class MediaScope {
  private streams = new Set<MediaStream>();
  private cancelled = false;
  private devices: Pick<MediaDevices, "getUserMedia">;
  private original: MediaDevices["getUserMedia"];
  private wrapped: MediaDevices["getUserMedia"];
  private muted: boolean;
  private guards = new Map<MediaStreamTrack, () => void>();
  constructor(devices: Pick<MediaDevices, "getUserMedia">, muted = false) {
    this.muted = muted;
    this.devices = devices;
    this.original = devices.getUserMedia;
    this.wrapped = async (constraints) => {
      if (this.cancelled)
        throw new DOMException("This call has ended.", "AbortError");
      const stream = await this.original.call(this.devices, constraints);
      if (this.cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        throw new DOMException("This call has ended.", "AbortError");
      }
      this.streams.add(stream);
      try {
        stream.getTracks().forEach((t) => this.guard(t));
      } catch {
        this.cancel();
        throw new Error("Could not safely control the microphone mute state.");
      }
      return stream;
    };
  }
  private guard(track: MediaStreamTrack) {
    if (this.guards.has(track)) return;
    const own = Object.getOwnPropertyDescriptor(track, "enabled");
    let descriptor = own;
    let proto = Object.getPrototypeOf(track);
    while (!descriptor && proto) {
      descriptor = Object.getOwnPropertyDescriptor(proto, "enabled");
      proto = Object.getPrototypeOf(proto);
    }
    let value = track.enabled;
    const read = descriptor?.get
      ? () => descriptor!.get!.call(track)
      : () => value;
    const write = descriptor?.set
      ? (next: boolean) => descriptor!.set!.call(track, next)
      : (next: boolean) => {
          value = next;
        };
    // LiveKit may try to enable a track during construction. The app's mute
    // remains authoritative until an explicit unmute, including that window.
    Object.defineProperty(track, "enabled", {
      configurable: true,
      enumerable: own?.enumerable ?? true,
      get: read,
      set: (next: boolean) => write(this.muted ? false : !!next),
    });
    this.guards.set(track, () => {
      const current = read();
      if (own)
        Object.defineProperty(
          track,
          "enabled",
          "value" in own ? { ...own, value: current } : own,
        );
      else delete (track as { enabled?: boolean }).enabled;
    });
    track.enabled = !this.muted;
  }
  install() {
    this.devices.getUserMedia = this.wrapped;
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    for (const s of this.streams)
      s.getTracks().forEach((t) => {
        t.enabled = !muted;
      });
  }
  finishStartup() {
    if (this.devices.getUserMedia === this.wrapped)
      this.devices.getUserMedia = this.original;
  }
  cancel() {
    this.cancelled = true;
    for (const stream of this.streams)
      stream.getTracks().forEach((t) => t.stop());
    this.streams.clear();
    for (const restore of this.guards.values()) restore();
    this.guards.clear();
  }
}
