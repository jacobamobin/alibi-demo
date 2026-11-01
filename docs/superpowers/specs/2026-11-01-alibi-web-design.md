# Alibi web proof — accepted platform change

The user approved switching to a website after MDM blocked App Store Xcode installation and Apple Developer sign-in was unavailable. Native scaffold work is preserved on `codex/native-ios`; it was not compiled or device-tested. The active deliverable is a static React/Next.js web app, with no application backend.

## Accepted behavior

- All people are synthetic. Three starter characters have ImageGen portraits, names, distinct personalities, and chosen ElevenLabs voices.
- Unknown people invented during the conversation use monogram avatars and available prepared voice slots. Reuse their identity on subsequent references.
- One ElevenLabs agent performs the cast. Up to 10 configured voices including default; exact voice bindings and idempotent joins are preserved.
- On desktop, use three equal thirds: People and Scene on the left, the FaceTime-style phone UI in the middle, Context/Transcript/Session activity on the right.
- On phone, only the FaceTime-style application is shown; cast, context, and Settings use sheets.
- Keys are entered in Settings and remain in session memory. No provider secrets are built into the static bundle, saved in browser storage, or hosted by Sites.
- Use a dedicated private ElevenLabs agent configured through explicit Settings actions. Preview mode has no live audio and is visibly labeled.
- Publish privately to Sites over HTTPS so microphone access can work on the phone. Physical-phone and live-provider verification remain separate from desktop browser tests.

## Visual system extracted from the ImageGen concept

- Near-black `#0d1012` canvas; panels `#15191b`; subtle `#292e31` dividers. Text `#f5f5f7`, secondary `#a1a6ac`; green `#49ce63`; hang-up red `#ff453a`.
- Apple system/SF-style font stack. Desktop wordmark 42–46px, panel headings 22px, person names 16px, supporting text 14px. Phone call captions 18px.
- Desktop 1:1:1 columns, a 390–430px center phone screen, 24–32px panel gutters; rounded portrait tiles, softly bordered rows, translucent round call controls.
- Control icons: microphone, speaker, add person, ellipsis, phone-down, settings. Native-looking white strokes in round glass controls; solid red End control.
- Three static photos are a separate generated production portrait atlas. An SVG viewport selects each equal-width third. No live video is implied.
- The browser/OS owns its status bar: omit fake signal/battery/time inside the phone UI. This intentionally avoids duplicate system chrome on the real phone.
- Initial screen supports starting a live call or a labeled silent preview. Active-call state adds/removes people dynamically; desktop transcript stays empty until actual live messages arrive.

## Ordered implementation and verification

1. Port the tested roster/provider contracts to TypeScript; add tests before implementation for duplicate joins, exact prepared voices, ten-person limit, name ambiguity, tool parsing, payload shape, and stale sessions.
2. Implement direct ElevenLabs REST setup and React SDK connection, with only session-memory keys and generic safe provider errors. Verify CORS preflight from the actual Site origin before claiming browser feasibility.
3. Implement the desktop three-column and mobile full-screen UI faithfully, including People, Scene, Settings, Add person, live/preview start, mute, volume, and end-call cleanup.
4. Test through the built-in browser at desktop and phone viewport sizes; compare the generated concept and browser screenshot using view_image. Run unit tests, type checks, and static production build.
5. Package exact pushed source and publish the owner-private Site. With user-entered credentials, test the real provider session and then obtain the user's physical-phone readback. Do not claim a live three-person phone proof without that evidence.

## Assets

- Concept: `docs/design/alibi-desktop-concept.png`.
- Starter portrait atlas: `web/public/portraits/cast.png`.
- Both generated with the built-in ImageGen tool on November 1, 2026. Prompts are saved in `docs/design/image-prompts.md`.
