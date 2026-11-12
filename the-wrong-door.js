const game = document.querySelector("#game");
const openingScreen = document.querySelector("#opening-screen");
const hallwayOneScreen = document.querySelector("#hallway-one-screen");
const hallwayTwoScreen = document.querySelector("#hallway-two-screen");
const hallwayThreeScreen = document.querySelector("#hallway-three-screen");
const hallwayOne = hallwayOneScreen.querySelector(".hallway");
const failedScreen = document.querySelector("#failed-screen");
const endingScreen = document.querySelector("#ending-screen");
const startButton = document.querySelector("#start-button");
const startOverButton = document.querySelector("#start-over-button");
const playAgainButton = document.querySelector("#play-again-button");
const soundToggle = document.querySelector("#sound-toggle");
const endingTitle = document.querySelector("#ending-title");
const endingDoorNumber = document.querySelector("#ending-door-number");
const endingQuestion = document.querySelector("#ending-question");
const failedHint = document.querySelector("#failed-hint");
const stageOneFeedback = document.querySelector("#stage-one-feedback");
const stageTwoFeedback = document.querySelector("#stage-two-feedback");
const stageThreeFeedback = document.querySelector("#stage-three-feedback");
const stageTwo201Door = document.querySelector('[data-stage="2"][data-door="201"]');
const stageTwoExitSign = hallwayTwoScreen.querySelector(".exit-sign");
const stageThreeHomeDoor = document.querySelector("#stage-three-home-door");
const stageThreeExitSign = document.querySelector("#stage-three-exit-sign");
const stageThreeExitArrow = document.querySelector("#stage-three-exit-arrow");
const stageOneDoors = [...document.querySelectorAll('[data-stage="1"]')];
const stageTwoDoors = [...document.querySelectorAll('[data-stage="2"]')];
const stageThreeDoors = [...document.querySelectorAll('[data-stage="3"]')];
const allDoors = [...stageOneDoors, ...stageTwoDoors, ...stageThreeDoors];
const introChapters = [...document.querySelectorAll("[data-intro-chapter]")];
const introProgressLinks = [...document.querySelectorAll("[data-intro-link]")];
const introArrivalTitle = document.querySelector("#game-title");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const DEFAULT_FEEDBACK = "Find the door that moves you forward.";
const failureHints = {
  1: "The hallway speaks through light, lines, and thresholds.",
  2: "A sign can be true and still mislead you.",
  3: "What feels like home may only remember it.",
};
const stageData = {
  1: {
    screen: hallwayOneScreen,
    doors: stageOneDoors,
    feedback: stageOneFeedback,
    correctDoor: "102",
    defaultFeedback: "Observe the thresholds, reflections, and light.",
    state: "hallway-one",
  },
  2: {
    screen: hallwayTwoScreen,
    doors: stageTwoDoors,
    feedback: stageTwoFeedback,
    correctDoor: "203",
    defaultFeedback: "Question which clue belongs to the architecture.",
    state: "hallway-two",
  },
  3: {
    screen: hallwayThreeScreen,
    doors: stageThreeDoors,
    feedback: stageThreeFeedback,
    correctDoor: "UNKNOWN",
    defaultFeedback: "Do not trust what feels familiar.",
    state: "hallway-three",
  },
};
const stageDoorRows = {
  1: hallwayOneScreen.querySelector(".door-row"),
  2: hallwayTwoScreen.querySelector(".door-row"),
  3: hallwayThreeScreen.querySelector(".door-row"),
};
const previousDoorOrders = new Map();

let isResolving = false;
let soundEnabled = false;
let audioContext = null;
let masterGain = null;
let masterCompressor = null;
let ambientSource = null;
let ambientGain = null;
let ambientFilter = null;
let ambientHumSource = null;
let ambientHumGain = null;
let fadingAmbientSource = null;
let fadingAmbientHumSource = null;
let ambientMixTimer = null;
let currentAmbientStage = 1;
const feedbackTimers = new Map();
const activeSoundSources = new Set();
const ambientMixByStage = {
  1: { noise: 0.022, cutoff: 360, hum: 0.0036, humFrequency: 78 },
  2: { noise: 0.025, cutoff: 430, hum: 0.0041, humFrequency: 82 },
  3: { noise: 0.028, cutoff: 510, hum: 0.0047, humFrequency: 86 },
};
const hallwayOneAnomalyClasses = [
  "is-anomaly-reflection",
  "is-anomaly-shadow",
  "is-anomaly-depth",
  "is-anomaly-distant",
];

