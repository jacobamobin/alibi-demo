import type { Person, Voice } from "./roster";
export const starterVoices: Voice[] = [
  {
    label: "default",
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    gender: "male",
  },
  {
    label: "Maya",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    gender: "female",
  },
  {
    label: "Leo",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    gender: "male",
  },
  {
    label: "Roger",
    voiceId: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    gender: "male",
  },
  {
    label: "Laura",
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    gender: "female",
  },
  {
    label: "Charlie",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    gender: "male",
  },
  {
    label: "River",
    voiceId: "SAz9YHcvj6GT2YYXdXww",
    name: "River",
    gender: "neutral",
  },
  {
    label: "Alice",
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    gender: "female",
  },
  {
    label: "Jessica",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    gender: "female",
  },
  {
    label: "Will",
    voiceId: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    gender: "male",
  },
];
export const starterPeople: Person[] = [
  {
    id: "owen",
    name: "Owen Brooks",
    voiceId: starterVoices[0].voiceId,
    personality:
      "Your easygoing friend. Warm, dry humor. Loves board games and remembers tiny details. Speaks in short, casual sentences.",
    pronouns: "he/him",
    color: "#6e858b",
    aliases: ["Owen"],
    portrait: 0,
  },
  {
    id: "maya",
    name: "Maya Chen",
    voiceId: starterVoices[1].voiceId,
    personality:
      "Quick-witted, observant, and playful. A competitive board-game friend. Adds specific details and occasionally teases Owen.",
    pronouns: "she/her",
    color: "#557a64",
    aliases: ["Maya"],
    portrait: 1,
  },
  {
    id: "leo",
    name: "Leo Bennett",
    voiceId: starterVoices[2].voiceId,
    personality:
      "A cheerful friend with infectious energy. Loves snacks and friendly competition. Keeps the conversation moving without dominating.",
    pronouns: "he/him",
    color: "#6c7393",
    aliases: ["Leo"],
    portrait: 2,
  },
  {
    id: "noah",
    name: "Noah Reed",
    preferredVoiceId: starterVoices[3].voiceId,
    personality:
      "Calm, confident, a little sarcastic. A great storyteller who keeps track of the plan and speaks unhurriedly.",
    pronouns: "he/him",
    color: "#8b6654",
    aliases: [],
    portrait: 3,
  },
  {
    id: "zara",
    name: "Zara Ellis",
    preferredVoiceId: starterVoices[4].voiceId,
    personality:
      "Warm and perceptive. Always knows the best spot in town. Thoughtful, direct, and quietly funny.",
    pronouns: "she/her",
    color: "#517f78",
    aliases: [],
    portrait: 4,
  },
  {
    id: "finn",
    name: "Finn Parker",
    preferredVoiceId: starterVoices[5].voiceId,
    personality:
      "Laid-back and cheerful. Has a terrible sense of direction and an excellent memory for funny stories.",
    pronouns: "he/him",
    color: "#9b876a",
    aliases: [],
    portrait: 5,
  },
  {
    id: "alex",
    name: "Alex Morgan",
    preferredVoiceId: starterVoices[6].voiceId,
    personality:
      "Thoughtful, witty, and a good listener. Into music and late-night conversations. Speaks with understated confidence.",
    pronouns: "they/them",
    color: "#727f85",
    aliases: [],
    portrait: 6,
  },
  {
    id: "amelia",
    name: "Amelia Hayes",
    preferredVoiceId: starterVoices[7].voiceId,
    personality:
      "Measured and charming with a dry British wit. Keeps things organized and finds humor in small details.",
    pronouns: "she/her",
    color: "#917869",
    aliases: [],
    portrait: 7,
  },
  {
    id: "jules",
    name: "Jules Carter",
    preferredVoiceId: starterVoices[8].voiceId,
    personality:
      "Playful, expressive, and spontaneous. Takes a lot of photos, loves a good story, and teases friends affectionately.",
    pronouns: "she/her",
    color: "#657f93",
    aliases: [],
    portrait: 8,
  },
  {
    id: "eli",
    name: "Eli Stone",
    preferredVoiceId: starterVoices[9].voiceId,
    personality:
      "Grounded and friendly. Loves cooking and small adventures. Brings specific sensory details to a conversation.",
    pronouns: "he/him",
    color: "#748364",
    aliases: [],
    portrait: 9,
  },
];
export const defaultScene = "";
export function inventedPerson(
  name: string,
  personality = "",
  pronouns = "",
): Person {
  const words = name.trim().split(/\s+/);
  const hash = [...name.toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const full =
    words.length === 1
      ? `${words[0]} ${["Carter", "Reed", "Morgan", "Hayes", "Ellis", "Parker"][hash % 6]}`
      : name.trim();
  return {
    id: `fiction-${full.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: full,
    personality:
      personality ||
      "A warm, relaxed fictional friend with a quick sense of humor. Keep replies natural and brief.",
    pronouns,
    color: ["#677e91", "#8e706b", "#697e68", "#887895", "#8a805d"][hash % 5],
    aliases: [],
  };
}
