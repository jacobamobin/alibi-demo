export type Voice = {
  label: string;
  voiceId: string;
  name: string;
  gender: string;
};
export type Person = {
  id: string;
  name: string;
  voiceId?: string;
  preferredVoiceId?: string;
  personality: string;
  pronouns: string;
  color: string;
  aliases: string[];
  portrait?: number;
  photoDataUrl?: string;
  photoOrigin?: "uploaded" | "generated";
  profile?: ContactProfile;
};
export type ContactProfile = {
  source: "contact" | "fictional";
  bio: string;
  ageRange: string;
  pronouns: string;
  heritage: string;
  voiceStyle: string;
  accent: string;
  voiceTraits: string;
  voiceReason?: string;
  aiDrafted?: boolean;
};
export type Participant = Person & { voice: Voice };

export class Roster {
  readonly voices: Voice[];
  private bindings = new Map<string, Participant>();
  private active = new Set<string>();
  private calls = new Map<string, string>();
  private reserved = new Map<string, string>();
  constructor(voices: Voice[], people: Person[] = []) {
    if (!voices.length || voices.length > 10)
      throw new Error(
        "Prepare between 1 and 10 voices, including the default.",
      );
    if (
      new Set(voices.map((v) => v.voiceId)).size !== voices.length ||
      new Set(voices.map((v) => v.label)).size !== voices.length ||
      voices.some((v) => !v.voiceId || !/^[A-Za-z][A-Za-z0-9_]*$/.test(v.label))
    )
      throw new Error("Every voice needs a unique ID and safe label.");
    this.voices = voices;
    for (const p of people)
      if (p.voiceId) {
        if (this.reserved.has(p.voiceId))
          throw new Error("Saved people must use distinct voices.");
        this.reserved.set(p.voiceId, p.id);
      }
  }
  get participants() {
    return [...this.active].map((id) => this.bindings.get(id)!);
  }
  join(person: Person, callID: string, gender = ""): Participant {
    const prior = this.calls.get(callID);
    if (prior && prior !== person.id)
      throw new Error("This tool request conflicts with an earlier join.");
    const existing = this.bindings.get(person.id);
    if (existing) {
      this.active.add(person.id);
      this.calls.set(callID, person.id);
      return existing;
    }
    const used = new Set(
      [...this.bindings.values()].map((p) => p.voice.voiceId),
    );
    let voice: Voice | undefined;
    if (person.voiceId) {
      voice = this.voices.find((v) => v.voiceId === person.voiceId);
      if (!voice)
        throw new Error("This saved voice wasn't prepared for this call.");
      if (
        used.has(voice.voiceId) ||
        (this.reserved.has(voice.voiceId) &&
          this.reserved.get(voice.voiceId) !== person.id)
      )
        throw new Error("This voice already belongs to another person.");
    } else {
      const available = this.voices.filter(
        (v) => !used.has(v.voiceId) && !this.reserved.has(v.voiceId),
      );
      voice =
        available.find((v) => v.voiceId === person.preferredVoiceId) ||
        available.find((v) => gender && v.gender === gender) ||
        available[0];
    }
    if (!voice)
      throw new Error(
        "All 10 voice slots are assigned. Start a new call for a fresh cast.",
      );
    const p = { ...person, voice };
    this.bindings.set(person.id, p);
    this.active.add(person.id);
    this.calls.set(callID, person.id);
    return p;
  }
  leave(id: string) {
    this.active.delete(id);
  }
  updatePortrait(id: string, photoDataUrl: string) {
    const person = this.bindings.get(id);
    if (person) this.bindings.set(id, { ...person, photoDataUrl, photoOrigin: "generated" });
  }
}
const normalized = (s: string) =>
  s.trim().toLocaleLowerCase().replace(/\s+/g, " ");
export function resolveName(
  query: string,
  people: Person[],
):
  | { kind: "match"; person: Person }
  | { kind: "ambiguous"; people: Person[] }
  | { kind: "none" } {
  const q = normalized(query);
  if (!q) return { kind: "none" };
  const exact = people.filter((p) => normalized(p.name) === q);
  const aliases = people.filter((p) =>
    p.aliases.some(
      (a) =>
        normalized(a) === q &&
        normalized(a) !== normalized(p.name).split(" ")[0],
    ),
  );
  const matches = exact.length
    ? exact
    : aliases.length
      ? aliases
      : people.filter(
          (p) =>
            normalized(p.name).split(" ")[0] === q ||
            p.aliases.some((a) => normalized(a) === q),
        );
  return matches.length === 1
    ? { kind: "match", person: matches[0] }
    : matches.length
      ? { kind: "ambiguous", people: matches }
      : { kind: "none" };
}
export class SessionFence {
  private epoch = 0;
  private active = false;
  begin() {
    this.active = true;
    return ++this.epoch;
  }
  end() {
    this.active = false;
    ++this.epoch;
  }
  accepts(token: number) {
    return this.active && this.epoch === token;
  }
}