let hallwayOneAnomalyTimer = null;
let hallwayOneAnomalyEndTimer = null;

function wait(standardDuration, reducedDuration = 40) {
  const duration = reducedMotion.matches ? reducedDuration : standardDuration;
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function stopHallwayOneAnomalies() {
  window.clearTimeout(hallwayOneAnomalyTimer);
  window.clearTimeout(hallwayOneAnomalyEndTimer);
  hallwayOneAnomalyTimer = null;
  hallwayOneAnomalyEndTimer = null;
  hallwayOne.classList.remove(...hallwayOneAnomalyClasses);
}

function scheduleHallwayOneAnomaly() {
  window.clearTimeout(hallwayOneAnomalyTimer);

  if (
    reducedMotion.matches ||
    hallwayOneScreen.hidden ||
    game.dataset.state !== "hallway-one"
  ) {
    return;
  }

  const delay = 12000 + Math.random() * 8000;
  hallwayOneAnomalyTimer = window.setTimeout(() => {
    hallwayOneAnomalyTimer = null;

    if (
      reducedMotion.matches ||
      hallwayOneScreen.hidden ||
      game.dataset.state !== "hallway-one" ||
      isResolving
    ) {
      scheduleHallwayOneAnomaly();
      return;
    }

    const anomalyClass =
      hallwayOneAnomalyClasses[
        Math.floor(Math.random() * hallwayOneAnomalyClasses.length)
      ];
    const duration = 1050 + Math.random() * 500;

    hallwayOne.classList.add(anomalyClass);
    hallwayOneAnomalyEndTimer = window.setTimeout(() => {
      hallwayOne.classList.remove(anomalyClass);
      hallwayOneAnomalyEndTimer = null;
      scheduleHallwayOneAnomaly();
    }, duration);
  }, delay);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function getAudioOutput(context) {
  if (masterGain && masterCompressor) return masterGain;

  masterGain = context.createGain();
  masterCompressor = context.createDynamicsCompressor();
  masterGain.gain.value = soundEnabled ? 0.92 : 0.0001;
  masterCompressor.threshold.value = -12;
  masterCompressor.knee.value = 9;
  masterCompressor.ratio.value = 5;
  masterCompressor.attack.value = 0.004;
  masterCompressor.release.value = 0.18;
  masterGain.connect(masterCompressor).connect(context.destination);
  return masterGain;
}

function trackSoundSource(source) {
  activeSoundSources.add(source);
  source.addEventListener("ended", () => activeSoundSources.delete(source), { once: true });
}

function stopActiveSoundSources() {
  if (!audioContext) return;

  activeSoundSources.forEach((source) => {
    try {
      source.stop(audioContext.currentTime + 0.015);
    } catch {
      // A source that already ended needs no additional cleanup.
    }
  });
  activeSoundSources.clear();
}

function createNoiseBuffer(context, duration = 0.08) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.72 + white * 0.28;
    data[index] = previous;
  }

  return buffer;
}

function scheduleNoiseBurst(when, duration, frequency, volume) {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = createNoiseBuffer(context, duration);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, when);
  filter.Q.setValueAtTime(0.7, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  source.connect(filter).connect(gain).connect(getAudioOutput(context));
  trackSoundSource(source);
  source.start(when);
}

function getAmbientMix(stage = currentAmbientStage) {
  return ambientMixByStage[stage] || ambientMixByStage[1];
}

