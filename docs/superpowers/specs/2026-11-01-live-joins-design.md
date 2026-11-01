# Live role-based joins

User scenario: a shared game-night scene includes Owen and Maya. Owen naturally confirms it and invites Maya when relevant; Maya rings and joins before speaking. An unnamed role such as “a DJ” is enough to invent a fictional full name and personality, then invite that person without repeatedly asking for a name. A self-reference (“I’m a DJ”) does not mean add another person.

Use existing client tools, prepared voices and simulated ring. New invented people show a monogram immediately. If an OpenAI key is available, generate an entirely synthetic adult portrait in the background from the invented role/personality, then replace the monogram. Never delay the ring or voice for an image. Two image jobs at a time, deduplicated per person, cancelled when the call ends; failures keep the monogram and allow manual retry. No real-photo reconstruction and no face-based identity inference. Photos never enter the call prompt.

Add a small “Message the call” text fallback in Context, using ElevenLabs’ documented sendUserMessage, for accessibility and reproducible demo dialogue while the microphone is muted. Typed messages are labeled You · typed; never misrepresent them as microphone transcription. Explicit typed input may establish context even while Demo mute pauses microphone capture.

Keep keys in tab memory. Tests cover portrait request privacy/errors, job concurrency/dedup/cancel, roster portrait update preserving voices, and role behavior prompt. Browser/live validation uses actual providers, typed game-night lines and checks agent-triggered ring/join/activity/portrait completion. Record text versus speech evidence separately.
