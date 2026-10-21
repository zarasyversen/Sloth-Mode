# Sloth Mode 🦥

A slow-movement exercise app. Your webcam watches you do a slow somatic movement, and a sloth climbs a vine only while you move slowly and smoothly. If you rush, it holds on and the vine sways. If you stop, it naps. Slow and steady wins the race.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3: “Slow and Steady”.

## How it works

**MediaPipe sees, my code judges, Gemma coaches.**

- **MediaPipe Pose** runs in your browser and finds body landmarks on every frame. Video never leaves the browser.
- **Plain JavaScript** turns those landmarks into a joint angle and a speed, then decides whether the sloth is climbing, swaying or napping. It's deterministic and fast, with no AI call in the loop.
- **Gemma** (open-weight, via Ollama) will pick exercises based on how you feel, set the pace and write cues. *(Coming soon.)*

## Run it

```sh
python3 -m http.server
```

Open <http://localhost:8000>. The camera only works on `localhost` or HTTPS.

## Project layout

```
index.html       markup
css/style.css    styles and design tokens
js/main.js       camera, pose loop, judging, UI
js/measure.js    landmark maths (angles, tilt, side picking)
js/library.js    exercise library
js/demo.js       animated stick-figure demo
js/audio.js      climbing tone and rustle
```

## Status

Working prototype with four exercises. Backend, Gemma planning and session reflection are in progress.

## License

[MIT](LICENSE)
