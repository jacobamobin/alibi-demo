import test from "node:test";
import assert from "node:assert/strict";
import { MediaScope } from "../lib/media.ts";
const stream = () => {
  let stopped = false;
  return {
    value: {
      getTracks: () => [
        {
          stop: () => {
            stopped = true;
          },
        },
      ],
    } as unknown as MediaStream,
    stopped: () => stopped,
  };
};
test("ending during SDK startup stops existing and late microphone streams", async () => {
  const first = stream(),
    late = stream();
  let resolve!: (s: MediaStream) => void;
  const devices = { getUserMedia: () => Promise.resolve(first.value) };
  const original = devices.getUserMedia;
  const scope = new MediaScope(devices);
  scope.install();
  await devices.getUserMedia();
  // The same capture source can resolve after an end tap.
  scope.cancel();
  assert.equal(first.stopped(), true);
  await assert.rejects(devices.getUserMedia(), /ended/);
  scope.finishStartup();
  assert.equal(devices.getUserMedia, original);
  const pendingDevices = {
    getUserMedia: () =>
      new Promise<MediaStream>((r) => {
        resolve = r;
      }),
  };
  const pending = new MediaScope(pendingDevices);
  pending.install();
  const capture = pendingDevices.getUserMedia();
  pending.cancel();
  resolve(late.value);
  await assert.rejects(capture, /ended/);
  assert.equal(late.stopped(), true);
  pending.finishStartup();
});
test("successful startup restores the browser method but keeps streams stoppable", async () => {
  const input = stream();
  const devices = { getUserMedia: () => Promise.resolve(input.value) };
  const original = devices.getUserMedia;
  const scope = new MediaScope(devices);
  scope.install();
  await devices.getUserMedia();
  scope.finishStartup();
  assert.equal(devices.getUserMedia, original);
  assert.equal(input.stopped(), false);
  scope.cancel();
  scope.cancel();
  assert.equal(input.stopped(), true);
});

test("muted startup disables microphone tracks before the SDK can send audio", async () => {
  const track = { enabled: true, stop: () => {} };
  const value = { getTracks: () => [track] } as unknown as MediaStream;
  const devices = { getUserMedia: async () => value };
  const scope = new MediaScope(devices, true);
  scope.install();
  await devices.getUserMedia();
  assert.equal(track.enabled, false);
  scope.setMuted(false);
  assert.equal(track.enabled, true);
  scope.setMuted(true);
  assert.equal(track.enabled, false);
  scope.cancel();
  scope.finishStartup();
});

test("demo mute survives the real LiveKit startup track constructor", async () => {
  const { LocalAudioTrack } = await import("livekit-client");
  const saved = globalThis.MediaStream;
  class FakeStream {
    tracks: MediaStreamTrack[];
    constructor(tracks: MediaStreamTrack[]) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
    getAudioTracks() {
      return this.tracks;
    }
  }
  globalThis.MediaStream = FakeStream as unknown as typeof MediaStream;
  const track = {
    id: "mic",
    kind: "audio",
    enabled: false,
    readyState: "live",
    getConstraints: () => ({}),
    getSettings: () => ({}),
    addEventListener() {},
    removeEventListener() {},
    stop() {},
  } as unknown as MediaStreamTrack;
  const devices = {
    getUserMedia: async () => new FakeStream([track]) as unknown as MediaStream,
  };
  const scope = new MediaScope(devices, true);
  let audio: InstanceType<typeof LocalAudioTrack> | undefined;
  try {
    scope.install();
    await devices.getUserMedia();
    audio = new LocalAudioTrack(track, {}, false);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(track.enabled, false);
    scope.setMuted(false);
    assert.equal(track.enabled, true);
    scope.setMuted(true);
    track.enabled = true;
    assert.equal(track.enabled, false);
  } finally {
    audio?.stop();
    scope.cancel();
    scope.finishStartup();
    if (saved === undefined)
      delete (globalThis as { MediaStream?: typeof MediaStream }).MediaStream;
    else globalThis.MediaStream = saved;
  }
});