function applyAmbientMix(stage = currentAmbientStage, timeConstant = 0.16) {
  currentAmbientStage = stage;
  if (!audioContext || !soundEnabled) return;

  const mix = getAmbientMix(stage);
  const now = audioContext.currentTime;
  ambientGain?.gain.setTargetAtTime(mix.noise, now, timeConstant);
  ambientFilter?.frequency.setTargetAtTime(mix.cutoff, now, timeConstant);
  ambientHumGain?.gain.setTargetAtTime(mix.hum, now, timeConstant);
  ambientHumSource?.frequency.setTargetAtTime(mix.humFrequency, now, timeConstant);
}

function setAmbientStage(stage) {
  window.clearTimeout(ambientMixTimer);
  ambientMixTimer = null;
  applyAmbientMix(stage);
}

function accentAmbient(multiplier, duration = 700) {
  if (!audioContext || !soundEnabled || !ambientGain) return;

  window.clearTimeout(ambientMixTimer);
  const mix = getAmbientMix();
  ambientGain.gain.setTargetAtTime(
    Math.max(0.0001, mix.noise * multiplier),
    audioContext.currentTime,
    0.055,
  );
  ambientMixTimer = window.setTimeout(() => {
    ambientMixTimer = null;
    applyAmbientMix(currentAmbientStage, 0.12);
  }, duration);
}

function startAmbientSound() {
  const context = getAudioContext();
  if (!context || ambientSource) return;

  if (fadingAmbientSource) {
    try {
      fadingAmbientSource.stop(context.currentTime);
    } catch {
      // It may have completed its scheduled fade already.
    }
    fadingAmbientSource = null;
  }
  if (fadingAmbientHumSource) {
    try {
      fadingAmbientHumSource.stop(context.currentTime);
    } catch {
      // It may have completed its scheduled fade already.
    }
    fadingAmbientHumSource = null;
  }

  ambientSource = context.createBufferSource();
  ambientGain = context.createGain();
  ambientFilter = context.createBiquadFilter();
  ambientHumSource = context.createOscillator();
  ambientHumGain = context.createGain();
  const mix = getAmbientMix();
  const now = context.currentTime;

  ambientSource.buffer = createNoiseBuffer(context, 2);
  ambientSource.loop = true;
  ambientFilter.type = "lowpass";
  ambientFilter.frequency.value = mix.cutoff;
  ambientHumSource.type = "sine";
  ambientHumSource.frequency.value = mix.humFrequency;
  ambientGain.gain.setValueAtTime(0.0001, now);
  ambientGain.gain.setTargetAtTime(mix.noise, now, 0.18);
  ambientHumGain.gain.setValueAtTime(0.0001, now);
  ambientHumGain.gain.setTargetAtTime(mix.hum, now, 0.22);
  ambientSource
    .connect(ambientFilter)
    .connect(ambientGain)
    .connect(getAudioOutput(context));
  ambientHumSource.connect(ambientHumGain).connect(getAudioOutput(context));
  ambientSource.start(now);
  ambientHumSource.start(now);
}

function stopAmbientSound() {
  if (!audioContext || !ambientSource || !ambientGain) return;
  const source = ambientSource;
  const gain = ambientGain;
  const humSource = ambientHumSource;
  const humGain = ambientHumGain;
  ambientSource = null;
  ambientGain = null;
  ambientFilter = null;
  ambientHumSource = null;
  ambientHumGain = null;
  fadingAmbientSource = source;
  fadingAmbientHumSource = humSource;
  const stopAt = audioContext.currentTime + 0.24;
  gain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.055);
  humGain?.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.055);
  source.stop(stopAt);
  humSource?.stop(stopAt);
  window.setTimeout(() => {
    if (fadingAmbientSource === source) fadingAmbientSource = null;
    if (fadingAmbientHumSource === humSource) fadingAmbientHumSource = null;
  }, 280);
}

