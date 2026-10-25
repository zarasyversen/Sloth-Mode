---
title: "Sloth Mode: a game you win by moving slowly"
published: false
tags: devchallenge, hf26challenge
---


*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

## What I Built

Sloth Mode is a webcam game where a sloth climbs a vine only while you move slowly and smoothly. Rush, and the sloth holds on while the vine sways. Stop, and it falls asleep. Slow and steady gets you to the treetop.

I built it for Week 3 of the DEV Hacktoberfest Open-Source AI Challenge, “Slow and Steady”. Everything runs on your own machine: an open-source pose model in the browser, and Gemma, an open-weight model, through Ollama.

### Why slow movement

My starting point was a simple idea: move with intention. I like exercising, and most training tells you to go faster, lift more, do one more rep. So I started reading about somatic exercises, where the point is the opposite: slow, controlled movement and paying attention to how it feels.

I wanted to build something where you *have* to move slowly. Not a timer telling you to slow down, but something that only works when you do. The hard part is that slow movement can feel like nothing is happening, so I made it a game. You watch a sloth, the slowest climber there is, and it only climbs when you match its pace.

That fit the week’s theme almost too well. In Sloth Mode, laziness, or at least slowness, is how you win.

### What a session looks like

One session takes a few minutes:

1. **How do you feel?** You type a few words, like “stiff shoulders after a long day at the laptop”, and choose how many minutes you have.
2. **Pick one of three.** Gemma suggests three movements from a library of twelve, such as a side arm raise, a slow squat, a roll-down or a bridge. Each card has a pace, a number of reps and one line about why it suits how you feel.
3. **Watch the pace once.** A stick figure shows the movement at the chosen speed. Then it gets out of the way.
4. **Climb.** The camera watches you move. A meter at the bottom of the video shows whether you’re still, at sloth pace or rushing, and the sloth climbs, clings on or naps to match. While you climb, Gemma’s cues rotate under the video (“Breathe deeply as your arms rise.”).
5. **Reach the treetop.** The end screen shows your climbing time, how often you rushed and napped, and where in the movement you tended to rush. Gemma reads that summary and writes a short reflection with one suggestion for next time.

**Who gets to be lazier:** you. There’s no routine to plan, no reps to count and no clock to watch. You say how you feel, Gemma picks the movement and the pace, and the sloth keeps time for you: if it’s climbing, you’re doing it right.

## Demo

**TODO:** replace this line with `{% embed <your video URL> %}`

## Code

{% embed https://github.com/zarasyversen/Sloth-Mode %}

The code is MIT-licensed on GitHub: [zarasyversen/Sloth-Mode](https://github.com/zarasyversen/Sloth-Mode). You need Node 20 or newer and [Ollama](https://ollama.com):

```sh
ollama pull gemma4:26b
npm start
```

Then open `http://localhost:8000`, tell the coach how you feel, and step back from the camera.

## How I Built It

### MediaPipe sees, my code judges, Gemma coaches

The one rule I set myself: the AI coaches, but it never judges your movement. Judging happens on every frame and has to be fast and fair, so it’s plain code.

[embedded content: Sloth Mode architecture · browser and local Ollama]

**MediaPipe sees.** [MediaPipe Pose](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) is open source and runs in the browser. On every video frame it returns the positions of 33 body landmarks, such as shoulders, elbows, hips and knees.

**My code judges.** Each exercise is defined by one measurement: an angle between three landmarks (shoulder, elbow, wrist for an arm raise) or the tilt of the torso. The code smooths that angle, works out its speed over the last half second, and compares it with the target speed, which is the movement’s range divided by the seconds per lift. Too slow and the sloth naps, too fast and it clings on, in between and it climbs. Short delays stop the state from flickering: rushing has to last 250 ms and napping 1.2 seconds. No model is involved, so the same movement always gets the same result.

**Gemma coaches.** Gemma runs in Ollama on your own computer and is used twice per session. Before it, Gemma turns how you feel into three exercise cards. After it, Gemma reads a summary like this one and writes a short reflection:

```json
{
  "exercise_id": "arms_overhead",
  "seconds_per_lift": 10,
  "reps": 5,
  "finished": true,
  "climb_seconds": 96,
  "total_seconds": 131,
  "rush_count": 4,
  "nap_count": 2,
  "rush_zone": "the last third, near the full movement"
}
```

For that summary, Gemma wrote: “You tended to move a little too quickly as your arms reached the top of the movement.” Both calls use Ollama’s structured output with a JSON schema, and the exercise `id` is an enum generated from the library, so Gemma can only pick movements the code knows how to measure.

### Honest tradeoffs

- **Speed is all it measures.** The game judges how fast a joint angle changes. It doesn’t yet measure smoothness, so a jerky movement at the right average speed still counts.
- **The thresholds are tuned by feel.** “Rushing” starts at 1.6 times the target speed and “still” below a quarter of it. Those numbers came from testing on myself, not from a study.
- **Side-on movements are noisy.** The light pose model jitters on knees and ankles seen from the side. The slow squat can say “Too quick” while you stand still, because the jitter alone is faster than its very slow target speed.
- **Gemma 4 26B needs a capable machine.** The model is about 16 GB, and choosing three exercises takes around 16 seconds on my laptop.
- **Gemma can only choose, not invent.** The exercise `id` in the JSON schema is an enum built from the library, and every answer is checked again in code. If an answer fails the checks, the app asks once more and then shows an error. That keeps Gemma safe, but also means it can’t suggest a movement I haven’t written measuring code for.

### What user feedback changed

People who tried it said there was too much happening at once: a stick figure, a pace meter, a range bar, the sloth and sound. So I cut it down. The stick figure now shows the pace once, before you start. The pace meter moved onto the camera view and got bigger. The range bar, the sound and the pace slider are gone. Now you only have to watch yourself and the sloth.

Next, I want to add a smoothness score so that jerky movement counts as rushing too, and calm down the jitter on side-on movements like the squat.

## Why Does Open Innovation Matter?

A camera pointed at your body in your living room is about as personal as data gets. Open models let me keep all of it on your machine.

- **Your body data stays local.** The video never leaves the browser tab. The pose model runs in the page, and the only thing sent anywhere is a handful of numbers to Ollama on your own computer.
- **The model is swappable.** Gemma is one line in `coach.js`. Any Ollama model that supports structured output can take its place.
- **No per-use cost.** No API keys and no bill per session, so you can climb as often as you like.
- **(Almost) offline.** Once the page, the pose model and the fonts have loaded, the coaching runs with no internet. The first load still needs the internet to fetch the pose model and its runtime from a CDN.

With a closed API, every plan and reflection would send how you feel and how your body moved to someone else’s server, cost money per call, and stop working when the network or the provider does. With Gemma in Ollama, the coach is a file on your own disk.

## Prize Categories

**Best Use of Gemma.** Gemma 4 26B runs locally through Ollama and does all the coaching: it turns how you feel into three exercise cards with pace, reps and cues, and reflects on each session’s summary afterwards. Structured output with an enum of exercise ids keeps it to movements the code can measure.
