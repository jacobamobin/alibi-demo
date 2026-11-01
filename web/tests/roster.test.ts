import test from "node:test";
import assert from "node:assert/strict";
import {
  Roster,
  resolveName,
  SessionFence,
  type Person,
  type Voice,
} from "../lib/roster.ts";
import { agentConfiguration, clientTools, parseJoin } from "../lib/agent.ts";

const voices: Voice[] = Array.from({ length: 10 }, (_, i) => ({
  label: i === 0 ? "default" : `Voice${i + 1}`,
  voiceId: `voice-${i + 1}`,
  name: `Voice ${i + 1}`,
  gender: i % 2 ? "female" : "male",
}));
const person = (id: string, name: string, voiceId?: string): Person => ({
  id,
  name,
  voiceId,
  personality: "Friendly, quick-witted, and specific.",
  pronouns: "",
  color: "#647c88",
  aliases: [],
});

test("three people join dynamically with distinct voices", () => {
  const r = new Roster(voices);
  assert.equal(r.join(person("1", "Owen"), "a").voice.voiceId, "voice-1");
  assert.equal(r.participants.length, 1);
  r.join(person("2", "Maya"), "b");
  r.join(person("3", "Leo"), "c");
  assert.deepEqual(
    r.participants.map((p) => p.voice.voiceId),
    ["voice-1", "voice-2", "voice-3"],
  );
});
test("duplicate tool requests and repeated people do not duplicate participants", () => {
  const r = new Roster(voices);
  const p = person("1", "Owen");
  const result = r.join(p, "same");
  assert.equal(r.join(p, "same"), result);
  assert.equal(r.join(p, "again"), result);
  assert.equal(r.participants.length, 1);
  assert.throws(() => r.join(person("2", "Maya"), "same"), /conflicts/);
});
test("saved voice is never silently substituted", () => {
  const r = new Roster(voices);
  assert.throws(
    () => r.join(person("1", "Saved", "not-prepared"), "a"),
    /wasn.t prepared/,
  );
  assert.equal(r.participants.length, 0);
  r.join(person("1", "Owen", "voice-1"), "b");
  assert.throws(
    () => r.join(person("2", "Other", "voice-1"), "c"),
    /already belongs/,
  );
});
test("ten voices include the default and leaving never recycles a binding", () => {
  const r = new Roster(voices);
  for (let i = 0; i < 10; i++)
    r.join(person(String(i), `Person ${i}`), `call-${i}`);
  assert.throws(() => r.join(person("11", "Eleven"), "last"), /assigned/);
  r.leave("0");
  assert.throws(() => r.join(person("11", "Eleven"), "last"), /assigned/);
  assert.equal(
    r.join(person("0", "Person 0"), "return").voice.voiceId,
    "voice-1",
  );
});
test("unknown characters cannot steal a reserved saved-person voice", () => {
  const saved = person("maya", "Maya", "voice-2");
  const r = new Roster(voices, [saved]);
  const unknown = r.join(person("john", "John"), "john", "female");
  assert.notEqual(unknown.voice.voiceId, "voice-2");
  assert.equal(r.join(saved, "maya").voice.voiceId, "voice-2");
});
test("invalid labels and duplicate prepared voices are rejected", () => {
  assert.throws(() => new Roster([]));
  assert.throws(
    () => new Roster([...voices, { ...voices[0], label: "Other" }]),
  );
  assert.throws(() => new Roster([{ ...voices[0], label: "x><bad" }]));
});
test("exact name and aliases win; ambiguous first names require a choice", () => {
  const a = person("a", "John Carter");
  a.aliases = ["JC"];
  const b = person("b", "John Smith");
  assert.deepEqual(resolveName(" JC ", [a, b]), { kind: "match", person: a });
  assert.deepEqual(resolveName("john carter", [a, b]), {
    kind: "match",
    person: a,
  });
  assert.equal(resolveName("John", [a, b]).kind, "ambiguous");
  assert.equal(resolveName("Nobody", [a, b]).kind, "none");
});
test("ended sessions reject stale callbacks", () => {
  const f = new SessionFence();
  const a = f.begin();
  assert.equal(f.accepts(a), true);
  f.end();
  assert.equal(f.accepts(a), false);
  const b = f.begin();
  assert.equal(f.accepts(a), false);
  assert.equal(f.accepts(b), true);
});
test("a first-name alias cannot hide another person with the same first name", () => {
  const a = person("owen", "Owen Brooks");
  a.aliases = ["Owen"];
  assert.equal(
    resolveName("Owen", [a, person("other", "Owen Smith")]).kind,
    "ambiguous",
  );
});
test("provider configuration counts the default once and requires authentication", () => {
  const cfg = agentConfiguration(voices, ["tool-a", "tool-b"]);
  assert.equal(cfg.conversation_config.tts.voice_id, "voice-1");
  assert.equal(cfg.conversation_config.agent.language, "en");
  assert.equal(cfg.conversation_config.tts.model_id, "eleven_flash_v2");
  assert.equal(cfg.conversation_config.tts.supported_voices.length, 9);
  assert.equal(cfg.platform_settings.auth.enable_auth, true);
  assert.deepEqual(cfg.conversation_config.agent.prompt.tool_ids, [
    "tool-a",
    "tool-b",
  ]);
  assert.equal(
    clientTools.every((t) => t.expects_response),
    true,
  );
});
test("join arguments validate identity and preserve explicit pronouns", () => {
  assert.throws(() => parseJoin({ name: "" }));
  assert.throws(() => parseJoin({ name: "x".repeat(101) }));
  assert.throws(() =>
    parseJoin({ name: "John", personality: "x".repeat(2001) }),
  );
  assert.equal(
    parseJoin({ name: "John Carter", pronouns: "he/him" }).pronouns,
    "he/him",
  );
});