function playFootsteps(duration = 950, targetScale = 0.75) {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  const count = 6;

  for (let index = 0; index < count; index += 1) {
    const progress = index / Math.max(1, count - 1);
    const when = context.currentTime + 0.08 + progress * (duration / 1000) * 0.78;
    const depthAttenuation = (1 - targetScale) * 0.022;
    const volume = Math.max(0.026, 0.058 - progress * (0.018 + depthAttenuation));
    const frequency = 430 + progress * 120;
    scheduleNoiseBurst(when, 0.072, frequency, volume);
    scheduleNoiseBurst(when + 0.047, 0.082, frequency * 0.68, volume * 0.18);
  }
}

function playHandleSound() {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(980, now);
  oscillator.frequency.exponentialRampToValueAtTime(430, now + 0.07);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.052, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  oscillator.connect(gain).connect(getAudioOutput(context));
  trackSoundSource(oscillator);
  oscillator.start(now);
  oscillator.stop(now + 0.1);
  scheduleNoiseBurst(now, 0.045, 1550, 0.019);
}

function playDoorTone(isCorrect, now) {
  const context = getAudioContext();
  if (!context || !soundEnabled) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(isCorrect ? 172 : 74, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    isCorrect ? 238 : 52,
    now + (isCorrect ? 0.52 : 0.38),
  );
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(isCorrect ? 0.018 : 0.027, now + 0.055);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (isCorrect ? 0.62 : 0.48));
  oscillator.connect(gain).connect(getAudioOutput(context));
  trackSoundSource(oscillator);
  oscillator.start(now);
  oscillator.stop(now + (isCorrect ? 0.66 : 0.52));
}

function playDoorSound(isCorrect) {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  scheduleNoiseBurst(now, 0.34, isCorrect ? 235 : 118, isCorrect ? 0.029 : 0.036);
  scheduleNoiseBurst(now + 0.075, 0.24, isCorrect ? 390 : 82, isCorrect ? 0.012 : 0.017);
  playDoorTone(isCorrect, now);
  accentAmbient(isCorrect ? 1.14 : 0.18, isCorrect ? 820 : 4000);
}

function playDoorCloseSound() {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  scheduleNoiseBurst(now, 0.2, 96, 0.078);
  scheduleNoiseBurst(now + 0.035, 0.12, 240, 0.022);
}

async function toggleSound() {
  const context = getAudioContext();
  if (!context) {
    soundToggle.disabled = true;
    soundToggle.textContent = "Sound unavailable";
    return;
  }

  if (context.state === "suspended") await context.resume();
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "Sound on" : "Sound off";

  const output = getAudioOutput(context);
  if (soundEnabled) {
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(0.92, context.currentTime, 0.055);
    startAmbientSound();
  } else {
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(0.0001, context.currentTime, 0.025);
    stopAmbientSound();
    stopActiveSoundSources();
  }
}

function hideAllScreens() {
  openingScreen.hidden = true;
  hallwayOneScreen.hidden = true;
  hallwayTwoScreen.hidden = true;
  hallwayThreeScreen.hidden = true;
  failedScreen.hidden = true;
  endingScreen.hidden = true;
}

function setDoorsEnabled(doors, enabled) {
  doors.forEach((door) => {
    door.disabled = !enabled;
  });
}

function clearDoorFeedback(screen, doors) {
  doors.forEach((door) => {
    door.classList.remove(
      "is-selected",
      "is-reaching",
      "is-opening",
      "is-correct-opening",
      "is-wrong-opening",
      "is-closing",
    );
  });
  screen.removeAttribute("data-phase");
  screen.removeAttribute("aria-busy");
  const hallway = screen.querySelector(".hallway");
  const player = hallway.querySelector(".player-figure");
  hallway.style.removeProperty("--passage-x");
  player.style.removeProperty("--run-x");
  player.style.removeProperty("--run-y");
  player.style.removeProperty("--run-scale");
  player.style.removeProperty("--run-duration");
  player.classList.remove(
    "is-running",
    "is-arrived",
    "is-entering",
    "is-hesitating",
  );
}

function setFeedback(feedback, message, atmospheric = false) {
  const timer = feedbackTimers.get(feedback);
  if (timer) window.clearTimeout(timer);
  feedbackTimers.delete(feedback);
  feedback.textContent = message;
  feedback.classList.toggle("is-atmospheric", atmospheric);
}

