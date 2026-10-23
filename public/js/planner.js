// “How do you feel?” form and the three exercise cards Gemma suggests.

import { postJson } from "./api.js";

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// onChoose receives { exercise, secondsPerLift, reps, cues, why }. onSkip is for choosing manually.
export function initPlanner({ library, onChoose, onSkip }) {
  const form = $("planForm");
  const feeling = $("feeling");
  const minutes = $("minutes");
  const ask = $("askCoach");
  const status = $("planStatus");
  const cards = $("cards");
  const list = $("cardList");

  function showForm() {
    cards.hidden = true;
    form.hidden = false;
    feeling.focus();
  }

  function showCards(options) {
    list.replaceChildren();
    for (const option of options) {
      const exercise = library.find((ex) => ex.id === option.id);
      if (!exercise) continue;
      const total = option.reps * 2 * option.seconds_per_lift;
      const card = el("button", "card");
      card.type = "button";
      card.append(
        el("p", "card-pos", exercise.position === "floor" ? "On the floor" : "Standing"),
        el("h3", "", exercise.name),
        el("p", "card-why", option.why),
        el("p", "card-meta", `${option.seconds_per_lift} s per lift · ${option.reps} reps · about ${Math.max(1, Math.round(total / 60))} min`)
      );
      card.addEventListener("click", () => onChoose({
        exercise,
        secondsPerLift: option.seconds_per_lift,
        reps: option.reps,
        cues: option.cues,
        why: option.why
      }));
      list.append(card);
    }
    form.hidden = true;
    cards.hidden = false;
    list.querySelector("button")?.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = feeling.value.trim();
    if (!text) {
      status.textContent = "Tell the coach a few words about how you feel.";
      feeling.focus();
      return;
    }
    ask.disabled = true;
    status.textContent = "Gemma is choosing three movements for you…";
    try {
      const plan = await postJson("/api/plan", { feeling: text, minutes: Number(minutes.value) });
      status.textContent = "";
      showCards(plan.exercises);
    } catch (err) {
      status.textContent = `${err.message} You can also choose an exercise yourself.`;
    } finally {
      ask.disabled = false;
    }
  });
  $("skipPlan").addEventListener("click", onSkip);
  $("backToPlan").addEventListener("click", showForm);

  return { showForm };
}
