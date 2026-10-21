// Rising tone while climbing, and a leaf rustle when the user rushes.

const audio = { ctx: null, osc: null, gain: null, on: true };

export function bindSoundButton(button) {
  button.addEventListener("click", (e) => {
    audio.on = !audio.on;
    e.currentTarget.setAttribute("aria-pressed", String(audio.on));
    e.currentTarget.textContent = audio.on ? "Sound on" : "Sound off";
    if (!audio.on && audio.gain) audio.gain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1);
  });
}
export function initAudio() {
  if (audio.ctx) return;
  audio.ctx = new AudioContext();
  audio.osc = audio.ctx.createOscillator();
  audio.osc.type = "sine";
  audio.gain = audio.ctx.createGain();
  audio.gain.gain.value = 0;
  audio.osc.connect(audio.gain).connect(audio.ctx.destination);
  audio.osc.start();
}
// climbing: the sloth is climbing and the session isn't finished. progress: 0..1 up the vine.
export function updateTone(climbing, progress) {
  if (!audio.ctx) return;
  const now = audio.ctx.currentTime;
  const on = audio.on && climbing;
  audio.gain.gain.setTargetAtTime(on ? 0.05 : 0, now, 0.25);
  audio.osc.frequency.setTargetAtTime(196 * Math.pow(2, progress), now, 0.3);
}
export function rustle() {
  if (!audio.ctx || !audio.on) return;
  const len = audio.ctx.sampleRate * 0.5;
  const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  filter.Q.value = 0.8;
  const g = audio.ctx.createGain();
  g.gain.value = 0.12;
  src.connect(filter).connect(g).connect(audio.ctx.destination);
  src.start();
}
