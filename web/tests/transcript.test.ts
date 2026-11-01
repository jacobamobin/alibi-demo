import test from "node:test";
import assert from "node:assert/strict";
import { speakerLabel } from "../lib/transcript.ts";
test("mixed tagged and default speech is attributed to the cast", () => {
  assert.equal(speakerLabel("<Maya>Hi.</Maya> Hello from Owen."), "cast");
  assert.equal(speakerLabel("Hey. <Maya>Hello!</Maya>"), "cast");
  assert.equal(speakerLabel("<Maya>Hello.</Maya><Leo>Hi!</Leo>"), "cast");
  assert.equal(speakerLabel("<Maya>Hello.</Maya>"), "Maya");
  assert.equal(speakerLabel("Hello."), "default");
});
