const timeSlider = document.getElementById("timeSlider");
const totalTimeLabel = document.getElementById("totalTimeLabel");
const countdownEl = document.getElementById("countdown");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const skipBtn = document.getElementById("skipBtn");
const currentPhaseEl = document.getElementById("currentPhase");
const currentPhaseDescriptionEl = document.getElementById("currentPhaseDescription");
const phaseTimeEl = document.getElementById("phaseTime");
const phaseList = document.getElementById("phaseList");
const promptBtn = document.getElementById("promptBtn");
const promptText = document.getElementById("promptText");
const phaseTimeProgressFill = document.getElementById("phaseTimeProgressFill");
const overallProgressFill = document.getElementById("overallProgressFill");

const phases = [
  {
    name: "Research",
    weight: 8,
    description: "Quick audience + landscape scan",
  },
  {
    name: "Brainstorm",
    weight: 6,
    description: "Rapid idea capture",
  },
  {
    name: "Sketch",
    weight: 9,
    description: "Loose visual directions",
  },
  {
    name: "Vector drafts",
    weight: 18,
    description: "Structured logo explorations",
  },
  {
    name: "Concept selection",
    weight: 12,
    description: "Narrow to finalists",
  },
  {
    name: "Refinement",
    weight: 25,
    description: "Polish the lead concept",
  },
  {
    name: "Secondary branding",
    weight: 0,
    description: "Extend the system",
  },
];

const promptIdeas = [
  "a coastal guesthouse brand targeting weekend travelers.",
  "a neighborhood bakery brand targeting early-morning commuters.",
  "a modular furniture brand targeting first-apartment renters.",
  "a zero-waste refill brand targeting eco-conscious shoppers.",
  "a language tutoring brand targeting international students.",
  "a pet wellness brand targeting urban dog owners.",
  "a mindful tech break brand targeting remote teams.",
  "a mobile car wash brand targeting busy parents.",
  "a local museum brand targeting family day-trippers.",
  "a women’s running club brand targeting novice runners.",
  "a music education brand targeting teenagers in after-school programs.",
  "a boutique hotel brand targeting design-focused travelers.",
  "a craft soda brand targeting summer festival goers.",
  "a plant delivery brand targeting apartment dwellers.",
  "a community cycling brand targeting city commuters.",
];

const promptAngles = [
  "community-first",
  "premium minimalist",
  "playful and youthful",
  "eco-conscious",
  "tech-forward",
  "artisan handcrafted",
  "bold and energetic",
  "calm and trustworthy",
];

const getFallbackPrompt = () => {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  return pick(promptIdeas);
};

const getAiPrompt = async () => {
  const nonce = Math.random().toString(36).slice(2);
  const angle = promptAngles[Math.floor(Math.random() * promptAngles.length)];
  const response = await fetch(
    `https://text.pollinations.ai/openai?nonce=${nonce}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          {
            role: "system",
            content:
              "You generate concise branding prompts. Return exactly one sentence in this format: a ____ brand targeting ____.",
          },
          {
            role: "user",
            content:
              `Generate one realistic branding prompt now. Use a ${angle} angle, keep it specific and natural, and do not repeat any previous prompt.`,
          },
        ],
        temperature: 1.2,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("No prompt text returned from AI response.");
  }
  return text;
};

let timerId = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let currentPhaseIndex = 0;
let phaseDurations = [];
let phaseRemaining = 0;
let isRunning = false;

const PRIMARY_ALLOCATION = 0.8;

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((value) => String(value).padStart(2, "0")).join(":");
};

const formatMinutes = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${String(rem).padStart(2, "0")}m`;
  }
  return `${mins}m`;
};

const updateTotalLabel = () => {
  const value = Number(timeSlider.value);
  totalTimeLabel.textContent = value === 1 ? "1 hour" : `${value} hours`;
};

const buildPhaseDurations = () => {
  const primaryTotal = Math.round(totalSeconds * PRIMARY_ALLOCATION);
  const secondaryTotal = totalSeconds - primaryTotal;
  const weightedPhases = phases.slice(0, -1);
  const weightSum = weightedPhases.reduce((sum, phase) => sum + phase.weight, 0);
  phaseDurations = weightedPhases.map((phase) =>
    Math.round((primaryTotal * phase.weight) / weightSum)
  );
  const allocatedPrimary = phaseDurations.reduce((sum, value) => sum + value, 0);
  const adjustment = primaryTotal - allocatedPrimary;
  if (adjustment !== 0) {
    phaseDurations[phaseDurations.length - 1] += adjustment;
  }
  phaseDurations.push(secondaryTotal);
};

