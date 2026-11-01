# WhatsApp scene capture implementation

User-directed extension of the working web app. Implement inline in the current branch.

1. Add tested scene capture and merge contracts: partial/final speech, mute/cancel epochs, summary replacement; extend ten-contact fixtures with soft preferred voice bindings so unknown joins remain possible.
2. Add home microphone capture through ElevenLabs Scribe realtime and direct single-use token minting. Track microphone resources, stop on mute/pagehide/New call, and gate all late callbacks. Carry captured scene and mute into the existing working voice call.
3. Make live context tool update the scene itself and request semantic scene updates from the agent whenever the user establishes relevant facts. Show incoming user speech context and preserve mute behavior.
4. Extract reusable circular Avatar and WhatsApp-style home/call surfaces. Keep desktop thirds, phone-only primary surface, current sheets, real live/preview status, and invitation ringing.
5. Verify tests/typecheck/static build, desktop and mobile browser flows, and generated-concept fidelity. Review lifecycle and voice allocation. Package/push exact source and privately deploy to the existing Site. Ask user for key entry only after the final deployment, then verify microphone scene capture and call context with user readback.
