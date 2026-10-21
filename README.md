# Sloth Mode 🦥

A slow-movement exercise app. Your webcam watches you do a slow somatic movement, and a sloth climbs a vine only while you move slowly and smoothly. If you rush, it holds on and the vine sways. If you stop, it naps. Slow and steady wins the race.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3: “Slow and Steady”.

## How it works

**MediaPipe sees, my code judges, Gemma coaches.**

- **MediaPipe Pose** runs in your browser and finds body landmarks on every frame. Video never leaves the browser.
- **Plain JavaScript** turns those landmarks into a joint angle and a speed, then decides whether the sloth is climbing, swaying or napping. It's deterministic and fast, with no AI call in the loop.
- **Gemma** (open-weight, running locally in Ollama) picks three exercises from a fixed library based on how you feel, sets the pace and reps, writes cues, and reflects on your session afterwards. The app checks every answer before it uses it.

## Run it

You need [Node](https://nodejs.org) 20 or newer and [Ollama](https://ollama.com) with Gemma:

```sh
ollama pull gemma4:26b
npm start
```

Open <http://localhost:8000>. The camera only works on `localhost` or HTTPS. Everything runs on your machine: video stays in the browser, and Gemma runs locally.

## Project layout

```
server.js               serves public/ and the API (no dependencies)
coach.js                Gemma prompts, JSON schemas and answer checks
library.json            exercise library, shared by frontend and backend
public/index.html       markup
public/css/style.css    styles and design tokens
public/js/main.js       camera, pose loop, judging, UI
public/js/measure.js    landmark maths (angles, tilt, side picking)
public/js/demo.js       animated stick-figure demo
public/js/audio.js      climbing tone and rustle
```

## API

- `POST /api/plan` with `{ "feeling": "stiff back", "minutes": 3 }` returns three options: `{ "exercises": [{ "id", "seconds_per_lift", "reps", "why", "cues" }] }`
- `POST /api/reflect` with a session summary returns `{ "reflection", "next_time" }`

## Status

Twelve exercises, and the backend with Gemma planning and reflection works. The frontend doesn’t use the API yet.

## License

[MIT](LICENSE)
