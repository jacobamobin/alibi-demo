import type { Person, ContactProfile } from "./roster.ts";
import { resolveName } from "./roster.ts";
import { starterVoices } from "./fixtures.ts";

// Original three voices are reserved; new contacts prefer the seven spare slots.
const descriptions = [
  "Confident, grounded, masculine · American",
  "Warm, expressive, feminine · American",
  "Relaxed, conversational, masculine · Australian",
  "Calm, versatile, neutral · American",
  "Clear, measured, feminine · British",
  "Playful, expressive, feminine · American",
  "Friendly, laid-back, masculine · American",
];
export const voiceOptions = starterVoices.slice(3).map((v, i) => ({ ...v, description: descriptions[i] }));
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export function validPhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= 350000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function validateContact(input: unknown): Person {
  if (!input || typeof input !== "object") throw new Error("Invalid contact.");
  const p = input as Record<string, unknown>;
  const name = clean(p.name, 100);
  if (!name || !/^(?:contact-|fiction-)[\p{L}\p{N}_-]{1,150}$/u.test(String(p.id))) throw new Error("A contact needs a name.");
  if (p.photoDataUrl !== undefined && !validPhoto(p.photoDataUrl)) throw new Error("Invalid contact photo. Choose another image.");
  if (p.preferredVoiceId !== undefined && !voiceOptions.some(v => v.voiceId === p.preferredVoiceId)) throw new Error("Choose a prepared voice.");
  const raw = p.profile && typeof p.profile === "object" ? p.profile as Record<string, unknown> : null;
  const profile: ContactProfile | undefined = raw ? {
    source: raw.source === "contact" ? "contact" : "fictional",
    bio: clean(raw.bio, 1000), ageRange: clean(raw.ageRange, 40),
    pronouns: clean(p.pronouns, 40), heritage: clean(raw.heritage, 100),
    voiceStyle: clean(raw.voiceStyle, 30), accent: clean(raw.accent, 60),
    voiceTraits: clean(raw.voiceTraits, 300), voiceReason: clean(raw.voiceReason, 300),
    aiDrafted: raw.aiDrafted === true,
  } : undefined;
  return {
    id: String(p.id), name, personality: clean(p.personality, 2000), pronouns: clean(p.pronouns, 40),
    color: typeof p.color === "string" && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#557a64",
    aliases: Array.isArray(p.aliases) ? p.aliases.filter((a): a is string => typeof a === "string" && a.length <= 100).slice(0, 5) : [],
    ...(p.preferredVoiceId ? { preferredVoiceId: String(p.preferredVoiceId) } : {}),
    ...(p.photoDataUrl ? { photoDataUrl: String(p.photoDataUrl), photoOrigin: p.photoOrigin === "generated" ? "generated" as const : "uploaded" as const } : {}),
    ...(profile ? { profile } : {}),
  };
}
export function callPerson(p: Person) {
  const { photoDataUrl: _photo, photoOrigin: _origin, portrait: _portrait, color: _color, ...details } = p;
  return details;
}
export function portraitLabel(p: Person) {
  if (p.photoDataUrl) return p.photoOrigin === "generated" ? "GENERATED PORTRAIT" : "CONTACT PHOTO";
  return p.portrait !== undefined ? "GENERATED PORTRAIT" : "CONTACT PERSONA";
}
export function mergeContacts(current: Person[], saved: Person[]): Person[] {
  return [...new Map([...current, ...saved].map(p => [p.id, p])).values()];
}
export function resolveCallName(query: string, people: Person[]) {
  const result = resolveName(query, people);
  return result.kind === "match" ? { kind: "match" as const, person: callPerson(result.person) } : result.kind === "ambiguous" ? { kind: "ambiguous" as const, people: result.people.map(callPerson) } : result;
}
const unescapeCard = (s: string) => s.replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");
export function parseVCard(text: string): { name: string; bio: string; photoDataUrl?: string } {
  if (text.length > 2000000) throw new Error("This vCard is too large. Import one contact at a time.");
  if ((text.match(/^BEGIN:VCARD\s*$/gim) || []).length !== 1) throw new Error("Choose a vCard (.vcf) containing one contact.");
  if (!/^END:VCARD\s*$/im.test(text)) throw new Error("This vCard is incomplete.");
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  let name = "", fallback = "", bio = "", photoDataUrl: string | undefined;
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const header = line.slice(0, colon), value = line.slice(colon + 1);
    const key = header.split(";")[0].split(".").at(-1)?.toUpperCase();
    if ((key === "FN" || key === "N") && /ENCODING=QUOTED-PRINTABLE/i.test(header)) throw new Error("This contact uses an older text encoding. Export it as a modern vCard or enter the name manually.");
    if (key === "FN") name = unescapeCard(value);
    if (key === "N") { const [last, first, middle] = value.split(";").map(unescapeCard); fallback = [first, middle, last].filter(Boolean).join(" "); }
    if (key === "NOTE") bio = unescapeCard(value).slice(0, 1000);
    if (key === "PHOTO") {
      const encoded = /ENCODING=(?:b|base64)(?:;|$)/i.test(header);
      const format = /(?:TYPE=|MEDIATYPE=image\/)(png|jpe?g|webp)/i.exec(header)?.[1]?.toLowerCase();
      const candidate = encoded && format ? `data:image/${format === "jpg" ? "jpeg" : format};base64,${value.replace(/\s/g, "")}` : value;
      if (validPhoto(candidate)) photoDataUrl = candidate;
    }
  }
  name = (name || fallback).trim().slice(0, 100);
  if (!name) throw new Error("This vCard has no name. Enter the contact manually.");
  return { name, bio, ...(photoDataUrl ? { photoDataUrl } : {}) };
}