function resetFeedbackLater(feedback, message = DEFAULT_FEEDBACK, delay = 1400) {
  const timer = window.setTimeout(() => {
    feedback.textContent = message;
    feedback.classList.remove("is-atmospheric");
    feedbackTimers.delete(feedback);
  }, delay);
  feedbackTimers.set(feedback, timer);
}

function setPassageOrigin(screen, doors, selectedDoor) {
  const hallway = screen.querySelector(".hallway");
  const hallwayBounds = hallway.getBoundingClientRect();
  const doorBounds = selectedDoor.getBoundingClientRect();
  const doorCenter = doorBounds.left + doorBounds.width / 2;
  const origin = ((doorCenter - hallwayBounds.left) / hallwayBounds.width) * 100;
  hallway.style.setProperty("--passage-x", `${origin}%`);
}

function setPlayerTarget(screen, selectedDoor) {
  const hallway = screen.querySelector(".hallway");
  const player = hallway.querySelector(".player-figure");
  const hallwayBounds = hallway.getBoundingClientRect();
  const playerBounds = player.getBoundingClientRect();
  const doorBounds = selectedDoor.getBoundingClientRect();
  const playerCenter = playerBounds.left + playerBounds.width / 2;
  const doorCenter = doorBounds.left + doorBounds.width / 2;
  const playerFeet = playerBounds.bottom - hallwayBounds.top;
  const doorThreshold = doorBounds.bottom - hallwayBounds.top - Math.max(2, doorBounds.height * 0.015);
  const relativeDoorHeight = doorBounds.height / hallwayBounds.height;
  const runScale = Math.min(0.9, Math.max(0.55, relativeDoorHeight * 1.6));
  const runDuration = Math.round(
    Math.min(1140, Math.max(900, 940 + (0.56 - relativeDoorHeight) * 720)),
  );
  const runY = doorThreshold - playerFeet;

  player.style.setProperty("--run-x", `${doorCenter - playerCenter}px`);
  player.style.setProperty("--run-y", `${runY}px`);
  player.style.setProperty("--run-scale", runScale.toFixed(3));
  player.style.setProperty("--run-duration", `${runDuration}ms`);
  return { player, runDuration, runScale };
}

function resetStageTwoNumber() {
  stageTwo201Door.querySelector(".door__number").textContent = "201";
  stageTwo201Door.setAttribute("aria-label", "Door 201");
}

function shuffledDoorOrder(doors, previousOrder) {
  let shuffled;
  let orderKey;

  do {
    shuffled = [...doors];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    orderKey = shuffled.map((door) => door.dataset.door).join("|");
  } while (doors.length > 1 && orderKey === previousOrder);

  return { shuffled, orderKey };
}

function randomizeStageDoorOrder(stage) {
  const doors = stageData[stage].doors;
  const { shuffled, orderKey } = shuffledDoorOrder(doors, previousDoorOrders.get(stage));

  shuffled.forEach((door) => stageDoorRows[stage].append(door));
  doors.splice(0, doors.length, ...shuffled);
  previousDoorOrders.set(stage, orderKey);
}

function positionExitSign(stage, doorIdentity, sign) {
  const doors = stageData[stage].doors;
  const doorIndex = doors.findIndex((door) => door.dataset.door === doorIdentity);
  const positions = ["left", "center", "right"];
  const arrows = ["←", "↓", "→"];
  const position = positions[doorIndex];
  const arrow = arrows[doorIndex];
  const arrowElement = sign.querySelector("span");
  const doorLabel = doorIdentity === "UNKNOWN" ? "unknown" : doorIdentity;
  const accessibleDirection =
    position === "center"
      ? `Exit sign points down toward the center Door ${doorLabel}`
      : `Exit sign points ${position} toward Door ${doorLabel}`;

  sign.dataset.position = position;
  sign.setAttribute("aria-label", accessibleDirection);
  arrowElement.textContent = arrow;
}

