# Sloth Mode

A slow-movement exercise app for the DEV Hacktoberfest Open-Source AI Challenge, Week 3 ("Slow and Steady": build something with open-weight models or open-source AI that rewards laziness).

Deadline: October 25, 2026, 11:59 PM PDT. Check the challenge page for the submission rules before setting up the repo.

## The idea

The webcam watches you do a slow somatic movement. A sloth climbs a vine only while you move slowly and smoothly. If you rush, it holds on and the vine sways. If you stop, it naps. Slow and steady wins the race.

Guiding principle for the code and the write-up: **MediaPipe sees, my code judges, Gemma coaches.**

- **MediaPipe Pose** (open source, runs in the browser) finds body landmarks on every frame. Video never leaves the browser.
- **Our code** turns landmarks into a joint angle, then speed, and decides climbing / swaying / napping. This must stay deterministic and fast, never an LLM call.
- **Gemma** (open-weight, via Ollama) picks exercises from a fixed library based on how the user feels, sets pace and reps, writes somatic cues, and reflects on a session summary afterwards.

## Current state

Working prototype, split into `index.html`, `css/style.css` and ES modules in `js/` (`main.js` state/loop/judging/UI, `measure.js` landmark maths, `demo.js`, `audio.js`); the exercise library lives in `library.json` at the root. Run it with `python3 -m http.server` and open `http://localhost:8000/` (camera needs localhost or HTTPS).

It already has:
- Webcam + MediaPipe Pose Landmarker (tasks-vision 0.10.14, lite model, VIDEO mode)
- `library.json` with 12 exercises (10 standing, 2 on the floor), fetched at startup. Each one has `id`, `name`, `position` (standing/floor), `focus` tags, `demo` key, `measure`, `range`, optional `tracks` (arm/leg/side, for the readout), `setup` and four `cues`
- Measurement types: `angle` (three landmarks; optional `sides` with auto-pick of the more visible side) and `tilt` (hip midpoint to shoulder midpoint)
- `range: [start, end]` in degrees (end can be lower than start, as in the squat)
- Smoothed angle, speed over a 0.5 s window, thresholds relative to target speed (`range / secondsPerLift`), state hysteresis (fast 250 ms, napping 1200 ms)
- Climbing sloth SVG, sway and nap states, rising tone and rustle sound, end screen with stats
- Animated stick-figure demo per exercise, driven by the pace slider, mirrored like the camera
- Range bar showing progress through the movement

Known gaps: speed only, no smoothness/jerk metric yet. Thresholds are tuned by feel and need real testing.

## What to build next (in order)

1. **Project setup:** git repo, open-source license, README stub. Split the prototype into `index.html`, CSS and JS modules without changing behaviour.
2. **Shared library:** move `LIBRARY` to `library.json`, used by both frontend and backend. Grow it to about 12 movements, each measurable with one angle or tilt (shoulder rolls, roll-down, torso rotation, knee lifts, lunge, cat-cow, lying knee drop). Each needs a `demo` figure.
3. **Backend:** small server that serves the frontend and exposes:
   - `POST /api/plan` with `{ feeling, minutes }` returns `{ exercises: [{ id, seconds_per_lift, reps, why, cues[] }] }`, three options to pick from
   - `POST /api/reflect` with a session summary returns `{ reflection, next_time }`
   - Use structured output with a JSON schema; `id` must be an `enum` generated from `library.json` so Gemma can never invent an exercise we can't measure.
   - System prompt: gentle movements, pain-free range, warm and brief tone.
4. **Switchable model provider:** one OpenAI-compatible code path configured by env vars (`MODEL_BASE_URL`, `MODEL_API_KEY`, `MODEL_NAME`). Default is local Ollama with Gemma (`http://localhost:11434/v1`). Cloud mode can point at Google AI Studio, OpenRouter or Groq. API keys stay server-side only.
5. **Frontend flow:** "How do you feel?" input, three exercise cards from `/api/plan`, then the climbing session using the chosen pace and cues, then a summary sent to `/api/reflect` and shown on the end screen.
6. **Session summary:** compact data only, never video or raw landmarks: climbing time, rush count, nap count, where in the range the user tended to rush (for example "top third").
7. **Polish if time allows:** smoothness metric, a hare on a neighbouring tree that sprints and falls asleep, deploy (e.g. Render) for cloud mode.
8. **Write-up for DEV:** writing quality is weighted most. Cover why open matters (body data stays local, swappable model, no per-use cost), the "MediaPipe sees, code judges, Gemma coaches" architecture, and honest tradeoffs.

## Conventions

- Keep it simple: vanilla JS in the browser unless there's a clear reason for a framework.
- Visible UI text uses typographic apostrophes and quotes.
- Design tokens: canopy `#17281F`, leaf `#203528`, moss `#2F4C3A`, mist `#E6EDDF`, lichen `#9FB39A`, marigold `#F0B44C` (climbing), orchid `#D49AC6` (rushing). Fonts: Young Serif for headings, Atkinson Hyperlegible for body (readable from across the room).
- Test changes with the camera before moving on; tracking feel matters more than features.
