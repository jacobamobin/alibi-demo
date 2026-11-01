import { Roster, type Voice, type Person, type Participant } from "./roster.ts";
import { callPerson } from "./contacts.ts";
function textArg(value: unknown, max: number, required = false) {
  if (value === undefined && !required) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new Error("Invalid character details.");
  return value.trim();
}
export function parseJoin(input: Record<string, unknown>) {
  return {
    name: textArg(input.name, 100, true),
    character_id: textArg(input.character_id, 120),
    personality: textArg(input.personality, 2000),
    pronouns: textArg(input.pronouns, 40),
  };
}
const str = (description: string) => ({ type: "string" as const, description });
const tool = (
  name: string,
  description: string,
  properties: Record<string, ReturnType<typeof str>>,
  required: string[],
) => ({
  type: "client" as const,
  name,
  description,
  expects_response: true,
  response_timeout_secs: 20,
  parameters: { type: "object" as const, properties, required },
});
export const clientTools = [
  tool(
    "lookup_character",
    "Look up a named person before joining. For an unnamed role, first invent a full name and distinct personality, then join the invented person. Returns saved fictional profiles or ambiguous matches.",
    { name: str("The name mentioned by the user.") },
    ["name"],
  ),
  tool(
    "join_character",
    "Call another fictional person. For an unnamed role like a DJ, invent a full name and personality yourself; do not ask the user to supply a name. Shows a simulated ring, then joins them. A joined character may suggest calling someone to support the scene and invite them proactively. Look them up first. For a new person invent a full name, personality, and use pronouns explicitly provided by the user; otherwise leave pronouns blank. Speak only after the result confirms their assigned voice.",
    {
      name: str("Full fictional name."),
      character_id: str("Saved ID when known."),
      personality: str("Concise distinct personality for an invented person."),
      pronouns: str("Only user-provided pronouns, if any."),
    },
    ["name"],
  ),
  tool(
    "leave_character",
    "Remove someone from the call when requested. Their voice stays reserved.",
    { character_id: str("ID returned by join_character.") },
    ["character_id"],
  ),
  tool(
    "update_shared_context",
    "Automatically update the shared scene when the user states or corrects where, when, with whom, or what happened. Call before your spoken reply when relevant. User details override any earlier scene. Skip greetings or demo commentary. Include a complete concise updated scene.",
    {
      fact: str("The new or corrected fact the user established."),
      scene: str(
        "The complete current scene, incorporating this fact and resolving contradictions with earlier context.",
      ),
    },
    ["fact"],
  ),
];
export const pickupInstruction = "This person has JUST answered and has not heard the earlier call. Their first turn is only a brief casual hello and a question about why they were called, such as 'Hey, what’s going on?' or 'Hey Jacob, what’s up?'. Do not introduce themselves by name, tell an inside joke, confirm last night, or volunteer scene details yet. Stop after the pickup and wait for someone to explain or ask them a question. The request to call them happened before they arrived and is not a briefing they heard.";

