import test from "node:test";
import assert from "node:assert/strict";
import { Roster, type Person } from "../lib/roster.ts";
import { Invitations } from "../lib/invitations.ts";
const p: Person = {
  id: "maya",
  name: "Maya Chen",
  personality: "Playful",
  pronouns: "she/her",
  color: "#557a64",
  aliases: [],
};
const roster = () =>
  new Roster([
    { label: "default", voiceId: "one", name: "One", gender: "male" },
    { label: "Maya", voiceId: "two", name: "Two", gender: "female" },
  ]);
test("an invitation rings first and joins with the reserved voice after the wait", async () => {
  let finish!: () => void;
  const r = roster();
  let ringing = 0;
  const invites = new Invitations(
    r,
    {
      changed: (people) => {
        ringing = people.length;
      },
    },
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const first = invites.invite(p, "call-a", "female");
  assert.equal(ringing, 1);
  assert.equal(r.participants.length, 0);
  assert.equal(invites.invite(p, "call-b", "female"), first);
  finish();
  const joined = await first;
  assert.equal(joined.voice.voiceId, "two");
  assert.equal(r.participants.length, 1);
  assert.equal(ringing, 0);
});
test("ending a call cancels pending rings and cannot add people to a later call", async () => {
  const r = roster();
  let ringing = 0;
  const invites = new Invitations(
    r,
    {
      changed: (people) => {
        ringing = people.length;
      },
    },
    (signal) =>
      new Promise<void>((_, reject) =>
        signal.addEventListener(
          "abort",
          () => reject(new Error("Call ended.")),
          { once: true },
        ),
      ),
  );
  const pending = invites.invite(p, "call");
  invites.cancel();
  await assert.rejects(pending, /ended/);
  assert.equal(r.participants.length, 0);
  assert.equal(ringing, 0);
  await assert.rejects(invites.invite(p, "late"), /ended/);
});
test("removing a ringing person prevents a late join and permits a deliberate new invite", async () => {
  const r = roster();
  const waiting: (() => void)[] = [];
  const invites = new Invitations(
    r,
    { changed: () => {} },
    () => new Promise<void>((resolve) => waiting.push(resolve)),
  );
  const old = invites.invite(p, "first");
  invites.cancelPerson(p.id);
  const fresh = invites.invite(p, "second");
  waiting[0]();
  await assert.rejects(old, /cancelled/);
  assert.equal(r.participants.length, 0);
  waiting[1]();
  await fresh;
  assert.equal(r.participants.length, 1);
});