function randomizeRunLayout() {
  [1, 2, 3].forEach(randomizeStageDoorOrder);
  positionExitSign(2, "203", stageTwoExitSign);
  positionExitSign(3, "EXIT", stageThreeExitSign);
}

function setStageThreeClue(doorWithClue = null) {
  stageThreeDoors.forEach((door) => door.classList.remove("door--clue"));
  if (doorWithClue) doorWithClue.classList.add("door--clue");
}

function resetStageThree() {
  stageThreeHomeDoor.querySelector(".door__number").textContent = "HOME";
  stageThreeHomeDoor.setAttribute("aria-label", "Door HOME");
  stageThreeExitArrow.textContent = "↓";
  stageThreeExitSign.setAttribute("aria-label", "Exit sign points toward the EXIT door");
  setStageThreeClue(stageThreeHomeDoor);
}

function resetEnding() {
  endingDoorNumber.textContent = "27";
  endingDoorNumber.classList.remove("is-changing");
  endingQuestion.hidden = true;
  playAgainButton.hidden = true;
}

function focusNext(element) {
  window.requestAnimationFrame(() => element.focus());
}

function setActiveIntroChapter(chapterName) {
  introProgressLinks.forEach((link) => {
    const isActive = link.dataset.introLink === chapterName;
    link.toggleAttribute("aria-current", isActive);
  });
}

function resetIntroExperience() {
  openingScreen.classList.remove("is-entering-game");
  introChapters.forEach((chapter, index) => {
    chapter.classList.toggle("is-visible", index === 0);
  });
  setActiveIntroChapter("arrival");
}

function showOpening() {
  isResolving = false;
  stopHallwayOneAnomalies();
  setAmbientStage(1);
  feedbackTimers.forEach((timer) => window.clearTimeout(timer));
  feedbackTimers.clear();

  Object.values(stageData).forEach(({ screen, doors, feedback, defaultFeedback }) => {
    clearDoorFeedback(screen, doors);
    setDoorsEnabled(doors, true);
    setFeedback(feedback, defaultFeedback);
  });

  resetStageTwoNumber();
  resetStageThree();
  resetEnding();
  resetIntroExperience();
  failedHint.hidden = true;
  failedHint.textContent = "";
  hideAllScreens();
  openingScreen.hidden = false;
  game.dataset.state = "opening";
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  focusNext(introArrivalTitle);
}

function startNewRun() {
  showOpening();
  randomizeRunLayout();
}

async function beginGameplay() {
  if (isResolving) return;
  isResolving = true;
  game.dataset.state = "intro-transition";
  openingScreen.classList.add("is-entering-game");
  await wait(1180, 280);
  isResolving = false;
  showHallwayOne();
}

function showHallwayOne() {
  const { screen, doors, feedback, defaultFeedback, state } = stageData[1];
  hideAllScreens();
  window.scrollTo({ top: 0, behavior: "auto" });
  screen.hidden = false;
  clearDoorFeedback(screen, doors);
  setDoorsEnabled(doors, true);
  setFeedback(feedback, defaultFeedback);
  game.dataset.state = state;
  setAmbientStage(1);
  focusNext(doors[0]);
  scheduleHallwayOneAnomaly();
}

async function arriveAtHallway(stage) {
  const { screen, doors, feedback, defaultFeedback, state } = stageData[stage];
  hideAllScreens();
  screen.hidden = false;
  clearDoorFeedback(screen, doors);
  setDoorsEnabled(doors, false);
  setFeedback(feedback, "The hallway continues.", true);
  screen.dataset.phase = "arrival";
  game.dataset.state = state;
  setAmbientStage(stage);

  await wait(520, 220);

  screen.removeAttribute("data-phase");
  setDoorsEnabled(doors, true);
  isResolving = false;
  focusNext(doors[0]);
  resetFeedbackLater(feedback, defaultFeedback);
}

function showFailed(stage) {
  hideAllScreens();
  failedHint.textContent = failureHints[stage];
  failedHint.hidden = false;
  failedScreen.hidden = false;
  game.dataset.state = "failed";
  isResolving = false;
  focusNext(startOverButton);
}

