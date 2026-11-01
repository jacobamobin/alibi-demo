# Contact studio

Add contact from home or the people sheet. Upload a photo, optionally import one vCard, enter a name and a short bio, then draft a profile with AI or fill it out manually. Review editable age range, pronouns, optional heritage, personality, accent and voice style; preview a suggested prepared ElevenLabs voice; save and call or invite the person. Saved profiles can be edited or deleted.

The existing static app, ten prepared voices, circular avatars, and desktop thirds remain. Browser-local IndexedDB stores custom profiles and compressed portraits. API keys stay in tab memory. Only an explicit AI action sends the selected thumbnail and entered details directly to OpenAI Responses (store:false). Images, phone numbers, and emails never enter the call prompt. Phone imports use a .vcf file; there is no automatic address-book access.

Photo analysis may estimate a broad age range. Race, ethnicity, nationality and gender identity are never inferred from a photo. Pronouns and optional heritage are user supplied; fictional characters may receive invented pronouns, clearly described as invented. Voice suggestions use user-selected sound, accent and personality, not racial appearance. All output is editable and a simulation. A photo does not establish how someone sounds.

Use the existing prepared voice pool instead of dynamically changing an active agent or cloning voices. A suggestion is preferred, not a guaranteed slot: occupied/reserved slots fall back to a distinct available voice. The UI explains this. vCard import strips telephone/email/address, supports an embedded JPEG/PNG photo, and rejects unsupported/multiple cards clearly. Manual creation works without an OpenAI key.

Builder decisions: gpt-4.1-mini vision + strict structured output; use known prepared voice traits and a constrained voice ID. Compress uploads in browser; no new dependencies. Native contact picker was considered, but a visible vCard/file upload works on iPhone Safari and desktop. Automatic face identity classification was excluded; explicit details preserve a useful demo without making that claim.

Verify photo/vCard parsing, schema/error handling, persistence, photo-free call context, duplicate names, voice allocation and all existing regressions. Browser QA covers mobile and desktop add/review/save/edit/reload/invite/delete, invalid file and missing-key paths. Real AI completion needs a user-entered OpenAI key; do not claim it from mocked tests.
