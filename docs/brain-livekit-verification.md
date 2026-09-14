# Brain AssemblyAI + LiveKit verification

Verified on 2026-09-13 with a local Python worker connected to the configured
LiveKit Cloud project. Production deployment was not completed: Fly's API
reported that the organization is suspended.

## Implemented flow

`Talk to brain` requests a holder-authorized, isolated LiveKit room. The server
dispatches `experience: "brain"` with `mode: "assemblyai-pipeline"`. Browser
microphone audio goes through LiveKit to AssemblyAI Universal 3.5 Pro at 16 kHz;
Grok answers and invokes the Brain tools; Deepgram Aura-2 generates the spoken
response returned through LiveKit.

Voice Focus supports near-field and far-field capture, defaulting to far-field
at 0.7. STT endpointing uses 100/1000 ms silence thresholds, Silero/AssemblyAI
thresholds of 0.3, and no additional LiveKit endpointing delay. The worker keeps
the supplied key server-side. No provider secret is returned by the token route
or embedded in browser assets.

## Real audio evidence

`scripts/brain-livekit-live-smoke.mjs` used a synthetic WAV microphone and a
temporary worker named `solgpt-brain-validation-local`. Its token response was
injected with a real token minted by the application server helper; this test
did not perform a wallet sign-in. Holder authorization is exercised separately
by the token route tests.

The final real-provider run observed:

- AssemblyAI transcript: `Please light up the escape circuit.`
- Actual browser circuit result: `stimulated gf ×2`.
- Grok confirmation transcript: `GF escape circuit highlighted:` (captured
  while speech was still streaming).
- Nonzero remote audio after the circuit action, confirming response playback.
- Stopped microphone tracks and removed remote playback elements on End.
- Worker log: `AssemblyAI transcription terminated cleanly`, emitted only after
  the provider's `Termination` message.
- Zero remaining LiveKit rooms after cleanup; the temporary worker was stopped.

The earlier silent system-TTS fixture failed as expected and was replaced with
a verified Deepgram-generated utterance. The live run also found and fixed a
startup issue: `ctx.connect()` must precede binding RoomIO transcription output
to the holder's participant identity. A regression test covers this ordering.

## Checks

- 35 Python worker tests pass, including loopback WebSocket tests for final audio
  flush, final transcript receipt, explicit Terminate, missing acknowledgement,
  unexpected closure, and concurrent/cancelled cleanup.
- 24 LiveKit TypeScript tests pass for signed token metadata, holder/room
  isolation, Voice Focus validation, and rejection of caller-chosen Brain rooms.
- Six adjacent AssemblyAI streaming-token tests pass after correcting their
  holder-gate fixtures to match the actual return type.
- `scripts/brain-voice-smoke.mjs` passes browser tests for media, transcripts,
  RPC validation, interruption-related state, autoplay recovery, failed startup,
  stale async work, and teardown.
- The Observatory scene smoke passes against the running Next application with
  all four scene selections, fallback, chat, mobile, and reduced motion checks,
  and zero page errors. The Brain iframe permits microphone and autoplay. The
  harness skips the current tab and waits for the target URL to avoid overlapping
  navigations.
- Changed TypeScript source passes ESLint. Environment-file Git safety and a
  scan for the supplied key in tracked source pass.

The full repository typecheck remains blocked by the missing existing module
`sol-gpt-ios/scripts/sync-ios-env.mjs`, imported by
`src/lib/solgpt/ios-env-sync.test.ts`. A full production build is therefore not
claimed. Real laptop/headset acoustics and wallet sign-in were not part of the
synthetic microphone smoke.

## Repeating the real-provider check

Start a static server for `public/` on port 3479. In `livekit-agent/`, with its
ignored environment file configured, run:

```sh
LIVEKIT_AGENT_NAME=solgpt-brain-validation-local uv run python agent.py dev --no-reload
```

From the repository root, provide a mono PCM WAV with initial silence followed
by “Please light up the escape circuit,” then run:

```sh
BRAIN_SMOKE_AUDIO=/absolute/path/to/synthetic-utterance.wav node --env-file=.env.local --import tsx scripts/brain-livekit-live-smoke.mjs
```

This uses the configured real providers. The script removes its temporary room
when it finishes; stop the temporary worker afterward.