const renderPhaseList = () => {
  phaseList.innerHTML = "";
  phases.forEach((phase, index) => {
    const li = document.createElement("li");
    li.className = "phase-item" + (index === currentPhaseIndex ? " active" : "");
    const name = document.createElement("div");
    name.innerHTML = `<div class="phase-name">${phase.name}</div><div class="phase-meta">${phase.description}</div>`;
    const time = document.createElement("div");
    time.className = "phase-meta";
    time.textContent = formatMinutes(phaseDurations[index] || 0);
    li.append(name, time);
    phaseList.appendChild(li);
  });
};

const updatePhaseDisplay = () => {
  const currentPhase = phases[currentPhaseIndex];
  currentPhaseEl.textContent = currentPhase?.name ?? "Complete";
  currentPhaseDescriptionEl.textContent = currentPhase?.description ?? "";
  currentPhaseEl.parentElement?.classList.toggle("active", Boolean(currentPhase));
  phaseTimeEl.textContent = formatTime(phaseRemaining);
  countdownEl.textContent = formatTime(remainingSeconds);
  const phaseDuration = phaseDurations[currentPhaseIndex] ?? 0;
  const phaseProgressPercent = phaseDuration
    ? Math.min(100, Math.max(0, ((phaseDuration - phaseRemaining) / phaseDuration) * 100))
    : 0;
  const progressPercent = totalSeconds
    ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
    : 0;
  phaseTimeProgressFill.style.width = `${phaseProgressPercent}%`;
  phaseTimeProgressFill.setAttribute("aria-valuenow", Math.round(phaseProgressPercent).toString());
  overallProgressFill.style.width = `${progressPercent}%`;
  overallProgressFill.setAttribute("aria-valuenow", Math.round(progressPercent).toString());
  renderPhaseList();
};

const resetTimer = () => {
  clearInterval(timerId);
  isRunning = false;
  startPauseBtn.textContent = "Start";
  totalSeconds = Math.round(Number(timeSlider.value) * 3600);
  remainingSeconds = totalSeconds;
  currentPhaseIndex = 0;
  buildPhaseDurations();
  phaseRemaining = phaseDurations[0];
  updatePhaseDisplay();
};

const tick = () => {
  if (remainingSeconds <= 0) {
    clearInterval(timerId);
    isRunning = false;
    startPauseBtn.textContent = "Start";
    remainingSeconds = 0;
    phaseRemaining = 0;
    updatePhaseDisplay();
    return;
  }

  remainingSeconds -= 1;
  if (phaseRemaining > 0) {
    phaseRemaining -= 1;
  }

  if (phaseRemaining <= 0 && currentPhaseIndex < phases.length - 1) {
    currentPhaseIndex += 1;
    phaseRemaining = phaseDurations[currentPhaseIndex];
  }

  updatePhaseDisplay();
};

startPauseBtn.addEventListener("click", () => {
  if (!isRunning) {
    isRunning = true;
    startPauseBtn.textContent = "Stop";
    timerId = setInterval(tick, 1000);
  } else {
    isRunning = false;
    startPauseBtn.textContent = "Start";
    clearInterval(timerId);
  }
});

resetBtn.addEventListener("click", resetTimer);

skipBtn.addEventListener("click", () => {
  if (currentPhaseIndex >= phases.length - 1) {
    return;
  }
  const skippedTime = phaseRemaining;
  phaseRemaining = 0;
  const secondaryIndex = phases.length - 1;
  phaseDurations[secondaryIndex] += skippedTime;
  currentPhaseIndex += 1;
  phaseRemaining = phaseDurations[currentPhaseIndex];
  updatePhaseDisplay();
});

timeSlider.addEventListener("input", () => {
  updateTotalLabel();
  if (!isRunning) {
    resetTimer();
  }
});

promptBtn.addEventListener("click", async () => {
  const originalLabel = promptBtn.textContent;
  promptBtn.disabled = true;
  promptBtn.textContent = "Generating...";

  try {
    promptText.textContent = await getAiPrompt();
  } catch {
    promptText.textContent = getFallbackPrompt();
  } finally {
    promptBtn.disabled = false;
    promptBtn.textContent = originalLabel;
  }
});

updateTotalLabel();
resetTimer();
