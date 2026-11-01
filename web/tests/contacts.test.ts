import test from "node:test";
import assert from "node:assert/strict";
import { parseVCard, validateContact, callPerson, voiceOptions, mergeContacts, resolveCallName, portraitLabel } from "../lib/contacts.ts";
import { buildProfileRequest, parseProfileResponse, generateContactProfile } from "../lib/contact-ai.ts";
import { starterPeople, starterVoices } from "../lib/fixtures.ts";
import { agentPrompt } from "../lib/agent.ts";

const draft = { name: "Casey Harper", source: "contact" as const, bio: "A relaxed friend who loves hiking.", pronouns: "they/them", heritage: "Canadian", ageRange: "25–34", voiceStyle: "neutral", accent: "American", personality: "Warm and funny", voiceTraits: "Relaxed, conversational", preferredVoiceId: starterVoices[6].voiceId };
test("uploaded photos are not labeled generated based on persona type or old ID", () => {
  const p = { ...starterPeople[0], id: "fiction-casey", portrait: undefined, photoDataUrl: "data:image/jpeg;base64,YQ==", profile: { ...draft, source: "fictional" as const } };
  assert.equal(portraitLabel(p), "CONTACT PHOTO");
  assert.equal(portraitLabel({ ...p, profile: { ...draft } }), "CONTACT PHOTO");
  assert.equal(portraitLabel({ ...p, photoOrigin: "generated" }), "GENERATED PORTRAIT");
});
test("vCard imports a folded embedded photo and name without phone or email", () => {
  const card = parseVCard("BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Casey\\, Harper\r\nPHOTO;ENCODING=b;TYPE=JPEG:aGVs\r\n bG8=\r\nTEL:555-1234\r\nEMAIL:private@example.com\r\nNOTE:Hiking\\nFriend\r\nEND:VCARD");
  assert.equal(card.name, "Casey, Harper");
  assert.equal(card.photoDataUrl, "data:image/jpeg;base64,aGVsbG8=");
  assert.equal(card.bio, "Hiking\nFriend");
  assert.doesNotMatch(JSON.stringify(card), /555-1234|private@example/);
});
test("vCard preserves international names and rejects multiple or unsupported cards", () => {
  assert.equal(parseVCard("BEGIN:VCARD\nN:李;明;;;\nEND:VCARD").name, "明 李");
  assert.throws(() => parseVCard("BEGIN:VCARD\nFN:A\nEND:VCARD\nBEGIN:VCARD\nFN:B\nEND:VCARD"), /one contact/i);
  assert.throws(() => parseVCard("not a contact"), /vCard/i);
  assert.throws(() => parseVCard("BEGIN:VCARD\nFN;ENCODING=QUOTED-PRINTABLE:Someone\nEND:VCARD"), /encoding/i);
});
test("custom profile validation preserves editable details and drops unknown fields", () => {
  const person = validateContact({ id: "contact-casey", name: draft.name, personality: draft.personality, pronouns: draft.pronouns, aliases: [], color: "#557a64", preferredVoiceId: draft.preferredVoiceId, photoDataUrl: "data:image/jpeg;base64,aGVsbG8=", profile: draft, apiKey: "secret" });
  assert.equal(person.profile?.heritage, "Canadian");
  assert.equal(person.photoDataUrl, "data:image/jpeg;base64,aGVsbG8=");
  assert.doesNotMatch(JSON.stringify(person), /apiKey|secret/);
  assert.throws(() => validateContact({ ...person, photoDataUrl: "https://tracker.invalid/photo" }), /photo/i);
  assert.throws(() => validateContact({ ...person, preferredVoiceId: "arbitrary-voice" }), /voice/i);
});
test("photos never enter call prompts or lookup payloads but reviewed profile details do", () => {
  const p = { ...starterPeople[0], photoDataUrl: "data:image/jpeg;base64,PRIVATEPHOTO", profile: { ...draft } };
  assert.doesNotMatch(JSON.stringify(callPerson(p)), /PRIVATEPHOTO|photoDataUrl/);
  const prompt = agentPrompt(starterVoices, [p], [], "Café on Friday");
  assert.doesNotMatch(prompt, /PRIVATEPHOTO|photoDataUrl/);
  assert.match(prompt, /relaxed friend who loves hiking/);
});
test("suggested voice choices use prepared spare slots, preserving the original cast", () => {
  assert.equal(voiceOptions.length, 7);
  assert.ok(voiceOptions.every(v => !starterPeople.slice(0,3).some(p => p.voiceId === v.voiceId)));
});
test("simultaneous saved profiles merge once, keeping lookup unambiguous", async () => {
  const p = { ...starterPeople[0], id: "contact-duplicate", name: "Casey Harper" };
  let people = [starterPeople[1]];
  let release!: () => void;
  const saved = new Promise<void>(resolve => { release = resolve; });
  const finish = async () => { await saved; people = mergeContacts(people, [p]); };
  const a = finish(), b = finish(); release(); await Promise.all([a,b]);
  assert.equal(people.length, 2);
  assert.equal(resolveCallName("Casey", people).kind, "match");
});
test("ambiguous contact lookup never sends either portrait to call tools", () => {
  const a = { ...starterPeople[0], id: "contact-a", name: "Casey Harper", aliases: [], photoDataUrl: "data:image/jpeg;base64,PRIVATE_A" };
  const b = { ...a, id: "contact-b", name: "Casey Reed", photoDataUrl: "data:image/jpeg;base64,PRIVATE_B" };
  const result = resolveCallName("Casey", [a,b]);
  assert.equal(result.kind, "ambiguous");
  assert.doesNotMatch(JSON.stringify(result), /photoDataUrl|data:image|PRIVATE_/);
});
test("AI request uses vision and structured output, preserves explicit identity and excludes unrelated contacts", () => {
  const body = buildProfileRequest({ ...draft, photoDataUrl: "data:image/jpeg;base64,aGVsbG8=" });
  assert.equal(body.store, false);
  assert.match(JSON.stringify(body.input), /input_image/);
  assert.match(body.instructions, /Never infer race/);
  assert.match(body.instructions, /voice.*photo/i);
  assert.doesNotMatch(JSON.stringify(body), /Owen Brooks|Maya Chen/);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
});
const output = { name: "Casey Harper", personality: "Warm and funny.", ageRange: "25–34", pronouns: "she/her", voiceStyle: "neutral", accent: "American", voiceTraits: "Conversational and relaxed", preferredVoiceId: starterVoices[6].voiceId, voiceReason: "River has a relaxed delivery." };
function response(value: unknown) { return { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }; }
test("AI result cannot overwrite user identity details or inject a voice outside the prepared pool", () => {
  const result = parseProfileResponse(response(output), draft);
  assert.equal(result.pronouns, "they/them");
  assert.equal(result.heritage, "Canadian");
  assert.equal(result.ageRange, draft.ageRange);
  assert.throws(() => parseProfileResponse(response({ ...output, preferredVoiceId: "unprepared" }), draft), /voice/i);
  assert.throws(() => parseProfileResponse({ status: "incomplete", output: [] }, draft), /complete/i);
  assert.throws(() => parseProfileResponse({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }, draft), /draft/i);
});
test("AI provider errors never expose the supplied key or raw provider input", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "bad key sk-secret-private, input contains private photo" } }), { status: 401 });
  try { await assert.rejects(generateContactProfile("sk-secret-private", draft), error => error instanceof Error && /401/.test(error.message) && !/sk-secret|private photo/.test(error.message)); }
  finally { globalThis.fetch = old; }
});
