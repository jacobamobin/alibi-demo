import test from "node:test";
import assert from "node:assert/strict";
import { buildPortraitRequest, generatePortrait, PortraitJobs } from "../lib/portraits.ts";
import { starterPeople, starterVoices, inventedPerson } from "../lib/fixtures.ts";
import { Roster } from "../lib/roster.ts";
import { agentPrompt, clientTools } from "../lib/agent.ts";
test("portrait prompt describes only an invented character and excludes private photo/context", () => {
  const p = { ...inventedPerson("Jordan Vale", "A dryly funny fictional DJ"), photoDataUrl: "PRIVATEIMAGE" };
  const request = buildPortraitRequest(p);
  assert.equal(request.model, "gpt-image-2");
  assert.equal(request.n, 1);
  assert.match(request.prompt, /entirely invented adult/i);
  assert.match(request.prompt, /fictional DJ/);
  assert.doesNotMatch(JSON.stringify(request), /PRIVATEIMAGE|Scene|Owen Brooks/);
});
test("portrait failures redact provider input and a remote URL is never accepted as the output", async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "sk-private PRIVATE INPUT" } }), { status: 403 });
    await assert.rejects(generatePortrait("sk-private", inventedPerson("DJ Jordan")), e => e instanceof Error && /403/.test(e.message) && !/sk-private|PRIVATE/.test(e.message));
    globalThis.fetch = async () => Response.json({ data: [{ url: "https://unexpected.invalid/private" }] });
    await assert.rejects(generatePortrait("sk-private", inventedPerson("DJ Jordan")), /portrait/i);
  } finally { globalThis.fetch = old; }
});
test("background portraits deduplicate, run two at a time, and apply the queued third result", async () => {
  const pending = new Map<string, (v: string) => void>();
  const applied: string[] = [];
  const jobs = new PortraitJobs((p) => new Promise(resolve => pending.set(p.id, resolve)), async p => { applied.push(p.name); });
  const a = inventedPerson("First Person"), b = inventedPerson("Second Person"), c = inventedPerson("Third Person");
  const first = jobs.run(a), duplicate = jobs.run(a), second = jobs.run(b), third = jobs.run(c);
  assert.equal(first, duplicate);
  assert.equal(pending.size, 2);
  pending.get(a.id)!("data:image/jpeg;base64,YQ=="); await first;
  assert.ok(pending.has(c.id));
  pending.get(b.id)!("data:image/jpeg;base64,Yg=="); pending.get(c.id)!("data:image/jpeg;base64,Yw==");
  await Promise.all([second, third]); assert.equal(applied.length, 3);
});
test("ending a call cancels queued portraits and rejects late generation results", async () => {
  const pending: ((v:string)=>void)[] = [];
  let applied = 0;
  const jobs = new PortraitJobs(() => new Promise(resolve => pending.push(resolve)), async () => { applied++; });
  const requests = [1,2,3].map(i => jobs.run(inventedPerson(`Person ${i}`)));
  jobs.cancelAll();
  pending.forEach(resolve => resolve("data:image/jpeg;base64,YQ=="));
  await Promise.all(requests);
  await Promise.resolve();
  assert.equal(applied, 0);
  assert.equal(pending.length, 2);
});
test("portrait upgrades do not change the call’s assigned voice or duplicate the person", () => {
  const roster = new Roster(starterVoices, starterPeople);
  const p = inventedPerson("Jordan Vale");
  const first = roster.join(p, "join-1");
  roster.updatePortrait(p.id, "data:image/jpeg;base64,YQ==");
  const again = roster.join(p, "join-2");
  assert.equal(again.voice, first.voice);
  assert.equal(again.photoDataUrl, "data:image/jpeg;base64,YQ==");
  assert.equal(roster.participants.length, 1);
});
test("director explicitly supports unnamed roles without demanding a name or inviting self-references", () => {
  const prompt = agentPrompt(starterVoices);
  assert.match(prompt, /unnamed role/);
  assert.match(prompt, /Do not ask.*name/);
  assert.match(prompt, /I.?m a DJ/);
  assert.match(clientTools.find(t => t.name === "join_character")!.description, /unnamed role/);
});
