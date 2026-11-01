"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Headphones,
  Info,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Plus,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Person } from "../lib/roster";
import { starterVoices } from "../lib/fixtures";
import { useAlibi } from "../lib/use-alibi";
import { useSceneMicrophone } from "../lib/use-scene-microphone";
import { Avatar } from "../components/avatar";
import { HomeScreen } from "../components/home-screen";
import { CallScreen } from "../components/call-screen";
import { ContactEditor } from "../components/contact-editor";
import { CallMessage } from "../components/call-message";
import { portraitLabel } from "../lib/contacts";

function Sheet({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="sheet"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-label={title}
    >
      <div className="sheet-inner">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
function SceneEditor({
  draft,
  scene,
  onDraft,
  save,
}: {
  draft: string;
  scene: string;
  onDraft: (v: string) => void;
  save: () => void;
}) {
  const id = useId();
  return (
    <>
      <label className="field-label" htmlFor={id}>
        The shared scene
      </label>
      <textarea
        id={id}
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        maxLength={4000}
        rows={4}
      />
      <button
        className="text-button save-scene"
        disabled={draft === scene}
        onClick={save}
      >
        {draft === scene ? (
          <>
            <Check size={14} /> Scene up to date
          </>
        ) : (
          <>
            Update scene <ArrowUpRight size={14} />
          </>
        )}
      </button>
    </>
  );
}
export default function Alibi() {
  const app = useAlibi();
  const capture = useSceneMicrophone(app.updateScene);
  const [micWanted, setMicWanted] = useState(false);
  const [sheet, setSheet] = useState<
    "" | "add" | "settings" | "context" | "new" | "more"
  >("");
  const [profile, setProfile] = useState<Person | null>(null);
  useEffect(() => { setProfile(p => p ? app.people.find(x => x.id === p.id) || null : null); }, [app.people]);
  const [editingContact, setEditingContact] = useState<Person | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [profileError, setProfileError] = useState("");
  useEffect(() => { setDeleting(false); setProfileError(""); }, [profile]);
  const [sceneDraft, setSceneDraft] = useState(app.scene);
  useEffect(() => setSceneDraft(app.scene), [app.scene]);
  async function microphone() {
    if (capture.status === "listening" || capture.status === "connecting") {
      capture.stop();
      setMicWanted(false);
      return;
    }
    if (!app.apiKey.trim()) {
      setSheet("settings");
      return;
    }
    setMicWanted(true);
    if (app.muted) app.toggleMute();
    await capture.start(app.apiKey, app.scene);
  }
  function demoMute() {
    const next = !app.muted;
    app.toggleMute();
    if (next) capture.stop();
    else if (micWanted && !app.active)
      void capture.start(app.apiKey, app.scene);
  }
  async function live(person?: Person) {
    capture.stop();
    setSheet("");
    setProfile(null);
    const began = await app.startLive(person);
    if (!began) setSheet("settings");
  }
  function createContact() {
    setEditingContact(undefined);
    setSheet("new");
  }
  const sceneEditor = (
    <SceneEditor
      draft={sceneDraft}
      scene={app.scene}
      onDraft={setSceneDraft}
      save={() => capture.replace(sceneDraft)}
    />
  );
  const transcript = (
    <div className="transcript" aria-live="polite">
      {app.transcript.length ? (
        app.transcript.map((t) => (
          <div className="transcript-line" key={t.id}>
            <b>{t.who}</b>
            <p>{t.text}</p>
          </div>
        ))
      ) : (
        <div className="empty-transcript">
          <Headphones size={23} />
          <p>Your conversation appears here.</p>
          <span>
            {app.mode === "preview"
              ? "Preview is silent. Start a live call for audio."
              : "Start a live call to hear your cast."}
          </span>
        </div>
      )}
    </div>
  );
  const context = (
    <>
      <div className="section-kicker">SHARED SCENE</div>
      <p className="context-scene">
        {app.scene || "Turn on the microphone to set the scene, or type it in."}
      </p>
      <div className="scene-listening-status">
        {app.muted
          ? "Demo muted · context paused"
          : capture.status === "listening"
            ? "Listening · scene updates automatically"
            : app.mode === "live"
              ? "Scene follows the conversation"
              : "Microphone off"}
      </div>
      {app.heard && <p className="heard-context">Heard: {app.heard}</p>}
      {app.facts.map((f) => (
        <p className="fact" key={f}>
          {f}
        </p>
      ))}
      <div className="section-heading">
        <h3>Transcript</h3>
        <span>{app.mode === "live" ? "Live" : "No live audio"}</span>
      </div>
      {transcript}
      <CallMessage enabled={app.mode === "live"} send={app.sendLine} />
      <div className="section-heading activity-heading">
        <h3>Session activity</h3>
      </div>
      <div className="activity">
        {app.activity.length ? (
          app.activity.map((a, i) => (
            <div key={i}>
              <span className="activity-dot" />
              <span>{a}</span>
            </div>
          ))
        ) : (
          <p className="muted">Your cast is ready when you are.</p>
        )}
      </div>
    </>
  );
  return (
    <main className="workspace">
      <aside className="side-panel people-panel">
        <header className="brand">
          <div className="brand-icon">
            <Phone size={22} />
          </div>
          <span>Alibi</span>
          <span className="beta">PREVIEW</span>
        </header>
        <p className="panel-intro">A familiar call. An unfamiliar cast.</p>
        <div className="section-heading">
          <h2>People</h2>
          <span>{app.people.length} contacts</span>
        </div>
        <div className="people-list">
          {app.people.map((p) => (
            <button
              className="person-row"
              key={p.id}
              onClick={() => setProfile(p)}
            >
              <Avatar person={p} />
              <span className="person-info">
                <strong>{p.name}</strong>
                <span>
                  {app.participants.find((x) => x.id === p.id)?.voice.name ||
                    starterVoices.find(
                      (v) => v.voiceId === (p.voiceId || p.preferredVoiceId),
                    )?.name ||
                    "Voice assigned on join"}{" "}
                  <span className="tiny-dot">·</span>{" "}
                  {p.photoDataUrl ? "Contact photo" : p.portrait !== undefined ? "Generated portrait" : "Monogram"}
                </span>
              </span>
              {app.participants.some((x) => x.id === p.id) ? (
                <span className="in-call-dot" title="In call" />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ))}
        </div>
        <button
          className="new-person"
          disabled={app.mode === "connecting"}
          onClick={createContact}
        >
          <Plus size={18} /> Add contact
        </button>
        <div className="scene-section">
          <div className="section-heading">
            <h2>Scene</h2>
            <span className="subtle-tag">Shared context</span>
          </div>
          {sceneEditor}
        </div>
        <div className="panel-bottom">
          <ShieldCheck size={16} />
          <p>Entirely fictional. Yours to imagine.</p>
        </div>
      </aside>
      <section className="center-panel" aria-label="Alibi call">
        <div className={`phone ${app.active ? "call-active" : "call-idle"}`}>
          {app.active ? (
            <CallScreen
              app={app}
              onAdd={() => setSheet("add")}
              onMore={() => setSheet("more")}
            />
          ) : (
            <HomeScreen
              app={app}
              capture={capture}
              onMic={() => void microphone()}
              onDemoMute={demoMute}
              onCall={() => void live()}
              onSettings={() => setSheet("settings")}
              onProfile={setProfile}
              onPeople={() => setSheet("add")}
              onNewContact={createContact}
              onContext={() => setSheet("context")}
            />
          )}
          {app.error && (
            <div className="error-toast" role="alert">
              <p>{app.error}</p>
              <button
                aria-label="Dismiss error"
                onClick={() => app.setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="desktop-caption">
          <Video size={13} /> Alibi <span>·</span> A fictional call, in good
          company.
        </div>
      </section>
      <aside className="side-panel context-panel">
        <header className="context-header">
          <h2>Context</h2>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setSheet("settings")}
          >
            <Settings size={20} />
          </button>
        </header>
        <p className="panel-intro">Everyone’s in on the same story.</p>
        {context}
        <div className="context-bottom">
          <span className="connection-dot" />
          {app.mode === "live"
            ? "Connected to ElevenLabs"
            : app.mode === "connecting"
              ? "Connecting to ElevenLabs"
              : "No live connection"}
          <span>{app.participants.length} / 10 voices</span>
        </div>
      </aside>
      {sheet === "settings" && (
        <Sheet title="Settings" close={() => setSheet("")}>
          <div className="settings-intro">
            <div className="settings-symbol">
              <Video size={26} />
            </div>
            <div>
              <h3>Your cast. Your connection.</h3>
              <p>Alibi connects directly to ElevenLabs from this browser.</p>
            </div>
          </div>
          <label className="field-label" htmlFor="key">
            ElevenLabs API key
          </label>
          <input
            id="key"
            type="password"
            value={app.apiKey}
            onChange={(e) => app.setApiKey(e.target.value)}
            placeholder="Enter your API key"
            autoComplete="off"
            spellCheck={false}
            disabled={app.active || app.preparing}
          />
          <p className="field-help">
            Kept in memory for this tab. Enter it again after a refresh. Your
            key needs access to voices, agents, tools, and conversation tokens.
          </p>
          <label className="field-label" htmlFor="openai-key">OpenAI API key <span className="muted">optional</span></label>
          <input id="openai-key" type="password" value={app.openAIKey} onChange={e => app.setOpenAIKey(e.target.value)} placeholder="For photo age estimates and contact drafts" autoComplete="off" spellCheck={false} />
          <p className="field-help">Draft with AI sends the selected photo and bio directly to OpenAI. New invented people can also get synthetic portraits in the background using your image credits. Keys stay in this tab.</p>
          <div className="voice-summary">
            <span>Prepared voices</span>
            <strong>10 distinct voices</strong>
          </div>
          <div className="settings-voices">
            {starterVoices.map((v, i) => (
              <span key={v.voiceId}>
                <i
                  style={{
                    background: ["#78919c", "#6e9978", "#9496c0"][i % 3],
                  }}
                />
                {v.name}
              </span>
            ))}
          </div>
          <button
            className="primary full-width"
            onClick={() => void app.prepare()}
            disabled={app.preparing || app.active || !app.apiKey.trim()}
          >
            {app.preparing
              ? "Preparing…"
              : app.agentID
                ? "Update Alibi agent"
                : "Prepare Alibi agent"}
          </button>
          {app.setupMessage && (
            <p className="setup-message" role="status">
              {app.setupMessage}
            </p>
          )}
          {app.agentID && (
            <div className="agent-ready">
              <Check size={16} />
              <span>Private Alibi agent saved on this browser</span>
            </div>
          )}
          <div className="settings-note">
            <ShieldCheck size={18} />
            <p>
              Live calls use your ElevenLabs credits. Voice recording is
              disabled for this agent. Text history follows its 7-day retention
              setting.
            </p>
          </div>
          <a
            className="external-link"
            href="https://elevenlabs.io/app/settings/api-keys"
            target="_blank"
            rel="noreferrer"
          >
            Open ElevenLabs API keys <ArrowUpRight size={14} />
          </a>
          <p className="settings-footnote">
            OpenAI is optional for contact drafting. Live calls use ElevenLabs.
            API keys stay in memory and are never saved with contacts.
          </p>
        </Sheet>
      )}
      {sheet === "add" && (
        <Sheet
          title={app.active ? "Add to the call" : "Your people"}
          close={() => setSheet("")}
        >
          <p className="sheet-description">
            {app.active
              ? "A new face. A voice of their own."
              : "Your fictional cast, ready for a scene."}
          </p>
          <div className="sheet-people">
            {app.people.map((p) => {
              const joined = app.participants.some((x) => x.id === p.id);
              const calling = app.ringing.some((x) => x.id === p.id);
              return (
                <div className="sheet-person" key={p.id}>
                  <button
                    className="person-profile-button"
                    onClick={() => {
                      setSheet("");
                      setProfile(p);
                    }}
                  >
                    <Avatar person={p} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.pronouns || "Fictional character"}</small>
                    </span>
                  </button>
                  {app.active ? (
                    <button
                      className={`join-button ${joined ? "joined" : ""}`}
                      disabled={joined || calling || app.mode === "connecting"}
                      aria-label={`Add ${p.name}`}
                      onClick={() => app.addPerson(p)}
                    >
                      {joined ? (
                        <Check size={17} />
                      ) : calling ? (
                        <Phone size={15} />
                      ) : (
                        <Plus size={19} />
                      )}
                    </button>
                  ) : (
                    <ChevronRight size={17} />
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="secondary full-width"
            disabled={app.mode === "connecting"}
            onClick={createContact}
          >
            <Plus size={17} /> Add contact
          </button>
          <p className="field-help">
            {app.active
              ? `${app.participants.length} people on the call · up to 10 voices per session`
              : "Add a photo and a profile, or import one contact from a vCard."}
          </p>
        </Sheet>
      )}
      {sheet === "new" && (
        <Sheet title={editingContact ? "Edit contact" : "Add contact"} close={() => setSheet("add")}>
          <ContactEditor key={editingContact?.id || "new"} person={editingContact} openAIKey={app.openAIKey} onKey={app.setOpenAIKey} elevenKey={app.apiKey} save={app.savePerson} onSaved={p => { setSheet(""); setProfile(p); }} />
        </Sheet>
      )}
      {sheet === "context" && (
        <Sheet title="Shared context" close={() => setSheet("")}>
          {sceneEditor}
          <div className="context-sheet-details">{context}</div>
        </Sheet>
      )}
      {sheet === "more" && (
        <Sheet title="This call" close={() => setSheet("")}>
          <div className="call-summary">
            <span className="subtle-tag">
              {app.mode === "preview" ? "Silent preview" : "Live audio"}
            </span>
            <h3>{app.participants.length} fictional people</h3>
            <p>
              Generated portraits and monograms. New fictional portraits appear when ready. Each person has a distinct
              voice in a live call.
            </p>
          </div>
          <button className="menu-row" onClick={() => setSheet("context")}>
            <Info size={20} /> Scene & transcript
            <ChevronRight size={17} />
          </button>
          <button className="menu-row" onClick={() => setSheet("add")}>
            <Users size={20} /> Manage people
            <ChevronRight size={17} />
          </button>
          {app.participants.map((p) => (
            <div className="manage-row" key={p.id}>
              <span>{p.name}</span>
              <button onClick={() => app.removePerson(p.id)}>Remove</button>
            </div>
          ))}
          <div className="ringing-list">
            {app.ringing.map((p) => (
              <div className="manage-row" key={p.id}>
                <span>Calling {p.name}…</span>
                <button onClick={() => app.removePerson(p.id)}>Cancel</button>
              </div>
            ))}
          </div>
          <button className="menu-row" onClick={() => setSheet("settings")}>
            <Settings size={20} /> Connection settings
            <ChevronRight size={17} />
          </button>
          {app.mode === "preview" && (
            <button
              className="primary full-width form-submit"
              onClick={async () => {
                await app.end();
                setSheet("settings");
              }}
            >
              Set up live audio <ArrowUpRight size={16} />
            </button>
          )}
        </Sheet>
      )}
      {profile && (
        <Sheet title="Contact profile" close={() => setProfile(null)}>
          <div className="profile-hero">
            <Avatar person={profile} />
            <span className="subtle-tag">
              {portraitLabel(profile)}
            </span>
            <h2>{profile.name}</h2>
            <p>{profile.pronouns || "Fictional character"}</p>
          </div>
          {profile.profile && <>
            <div className="profile-facts"><span>{profile.profile.ageRange || "Age unspecified"}</span><span>{profile.profile.source === "fictional" ? "Fictional person" : "Contact persona"}</span>{profile.profile.aiDrafted && <span>AI draft · reviewed</span>}</div>
            {profile.profile.bio && <div className="profile-detail"><span>About</span><p>{profile.profile.bio}</p></div>}
            {profile.profile.heritage && <div className="profile-detail"><span>Background · provided by you</span><p>{profile.profile.heritage}</p></div>}
          </>}
          <div className="profile-detail">
            <span>Personality</span>
            <p>{profile.personality}</p>
          </div>
          <div className="profile-detail voice-detail">
            <span>ElevenLabs voice</span>
            <strong>
              {app.participants.find((p) => p.id === profile.id)?.voice.name ||
                starterVoices.find(
                  (v) =>
                    v.voiceId === (profile.voiceId || profile.preferredVoiceId),
                )?.name ||
                "Assigned when they join"}
            </strong>
          </div>
          {profile.profile?.voiceTraits && <div className="profile-detail"><span>Voice direction</span><p>{profile.profile.voiceTraits}</p></div>}
          {app.canCreatePortrait(profile) && <div className="profile-portrait-action"><button className="secondary full-width" disabled={app.portraitState[profile.id] === "pending"} onClick={() => app.requestPortrait(profile)}>{app.portraitState[profile.id] === "pending" ? "Creating synthetic portrait…" : "Generate synthetic portrait"}</button><p className="field-help">Creates an invented face with OpenAI. The monogram and voice work while it loads.</p></div>}
          {app.portraitErrors[profile.id] && <p className="contact-form-error" role="alert">{app.portraitErrors[profile.id]}</p>}
          {profile.portrait === undefined && !app.active && <div className="profile-edit-actions">
            <button className="secondary full-width" onClick={() => { setEditingContact(profile); setProfile(null); setSheet("new"); }}>Edit contact</button>
            {deleting ? <div className="contact-delete-confirm"><p>Remove this contact from this browser?</p><button className="text-button" onClick={() => setDeleting(false)}>Keep contact</button><button className="text-button danger" onClick={async () => { try { await app.deletePerson(profile.id); setProfile(null); } catch (e) { setProfileError(e instanceof Error ? e.message : "Couldn’t remove contact."); } }}>Remove</button></div> : <button className="text-button danger" onClick={() => setDeleting(true)}>Remove contact</button>}
          </div>}
          {profileError && <p className="contact-form-error" role="alert">{profileError}</p>}
          {!app.active && (
            <button
              className="primary full-width"
              onClick={() => void live(profile)}
            >
              <Phone size={18} />
              Call {profile.name.split(" ")[0]}
            </button>
          )}
          {app.active && (
            <button
              className="primary full-width"
              disabled={
                app.participants.some((p) => p.id === profile.id) ||
                app.mode === "connecting"
              }
              onClick={() => {
                app.addPerson(profile);
                setProfile(null);
              }}
            >
              <UserPlus size={18} />{" "}
              {app.participants.some((p) => p.id === profile.id)
                ? "Already in the call"
                : "Add to call"}
            </button>
          )}
        </Sheet>
      )}
    </main>
  );
}
