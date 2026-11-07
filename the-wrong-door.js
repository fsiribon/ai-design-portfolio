const game = document.querySelector("#game");
const openingScreen = document.querySelector("#opening-screen");
const hallwayOneScreen = document.querySelector("#hallway-one-screen");
const hallwayTwoScreen = document.querySelector("#hallway-two-screen");
const hallwayThreeScreen = document.querySelector("#hallway-three-screen");
const failedScreen = document.querySelector("#failed-screen");
const endingScreen = document.querySelector("#ending-screen");
const startButton = document.querySelector("#start-button");
const startOverButton = document.querySelector("#start-over-button");
const playAgainButton = document.querySelector("#play-again-button");
const endingTitle = document.querySelector("#ending-title");
const endingDoorNumber = document.querySelector("#ending-door-number");
const endingQuestion = document.querySelector("#ending-question");
const stageOneFeedback = document.querySelector("#stage-one-feedback");
const stageTwoFeedback = document.querySelector("#stage-two-feedback");
const stageThreeFeedback = document.querySelector("#stage-three-feedback");
const stageTwoLeftDoor = document.querySelector("#stage-two-left-door");
const stageThreeHomeDoor = document.querySelector("#stage-three-home-door");
const stageThreeExitSign = document.querySelector("#stage-three-exit-sign");
const stageThreeExitArrow = document.querySelector("#stage-three-exit-arrow");
const stageOneDoors = [...document.querySelectorAll('[data-stage="1"]')];
const stageTwoDoors = [...document.querySelectorAll('[data-stage="2"]')];
const stageThreeDoors = [...document.querySelectorAll('[data-stage="3"]')];
const allDoors = [...stageOneDoors, ...stageTwoDoors, ...stageThreeDoors];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const DEFAULT_FEEDBACK = "Find the door that moves you forward.";
const stageData = {
  1: {
    screen: hallwayOneScreen,
    doors: stageOneDoors,
    feedback: stageOneFeedback,
    correctDoor: "102",
    state: "hallway-one",
  },
  2: {
    screen: hallwayTwoScreen,
    doors: stageTwoDoors,
    feedback: stageTwoFeedback,
    correctDoor: "203",
    state: "hallway-two",
  },
  3: {
    screen: hallwayThreeScreen,
    doors: stageThreeDoors,
    feedback: stageThreeFeedback,
    correctDoor: "UNKNOWN",
    state: "hallway-three",
  },
};

let isResolving = false;
const feedbackTimers = new Map();

function wait(standardDuration, reducedDuration = 40) {
  const duration = reducedMotion.matches ? reducedDuration : standardDuration;
  return new Promise((resolve) => window.setTimeout(resolve, duration));
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
    door.classList.remove("is-selected", "is-opening");
  });
  screen.removeAttribute("data-phase");
  screen.querySelector(".hallway").style.removeProperty("--passage-x");
}

function setFeedback(feedback, message, atmospheric = false) {
  const timer = feedbackTimers.get(feedback);
  if (timer) window.clearTimeout(timer);
  feedbackTimers.delete(feedback);
  feedback.textContent = message;
  feedback.classList.toggle("is-atmospheric", atmospheric);
}

function resetFeedbackLater(feedback, delay = 1400) {
  const timer = window.setTimeout(() => {
    feedback.textContent = DEFAULT_FEEDBACK;
    feedback.classList.remove("is-atmospheric");
    feedbackTimers.delete(feedback);
  }, delay);
  feedbackTimers.set(feedback, timer);
}

function setPassageOrigin(screen, doors, selectedDoor) {
  const doorIndex = doors.indexOf(selectedDoor);
  const origin = ((doorIndex + 0.5) / doors.length) * 100;
  screen.querySelector(".hallway").style.setProperty("--passage-x", `${origin}%`);
}

function resetStageTwoNumber() {
  stageTwoLeftDoor.querySelector(".door__number").textContent = "201";
  stageTwoLeftDoor.setAttribute("aria-label", "Door 201");
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

function showOpening() {
  isResolving = false;
  feedbackTimers.forEach((timer) => window.clearTimeout(timer));
  feedbackTimers.clear();

  Object.values(stageData).forEach(({ screen, doors, feedback }) => {
    clearDoorFeedback(screen, doors);
    setDoorsEnabled(doors, true);
    setFeedback(feedback, DEFAULT_FEEDBACK);
  });

  resetStageTwoNumber();
  resetStageThree();
  resetEnding();
  hideAllScreens();
  openingScreen.hidden = false;
  game.dataset.state = "opening";
  focusNext(startButton);
}

function showHallwayOne() {
  const { screen, doors, feedback, state } = stageData[1];
  hideAllScreens();
  screen.hidden = false;
  clearDoorFeedback(screen, doors);
  setDoorsEnabled(doors, true);
  setFeedback(feedback, DEFAULT_FEEDBACK);
  game.dataset.state = state;
  focusNext(doors[0]);
}

async function arriveAtHallway(stage) {
  const { screen, doors, feedback, state } = stageData[stage];
  hideAllScreens();
  screen.hidden = false;
  clearDoorFeedback(screen, doors);
  setDoorsEnabled(doors, false);
  setFeedback(feedback, "The hallway continues.", true);
  screen.dataset.phase = "arrival";
  game.dataset.state = state;

  await wait(520, 220);

  screen.removeAttribute("data-phase");
  setDoorsEnabled(doors, true);
  isResolving = false;
  focusNext(doors[0]);
  resetFeedbackLater(feedback);
}

function showFailed() {
  hideAllScreens();
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

async function resolveWrongDoor(stage, selectedDoor) {
  const { screen, doors, feedback } = stageData[stage];

  setPassageOrigin(screen, doors, selectedDoor);
  setFeedback(feedback, "");
  await wait(120, 70);
  selectedDoor.classList.add("is-opening");
  screen.dataset.phase = "passage";

  await wait(820, 260);
  await wait(360, 160);
  showFailed();
}

async function resolveCorrectDoor(stage, selectedDoor) {
  const { screen, doors, feedback } = stageData[stage];

  setPassageOrigin(screen, doors, selectedDoor);
  setFeedback(feedback, stage === 3 ? "" : "The hallway continues.", true);
  await wait(120, 70);
  selectedDoor.classList.add("is-opening");
  screen.dataset.phase = "passage";

  await wait(820, 260);

  if (stage === 1) {
    await arriveAtHallway(2);
    return;
  }

  if (stage === 2) {
    await arriveAtHallway(3);
    return;
  }

  await wait(360, 160);
  await showEnding();
  isResolving = false;
}

async function chooseDoor(event) {
  if (isResolving) return;

  const selectedDoor = event.currentTarget;
  const stage = Number(selectedDoor.dataset.stage);
  const doorBehavior = selectedDoor.dataset.door;
  const { doors, feedback, correctDoor } = stageData[stage];

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

startButton.addEventListener("click", showHallwayOne);
startOverButton.addEventListener("click", showOpening);
playAgainButton.addEventListener("click", showOpening);
allDoors.forEach((door) => door.addEventListener("click", chooseDoor));
