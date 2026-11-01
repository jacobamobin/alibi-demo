"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, FileUp, LoaderCircle, Sparkles, UserPlus, Volume2 } from "lucide-react";
import type { Person } from "../lib/roster";
import { parseVCard, validateContact, voiceOptions } from "../lib/contacts";
import { generateContactProfile, type ContactDraft } from "../lib/contact-ai";
import { prepareContactPhoto, photoBlob } from "../lib/contact-photo";
import { elevenRequest } from "../lib/agent";
import { Avatar } from "./avatar";

type Props = {
  person?: Person;
  openAIKey: string;
  onKey: (key: string) => void;
  elevenKey: string;
  save: (p: Person) => Promise<Person>;
  onSaved: (p: Person) => void;
};
function initialDraft(p?: Person): ContactDraft {
  return {
    name: p?.name || "", source: p?.profile?.source || (p ? "fictional" : "contact"), bio: p?.profile?.bio || "",
    personality: p?.personality || "", pronouns: p?.pronouns || "", heritage: p?.profile?.heritage || "",
    ageRange: p?.profile?.ageRange || "", voiceStyle: p?.profile?.voiceStyle || "", accent: p?.profile?.accent || "",
    voiceTraits: p?.profile?.voiceTraits || "", preferredVoiceId: p?.preferredVoiceId || voiceOptions[3].voiceId,
    photoDataUrl: p?.photoDataUrl, voiceReason: p?.profile?.voiceReason, aiDrafted: p?.profile?.aiDrafted,
    photoOrigin: p?.photoOrigin,
  };
}
export function ContactEditor({ person, openAIKey, onKey, elevenKey, save, onSaved }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(person));
  const [step, setStep] = useState<"person" | "review">(person ? "review" : "person");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewVoice, setPreviewVoice] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const cardInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => () => { ++epoch.current; controller.current?.abort(); audio.current?.pause(); }, []);
  function field<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }
  async function photo(file?: File) {
    if (!file) return;
    const token = ++epoch.current;
    setBusy("photo"); setError("");
    try {
      const data = await prepareContactPhoto(file);
      if (token === epoch.current) setDraft(d => ({ ...d, photoDataUrl: data, photoOrigin: "uploaded" }));
    } catch (e) { if (token === epoch.current) setError(e instanceof Error ? e.message : "Couldn’t open photo."); }
    finally { if (token === epoch.current) setBusy(""); }
  }
  async function importCard(file?: File) {
    if (!file) return;
    const token = ++epoch.current;
    setBusy("import"); setError(""); setNotice("");
    try {
      if (file.size > 2000000) throw new Error("Choose a vCard smaller than 2 MB containing one contact.");
      const imported = parseVCard(await file.text());
      const thumbnail = imported.photoDataUrl ? await prepareContactPhoto(photoBlob(imported.photoDataUrl)) : undefined;
      if (token !== epoch.current) return;
      setDraft({ ...initialDraft(), name: imported.name, bio: imported.bio, source: "contact", photoDataUrl: thumbnail, photoOrigin: thumbnail ? "uploaded" : undefined });
      setNotice("Name and any embedded photo imported. Phone numbers and email addresses are left out.");
    } catch (e) { if (token === epoch.current) setError(e instanceof Error ? e.message : "Couldn’t import that contact."); }
    finally { if (token === epoch.current) setBusy(""); }
  }
  async function generate() {
    if (draft.source === "contact" && !draft.name.trim()) { setError("Enter your contact’s name first."); return; }
    const token = ++epoch.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy("ai"); setError(""); setNotice("");
    try {
      const result = await generateContactProfile(openAIKey, draft, abort.signal);
      if (token !== epoch.current) return;
      setDraft(result); setStep("review");
    } catch (e) { if (token === epoch.current && !abort.signal.aborted) setError(e instanceof Error ? e.message : "Couldn’t draft this profile."); }
    finally { if (token === epoch.current) setBusy(""); }
  }
  async function preview() {
    if (!elevenKey.trim()) { setError("Enter your ElevenLabs key in Settings to load a voice sample."); return; }
    const token = ++epoch.current;
    setBusy("preview"); setError("");
    try {
      const result = await elevenRequest<{ preview_url?: string }>(`/v1/voices/${encodeURIComponent(draft.preferredVoiceId)}`, elevenKey.trim());
      if (token !== epoch.current) return;
      if (!result.preview_url || !/^https:\/\//.test(result.preview_url)) throw new Error("This voice has no sample available. Choose another voice or hear it in a call.");
      setPreviewUrl(result.preview_url); setPreviewVoice(draft.preferredVoiceId);
    } catch (e) { if (token === epoch.current) setError(e instanceof Error ? e.message : "Couldn’t load voice sample."); }
    finally { if (token === epoch.current) setBusy(""); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== "review") return;
    const token = ++epoch.current;
    setBusy("save"); setError("");
    try {
      const { name, personality, pronouns, preferredVoiceId, photoDataUrl, photoOrigin, ...profile } = draft;
      const saved = await save(validateContact({
        id: person?.id || `contact-${crypto.randomUUID()}`, name, personality: personality || profile.bio || "A friendly, relaxed contact persona. Keep replies natural and brief.",
        pronouns, preferredVoiceId, photoDataUrl, photoOrigin, profile: { ...profile, pronouns }, aliases: person?.aliases || [], color: person?.color || "#557a64",
      }));
      if (token === epoch.current) onSaved(saved);
    } catch (e) { if (token === epoch.current) setError(e instanceof Error ? e.message : "Couldn’t save this contact."); }
    finally { if (token === epoch.current) setBusy(""); }
  }
  const face: Person = { id: "draft", name: draft.name || "New contact", personality: draft.personality, pronouns: draft.pronouns, color: "#557a64", aliases: [], photoDataUrl: draft.photoDataUrl };
  return (
    <form className="contact-editor" onSubmit={submit}>
      <nav className="contact-steps" aria-label="Contact steps">
        <span className={step === "person" ? "current" : "done"}>1 <b>The person</b></span><i />
        <span className={step === "review" ? "current" : ""}>2 <b>Review & voice</b></span>
      </nav>
      {step === "person" ? <>
        <fieldset disabled={!!busy}>
          <div className="contact-source" aria-label="Profile type">
            <button type="button" aria-pressed={draft.source === "contact"} onClick={() => field("source", "contact")}>My contact</button>
            <button type="button" aria-pressed={draft.source === "fictional"} onClick={() => field("source", "fictional")}>Fictional person</button>
          </div>
          <div className="contact-photo-picker">
            <button type="button" onClick={() => photoInput.current?.click()} aria-label="Choose contact photo"><Avatar person={face} /><span><Camera size={15} /></span></button>
            <div><strong>{draft.photoDataUrl ? "Photo added" : "Add a face"}</strong><p>Choose a photo from your library.</p><button type="button" className="text-button" onClick={() => photoInput.current?.click()}>{draft.photoDataUrl ? "Change photo" : "Choose photo"}</button>{draft.photoDataUrl && <button type="button" className="text-button" onClick={() => field("photoDataUrl", undefined)}>Remove</button>}</div>
          </div>
          <input ref={photoInput} type="file" accept="image/*" className="file-input" aria-label="Contact photo file" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="contact-import" onClick={() => cardInput.current?.click()}><FileUp size={17} /><span>Import a phone contact <small>Choose a .vcf file</small></span></button>
          <input ref={cardInput} type="file" accept=".vcf,text/vcard,text/x-vcard" className="file-input" aria-label="Import vCard file" onChange={e => { void importCard(e.target.files?.[0]); e.target.value = ""; }} />
          <details className="contact-import-help"><summary>Importing from iPhone</summary><p>In Contacts, open a person → Share Contact → Save to Files. Then choose that .vcf here. You can also enter the name and choose a photo yourself.</p></details>
          <label className="field-label" htmlFor="contact-name">Name</label>
          <input id="contact-name" value={draft.name} maxLength={100} onChange={e => field("name", e.target.value)} placeholder={draft.source === "fictional" ? "Name, or let AI invent one" : "e.g. Casey Harper"} />
          <label className="field-label" htmlFor="contact-bio">A little about them</label>
          <textarea id="contact-bio" rows={3} value={draft.bio} maxLength={1000} onChange={e => field("bio", e.target.value)} placeholder="How you know them, their interests, how they talk…" />
          <div className="contact-field-row">
            <div><label className="field-label" htmlFor="contact-style">Voice style</label><select id="contact-style" value={draft.voiceStyle} onChange={e => field("voiceStyle", e.target.value)}><option value="">Suggest a sound</option><option value="masculine">Masculine</option><option value="feminine">Feminine</option><option value="neutral">Neutral</option></select></div>
            <div><label className="field-label" htmlFor="contact-accent">Accent</label><input id="contact-accent" maxLength={60} value={draft.accent} onChange={e => field("accent", e.target.value)} placeholder="Optional" /></div>
          </div>
          {<div className="contact-ai-key"><label className="field-label" htmlFor="contact-ai-key">OpenAI key <span className="muted">for AI drafting</span></label><input id="contact-ai-key" type="password" autoComplete="off" spellCheck={false} value={openAIKey} onChange={e => onKey(e.target.value)} placeholder="Kept only in this tab" /></div>}
          <p className="field-help">Draft with AI sends this photo and bio directly to OpenAI. It estimates an age range and suggests a persona and voice. You choose identity details.</p>
          <button type="button" className="primary full-width" onClick={() => void generate()}><Sparkles size={17} /> Draft with AI</button>
          <button type="button" className="text-button contact-manual" onClick={() => { setError(""); setStep("review"); }}>Continue manually</button>
        </fieldset>
      </> : <>
        <button type="button" className="text-button contact-back" disabled={!!busy} onClick={() => { audio.current?.pause(); setStep("person"); setError(""); }}><ArrowLeft size={15} /> Photo & details</button>
        <div className="contact-review-hero"><Avatar person={face} /><div><strong>{draft.name || "New contact"}</strong><span>{draft.aiDrafted ? "AI draft · ready for your review" : "Make this person your own"}</span></div></div>
        {draft.aiDrafted && <p className="contact-draft-note"><Sparkles size={15} /> Age is approximate. Personality and voice are creative suggestions.{draft.source === "fictional" ? " Unspecified pronouns may be invented." : ""}</p>}
        <fieldset disabled={!!busy}>
          <label className="field-label" htmlFor="review-name">Name</label><input id="review-name" value={draft.name} maxLength={100} required onChange={e => field("name", e.target.value)} />
          <div className="contact-field-row"><div><label className="field-label" htmlFor="contact-age">Age range</label><input id="contact-age" value={draft.ageRange} maxLength={40} placeholder="e.g. 25–34" onChange={e => field("ageRange", e.target.value)} /></div><div><label className="field-label" htmlFor="contact-pronouns">Pronouns</label><input id="contact-pronouns" value={draft.pronouns} maxLength={40} placeholder="Optional" onChange={e => field("pronouns", e.target.value)} /></div></div>
          <details className="contact-identity"><summary>Background & identity <span>Optional</span></summary><label className="field-label" htmlFor="contact-heritage">Heritage / background</label><input id="contact-heritage" maxLength={100} value={draft.heritage} onChange={e => field("heritage", e.target.value)} placeholder="Details you provide" /><p className="field-help">Race, heritage and gender identity are never predicted from the photo. This field doesn’t determine the voice.</p></details>
          <label className="field-label" htmlFor="contact-personality">Personality for the call</label><textarea id="contact-personality" rows={3} value={draft.personality} maxLength={2000} onChange={e => field("personality", e.target.value)} placeholder={draft.bio || "Warm, funny, always has a story…"} />
          <div className="contact-voice-card">
            <label className="field-label" htmlFor="contact-voice">{draft.aiDrafted ? "Suggested ElevenLabs voice" : "ElevenLabs voice"}</label>
            <select id="contact-voice" value={draft.preferredVoiceId} onChange={e => { audio.current?.pause(); field("preferredVoiceId", e.target.value); field("voiceReason", ""); }}>{voiceOptions.map(v => <option key={v.voiceId} value={v.voiceId}>{v.name} · {v.description}</option>)}</select>
            {draft.voiceReason && <p>{draft.voiceReason}</p>}
            <label className="field-label" htmlFor="voice-notes">Voice direction</label><input id="voice-notes" value={draft.voiceTraits} maxLength={300} onChange={e => field("voiceTraits", e.target.value)} placeholder="e.g. relaxed, quick wit, short sentences" />
            <button type="button" className="secondary full-width" onClick={() => void preview()}><Volume2 size={17} /> Load voice sample</button>
            {previewUrl && previewVoice === draft.preferredVoiceId && <audio ref={audio} controls preload="none" src={previewUrl} aria-label="ElevenLabs voice sample" />}
            <p className="field-help">A simulated voice, not a clone. If its slot is taken in a group call, Alibi uses another distinct prepared voice. Up to 10 per call.</p>
          </div>
          <button type="submit" className="primary full-width contact-save"><UserPlus size={18} /> {person ? "Save changes" : "Save contact"}</button>
        </fieldset>
        <p className="field-help contact-local"><Check size={13} /> Profile and photo stay in this browser. No phone numbers are saved.</p>
      </>}
      {busy && <p className="contact-progress" role="status"><LoaderCircle size={16} />{busy === "ai" ? "Drafting profile and matching a voice…" : busy === "save" ? "Saving on this device…" : busy === "preview" ? "Loading voice sample…" : "Preparing contact…"}</p>}
      {notice && <p className="contact-notice" role="status">{notice}</p>}
      {error && <p className="contact-form-error" role="alert">{error}</p>}
    </form>
  );
}
