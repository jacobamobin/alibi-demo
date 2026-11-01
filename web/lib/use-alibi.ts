"use client";
import { useEffect, useRef, useState } from "react";
import type { VoiceConversation } from "@elevenlabs/react";
import {
  Roster,
  SessionFence,
  resolveName,
  type Person,
  type Participant,
} from "./roster";
import {
  starterPeople,
  starterVoices,
  defaultScene,
  inventedPerson,
} from "./fixtures";
import {
  agentConfiguration,
  agentPrompt,
  clientTools,
  elevenRequest,
  parseJoin,
  pickupInstruction,
} from "./agent";
import { MediaScope } from "./media";
import { speakerLabel } from "./transcript";
import { Invitations } from "./invitations";
import { mergeScene, SceneUpdatePermission } from "./scene";
import { callPerson, validateContact, mergeContacts, resolveCallName } from "./contacts";
import { readContacts, storeContact, eraseContact } from "./contact-store";
import { PortraitJobs, generatePortrait, type PortraitState } from "./portraits";
import { photoBlob, prepareContactPhoto } from "./contact-photo";
export type Transcript = { id: string; who: string; text: string };
export function useAlibi() {
  const [people, setPeople] = useState<Person[]>(starterPeople);
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ringing, setRinging] = useState<Participant[]>([]);
  const [mode, setMode] = useState<"idle" | "preview" | "connecting" | "live">(
    "idle",
  );
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [scene, setScene] = useState(defaultScene);
  const sceneRef = useRef(scene);
  const scenePermission = useRef(new SceneUpdatePermission());
  sceneRef.current = scene;
  const [heard, setHeard] = useState("");
  const [facts, setFacts] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [openAIKey, setOpenAIKey] = useState("");
  const openAIKeyRef = useRef(openAIKey);
  openAIKeyRef.current = openAIKey;
  const [portraitState, setPortraitState] = useState<Record<string, PortraitState>>({});
  const [portraitErrors, setPortraitErrors] = useState<Record<string, string>>({});
  const portraitJobs = useRef<PortraitJobs | null>(null);
  const [agentID, setAgentID] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [sound, setSound] = useState(true);
  const [talking, setTalking] = useState(false);
  const [speaker, setSpeaker] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const fence = useRef(new SessionFence());
  const roster = useRef<Roster | null>(null);
  const invitations = useRef<Invitations | null>(null);
  const session = useRef<VoiceConversation | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const mediaScope = useRef<MediaScope | null>(null);
  const toolIDs = useRef<string[]>([]);
  const startTime = useRef(0);
  const busy = useRef(false);
  const active = mode !== "idle";
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("alibi-agent") || "null");
      if (Array.isArray(saved?.tools)) {
        if (typeof saved.id === "string") setAgentID(saved.id);
        toolIDs.current = saved.tools;
      }
    } catch {
      /* Non-secret preferences are optional. */
    }
    try {
      const saved = JSON.parse(localStorage.getItem("alibi-people") || "[]");
      if (Array.isArray(saved)) {
        const generated: Person[] = saved
          .slice(0, 100)
          .filter(
            (p) =>
              typeof p?.name === "string" &&
              p.name.trim() &&
              p.name.length <= 100 &&
              typeof p?.personality === "string" &&
              p.personality.length <= 2000 &&
              typeof p?.pronouns === "string" &&
              p.pronouns.length <= 40,
          )
          .map((p) => inventedPerson(p.name, p.personality, p.pronouns));
        peopleRef.current = [...starterPeople, ...generated];
        setPeople(peopleRef.current);
      }
    } catch {}
    let mounted = true;
    void readContacts().then((saved) => {
      if (!mounted) return;
      peopleRef.current = mergeContacts(peopleRef.current, saved);
      setPeople(peopleRef.current);
    }).catch(() => { /* Save reports actionable storage errors. Legacy contacts remain available. */ });
    const onHide = () => {
      void end();
    };
    const stop = () => {
      fence.current.end();
      invitations.current?.cancel();
      portraitJobs.current?.cancelAll();
      mediaScope.current?.cancel();
      mic.current?.getTracks().forEach((t) => t.stop());
      const old = session.current;
      session.current = null;
      void old?.endSession().catch(() => {});
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      mounted = false;
      window.removeEventListener("pagehide", onHide);
      stop();
    };
  }, []);
  useEffect(() => {
    if (mode !== "live" && mode !== "preview") return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [mode]);
  function note(message: string) {
    setActivity((a) => [...a.slice(-29), message]);
  }
  function canCreatePortrait(p: Person) {
    return !p.photoDataUrl && p.portrait === undefined && (p.profile?.source === "fictional" || (!p.profile && p.id.startsWith("fiction-")));
  }
  function requestPortrait(p: Person) {
    if (!canCreatePortrait(p)) return;
    if (!openAIKeyRef.current.trim()) { setPortraitErrors(e => ({ ...e, [p.id]: "Add an OpenAI key in Settings to create a portrait." })); return; }
    if (!portraitJobs.current) portraitJobs.current = new PortraitJobs(
      async (person, signal) => {
        const image = await generatePortrait(openAIKeyRef.current, person, signal);
        if (signal.aborted) throw new DOMException("Portrait cancelled", "AbortError");
        return prepareContactPhoto(photoBlob(image));
      },
      async (person, photoDataUrl, signal) => {
        const current = peopleRef.current.find(x => x.id === person.id);
        if (!current || current.photoDataUrl || signal.aborted) return;
        const next = { ...current, photoDataUrl, photoOrigin: "generated" as const };
        await storeContact(next);
        if (signal.aborted || !peopleRef.current.some(x => x.id === person.id)) return;
        peopleRef.current = mergeContacts(peopleRef.current, [next]);
        setPeople(peopleRef.current);
        roster.current?.updatePortrait(person.id, photoDataUrl);
        if (modeRef.current !== "idle") setParticipants(roster.current?.participants || []);
        setRinging(people => people.map(x => x.id === person.id ? { ...x, photoDataUrl } : x));
        note(`${person.name.split(" ")[0]}’s synthetic portrait is ready`);
      },
      (id, state, error) => {
        setPortraitState(p => ({ ...p, [id]: state }));
        setPortraitErrors(p => ({ ...p, [id]: error || "" }));
      },
    );
    void portraitJobs.current.run(p);
  }
  async function remember(p: Person) {
    if (peopleRef.current.some((x) => x.id === p.id)) return;
    await storeContact(p);
    peopleRef.current = mergeContacts(peopleRef.current, [p]);
    setPeople(peopleRef.current);
  }
  async function savePerson(input: Person) {
    const p = validateContact(input);
    portraitJobs.current?.cancel(p.id);
    if (peopleRef.current.length >= 110 && !peopleRef.current.some(x => x.id === p.id)) throw new Error("You have 100 custom contacts. Delete one before adding another.");
    await storeContact(p);
    peopleRef.current = mergeContacts(peopleRef.current, [p]);
    setPeople(peopleRef.current);
    session.current?.sendContextualUpdate(`Reviewed contact profile: ${JSON.stringify(callPerson(p))}. Only use this person after they join, with the voice label returned by join_character.`);
    return p;
  }
  async function deletePerson(id: string) {
    if (active) throw new Error("End the call before deleting a contact.");
    portraitJobs.current?.cancel(id);
    await eraseContact(id);
    peopleRef.current = peopleRef.current.filter(x => x.id !== id);
    setPeople(peopleRef.current);
    // Prevent an old monogram-only profile from reappearing on refresh.
    try {
      const legacy = JSON.parse(localStorage.getItem("alibi-people") || "[]");
      if (Array.isArray(legacy)) localStorage.setItem("alibi-people", JSON.stringify(legacy.filter(p => typeof p?.name !== "string" || inventedPerson(p.name).id !== id)));
    } catch {}
  }
  function releaseMic() {
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
  }
  function addToRoster(p: Person, id = crypto.randomUUID()) {
    if (!roster.current) throw new Error("Start a call first.");
    const wasJoined = roster.current.participants.some((x) => x.id === p.id);
    const gender = p.pronouns.startsWith("she")
      ? "female"
      : p.pronouns.startsWith("he")
        ? "male"
        : "";
    const joined = roster.current.join(p, id, gender);
    setParticipants(roster.current.participants);
    if (!wasJoined) note(`${p.name.split(" ")[0]} joined`);
    return joined;
  }
  async function addPerson(p: Person) {
    const epoch = currentEpoch.current;
    try {
      if (mode === "connecting")
        throw new Error("Wait for the call to connect before adding someone.");
      setError("");
      await remember(p);
      if (active && !fence.current.accepts(epoch)) return;
      if (active) {
        const gender = p.pronouns.startsWith("she")
          ? "female"
          : p.pronouns.startsWith("he")
            ? "male"
            : "";
        const joined = await invitations.current!.invite(
          p,
          crypto.randomUUID(),
          gender,
        );
        if (!fence.current.accepts(epoch)) return;
        if (openAIKeyRef.current.trim()) requestPortrait(p);
        session.current?.sendContextualUpdate(
          `Joined character after a simulated ring: ${JSON.stringify({ id: joined.id, name: joined.name, personality: joined.personality, pronouns: joined.pronouns, voice_label: joined.voice.label })}. ${pickupInstruction} Default label is untagged. All other labels require exact XML tags.`,
        );
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!active || fence.current.accepts(epoch))
        setError(
          e instanceof Error ? e.message : "Unable to join this person.",
        );
    }
  }
  function removePerson(id: string) {
    invitations.current?.cancelPerson(id);
    roster.current?.leave(id);
    setParticipants(roster.current?.participants || []);
    note(
      `${peopleRef.current.find((p) => p.id === id)?.name.split(" ")[0] || "Person"} left`,
    );
    session.current?.sendContextualUpdate(
      `Character ${id} has left or their invitation was cancelled. Do not speak as them unless they rejoin.`,
    );
  }
  function updateScene(value: string) {
    sceneRef.current = value;
    setScene(value);
    session.current?.sendContextualUpdate(`Updated shared scene: ${value}`);
  }
  async function prepare() {
    if (busy.current || active) return;
    if (!apiKey.trim()) {
      setSetupMessage("Enter your ElevenLabs API key first.");
      return;
    }
    busy.current = true;
    setPreparing(true);
    setSetupMessage("Checking voices…");
    setError("");
    let stage = "Checking voices";
    try {
      const catalog = await elevenRequest<{ voices: { voice_id: string }[] }>(
        "/v1/voices",
        apiKey.trim(),
      );
      const available = new Set(catalog.voices.map((v) => v.voice_id));
      const missing = starterVoices.filter((v) => !available.has(v.voiceId));
      if (missing.length)
        throw new Error(
          `Your account is missing these prepared voices: ${missing.map((v) => v.name).join(", ")}. Add them in ElevenLabs, then try again.`,
        );
      for (let i = 0; i < clientTools.length; i++) {
        stage = `Preparing ${clientTools[i].name}`;
        setSetupMessage(
          `Preparing call tools (${i + 1}/${clientTools.length})…`,
        );
        const id = toolIDs.current[i];
        const result = await elevenRequest<{ id: string }>(
          id
            ? `/v1/convai/tools/${encodeURIComponent(id)}`
            : "/v1/convai/tools",
          apiKey.trim(),
          { tool_config: clientTools[i] },
          id ? "PATCH" : "POST",
        );
        toolIDs.current[i] = result.id;
        try {
          localStorage.setItem(
            "alibi-agent",
            JSON.stringify({ id: agentID, tools: toolIDs.current }),
          );
        } catch {}
      }
      stage = "Preparing your private agent";
      setSetupMessage("Preparing your private agent…");
      const result = await elevenRequest<{ agent_id: string }>(
        agentID
          ? `/v1/convai/agents/${encodeURIComponent(agentID)}`
          : "/v1/convai/agents/create",
        apiKey.trim(),
        agentConfiguration(starterVoices, toolIDs.current),
        agentID ? "PATCH" : "POST",
      );
      setAgentID(result.agent_id);
      try {
        localStorage.setItem(
          "alibi-agent",
          JSON.stringify({ id: result.agent_id, tools: toolIDs.current }),
        );
      } catch {}
      setSetupMessage(
        "Ready. 10 distinct voices are prepared. Start a live call.",
      );
    } catch (e) {
      setSetupMessage(
        `${stage}: ${e instanceof Error ? e.message : "Setup failed. Check your ElevenLabs account."}`,
      );
    } finally {
      busy.current = false;
      setPreparing(false);
    }
  }
  const currentEpoch = useRef(0);
  function initialize(epoch: number, initialPerson: Person = starterPeople[0]) {
    scenePermission.current.reset();
    setError("");
    setTranscript([]);
    setActivity([]);
    setFacts([]);
    setSpeaker("");
    setTalking(false);
    setSound(true);
    setElapsed(0);
    setRinging([]);
    roster.current = new Roster(starterVoices, peopleRef.current);
    addToRoster(initialPerson);
    currentEpoch.current = epoch;
    invitations.current = new Invitations(roster.current, {
      changed: (people) => {
        if (fence.current.accepts(epoch)) setRinging(people);
      },
      calling: (p) => {
        if (fence.current.accepts(epoch))
          note(`Calling ${p.name.split(" ")[0]}…`);
      },
      joined: (p) => {
        if (fence.current.accepts(epoch)) {
          setParticipants(roster.current!.participants);
          note(`${p.name.split(" ")[0]} joined`);
        }
      },
    });
  }
  function preview() {
    if (busy.current || active) return;
    const epoch = fence.current.begin();
    initialize(epoch);
    startTime.current = Date.now();
    setMode("preview");
    note("Preview started · no live audio");
  }
  async function startLive(initialPerson: Person = starterPeople[0]) {
    if (busy.current || active) return false;
    if (!apiKey.trim() || !agentID) {
      setError("Add your key and prepare an agent in Settings first.");
      return false;
    }
    busy.current = true;
    const epoch = fence.current.begin();
    initialize(epoch, initialPerson);
    setMode("connecting");
    let startupScope: MediaScope | null = null;
    try {
      // Request from the explicit tap, before awaiting network/SDK work (Safari).
      mic.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.current.getTracks().forEach((t) => {
        t.enabled = !mutedRef.current;
      });
      if (!fence.current.accepts(epoch)) {
        releaseMic();
        return true;
      }
      const [{ VoiceConversation }, token] = await Promise.all([
        import("@elevenlabs/react"),
        elevenRequest<{ token: string }>(
          `/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentID)}`,
          apiKey.trim(),
        ),
      ]);
      if (!fence.current.accepts(epoch)) {
        releaseMic();
        return true;
      }
      startupScope = new MediaScope(navigator.mediaDevices, mutedRef.current);
      startupScope.install();
      mediaScope.current = startupScope;
      const safeTool =
        (fn: (args: Record<string, unknown>) => unknown) =>
        async (args: Record<string, unknown>) => {
          if (!fence.current.accepts(epoch))
            return JSON.stringify({ error: "This call has ended." });
          try {
            return JSON.stringify(await fn(args));
          } catch (e) {
            return JSON.stringify({
              error: e instanceof Error ? e.message : "Tool failed.",
            });
          }
        };
      const connection = await VoiceConversation.startSession({
        conversationToken: token.token,
        connectionType: "webrtc",
        useWakeLock: true,
        onConversationCreated: (connection) => {
          if (connection.type === "voice")
            connection.setMicMuted(mutedRef.current);
        },
        overrides: {
          agent: {
            prompt: {
              prompt: agentPrompt(
                starterVoices,
                peopleRef.current,
                roster.current!.participants,
                sceneRef.current,
              ),
            },
            firstMessage:
              roster.current!.participants[0].voice.label === "default"
                ? `Hey, it's ${initialPerson.name.split(" ")[0]}. What's up?`
                : `<${roster.current!.participants[0].voice.label}>Hey, it's ${initialPerson.name.split(" ")[0]}. What's up?</${roster.current!.participants[0].voice.label}>`,
          },
        },
        clientTools: {
          lookup_character: safeTool((args) => {
            return resolveCallName(
              typeof args.name === "string" ? args.name : "",
              peopleRef.current,
            );
          }),
          join_character: safeTool(async (args) => {
            const input = parseJoin(args);
            const result = resolveName(input.name, peopleRef.current);
            if (result.kind === "ambiguous" && !input.character_id)
              return {
                error: "Ambiguous name. Ask which person.",
                matches: result.people.map(callPerson),
              };
            const saved = input.character_id
              ? peopleRef.current.find((p) => p.id === input.character_id)
              : undefined;
            if (input.character_id && !saved)
              return { error: "Unknown saved character ID." };
            const p =
              saved ||
              (result.kind === "match"
                ? result.person
                : inventedPerson(
                    input.name,
                    input.personality,
                    input.pronouns,
                  ));
            await remember(p);
            if (!fence.current.accepts(epoch)) throw new DOMException("This call has ended.", "AbortError");
            const gender = p.pronouns.startsWith("she")
              ? "female"
              : p.pronouns.startsWith("he")
                ? "male"
                : "";
            const joined = await invitations.current!.invite(
              p,
              crypto.randomUUID(),
              gender,
            );
            if (!fence.current.accepts(epoch)) throw new DOMException("This call has ended.", "AbortError");
            if (openAIKeyRef.current.trim()) requestPortrait(p);
            return {
              joined: true,
              pickup_instruction: pickupInstruction,
              id: joined.id,
              name: joined.name,
              personality: joined.personality,
              voice_label: joined.voice.label,
              voice_rule:
                joined.voice.label === "default"
                  ? "Speak untagged."
                  : `Use <${joined.voice.label}>speech</${joined.voice.label}>.`,
            };
          }),
          leave_character: safeTool((args) => {
            const id =
              typeof args.character_id === "string" ? args.character_id : "";
            removePerson(id);
            return { left: id };
          }),
          update_shared_context: safeTool((args) => {
            if (!scenePermission.current.allows(mutedRef.current))
              return {
                saved: false,
                reason: "Demo mute is active. Keep the existing scene.",
              };
            if (
              typeof args.fact !== "string" ||
              !args.fact.trim() ||
              args.fact.length > 1000
            )
              throw new Error("Invalid scene fact.");
            const fact = args.fact.trim();
            if (
              args.scene !== undefined &&
              (typeof args.scene !== "string" || args.scene.length > 4000)
            )
              throw new Error("Invalid scene summary.");
            const updated = mergeScene(
              sceneRef.current,
              fact,
              typeof args.scene === "string" ? args.scene : undefined,
            );
            scenePermission.current.completed();
            sceneRef.current = updated;
            setScene(updated);
            setFacts((f) => (f.includes(fact) ? f : [...f.slice(-29), fact]));
            return { saved: true, scene: updated };
          }),
        },
        onConnect: () => {
          if (!fence.current.accepts(epoch)) return;
          startTime.current = Date.now();
          setMode("live");
          note("ElevenLabs connected");
        },
        onModeChange: ({ mode: next }) => {
          if (fence.current.accepts(epoch)) setTalking(next === "speaking");
        },
        onMessage: (m) => {
          if (!fence.current.accepts(epoch)) return;
          if (m.role !== "user") scenePermission.current.completed();
          if (m.role === "user" && !mutedRef.current) {
            setHeard(m.message);
            const updated = mergeScene(sceneRef.current, m.message);
            sceneRef.current = updated;
            setScene(updated);
          }
          const label = speakerLabel(m.message);
          const who =
            m.role === "user"
              ? "You"
              : label === "cast"
                ? "Cast"
                : roster.current?.participants
                    .find((p) => p.voice.label === label)
                    ?.name.split(" ")[0] || "Cast";
          if (m.role !== "user") setSpeaker(who);
          setTranscript((t) =>
            [
              ...t.filter((row) => row.id !== `${m.role}-${m.event_id}`),
              {
                id: `${m.role}-${m.event_id}`,
                who,
                text: m.message.replace(/<[^>]*>/g, ""),
              },
            ].slice(-100),
          );
        },
        onError: () => {
          if (fence.current.accepts(epoch))
            setError(
              "The live audio connection reported an error. End the call and try again.",
            );
        },
        onDisconnect: (details) => {
          if (!fence.current.accepts(epoch)) return;
          fence.current.end();
          invitations.current?.cancel();
          portraitJobs.current?.cancelAll();
          setRinging([]);
          session.current = null;
          mediaScope.current?.cancel();
          releaseMic();
          setMode("idle");
          setTalking(false);
          setParticipants([]);
          note("Call ended");
          if (details.reason === "error")
            setError(
              "The provider disconnected. Check your connection and ElevenLabs balance.",
            );
        },
      });
      if (!fence.current.accepts(epoch)) {
        await connection.endSession();
        return true;
      }
      session.current = connection;
      connection.setMicMuted(mutedRef.current);
      releaseMic();
      return true;
    } catch (e) {
      startupScope?.cancel();
      if (fence.current.accepts(epoch)) {
        fence.current.end();
        setMode("idle");
        setParticipants([]);
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Microphone access was denied. Allow it in your browser settings, then try again."
            : e instanceof Error && e.message.startsWith("ElevenLabs")
              ? e.message
              : "Could not start live audio. Check microphone permissions, your connection, and agent setup.",
        );
      }
      releaseMic();
      return true;
    } finally {
      startupScope?.finishStartup();
      busy.current = false;
    }
  }
  async function end() {
    scenePermission.current.reset();
    fence.current.end();
    invitations.current?.cancel();
    portraitJobs.current?.cancelAll();
    setRinging([]);
    mediaScope.current?.cancel();
    releaseMic();
    const old = session.current;
    session.current = null;
    setMode("idle");
    setParticipants([]);
    setTalking(false);
    note("Call ended");
    try {
      await old?.endSession();
    } catch {
      setError(
        "Audio was stopped. The provider could not confirm disconnection.",
      );
    }
  }
  function sendLine(input: string) {
    const text = input.trim();
    if (!text || text.length > 1000 || mode !== "live" || !session.current?.isOpen()) return false;
    try {
      scenePermission.current.typed();
      session.current.sendUserMessage(text);
      const updated = mergeScene(sceneRef.current, text);
      sceneRef.current = updated; setScene(updated);
      setTranscript(t => [...t, { id: `typed-${crypto.randomUUID()}`, who: "You · typed", text }].slice(-100));
      return true;
    } catch { setError("Couldn’t send that line. Check the live connection and try again."); return false; }
  }
  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    mediaScope.current?.setMuted(next);
    mic.current?.getTracks().forEach((t) => {
      t.enabled = !next;
    });
    session.current?.setMicMuted(next);
  }
  function toggleSound() {
    if (mode !== "live") return;
    setSound((v) => {
      session.current?.setVolume({ volume: v ? 0 : 1 });
      return !v;
    });
  }
  return {
    people,
    participants,
    ringing,
    mode,
    active,
    scene,
    heard,
    updateScene,
    facts,
    transcript,
    activity,
    error,
    setError,
    apiKey,
    setApiKey,
    openAIKey,
    setOpenAIKey,
    portraitState,
    portraitErrors,
    canCreatePortrait,
    requestPortrait,
    sendLine,
    agentID,
    preparing,
    setupMessage,
    prepare,
    muted,
    sound,
    talking,
    speaker,
    elapsed,
    preview,
    startLive,
    end,
    addPerson,
    savePerson,
    deletePerson,
    removePerson,
    toggleMute,
    toggleSound,
  };
}