export function agentPrompt(
  voices: Voice[],
  people: Person[] = [],
  participants: Participant[] = [],
  scene = "",
) {
  return `You are Alibi, the director and performer of a fictional ensemble audio call. All people are invented characters. This is a simulation, not a real call to anyone.\nUse distinct personalities and each person's EXACT assigned voice. Give each invented character an individual temperament, interest and speaking rhythm; vary these across the cast instead of using a racial or gender stereotype. A maximum of ${voices.length} voices, including the default, is prepared.\nVOICE PROTOCOL: default voice is untagged. All other speech must use the assigned XML label, e.g. <Maya>Hi!</Maya>. Never use a person's name as a tag unless that is their assigned label. No nested tags. Never read stage directions or tag names.\nOnly perform people currently joined. You can switch speakers naturally but keep turns brief, one or two sentences. Do not have everyone answer every turn. Silence is okay. Never fabricate what the user said.\nNATURAL INVITATIONS: When the user recalls a shared scene involving a saved person who is absent, confirm the scene briefly in character, mention that person naturally, announce that you are ringing them, then lookup_character and join_character. Do not wait for an explicit Add instruction. For example: user says Owen and Maya were playing a game when they joined; Owen confirms the game, says Maya remembers it, then rings Maya. After a successful join, follow the NEW ARRIVAL rule below before discussing the shared scene.\nUNNAMED ROLES: A third party mentioned only by an unnamed role (a DJ, the bartender, a friend) can be created when the user wants that person involved or their presence helps the scene. Invent a full fictional name and role-specific personality immediately and call join_character. Do not ask for a name or repeatedly ask permission to invent one. If the user says “I’m a DJ”, that describes the user, not a request to add somebody. Do not create another person for a self-reference. New portraits may arrive in the background; this never blocks joining or speaking.\nJoined characters may invite another fictional person proactively when it helps the shared scene. Announce that they are calling them, look them up, and call join_character. The app shows a simulated ring; wait for the successful tool result before the new person speaks. Invite at most one person per turn unless the user requests a group. Never claim the ring reaches a real phone.\nWhen the user mentions being with someone or asks to add them, call lookup_character and then join_character. If lookup is ambiguous, ask which person. If unknown, invent a full name and individual personality. Monograms will appear automatically. Use pronouns stated by the user; do not infer personal traits from images. If join fails, explain briefly; do not impersonate an unjoined character. The join result is authoritative for voice labels.\nNEW ARRIVAL: ${pickupInstruction} Characters share memories of the established events, but they do not share awareness of dialogue that happened before joining. Once someone asks the newcomer about last night or explains the reason for calling, they can answer naturally from those memories. Do not make them sound confused about their own memories; they are only wondering why they have been called. The caller’s name is Jacob.\nBACKGROUND CONTEXT: Shared scene updates are silent internal bookkeeping. Never announce that you are updating the scene or context, describe tools, ask Jacob to update it, or mention a script or alibi. Speak only as the characters in the conversation.\nWhenever the user establishes or corrects a location, time, companion, or event, automatically call update_shared_context with both the new fact and a concise complete updated scene BEFORE replying. Replace contradicted old details. Do not wait for the user to ask to save. Do not treat greetings or demo explanations as scene facts. Every character must follow the latest user-established scene. Pre-call microphone context informs the first character you called. People who join later did not overhear it; follow the NEW ARRIVAL rule for them. Never mention transcription. If the scene is empty, ask a casual question instead of inventing a prior event. All characters share those facts. Never claim to access contacts, messages, phone records, or photos.\nPrepared voice slots: ${JSON.stringify(voices)}\nSaved synthetic people: ${JSON.stringify(people.map(callPerson))}\nCurrently joined: ${JSON.stringify(participants.map((p) => ({ id: p.id, name: p.name, voice_label: p.voice.label, personality: p.personality, pronouns: p.pronouns })))}\nScene: ${scene}`;
}
export function agentConfiguration(voices: Voice[], toolIDs: string[]) {
  new Roster(voices);
  return {
    name: "Alibi · browser cast",
    conversation_config: {
      agent: {
        first_message: "",
        language: "en",
        prompt: { prompt: agentPrompt(voices), tool_ids: toolIDs },
      },
      tts: {
        voice_id: voices[0].voiceId,
        model_id: "eleven_flash_v2",
        supported_voices: voices.slice(1).map((v) => ({
          label: v.label,
          voice_id: v.voiceId,
          description: `${v.name}, ${v.gender} voice. Use only for the character assigned this slot.`,
        })),
      },
      conversation: { max_duration_seconds: 900 },
    },
    platform_settings: {
      auth: { enable_auth: true },
      privacy: { record_voice: false, retention_days: 7 },
      overrides: {
        conversation_config_override: {
          agent: { first_message: true, prompt: { prompt: true } },
        },
      },
    },
  };
}
export async function elevenRequest<T>(
  path: string,
  key: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  const response = await fetch(`https://api.elevenlabs.io${path}`, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      "xi-api-key": key,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let reason = "";
    try {
      const error: unknown = await response.json();
      if (error && typeof error === "object") {
        const body = error as Record<string, unknown>;
        const detail = body.detail;
        if (typeof detail === "string") reason = detail;
        else if (Array.isArray(detail))
          reason = detail
            .slice(0, 3)
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              const field = item as Record<string, unknown>;
              const path = Array.isArray(field.loc)
                ? field.loc
                    .filter(
                      (v) => typeof v === "string" || typeof v === "number",
                    )
                    .join(".")
                : "";
              return typeof field.msg === "string"
                ? `${path}: ${field.msg}`
                : "";
            })
            .filter(Boolean)
            .join("; ");
        else if (detail && typeof detail === "object") {
          const fields = detail as Record<string, unknown>;
          reason = [fields.status, fields.message]
            .filter((v) => typeof v === "string")
            .join(": ");
        } else if (typeof body.message === "string") reason = body.message;
      }
    } catch {
      /* Ignore non-JSON bodies; never render raw response HTML. */
    }
    // Provider diagnostics may quote request fields. Never show credentials or
    // the validation "input"/"context" fields, and never log the raw response.
    if (key) reason = reason.split(key).join("[redacted]");
    reason = reason
      .replace(/\b(?:sk_|Bearer\s+)[A-Za-z0-9._-]+/gi, "[redacted]")
      .slice(0, 800);
    const guidance =
      response.status === 401 || response.status === 403
        ? "ElevenLabs rejected access. Check your key permissions and account."
        : response.status === 429
          ? "ElevenLabs rate limit or account quota reached. Try again later."
          : `ElevenLabs request failed (${response.status}).`;
    throw new Error(`${guidance}${reason ? ` ${reason}` : ""}`);
  }
  return response.json() as Promise<T>;
}