async function showEnding() {
  hideAllScreens();
  resetEnding();
  endingScreen.hidden = false;
  game.dataset.state = "ending";
  focusNext(endingTitle);

  await wait(900, 320);
  endingDoorNumber.classList.add("is-changing");
  await wait(220, 100);
  endingDoorNumber.textContent = "28";
  endingDoorNumber.classList.remove("is-changing");

  await wait(820, 280);
  endingQuestion.hidden = false;
  playAgainButton.hidden = false;
  game.dataset.state = "ending-complete";
  focusNext(playAgainButton);
}

async function approachSelectedDoor(stage, selectedDoor, isCorrect) {
  const { screen, doors, feedback } = stageData[stage];
  const { player, runDuration, runScale } = setPlayerTarget(screen, selectedDoor);

  setPassageOrigin(screen, doors, selectedDoor);
  screen.setAttribute("aria-busy", "true");
  setFeedback(feedback, "Moving toward the door.", true);
  await wait(140, 60);

  screen.dataset.phase = "running";
  player.classList.add("is-running");
  playFootsteps(runDuration, runScale);
  await wait(runDuration, 160);

  player.classList.add("is-arrived");
  screen.dataset.phase = "door-open";
  selectedDoor.classList.add("is-reaching");
  playHandleSound();
  await wait(180, 70);

  selectedDoor.classList.add(
    "is-opening",
    isCorrect ? "is-correct-opening" : "is-wrong-opening",
  );
  playDoorSound(isCorrect);
  setFeedback(feedback, "");
  await wait(420, 180);

  return player;
}

async function resolveWrongDoor(stage, selectedDoor) {
  const { screen } = stageData[stage];
  const player = await approachSelectedDoor(stage, selectedDoor, false);

  player.classList.add("is-hesitating");
  await wait(300, 120);
  selectedDoor.classList.add("is-closing");
  playDoorCloseSound();
  await wait(340, 140);

  screen.dataset.phase = "passage";
  await wait(360, 180);
  showFailed(stage);
}

async function resolveCorrectDoor(stage, selectedDoor) {
  const { screen, feedback } = stageData[stage];
  const player = await approachSelectedDoor(stage, selectedDoor, true);

  player.classList.add("is-entering");
  await wait(320, 160);
  setFeedback(feedback, stage === 3 ? "" : "The hallway continues.", true);
  screen.dataset.phase = "passage";
  await wait(720, 240);

  if (stage === 1) {
    await arriveAtHallway(2);
    return;
  }

  if (stage === 2) {
    await arriveAtHallway(3);
    return;
  }

  await showEnding();
  isResolving = false;
}

async function chooseDoor(event) {
  if (isResolving) return;

  const selectedDoor = event.currentTarget;
  const stage = Number(selectedDoor.dataset.stage);
  const doorBehavior = selectedDoor.dataset.door;
  const { doors, feedback, correctDoor } = stageData[stage];

  if (stage === 1) stopHallwayOneAnomalies();

  isResolving = true;
  setDoorsEnabled(doors, false);
  selectedDoor.classList.add("is-selected");
  setFeedback(feedback, "");

  if (doorBehavior === correctDoor) {
    await resolveCorrectDoor(stage, selectedDoor);
    return;
  }

  await resolveWrongDoor(stage, selectedDoor);
}

startButton.addEventListener("click", beginGameplay);
startOverButton.addEventListener("click", startNewRun);
playAgainButton.addEventListener("click", startNewRun);
soundToggle.addEventListener("click", toggleSound);
allDoors.forEach((door) => door.addEventListener("click", chooseDoor));

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    stopHallwayOneAnomalies();
    return;
  }

  scheduleHallwayOneAnomaly();
});

if ("IntersectionObserver" in window) {
  const introObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.38) return;
        entry.target.classList.add("is-visible");
        setActiveIntroChapter(entry.target.dataset.introChapter);
      });
    },
    { threshold: [0.38, 0.58, 0.78] },
  );

  introChapters.forEach((chapter) => introObserver.observe(chapter));
}

startNewRun();
