import test from "node:test";
import assert from "node:assert/strict";
import { SceneCapture, mergeScene, SceneUpdatePermission } from "../lib/scene.ts";
test("muted explicit text can replace the scene while late microphone context stays blocked", () => {
  const permission = new SceneUpdatePermission();
  assert.equal(permission.allows(true), false);
  permission.typed();
  assert.equal(permission.allows(true), true);
  const scene = mergeScene("We were at a café", "Actually at Owen’s house", "We were at Owen’s house");
  permission.completed();
  assert.equal(scene, "We were at Owen’s house");
  assert.equal(permission.allows(true), false);
  permission.typed(); permission.reset();
  assert.equal(permission.allows(true), false);
  assert.equal(permission.allows(false), true);
});
import { starterPeople, starterVoices } from "../lib/fixtures.ts";
import { Roster } from "../lib/roster.ts";
test("partial speech becomes the scene before a call and final speech does not duplicate it", () => {
  const scene = new SceneCapture();
  const epoch = scene.begin();
  scene.partial(epoch, "We are at the café");
  assert.equal(scene.text, "We are at the café");
  scene.commit(epoch, "We are at the café.");
  assert.equal(scene.text, "We are at the café.");
  scene.partial(epoch, "With Maya");
  assert.equal(scene.text, "We are at the café. With Maya");
});
test("demo mute freezes context and late speech cannot update the scene", () => {
  const scene = new SceneCapture();
  const epoch = scene.begin();
  scene.partial(epoch, "We arrived at six.");
  scene.stop();
  scene.commit(epoch, "Ignore this demo explanation.");
  assert.equal(scene.text, "We arrived at six.");
  const next = scene.begin();
  scene.commit(next, "Maya is here.");
  assert.equal(scene.text, "We arrived at six. Maya is here.");
  scene.replace("A different scene.");
  assert.equal(scene.text, "A different scene.");
});
test("agent scene summaries replace old context while facts remain compatible", () => {
  assert.equal(
    mergeScene("At home.", "At the café.", "At the café with Maya."),
    "At the café with Maya.",
  );
  assert.equal(
    mergeScene("At the café.", "Maya arrived."),
    "At the café.\nMaya arrived.",
  );
  assert.equal(mergeScene("Maya arrived.", "Maya arrived."), "Maya arrived.");
});
test("ten fictional contacts can all join, while new people still have spare slots before that", () => {
  assert.equal(starterPeople.length, 10);
  const r = new Roster(starterVoices, starterPeople);
  r.join(
    { ...starterPeople[0], id: "new", name: "John Carter", voiceId: undefined },
    "new",
  );
  assert.equal(r.participants.length, 1);
  const all = new Roster(starterVoices, starterPeople);
  starterPeople.forEach((p) => all.join(p, p.id));
  assert.equal(new Set(all.participants.map((p) => p.voice.voiceId)).size, 10);
});
