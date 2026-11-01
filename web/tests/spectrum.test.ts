import test from "node:test";
import assert from "node:assert/strict";
import { spectrumBands, attributedPersonId } from "../lib/spectrum.ts";
import { starterPeople, starterVoices } from "../lib/fixtures.ts";
test("spectrum comes from real frequency energy and returns silence for empty or muted output", () => {
  assert.deepEqual(spectrumBands(new Uint8Array(1024)), Array(9).fill(0));
  const voice = new Uint8Array(1024); voice.fill(180, 0, 250);
  const loud = spectrumBands(voice);
  assert.ok(loud[0] > 0.5);
  assert.equal(loud.at(-1), 0);
  assert.deepEqual(spectrumBands(voice, false), Array(9).fill(0));
  assert.deepEqual(spectrumBands(undefined), Array(9).fill(0));
});
test("mixed speakers stay unattributed and duplicate first names resolve by voice ID", () => {
  const people = [{ ...starterPeople[0], voice: starterVoices[0] }, { ...starterPeople[1], id: "other-owen", name: "Owen Reed", voice: starterVoices[1] }];
  assert.equal(attributedPersonId("<Maya>Hi Jacob.</Maya>", people), "other-owen");
  assert.equal(attributedPersonId("Hey Jacob. <Maya>Hi!</Maya>", people), "");
  assert.equal(attributedPersonId("Hey Jacob.", people), "owen");
});
