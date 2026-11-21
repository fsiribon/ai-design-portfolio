(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const playfield = document.querySelector("#playfield");
  const hud = document.querySelector("#hud");
  const levelLabel = document.querySelector("#level-label");
  const scoreValue = document.querySelector("#score-value");
  const bestValue = document.querySelector("#best-value");
  const startScreen = document.querySelector("#start-screen");
  const transitionScreen = document.querySelector("#transition-screen");
  const pauseScreen = document.querySelector("#pause-screen");
  const gameOverScreen = document.querySelector("#game-over-screen");
  const transitionKicker = document.querySelector("#transition-kicker");
  const transitionTitle = document.querySelector("#transition-title");
  const transitionSubtitle = document.querySelector("#transition-subtitle");
  const transitionNote = document.querySelector("#transition-note");
  const transitionRule = document.querySelector("#transition-rule");
  const transitionObjective = document.querySelector("#transition-objective");
  const transitionWarning = document.querySelector("#transition-warning");
  const transitionSymbols = document.querySelector("#transition-symbols");
  const finalScoreValue = document.querySelector("#final-score-value");
  const finalBestValue = document.querySelector("#final-best-value");
  const gameOverReason = document.querySelector("#game-over-reason");
  const announcement = document.querySelector("#announcement");
  const announcementTitle = document.querySelector("#announcement-title");
  const announcementSubtitle = document.querySelector("#announcement-subtitle");
  const gameStatus = document.querySelector("#game-status");
  const startButton = document.querySelector("#start-button");
  const resumeButton = document.querySelector("#resume-button");
  const restartButton = document.querySelector("#restart-button");
  const soundToggle = document.querySelector("#sound-toggle");
  const musicToggle = document.querySelector("#music-toggle");
  const targetLabel = document.querySelector("#target-label");
  const targetProgress = document.querySelector("#target-progress");

  const WORLD_WIDTH = 1280;
  const WORLD_HEIGHT = 720;
  const BOUNDARY = 48;
  const SERPENT_X = 270;
  const INITIAL_SCROLL_SPEED = 118;
  const SPEED_STEP = 11;
  const VERTICAL_SPEED = 235;
  const CONTROL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"]);
  const ELEMENT = Object.freeze({ FIRE: "fire", WATER: "water", GOLD: "gold" });
  const elementRules = Object.freeze({
    1: { target: ELEMENT.FIRE, weights: [[ELEMENT.FIRE, 1]] },
    2: { target: ELEMENT.WATER, weights: [[ELEMENT.WATER, .67], [ELEMENT.FIRE, .33]] },
    3: { target: ELEMENT.GOLD, weights: [[ELEMENT.GOLD, .5], [ELEMENT.WATER, .25], [ELEMENT.FIRE, .25]] },
  });
  const elementNames = Object.freeze({ fire: "Fire", water: "Water", gold: "Gold" });
  const elementGlyphs = Object.freeze({ fire: "🔥", water: "💧", gold: "◆" });

  const GAME_STATE = Object.freeze({
    START: "START",
    INTRO: "INTRO",
    PLAYING: "PLAYING",
    LEVEL_TRANSITION: "LEVEL_TRANSITION",
    PAUSED: "PAUSED",
    DYING: "DYING",
    GAME_OVER: "GAME_OVER",
  });

  const palettes = {
    1: { skyTop: "#0c2530", skyBottom: "#24484c", far: "#17343d", palace: "#132e34", middle: "#102a2d", ground: "#0b2325", foreground: "#06191c", stone: "#162a2b", edge: "#405251", fog: "rgba(142,174,166,.08)", lightning: "rgba(182,218,226,.12)" },
    2: { skyTop: "#101d30", skyBottom: "#293f4d", far: "#182b3b", palace: "#172638", middle: "#111f30", ground: "#0b1b28", foreground: "#060f1c", stone: "#1c2732", edge: "#46505b", fog: "rgba(125,151,166,.075)", lightning: "rgba(185,211,235,.15)" },
    3: { skyTop: "#160f24", skyBottom: "#2b263b", far: "#21182f", palace: "#1a1427", middle: "#130f20", ground: "#0c0d18", foreground: "#05060d", stone: "#211b29", edge: "#514358", fog: "rgba(143,128,157,.07)", lightning: "rgba(198,202,236,.18)" },
  };

  const levelSettings = {
    1: { gapMin: 210, gapMax: 232, widthMin: 88, widthMax: 126, spacingMin: 530, spacingMax: 650, highCenter: 240, lowCenter: 480 },
    2: { gapMin: 176, gapMax: 202, widthMin: 108, widthMax: 152, spacingMin: 430, spacingMax: 555, highCenter: 225, lowCenter: 495 },
    3: { gapMin: 148, gapMax: 174, widthMin: 122, widthMax: 178, spacingMin: 350, spacingMax: 465, highCenter: 210, lowCenter: 510 },
  };

  const environmentSources = {
    1: "Assets/serpent/environment/serpent-kingdom-level-1.jpg",
    2: "Assets/serpent/environment/serpent-kingdom-level-2.jpg",
    3: "Assets/serpent/environment/serpent-kingdom-level-3.jpg",
  };
  const environmentImages = {};
  Object.entries(environmentSources).forEach(([environmentLevel, source]) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    environmentImages[environmentLevel] = image;
  });

  const occupiedWindowPositions = {
    1: [[832, 298], [864, 278], [903, 253], [937, 221], [973, 269], [1005, 309], [1042, 276], [1081, 327], [1124, 294], [1162, 339], [1201, 307]],
    2: [[561, 337], [608, 311], [653, 281], [705, 242], [758, 204], [813, 173], [868, 127], [913, 188], [963, 223], [1012, 249], [1061, 284], [1114, 316], [1171, 282], [1218, 342]],
    3: [[184, 296], [231, 248], [282, 216], [332, 172], [388, 122], [449, 151], [511, 110], [571, 197], [632, 155], [689, 214], [748, 185], [809, 248], [866, 221], [929, 277], [986, 251], [1042, 311], [1107, 286], [1174, 336]],
  };
  const occupiedWindows = Object.fromEntries(Object.entries(occupiedWindowPositions).map(([environmentLevel, positions]) => [
    environmentLevel,
    positions.map(([x, y], index) => ({
      x,
      y,
      width: 2.5 + index % 3,
      height: 6 + index % 4,
      phase: index * 1.73 + Number(environmentLevel) * 0.61,
      rate: 0.12 + (index % 5) * 0.035,
      minimum: 0.08 + (index % 4) * 0.035,
      maximum: 0.28 + (index % 3) * 0.07,
    })),
  ]));

  const input = { up: false, down: false };
  let state = GAME_STATE.START;
  let previousTimestamp = performance.now();
  let worldTime = 0;
  let scrollDistance = 0;
  let level = 1;
  let score = 0;
  let bestScore = loadBestScore();
  let speedTier = 0;
  let introTimer = 0;
  let levelTransitionTimer = 0;
  let levelTransitionPresented = false;
  let deathTimer = 0;
  let collisionGrace = 0;
  let lightningTimer = 7;
  let lightningIntensity = 0;
  let lightningEchoTimer = 0;
  let serpent = null;
  let elements = [];
  let levelProgress = 0;
  let elementSpawnSerial = 0;
  let spawnsSinceTarget = 0;
  let deathReason = "Hit the stone";
  let deathCause = "stone";
  let obstacles = [];
  let particles = [];
  let feedbackWaves = [];
  let scorePopups = [];
  let headGlowTimer = 0;
  let speedPulseTimer = 0;
  let collisionPulseTimer = 0;
  let environmentFromLevel = 1;
  let environmentBlend = 1;
  let announcementTimer = null;
  let obstacleSerial = 0;
  let audioContext = null;
  let masterGain = null;
  let audioEnabled = true;
  let musicEnabled = true;
  let audioStarted = false;
  let horrorAudio = null;
  let musicInstanceCount = 0;
  let musicMode = "silent";
  let nextHissTimer = 7;
  let levelEntryHissTimer = 2.2;
  let approachHissCooldown = 0;
  let tongueAudioActive = false;
  let audioUpdateAccumulator = 0;
  let audioPassedColumns = new WeakSet();
  let fpsWindowStart = performance.now();
  let fpsFrameCount = 0;
  let measuredFps = 0;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clouds = Array.from({ length: 10 }, (_, index) => ({ x: index * 178 + 70, y: 55 + (index % 4) * 42, width: 150 + (index % 3) * 55, opacity: .022 + (index % 4) * .012, phase: index * .9 }));
  const ambientMotes = Array.from({ length: 46 }, (_, index) => ({ x: (index * 193 + 73) % WORLD_WIDTH, y: 120 + ((index * 113 + 41) % 520), radius: .8 + (index % 4) * .45, drift: 8 + (index % 5) * 3, speed: 4 + (index % 6), phase: index * 1.61 }));
  const palaceLights = Array.from({ length: 48 }, (_, index) => ({ worldX: 120 + index * 103, row: index % 4, phase: index * 1.37, frequency: .32 + (index % 7) * .09, mode: index % 4 }));
  const floatingLanterns = Array.from({ length: 15 }, (_, index) => ({
    worldX: 150 + index * 197,
    baseY: 260 + (index % 5) * 57,
    depth: .12 + (index % 4) * .08,
    size: 1.7 + (index % 4) * .65,
    phase: index * 1.91,
    rise: 3.2 + (index % 5) * .7,
  }));

  const livingLightColors = [
    [255, 197, 108],
    [255, 221, 155],
    [231, 157, 77],
    [246, 184, 94],
    [171, 198, 205],
  ];

  const livingAtmosphericLights = Array.from({ length: 24 }, (_, index) => {
    const depth = index < 8 ? "far" : index < 18 ? "mid" : "near";
    const depthIndex = depth === "far" ? index : depth === "mid" ? index - 8 : index - 18;
    const colorIndex = index % 9 === 0 ? 4 : index % 4;
    const baseY = depth === "far"
      ? 142 + (depthIndex % 4) * 64
      : depth === "mid"
        ? 258 + (depthIndex % 5) * 57
        : 286 + (depthIndex % 4) * 82;
    return {
      depth,
      baseX: 74 + ((index * 211 + (index % 3) * 83) % 1320),
      baseY,
      radius: depth === "far" ? 11 + (index % 3) * 3 : depth === "mid" ? 18 + (index % 4) * 4 : 28 + (index % 3) * 7,
      core: depth === "far" ? .55 + (index % 2) * .2 : depth === "mid" ? .8 + (index % 3) * .18 : 1.1 + (index % 2) * .25,
      alpha: depth === "far" ? .055 + (index % 3) * .012 : depth === "mid" ? .07 + (index % 4) * .013 : .058 + (index % 3) * .012,
      parallax: depth === "far" ? .025 + (index % 3) * .006 : depth === "mid" ? .11 + (index % 4) * .013 : .27 + (index % 3) * .025,
      driftX: 4 + (index % 5) * 2.6,
      driftY: 6 + (index % 4) * 3.4,
      driftRate: .045 + (index % 6) * .011,
      pulseRate: .13 + (index % 7) * .019,
      phase: index * 1.873 + .71,
      behindFog: index % 3 !== 1,
      fades: index % 4 === 0 || index % 7 === 0,
      largeDecoy: index >= 8 && (index % 5 === 1 || index % 7 === 0),
      colorIndex,
      color: livingLightColors[colorIndex],
    };
  });

  const livingFogLayers = [
    { name: "upper", y: 118, height: 58, width: 330, alpha: .032, direction: -1, drift: 1.6, parallax: .018, tone: [181, 194, 202], patches: 4, phase: .8 },
    { name: "ridge", y: 246, height: 74, width: 355, alpha: .042, direction: 1, drift: 2.2, parallax: .036, tone: [157, 174, 181], patches: 4, phase: 2.1 },
    { name: "valley", y: 382, height: 88, width: 390, alpha: .056, direction: -1, drift: 3.1, parallax: .075, tone: [145, 165, 168], patches: 4, phase: 3.7 },
    { name: "lower", y: 514, height: 102, width: 420, alpha: .061, direction: 1, drift: 4.3, parallax: .14, tone: [131, 157, 156], patches: 4, phase: 5.2 },
    { name: "column-base", y: 625, height: 76, width: 365, alpha: .052, direction: -1, drift: 5.8, parallax: .23, tone: [119, 145, 143], patches: 5, phase: 6.9 },
  ];
  const livingLightSprites = livingLightColors.map((color) => createLivingLightSprite(color));
  const livingFogTextures = livingFogLayers.map((layer, index) => createLivingFogTexture(layer, index));
  const serpentScaleSprites = {
    dorsal: createSerpentScaleSprite("#2db8c4", "#0b5c73", "#75dce2"),
    side: createSerpentScaleSprite("#2799aa", "#093f58", "#55c8d2"),
    ventral: createSerpentScaleSprite("#91cdd2", "#315f6b", "#c1e6e2", true),
    warm: createSerpentScaleSprite("#d99755", "#6d4c43", "#f3c27e"),
  };

  const audioHooks = Object.freeze({
    ambient: () => emitAudioCue("ambient"),
    collect: (element) => emitAudioCue("collect", { element }),
    wrongElement: (element) => emitAudioCue("wrong-element", { element }),
    speedIncrease: () => emitAudioCue("speed-increase"),
    levelComplete: () => emitAudioCue("level-complete"),
    collision: () => emitAudioCue("collision"),
    gameOver: () => emitAudioCue("game-over"),
  });

  class LivingSerpent {
    constructor() {
      this.x = SERPENT_X;
      this.y = WORLD_HEIGHT / 2;
      this.angle = 0;
      this.verticalVelocity = 0;
      this.headRadius = 14;
      this.segmentSpacing = 6;
      this.alpha = 1;
      this.pendingGrowth = 0;
      this.growthProgress = 0;
      this.body = Array.from({ length: 25 }, (_, index) => ({ x: this.x - index * this.segmentSpacing, y: this.y }));
    }

    resetPosition() {
      this.x = SERPENT_X;
      this.y = WORLD_HEIGHT / 2;
      this.angle = 0;
      this.verticalVelocity = 0;
      this.alpha = 1;
      this.body.forEach((segment, index) => { segment.x = this.x - index * this.segmentSpacing; segment.y = this.y; });
    }

    grow(amount = 4) {
      this.pendingGrowth += amount;
    }

    updateGrowth(delta) {
      if (this.pendingGrowth <= 0) return;
      this.growthProgress += delta * 8;
      while (this.pendingGrowth > 0 && this.growthProgress >= 1) {
        const tail = this.body[this.body.length - 1];
        this.body.push({ x: tail.x, y: tail.y });
        this.pendingGrowth -= 1;
        this.growthProgress -= 1;
      }
    }

    update(delta) {
      this.updateGrowth(delta);
      const verticalDirection = Number(input.down) - Number(input.up);
      const steeringSpeed = VERTICAL_SPEED + Math.min(speedTier * 5, 28);
      const targetVelocity = verticalDirection * steeringSpeed;
      this.verticalVelocity = lerp(this.verticalVelocity, targetVelocity, 1 - Math.exp(-8.5 * delta));
      if (verticalDirection === 0) this.verticalVelocity *= Math.pow(.86, delta * 60);
      this.y += this.verticalVelocity * delta;
      this.x = SERPENT_X + Math.sin(worldTime * 1.6) * 1.2;
      this.angle = clamp(Math.atan2(this.verticalVelocity, currentWorldSpeed() * 1.15), -.72, .72);

      // Previous head positions drift with the scrolling kingdom. This keeps
      // vertical steering readable as a flowing diagonal curve instead of a
      // tight hook directly beneath the anchored head.
      for (let index = 1; index < this.body.length; index += 1) {
        this.body[index].x -= currentWorldSpeed() * delta;
      }

      this.body[0].x = this.x;
      this.body[0].y = this.y;
      for (let iteration = 0; iteration < 2; iteration += 1) {
        for (let index = 1; index < this.body.length; index += 1) {
          const leader = this.body[index - 1];
          const segment = this.body[index];
          const dx = leader.x - segment.x;
          const dy = leader.y - segment.y;
          const distance = Math.hypot(dx, dy) || 1;
          const correction = (distance - this.segmentSpacing) / distance;
          if (correction > 0) { segment.x += dx * correction; segment.y += dy * correction; }
        }
      }
    }
  }

  function loadBestScore() { try { return Math.max(0, Number.parseInt(localStorage.getItem("serpentLivingPathBest") || "0", 10) || 0); } catch { return 0; } }
  function saveBestScore() { try { localStorage.setItem("serpentLivingPathBest", String(bestScore)); } catch { /* Optional storage. */ } }
  function emitAudioCue(cue, detail = {}) { window.dispatchEvent(new CustomEvent("serpent:audio", { detail: { cue, ...detail } })); }
  function ensureAudioContext() {
    if (!audioStarted) return null;
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = audioEnabled ? 0.34 : 0;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function resumeAudio() {
    if (!audioEnabled || !audioStarted) return null;
    const activeContext = ensureAudioContext();
    if (activeContext?.state === "suspended") activeContext.resume().catch(() => {});
    return activeContext;
  }

  function audioEffectsDestination() {
    return horrorAudio?.effectsGain || masterGain;
  }

  function playTone({ frequency, endFrequency = frequency, duration = 0.2, delay = 0, volume = 0.12, type = "sine" }, destinationOverride = null) {
    const activeContext = resumeAudio();
    const destination = destinationOverride || audioEffectsDestination();
    if (!activeContext || !destination) return;
    const startsAt = activeContext.currentTime + delay;
    const oscillator = activeContext.createOscillator();
    const gain = activeContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startsAt + duration);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(volume, startsAt + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.04);
  }

  function playNoise({ duration = 0.18, volume = 0.07, frequency = 500, filterType = "highpass", delay = 0 }, destinationOverride = null) {
    const activeContext = resumeAudio();
    const destination = destinationOverride || audioEffectsDestination();
    if (!activeContext || !destination) return;
    const startsAt = activeContext.currentTime + delay;
    const frameCount = Math.max(1, Math.floor(activeContext.sampleRate * duration));
    const buffer = activeContext.createBuffer(1, frameCount, activeContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    const source = activeContext.createBufferSource();
    const filter = activeContext.createBiquadFilter();
    const gain = activeContext.createGain();
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(volume, startsAt + Math.min(.025, duration * .18));
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(startsAt);
  }

  function createLoopingNoiseBuffer(activeContext, seconds = 2.5) {
    const frameCount = Math.floor(activeContext.sampleRate * seconds);
    const buffer = activeContext.createBuffer(1, frameCount, activeContext.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * .965 + white * .035;
      data[index] = white * .34 + previous * .66;
    }
    return buffer;
  }

  function startHorrorAmbience() {
    const activeContext = resumeAudio();
    if (!activeContext || !masterGain) return;
    if (horrorAudio) { applyHorrorLevelMix(); return; }

    const effectsGain = activeContext.createGain();
    const ambientGain = activeContext.createGain();
    const windGain = activeContext.createGain();
    const movementGain = activeContext.createGain();
    const droneGain = activeContext.createGain();
    const approachGain = activeContext.createGain();
    const musicGain = activeContext.createGain();
    const musicMuteGain = activeContext.createGain();
    const musicFilter = activeContext.createBiquadFilter();
    const musicPadGain = activeContext.createGain();
    const musicBassGain = activeContext.createGain();
    const musicShimmerGain = activeContext.createGain();
    effectsGain.gain.value = 1;
    ambientGain.gain.value = 1;
    windGain.gain.value = .0001;
    movementGain.gain.value = .0001;
    droneGain.gain.value = .0001;
    approachGain.gain.value = .0001;
    musicGain.gain.value = .0001;
    musicMuteGain.gain.value = musicEnabled ? 1 : .0001;
    musicPadGain.gain.value = .0001;
    musicBassGain.gain.value = .0001;
    musicShimmerGain.gain.value = .0001;
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 900;
    musicFilter.Q.value = .72;
    effectsGain.connect(masterGain);
    ambientGain.connect(masterGain);
    musicGain.connect(musicMuteGain);
    musicMuteGain.connect(masterGain);
    windGain.connect(ambientGain);
    movementGain.connect(ambientGain);
    droneGain.connect(ambientGain);
    approachGain.connect(ambientGain);
    musicPadGain.connect(musicFilter);
    musicBassGain.connect(musicFilter);
    musicShimmerGain.connect(musicFilter);
    musicFilter.connect(musicGain);

    const noiseBuffer = createLoopingNoiseBuffer(activeContext);
    const windSource = activeContext.createBufferSource();
    const windFilter = activeContext.createBiquadFilter();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;
    windFilter.type = "bandpass";
    windFilter.frequency.value = 620;
    windFilter.Q.value = .42;
    windSource.connect(windFilter);
    windFilter.connect(windGain);

    const movementHighpass = activeContext.createBiquadFilter();
    const movementLowpass = activeContext.createBiquadFilter();
    movementHighpass.type = "highpass";
    movementHighpass.frequency.value = 1250;
    movementLowpass.type = "lowpass";
    movementLowpass.frequency.value = 3900;
    windSource.connect(movementHighpass);
    movementHighpass.connect(movementLowpass);
    movementLowpass.connect(movementGain);

    const droneLow = activeContext.createOscillator();
    droneLow.type = "sine";
    droneLow.frequency.value = 46;
    droneLow.connect(droneGain);

    const approachOscillator = activeContext.createOscillator();
    const approachFilter = activeContext.createBiquadFilter();
    approachOscillator.type = "triangle";
    approachOscillator.frequency.value = 78;
    approachFilter.type = "lowpass";
    approachFilter.frequency.value = 180;
    approachOscillator.connect(approachFilter);
    approachFilter.connect(approachGain);

    const padFrequencies = [[55, 82.41, 110], [49, 73.42, 98], [43.65, 65.41, 87.31]][clamp(level - 1, 0, 2)];
    const musicPadOscillators = padFrequencies.map((frequency, index) => {
      const oscillator = activeContext.createOscillator();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 1 ? -5 : index === 2 ? 7 : 0;
      oscillator.connect(musicPadGain);
      return oscillator;
    });
    const musicBassOscillator = activeContext.createOscillator();
    musicBassOscillator.type = "sine";
    musicBassOscillator.frequency.value = [27.5, 24.5, 21.83][clamp(level - 1, 0, 2)];
    musicBassOscillator.connect(musicBassGain);
    const musicShimmerOscillator = activeContext.createOscillator();
    musicShimmerOscillator.type = "sine";
    musicShimmerOscillator.frequency.value = [220, 196, 174.61][clamp(level - 1, 0, 2)];
    musicShimmerOscillator.connect(musicShimmerGain);

    windSource.start();
    droneLow.start();
    approachOscillator.start();
    musicPadOscillators.forEach((oscillator) => oscillator.start());
    musicBassOscillator.start();
    musicShimmerOscillator.start();
    musicInstanceCount += 1;
    horrorAudio = {
      effectsGain, ambientGain, windGain, movementGain, droneGain, approachGain, windFilter, approachOscillator,
      musicGain, musicMuteGain, musicFilter, musicPadGain, musicBassGain, musicShimmerGain, musicPadOscillators,
      musicBassOscillator, musicShimmerOscillator, nextMusicPulseAt: activeContext.currentTime + 1.25,
      nextMusicChimeAt: activeContext.currentTime + 3.2, nextMusicBeatAt: activeContext.currentTime + .12,
      musicPulseStep: 0, musicBeatStep: 0, musicBaseGain: .0001,
    };
    applyHorrorLevelMix();
  }

  function applyHorrorLevelMix(quiet = false) {
    if (!horrorAudio || !audioContext) return;
    const now = audioContext.currentTime;
    const levelIndex = clamp(level - 1, 0, 2);
    const windLevels = [.006, .011, .017];
    const movementLevels = [.0025, .0045, .007];
    const droneLevels = [.004, .009, .016];
    const quietFactor = quiet ? .06 : 1;
    horrorAudio.windGain.gain.setTargetAtTime(windLevels[levelIndex] * quietFactor, now, .45);
    horrorAudio.movementGain.gain.setTargetAtTime(movementLevels[levelIndex] * quietFactor, now, .35);
    horrorAudio.droneGain.gain.setTargetAtTime(droneLevels[levelIndex] * quietFactor, now, .8);
    horrorAudio.ambientGain.gain.setTargetAtTime(quiet ? .25 : 1, now, quiet ? .08 : .7);
    horrorAudio.windFilter.frequency.setTargetAtTime([540, 680, 820][levelIndex], now, 1.2);
    const adaptiveMode = state === GAME_STATE.GAME_OVER
      ? "gameover"
      : quiet
        ? "dying"
        : state === GAME_STATE.PAUSED
        ? "paused"
        : state === GAME_STATE.LEVEL_TRANSITION
          ? "transition"
          : "playing";
    applyAdaptiveMusicMix(adaptiveMode);
  }

  function applyAdaptiveMusicMix(mode = "playing", fade = .5, restart = false) {
    if (!horrorAudio || !audioContext) return;
    musicMode = mode;
    const now = audioContext.currentTime;
    const levelIndex = clamp(level - 1, 0, 2);
    const speedTension = Math.min(.09, speedTier * .012);
    const playingGain = [.54, .61, .68][levelIndex] + speedTension;
    const gainTargets = { playing: playingGain, paused: .13, transition: .25, dying: .018, gameover: .045, silent: .0001 };
    const gainTarget = gainTargets[mode] ?? playingGain;
    const padTargets = [.052, .064, .076];
    const bassTargets = [.022, .038, .055];
    const shimmerTargets = [.0035, .0075, .012];
    const modeFactor = mode === "playing" ? 1 : mode === "paused" ? .55 : mode === "transition" ? .72 : mode === "gameover" ? .42 : .18;
    const padFrequencies = [[55, 82.41, 110], [49, 73.42, 98], [43.65, 65.41, 87.31]][levelIndex];
    const filterTarget = mode === "paused" ? 380 : mode === "transition" ? 680 : mode === "dying" ? 270 : mode === "gameover" ? 340 : [900, 1220, 1650][levelIndex] + speedTier * 65;
    horrorAudio.musicBaseGain = gainTarget;
    horrorAudio.musicGain.gain.cancelScheduledValues(now);
    if (restart) horrorAudio.musicGain.gain.setValueAtTime(.0001, now);
    horrorAudio.musicGain.gain.setTargetAtTime(gainTarget, now + (restart ? .04 : 0), restart ? .62 : fade);
    horrorAudio.musicPadGain.gain.setTargetAtTime(padTargets[levelIndex] * modeFactor, now, fade);
    horrorAudio.musicBassGain.gain.setTargetAtTime((bassTargets[levelIndex] + speedTier * .0015) * modeFactor, now, fade);
    horrorAudio.musicShimmerGain.gain.setTargetAtTime((shimmerTargets[levelIndex] + speedTier * .0007) * modeFactor, now, fade);
    horrorAudio.musicFilter.frequency.setTargetAtTime(filterTarget, now, fade * 1.4);
    horrorAudio.musicPadOscillators.forEach((oscillator, index) => oscillator.frequency.setTargetAtTime(padFrequencies[index], now, 1.15));
    horrorAudio.musicBassOscillator.frequency.setTargetAtTime([27.5, 24.5, 21.83][levelIndex], now, 1.2);
    horrorAudio.musicShimmerOscillator.frequency.setTargetAtTime([220, 196, 174.61][levelIndex], now, 1.3);
  }

  function restartAdaptiveMusic() {
    if (!horrorAudio || !audioContext) return;
    const now = audioContext.currentTime;
    horrorAudio.nextMusicPulseAt = now + .7;
    horrorAudio.nextMusicChimeAt = now + 2.4;
    horrorAudio.nextMusicBeatAt = now + .12;
    horrorAudio.musicPulseStep = 0;
    horrorAudio.musicBeatStep = 0;
    applyAdaptiveMusicMix("playing", .55, true);
  }

  function duckAdaptiveMusic(factor = .76, duration = .35) {
    if (!horrorAudio || !audioContext || musicMode !== "playing") return;
    const now = audioContext.currentTime;
    const base = horrorAudio.musicBaseGain || .54;
    horrorAudio.musicGain.gain.cancelScheduledValues(now);
    horrorAudio.musicGain.gain.setTargetAtTime(base * factor, now, .025);
    horrorAudio.musicGain.gain.setTargetAtTime(base, now + duration, .18);
  }

  function playAdaptiveMusicPulse() {
    if (!horrorAudio || musicMode !== "playing") return;
    const levelIndex = clamp(level - 1, 0, 2);
    const pulseNotes = [[55, 61.74], [49, 55], [43.65, 49]][levelIndex];
    const note = pulseNotes[horrorAudio.musicPulseStep % pulseNotes.length];
    const pulseVolume = .025 + levelIndex * .008 + Math.min(.014, speedTier * .0018);
    playTone({ frequency: note, endFrequency: note * .92, duration: .42, volume: pulseVolume, type: "sine" }, horrorAudio.musicFilter);
    if (levelIndex >= 1 && horrorAudio.musicPulseStep % 2 === 1) {
      playNoise({ duration: levelIndex === 2 ? .16 : .1, volume: levelIndex === 2 ? .022 : .012, frequency: levelIndex === 2 ? 145 : 210, filterType: "lowpass" }, horrorAudio.musicFilter);
    }
    horrorAudio.musicPulseStep += 1;
  }

  function playAdaptiveMusicChime() {
    if (!horrorAudio || musicMode !== "playing") return;
    const levelIndex = clamp(level - 1, 0, 2);
    const noteSets = [[330, 440, 493.88], [293.66, 392, 440], [261.63, 311.13, 369.99]];
    const notes = noteSets[levelIndex];
    const note = notes[Math.floor(Math.random() * notes.length)];
    const type = levelIndex === 0 ? "sine" : levelIndex === 1 ? "triangle" : "sawtooth";
    playTone({ frequency: note, endFrequency: note * (levelIndex === 2 ? .82 : 1.33), duration: .9 + Math.random() * .45, volume: .018 + levelIndex * .005, type }, horrorAudio.musicFilter);
    if (levelIndex === 1) playTone({ frequency: note * 2, endFrequency: note * 1.55, duration: .65, delay: .09, volume: .009, type: "sine" }, horrorAudio.musicFilter);
    if (levelIndex === 2) playTone({ frequency: note / 2, endFrequency: note / 2.7, duration: 1.25, delay: .05, volume: .014, type: "triangle" }, horrorAudio.musicFilter);
  }

  function adaptiveBeatDuration() {
    const bpm = [94, 108, 122][clamp(level - 1, 0, 2)] + Math.min(18, speedTier * 2.5);
    return 60 / bpm / 2;
  }

  function playAdaptiveMusicBeat() {
    if (!horrorAudio || !musicEnabled || musicMode !== "playing") return;
    const levelIndex = clamp(level - 1, 0, 2);
    const step = horrorAudio.musicBeatStep % 16;
    const kickSteps = levelIndex === 0 ? [0, 8] : levelIndex === 1 ? [0, 4, 8, 12] : [0, 3, 6, 8, 11, 14];
    const bassRoots = [55, 49, 43.65];
    const root = bassRoots[levelIndex];
    const speedDetail = Math.min(.018, speedTier * .0022);

    if (kickSteps.includes(step)) {
      playTone({ frequency: 104 - levelIndex * 8, endFrequency: 42 - levelIndex * 3, duration: .2, volume: .06 + levelIndex * .013 + speedDetail, type: "sine" }, horrorAudio.musicFilter);
      playNoise({ duration: .045, volume: .012 + levelIndex * .004, frequency: 1050, filterType: "lowpass" }, horrorAudio.musicFilter);
    }

    if (step === 4 || step === 12) {
      playNoise({ duration: levelIndex === 2 ? .18 : .13, volume: .025 + levelIndex * .009 + speedDetail * .4, frequency: levelIndex === 2 ? 1380 : 1750, filterType: "bandpass" }, horrorAudio.musicFilter);
      if (levelIndex === 2) playTone({ frequency: 184, endFrequency: 109, duration: .2, volume: .018, type: "sawtooth" }, horrorAudio.musicFilter);
    }

    const hatEveryStep = levelIndex === 2 || (levelIndex === 1 && speedTier >= 2);
    if (hatEveryStep || step % 2 === 0) {
      const accent = step % 4 === 0 ? 1 : .62;
      playNoise({ duration: .035 + levelIndex * .012, volume: (.008 + levelIndex * .004 + speedDetail * .25) * accent, frequency: 5200 - levelIndex * 450, filterType: "highpass" }, horrorAudio.musicFilter);
    }

    if (step % 4 === 0) {
      const pattern = [[1, 1.125, 1.5, 1.125], [1, 1.2, 1.5, 1.333], [1, .875, 1.333, .75]][levelIndex];
      const note = root * pattern[(step / 4) % pattern.length];
      playTone({ frequency: note, endFrequency: note * .94, duration: adaptiveBeatDuration() * 1.65, volume: .033 + levelIndex * .009 + speedDetail, type: levelIndex === 2 ? "triangle" : "sine" }, horrorAudio.musicFilter);
    }

    if (levelIndex >= 1 && (step === 7 || step === 15)) {
      playTone({ frequency: levelIndex === 1 ? 587.33 : 466.16, endFrequency: levelIndex === 1 ? 392 : 233.08, duration: .18, volume: .012 + levelIndex * .004, type: levelIndex === 2 ? "sawtooth" : "triangle" }, horrorAudio.musicFilter);
    }

    horrorAudio.musicBeatStep += 1;
  }

  function updateAdaptiveMusic() {
    if (!horrorAudio || !audioContext || !musicEnabled || musicMode !== "playing" || state !== GAME_STATE.PLAYING) return;
    const now = audioContext.currentTime;
    if (now >= horrorAudio.nextMusicBeatAt) {
      playAdaptiveMusicBeat();
      horrorAudio.nextMusicBeatAt = now + adaptiveBeatDuration();
    }
    if (now >= horrorAudio.nextMusicPulseAt) {
      playAdaptiveMusicPulse();
      const interval = Math.max(1.05, [2.75, 2.18, 1.62][clamp(level - 1, 0, 2)] - speedTier * .075);
      horrorAudio.nextMusicPulseAt = now + interval;
    }
    if (now >= horrorAudio.nextMusicChimeAt) {
      playAdaptiveMusicChime();
      horrorAudio.nextMusicChimeAt = now + [6.8, 5.5, 4.3][clamp(level - 1, 0, 2)] + Math.random() * 2.6;
    }
  }

  function playSerpentHiss(intensity = .45, delay = 0) {
    const activeContext = resumeAudio();
    const destination = audioEffectsDestination();
    if (!activeContext || !destination) return;
    const startsAt = activeContext.currentTime + delay;
    const duration = .28 + intensity * .42 + Math.random() * .18;
    const frameCount = Math.floor(activeContext.sampleRate * duration);
    const buffer = activeContext.createBuffer(1, frameCount, activeContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const envelope = Math.sin(Math.PI * index / frameCount);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = activeContext.createBufferSource();
    const highpass = activeContext.createBiquadFilter();
    const bandpass = activeContext.createBiquadFilter();
    const gain = activeContext.createGain();
    source.buffer = buffer;
    highpass.type = "highpass";
    highpass.frequency.value = 1350 + Math.random() * 520;
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2800 + Math.random() * 780, startsAt);
    bandpass.frequency.exponentialRampToValueAtTime(4100 + Math.random() * 720, startsAt + duration);
    bandpass.Q.value = .65 + intensity * .45;
    gain.gain.setValueAtTime(.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(.04 + intensity * .07, startsAt + .045);
    gain.gain.exponentialRampToValueAtTime(.0001, startsAt + duration);
    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(destination);
    source.start(startsAt);
    if (intensity > .7) playTone({ frequency: 118 + Math.random() * 28, endFrequency: 72, duration: duration * .78, delay: delay + .03, volume: .025 * intensity, type: "sawtooth" });
  }

  function playTongueFlick() {
    playNoise({ duration: .045, volume: .012, frequency: 2800, filterType: "highpass" });
    playTone({ frequency: 1180, endFrequency: 720, duration: .052, volume: .006, type: "triangle" });
  }

  function playRumble(intensity = .6, delay = 0) {
    playTone({ frequency: 58, endFrequency: 39, duration: .65 + intensity * .45, delay, volume: .03 + intensity * .025, type: "sine" });
    playNoise({ duration: .52 + intensity * .4, volume: .018 + intensity * .02, frequency: 160, filterType: "lowpass", delay });
  }

  function playThunder(delay = .7) {
    playNoise({ duration: 1.25 + Math.random() * .65, volume: level === 3 ? .065 : .038, frequency: 310, filterType: "lowpass", delay });
    playTone({ frequency: 52, endFrequency: 31, duration: 1.3, delay: delay + .04, volume: level === 3 ? .055 : .032, type: "sine" });
  }

  function playStonePassage() {
    playNoise({ duration: .22 + Math.random() * .18, volume: .018 + level * .004, frequency: 960, filterType: "bandpass" });
    if (Math.random() > .46) playTone({ frequency: 92 + Math.random() * 24, endFrequency: 64, duration: .32, volume: .013, type: "triangle" });
  }

  function playDistortedReptile() {
    const activeContext = resumeAudio();
    const destination = audioEffectsDestination();
    if (!activeContext || !destination) return;
    const oscillator = activeContext.createOscillator();
    const distortion = activeContext.createWaveShaper();
    const filter = activeContext.createBiquadFilter();
    const gain = activeContext.createGain();
    const curve = new Float32Array(256);
    for (let index = 0; index < curve.length; index += 1) {
      const value = index * 2 / (curve.length - 1) - 1;
      curve[index] = Math.tanh(value * 3.2);
    }
    distortion.curve = curve;
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(96, activeContext.currentTime + .08);
    oscillator.frequency.exponentialRampToValueAtTime(42, activeContext.currentTime + .72);
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(.0001, activeContext.currentTime + .08);
    gain.gain.exponentialRampToValueAtTime(.055, activeContext.currentTime + .13);
    gain.gain.exponentialRampToValueAtTime(.0001, activeContext.currentTime + .78);
    oscillator.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    oscillator.start(activeContext.currentTime + .08);
    oscillator.stop(activeContext.currentTime + .82);
  }

  function playElementCollectionSound(element) {
    if (element === ELEMENT.WATER) {
      playNoise({ duration: .24, volume: .055, frequency: 1150, filterType: "bandpass" });
      playTone({ frequency: 410, endFrequency: 690, duration: .28, volume: .095, type: "sine" });
      playTone({ frequency: 860, endFrequency: 1040, duration: .2, delay: .06, volume: .052, type: "triangle" });
    } else if (element === ELEMENT.GOLD) {
      playTone({ frequency: 760, endFrequency: 1180, duration: .3, volume: .105, type: "triangle" });
      playTone({ frequency: 1210, endFrequency: 1510, duration: .22, delay: .075, volume: .065, type: "sine" });
      playTone({ frequency: 520, endFrequency: 650, duration: .34, delay: .02, volume: .042, type: "sine" });
    } else {
      playTone({ frequency: 560, endFrequency: 880, duration: .24, volume: .11, type: "sine" });
      playTone({ frequency: 930, endFrequency: 1080, duration: .17, delay: .045, volume: .055, type: "triangle" });
      playNoise({ duration: .09, volume: .028, frequency: 1250, filterType: "highpass" });
    }
  }

  function playWrongElementSound(element) {
    playNoise({ duration: .24, volume: .11, frequency: element === ELEMENT.FIRE ? 340 : 210, filterType: "lowpass" });
    playTone({ frequency: element === ELEMENT.FIRE ? 184 : 132, endFrequency: 54, duration: .52, volume: .13, type: "sawtooth" });
    playTone({ frequency: 420, endFrequency: 96, duration: .38, delay: .035, volume: .07, type: "square" });
    playSerpentHiss(.95, .045);
  }

  function playAudioCue(cue, detail = {}) {
    playfield.dataset.lastAudioCue = cue;
    playfield.dataset.audioState = audioContext?.state || "idle";
    if (!audioEnabled || !audioStarted) return;
    if (cue === "ambient") {
      startHorrorAmbience();
      levelEntryHissTimer = 1.8 + Math.random() * 1.8;
    } else if (cue === "collect") {
      duckAdaptiveMusic(.8, .28);
      playElementCollectionSound(detail.element || ELEMENT.FIRE);
      playSerpentHiss(.42, .035);
    } else if (cue === "wrong-element") {
      applyHorrorLevelMix(true);
      playWrongElementSound(detail.element);
    } else if (cue === "speed-increase") {
      applyAdaptiveMusicMix("playing", .32);
      duckAdaptiveMusic(.68, .58);
      playTone({ frequency: 172, endFrequency: 415, duration: .48, volume: .065, type: "triangle" });
      playSerpentHiss(.82, .06);
      playRumble(.72, .08);
    } else if (cue === "level-complete") {
      applyAdaptiveMusicMix("transition", .24);
      playTone({ frequency: 174, endFrequency: 220, duration: .7, volume: .06, type: "sine" });
      playTone({ frequency: 440, endFrequency: 660, duration: .62, delay: .12, volume: .065, type: "triangle" });
      playTone({ frequency: 660, endFrequency: 880, duration: .5, delay: .45, volume: .035, type: "sine" });
      playRumble(.35, .16);
    } else if (cue === "collision") {
      applyHorrorLevelMix(true);
      playNoise({ duration: .22, volume: .095, frequency: 290, filterType: "highpass" });
      playTone({ frequency: 170, endFrequency: 58, duration: .48, volume: .105, type: "sawtooth" });
      playSerpentHiss(1, .025);
      playDistortedReptile();
    } else if (cue === "game-over") {
      applyAdaptiveMusicMix("gameover", .55);
      playTone({ frequency: 52, endFrequency: 38, duration: 2.8, delay: .38, volume: .038, type: "sine" });
    }
  }

  function nextNaturalHissDelay() {
    const ranges = [[8.5, 15], [6, 11], [4.2, 8.2]];
    const [minimum, maximum] = ranges[clamp(level - 1, 0, 2)];
    return minimum + Math.random() * (maximum - minimum);
  }

  function updateSoundToggle() {
    soundToggle.textContent = audioEnabled ? "Sound on" : "Sound off";
    soundToggle.setAttribute("aria-pressed", String(audioEnabled));
    soundToggle.setAttribute("aria-label", audioEnabled ? "Turn sound off" : "Turn sound on");
    playfield.dataset.sound = audioEnabled ? "on" : "off";
  }

  function updateMusicToggle() {
    musicToggle.textContent = musicEnabled ? "Music on" : "Music off";
    musicToggle.setAttribute("aria-pressed", String(musicEnabled));
    musicToggle.setAttribute("aria-label", musicEnabled ? "Turn music off" : "Turn music on");
    playfield.dataset.music = musicEnabled ? "on" : "off";
  }

  function toggleSound() {
    audioEnabled = !audioEnabled;
    updateSoundToggle();
    if (masterGain && audioContext) {
      const now = audioContext.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(audioEnabled ? .34 : .0001, now, .035);
    }
    if (audioEnabled && audioStarted) {
      resumeAudio();
      startHorrorAmbience();
      applyHorrorLevelMix(state === GAME_STATE.GAME_OVER || state === GAME_STATE.DYING);
    }
    setStatus(audioEnabled ? "Sound on." : "Sound off.");
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    updateMusicToggle();
    if (horrorAudio?.musicMuteGain && audioContext) {
      const now = audioContext.currentTime;
      horrorAudio.musicMuteGain.gain.cancelScheduledValues(now);
      horrorAudio.musicMuteGain.gain.setTargetAtTime(musicEnabled ? 1 : .0001, now, .04);
      if (musicEnabled) {
        horrorAudio.nextMusicBeatAt = now + .08;
        applyAdaptiveMusicMix(state === GAME_STATE.PAUSED ? "paused" : state === GAME_STATE.GAME_OVER ? "gameover" : "playing", .25);
      }
    }
    setStatus(musicEnabled ? "Music on." : "Music off. Sound effects remain on.");
  }

  function updateHorrorAudio(delta) {
    if (!audioStarted || !audioEnabled || !horrorAudio || !audioContext) return;
    approachHissCooldown = Math.max(0, approachHissCooldown - delta);
    updateAdaptiveMusic();

    if (state !== GAME_STATE.PLAYING) {
      audioUpdateAccumulator += delta;
      if (audioUpdateAccumulator >= .12) {
        audioUpdateAccumulator = 0;
        const now = audioContext.currentTime;
        const target = state === GAME_STATE.PAUSED || state === GAME_STATE.LEVEL_TRANSITION ? .38 : .18;
        horrorAudio.ambientGain.gain.setTargetAtTime(target, now, .35);
        horrorAudio.approachGain.gain.setTargetAtTime(.0001, now, .12);
      }
      return;
    }

    levelEntryHissTimer -= delta;
    nextHissTimer -= delta;
    if (levelEntryHissTimer <= 0) {
      playSerpentHiss(level === 1 ? .27 : level === 2 ? .4 : .55);
      levelEntryHissTimer = Number.POSITIVE_INFINITY;
    } else if (nextHissTimer <= 0) {
      playSerpentHiss(level === 1 ? .24 + Math.random() * .16 : level === 2 ? .38 + Math.random() * .2 : .5 + Math.random() * .25);
      nextHissTimer = nextNaturalHissDelay();
    }

    const tonguePhase = wrap(worldTime + Math.sin(worldTime * .113) * 1.6, 7.4);
    const tongueVisible = !reducedMotionQuery.matches && tonguePhase <= .34;
    if (tongueVisible && !tongueAudioActive) playTongueFlick();
    tongueAudioActive = tongueVisible;

    const targetType = elementRules[level].target;
    const nearestTarget = elements
      .filter((element) => element.type === targetType && element.x > serpent.x - 45)
      .sort((first, second) => first.x - second.x)[0];
    const targetDistance = nearestTarget ? Math.hypot(serpent.x - nearestTarget.x, serpent.y - elementFloatY(nearestTarget)) : 999;
    const proximity = clamp(1 - targetDistance / 260, 0, 1);
    if (proximity > .47 && approachHissCooldown <= 0) {
      playSerpentHiss(.22 + proximity * .16);
      approachHissCooldown = 8 + Math.random() * 5;
    }

    obstacles.forEach((obstacle) => {
      if (audioPassedColumns.has(obstacle)) return;
      const bounds = columnShaftBounds(obstacle);
      const centerX = (bounds.left + bounds.right) / 2;
      const inGap = serpent.y > obstacle.topHeight - 18 && serpent.y < obstacle.bottomStart + 18;
      if (Math.abs(centerX - serpent.x) < bounds.width * .5 + 34 && inGap) {
        audioPassedColumns.add(obstacle);
        if (Math.random() < .72) playStonePassage();
      }
    });

    audioUpdateAccumulator += delta;
    if (audioUpdateAccumulator < .12) return;
    audioUpdateAccumulator = 0;
    const now = audioContext.currentTime;
    const steering = clamp(Math.abs(serpent.verticalVelocity) / (VERTICAL_SPEED + 28), 0, 1);
    const levelIndex = clamp(level - 1, 0, 2);
    const movementBase = [.0025, .0045, .007][levelIndex];
    horrorAudio.movementGain.gain.setTargetAtTime(movementBase * (.72 + steering * .7 + speedTier * .045), now, .15);
    horrorAudio.approachGain.gain.setTargetAtTime(.0001 + proximity * proximity * (.005 + levelIndex * .0015), now, .18);
    horrorAudio.approachOscillator.frequency.setTargetAtTime(72 + proximity * 24 + levelIndex * 5, now, .25);
    horrorAudio.ambientGain.gain.setTargetAtTime(1, now, .45);
  }
  function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
  function lerp(start, end, amount) { return start + (end - start) * amount; }
  function wrap(value, span) { return ((value % span) + span) % span; }
  function currentWorldSpeed() { return INITIAL_SCROLL_SPEED + speedTier * SPEED_STEP; }
  function setStatus(message) { gameStatus.textContent = ""; window.requestAnimationFrame(() => { gameStatus.textContent = message; }); }
  function updateHud() {
    const levelNames = { 1: "Awakening", 2: "The Climb", 3: "Survival" };
    const target = elementRules[level].target;
    const targetName = elementNames[target];
    const targetGlyph = elementGlyphs[target];
    levelLabel.textContent = `Level ${level} · ${levelNames[level]}`;
    targetLabel.textContent = `Target: ${targetName}`;
    targetProgress.textContent = level === 3 ? `${targetGlyph} ${levelProgress}` : `${targetGlyph} ${levelProgress} / 10`;
    scoreValue.textContent = String(score);
    bestValue.textContent = String(bestScore);
  }

  function updateDiagnostics() {
    const upcomingObstacles = serpent
      ? obstacles.filter((obstacle) => obstacle.x + obstacle.width > serpent.x + 8)
      : obstacles;
    playfield.dataset.state = state;
    playfield.dataset.level = String(level);
    playfield.dataset.score = String(score);
    playfield.dataset.bestScore = String(bestScore);
    playfield.dataset.speedTier = String(speedTier);
    playfield.dataset.speed = String(currentWorldSpeed());
    playfield.dataset.segmentCount = String(serpent?.body.length || 0);
    playfield.dataset.headX = serpent ? serpent.x.toFixed(2) : "";
    playfield.dataset.headY = serpent ? serpent.y.toFixed(2) : "";
    playfield.dataset.headAngle = serpent ? serpent.angle.toFixed(5) : "";
    const nearestElement = elements.filter((element) => element.x > serpent.x - 50).sort((first, second) => first.x - second.x)[0];
    playfield.dataset.fireX = nearestElement ? nearestElement.x.toFixed(2) : "";
    playfield.dataset.fireY = nearestElement ? elementFloatY(nearestElement).toFixed(2) : "";
    playfield.dataset.elementCount = String(elements.length);
    playfield.dataset.targetElement = elementRules[level].target;
    playfield.dataset.levelProgress = String(levelProgress);
    playfield.dataset.elementPattern = elements
      .filter((element) => element.x > serpent.x - 50)
      .sort((first, second) => first.x - second.x)
      .slice(0, 5)
      .map((element) => `${element.type}:${Math.round(element.x)}:${Math.round(elementFloatY(element))}`)
      .join("|");
    playfield.dataset.obstacleCount = String(obstacles.length);
    playfield.dataset.firstObstacleX = upcomingObstacles[0] ? upcomingObstacles[0].x.toFixed(2) : "";
    playfield.dataset.obstaclePattern = upcomingObstacles.slice(0, 4).map((obstacle) => `${obstacle.passage}:${Math.round(obstacle.gapCenter)}:${Math.round(obstacle.gapSize)}`).join("|");
    playfield.dataset.scrollDistance = scrollDistance.toFixed(2);
    playfield.dataset.lightning = lightningIntensity.toFixed(3);
    playfield.dataset.feedbackWaves = String(feedbackWaves.length);
    playfield.dataset.scorePopups = String(scorePopups.length);
    playfield.dataset.headGlow = headGlowTimer.toFixed(3);
    playfield.dataset.speedPulse = speedPulseTimer.toFixed(3);
    playfield.dataset.collisionPulse = collisionPulseTimer.toFixed(3);
    playfield.dataset.environmentReady = String(Boolean(environmentImages[level]?.complete && environmentImages[level]?.naturalWidth));
    playfield.dataset.environmentBlend = environmentBlend.toFixed(3);
    playfield.dataset.atmosphericLights = String(livingAtmosphericLights.length);
    playfield.dataset.fogLayers = String(livingFogLayers.length);
    playfield.dataset.audioState = audioContext?.state || "idle";
    playfield.dataset.audioStarted = String(audioStarted);
    playfield.dataset.audioEnabled = String(audioEnabled);
    playfield.dataset.musicEnabled = String(musicEnabled);
    playfield.dataset.horrorAmbience = String(Boolean(horrorAudio));
    playfield.dataset.musicActive = String(Boolean(horrorAudio?.musicGain));
    playfield.dataset.musicMode = musicMode;
    playfield.dataset.musicInstances = String(musicInstanceCount);
    playfield.dataset.musicGain = horrorAudio?.musicGain && audioContext ? horrorAudio.musicGain.gain.value.toFixed(4) : "0.0000";
    playfield.dataset.musicOutputGain = horrorAudio?.musicMuteGain && audioContext ? horrorAudio.musicMuteGain.gain.value.toFixed(4) : "0.0000";
    playfield.dataset.musicFilter = horrorAudio?.musicFilter && audioContext ? horrorAudio.musicFilter.frequency.value.toFixed(1) : "0.0";
    playfield.dataset.musicPadGain = horrorAudio?.musicPadGain && audioContext ? horrorAudio.musicPadGain.gain.value.toFixed(4) : "0.0000";
    playfield.dataset.musicBassGain = horrorAudio?.musicBassGain && audioContext ? horrorAudio.musicBassGain.gain.value.toFixed(4) : "0.0000";
    playfield.dataset.nextMusicPulse = horrorAudio && audioContext ? Math.max(0, horrorAudio.nextMusicPulseAt - audioContext.currentTime).toFixed(2) : "waiting";
    playfield.dataset.nextHiss = Number.isFinite(nextHissTimer) ? nextHissTimer.toFixed(2) : "waiting";
    playfield.dataset.fps = measuredFps.toFixed(1);
  }

  function clearInput() { input.up = false; input.down = false; }

  function startNewRun(withIntro = false) {
    score = 0; level = 1; levelProgress = 0; speedTier = 0; worldTime = 0; scrollDistance = 0;
    deathReason = "Hit the stone"; deathCause = "stone";
    lightningTimer = randomLightningDelay(); lightningIntensity = 0; lightningEchoTimer = 0; collisionGrace = 1; particles = [];
    feedbackWaves = []; scorePopups = []; headGlowTimer = 0; speedPulseTimer = 0; collisionPulseTimer = 0;
    environmentFromLevel = 1; environmentBlend = 1;
    nextHissTimer = nextNaturalHissDelay(); levelEntryHissTimer = 2 + Math.random() * 1.8; approachHissCooldown = 0;
    tongueAudioActive = false; audioUpdateAccumulator = 0; audioPassedColumns = new WeakSet();
    if (audioStarted && audioEnabled) {
      startHorrorAmbience();
      restartAdaptiveMusic();
    }
    playfield.classList.remove("is-speed-pulsing", "is-colliding");
    hideAnnouncement();
    serpent = new LivingSerpent(); initializeObstacleStream(); initializeElementStream();
    clearInput(); hideAllScreens(); updateHud();

    if (withIntro) {
      state = GAME_STATE.INTRO;
      introTimer = 0;
      hud.hidden = true;
      startButton.disabled = true;
      startScreen.classList.add("is-leaving");
      setStatus("Level 1, Awakening, begins soon.");
      return;
    }

    beginPlaying();
  }

  function beginPlaying() {
    state = GAME_STATE.PLAYING;
    startScreen.hidden = true;
    startScreen.classList.remove("is-leaving");
    transitionScreen.hidden = true;
    transitionScreen.classList.remove("screen--intro");
    startButton.disabled = false;
    hud.hidden = false;
    setStatus("Level 1. The serpent travels automatically. Use W and S or the up and down arrows to steer.");
    audioHooks.ambient(); playfield.focus({ preventScroll: true });
  }

  function hideAllScreens() { transitionScreen.hidden = true; pauseScreen.hidden = true; gameOverScreen.hidden = true; }

  function createGate(x, gateLevel = level) {
    const settings = levelSettings[gateLevel];
    const gapSize = settings.gapMin + Math.random() * (settings.gapMax - settings.gapMin);
    const width = settings.widthMin + Math.random() * (settings.widthMax - settings.widthMin);
    const passage = obstacleSerial % 2 === 0 ? "high" : "low";
    obstacleSerial += 1;
    const intendedCenter = passage === "high" ? settings.highCenter : settings.lowCenter;
    const gapCenter = intendedCenter + (Math.random() - .5) * (gateLevel === 1 ? 30 : 22);
    return { x, width, gapCenter, gapSize, topHeight: gapCenter - gapSize / 2, bottomStart: gapCenter + gapSize / 2, passage, kind: Math.floor(Math.random() * 4), seed: Math.random() * 100 };
  }

  function initializeObstacleStream() {
    obstacles = [];
    obstacleSerial = 0;
    const settings = levelSettings[level];
    let x = level === 1 ? 870 : level === 2 ? 760 : 700;
    for (let index = 0; index < 5; index += 1) {
      obstacles.push(createGate(x));
      x += settings.spacingMin + Math.random() * (settings.spacingMax - settings.spacingMin);
    }
  }

  function appendObstacleIfNeeded() {
    const settings = levelSettings[level];
    const last = obstacles[obstacles.length - 1];
    if (last && last.x > WORLD_WIDTH + settings.spacingMax * .4) return;
    const nextX = (last ? last.x + last.width : WORLD_WIDTH) + settings.spacingMin + Math.random() * (settings.spacingMax - settings.spacingMin);
    obstacles.push(createGate(nextX));
  }

  function chooseElementType(forceTarget = false) {
    const rule = elementRules[level];
    if (forceTarget || level === 1 || spawnsSinceTarget >= (level === 2 ? 1 : 2)) {
      spawnsSinceTarget = 0;
      return rule.target;
    }
    const roll = Math.random();
    let cumulative = 0;
    for (const [type, weight] of rule.weights) {
      cumulative += weight;
      if (roll <= cumulative) {
        if (type === rule.target) spawnsSinceTarget = 0;
        else spawnsSinceTarget += 1;
        return type;
      }
    }
    return rule.target;
  }

  function createElement(type, x, y) {
    return {
      id: ++elementSpawnSerial,
      type,
      x,
      y: clamp(y, BOUNDARY + 58, WORLD_HEIGHT - BOUNDARY - 58),
      radius: type === ELEMENT.WATER ? 17 : type === ELEMENT.GOLD ? 16 : 15,
      phase: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
    };
  }

  function elementFloatY(element) {
    if (element.type === ELEMENT.WATER) return element.y + Math.sin(worldTime * 1.8 + element.phase) * 5;
    if (element.type === ELEMENT.GOLD) return element.y + Math.sin(worldTime * 1.35 + element.phase) * 8;
    return element.y + Math.sin(worldTime * 2.4 + element.phase) * 7;
  }

  function elementSpawnPosition(xHint) {
    const nearbyGate = obstacles.find((obstacle) => obstacle.x + obstacle.width * .5 >= xHint - 70);
    if (nearbyGate && nearbyGate.x < xHint + 260) {
      return {
        x: nearbyGate.x + nearbyGate.width * (.43 + Math.random() * .14),
        y: nearbyGate.gapCenter + (Math.random() - .5) * Math.max(18, nearbyGate.gapSize * .22),
      };
    }
    const lanes = [178, WORLD_HEIGHT / 2, 542];
    return { x: xHint, y: lanes[elementSpawnSerial % lanes.length] + (Math.random() - .5) * 34 };
  }

  function appendElement(forceTarget = false) {
    const lastX = elements.length ? Math.max(...elements.map((element) => element.x)) : WORLD_WIDTH;
    const position = elementSpawnPosition(lastX + 260 + Math.random() * 90);
    elements.push(createElement(chooseElementType(forceTarget), position.x, position.y));
  }

  function initializeElementStream() {
    elements = [createElement(elementRules[level].target, 430, WORLD_HEIGHT / 2)];
    elementSpawnSerial = 1;
    spawnsSinceTarget = 0;
    appendElement(true);
    appendElement(false);
  }

  function maintainElementStream() {
    elements = elements.filter((element) => element.x > -90);
    while (elements.length < 3) appendElement(false);
  }

  function collectElement(element) {
    const collectedAt = { x: element.x, y: elementFloatY(element) };
    elements = elements.filter((candidate) => candidate !== element);
    score += 1;
    levelProgress += 1;
    serpent.grow(4);
    headGlowTimer = 0.55;
    feedbackWaves.push({ x: collectedAt.x, y: collectedAt.y, type: element.type, life: 0.55, maxLife: 0.55 });
    scorePopups.push({ x: collectedAt.x, y: collectedAt.y - 8, text: "+1", type: element.type, life: 0.82, maxLife: 0.82 });
    createBurst(collectedAt.x, collectedAt.y, element.type, reducedMotionQuery.matches ? 10 : 22);
    audioHooks.collect(element.type);
    if (score > bestScore) { bestScore = score; saveBestScore(); }
    const completesLevel = level < 3 && levelProgress >= 10;
    if (score % 5 === 0) {
      speedTier = score / 5;
      triggerSpeedFeedback(!completesLevel);
      setStatus(`Score ${score}. Speed increased. The kingdom is moving faster.`);
    } else setStatus(`${elementNames[element.type]} collected. Score ${score}.`);
    updateHud();
    pulseScoreHud();
    if (level === 1 && levelProgress >= 10) { beginLevelTransition(2); return; }
    if (level === 2 && levelProgress >= 10) { beginLevelTransition(3); return; }
    maintainElementStream();
  }

  function pulseScoreHud() {
    scoreValue.classList.remove("is-pulsing");
    void scoreValue.offsetWidth;
    scoreValue.classList.add("is-pulsing");
  }

  function triggerSpeedFeedback(showMessage = true) {
    speedPulseTimer = 0.9;
    headGlowTimer = Math.max(headGlowTimer, 0.9);
    feedbackWaves.push({ x: serpent.x, y: serpent.y, type: "speed", life: 0.9, maxLife: 0.9 });
    createBurst(serpent.x, serpent.y, "speed", reducedMotionQuery.matches ? 12 : 28);
    playfield.classList.remove("is-speed-pulsing");
    void playfield.offsetWidth;
    playfield.classList.add("is-speed-pulsing");
    window.setTimeout(() => playfield.classList.remove("is-speed-pulsing"), 900);
    if (showMessage) showAnnouncement("Speed increased", "The path quickens");
    audioHooks.speedIncrease();
  }

  function showAnnouncement(title, subtitle = "") {
    window.clearTimeout(announcementTimer);
    announcementTitle.textContent = title;
    announcementSubtitle.textContent = subtitle;
    announcementSubtitle.hidden = !subtitle;
    announcement.hidden = false;
    announcement.style.animation = "none";
    void announcement.offsetWidth; announcement.style.animation = "";
    announcementTimer = window.setTimeout(() => { announcement.hidden = true; }, 1500);
  }

  function hideAnnouncement() {
    window.clearTimeout(announcementTimer);
    announcement.hidden = true;
  }

  function beginLevelTransition(nextLevel) {
    state = GAME_STATE.LEVEL_TRANSITION; levelTransitionTimer = 0; clearInput();
    applyAdaptiveMusicMix("transition", .24);
    levelTransitionPresented = false;
    hideAnnouncement();
    transitionScreen.classList.remove("screen--intro");
    transitionKicker.textContent = `Level ${nextLevel - 1} complete`; transitionTitle.textContent = `Level ${nextLevel}`;
    transitionSubtitle.textContent = nextLevel === 2 ? "The Climb" : "Survival";
    transitionNote.hidden = false;
    transitionNote.textContent = nextLevel === 2 ? "The path narrows." : "Only the path remains.";
    transitionRule.hidden = false;
    transitionObjective.textContent = nextLevel === 2 ? "Seek water" : "Seek gold";
    transitionWarning.textContent = nextLevel === 2 ? "Fire is no longer safe." : "Fire and water are now deadly.";
    transitionSymbols.innerHTML = nextLevel === 2
      ? "<span>🔥 Fire ✕</span><span>💧 Water ✓</span>"
      : "<span>🔥 Fire ✕</span><span>💧 Water ✕</span><span>◆ Gold ✓</span>";
    transitionSymbols.setAttribute("aria-label", nextLevel === 2 ? "Fire is dangerous. Water is safe." : "Fire and water are dangerous. Gold is safe.");
    transitionScreen.hidden = true;
    setStatus(`Level ${nextLevel - 1} complete. Level ${nextLevel} begins soon.`);
  }

  function enterLevel(nextLevel) {
    environmentFromLevel = level; environmentBlend = 0; level = nextLevel; levelProgress = 0; serpent.resetPosition(); initializeObstacleStream(); initializeElementStream(); collisionGrace = 1.1; particles = [];
    nextHissTimer = nextNaturalHissDelay(); levelEntryHissTimer = 1.2 + Math.random() * 1.6; approachHissCooldown = 0; audioPassedColumns = new WeakSet();
    state = GAME_STATE.PLAYING;
    if (horrorAudio) applyHorrorLevelMix(false);
    lightningTimer = randomLightningDelay() * .7; transitionScreen.hidden = true; transitionRule.hidden = true; updateHud();
    setStatus(level === 2 ? "Level 2, The Climb. Weave through the kingdom walls." : "Level 3, Survival. The deep kingdom has no end.");
    playfield.focus({ preventScroll: true });
  }

  function triggerCollision() {
    if (state !== GAME_STATE.PLAYING) return;
    deathReason = "Hit the stone";
    deathCause = "stone";
    state = GAME_STATE.DYING; deathTimer = 0; clearInput();
    collisionPulseTimer = 0.65;
    feedbackWaves.push({ x: serpent.x, y: serpent.y, type: "death", life: 0.78, maxLife: 0.78 });
    createBurst(serpent.x, serpent.y, "death", reducedMotionQuery.matches ? 20 : 48);
    playfield.classList.remove("is-colliding");
    void playfield.offsetWidth;
    playfield.classList.add("is-colliding");
    window.setTimeout(() => playfield.classList.remove("is-colliding"), 440);
    audioHooks.collision(); setStatus("Collision. You lost control.");
  }

  function triggerWrongElementDeath(element) {
    if (state !== GAME_STATE.PLAYING) return;
    deathReason = `Wrong element — ${elementNames[element.type]}`;
    deathCause = `wrong-${element.type}`;
    state = GAME_STATE.DYING; deathTimer = 0; clearInput();
    collisionPulseTimer = .65;
    const impactY = elementFloatY(element);
    feedbackWaves.push({ x: element.x, y: impactY, type: `wrong-${element.type}`, life: .78, maxLife: .78 });
    createBurst(element.x, impactY, `wrong-${element.type}`, reducedMotionQuery.matches ? 18 : 42);
    showAnnouncement("Wrong element", "The path changed");
    playfield.classList.remove("is-colliding");
    void playfield.offsetWidth;
    playfield.classList.add("is-colliding");
    window.setTimeout(() => playfield.classList.remove("is-colliding"), 440);
    audioHooks.wrongElement(element.type);
    setStatus(`Wrong element. ${elementNames[element.type]} is dangerous in Level ${level}.`);
  }

  function completeGameOver() {
    state = GAME_STATE.GAME_OVER; hud.hidden = true; finalScoreValue.textContent = String(score); finalBestValue.textContent = String(bestScore);
    hideAnnouncement();
    gameOverReason.textContent = deathReason;
    gameOverScreen.hidden = false; audioHooks.gameOver(); setStatus(`Game over. ${deathReason}. Score ${score}. Best score ${bestScore}.`); restartButton.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (state !== GAME_STATE.PLAYING) return;
    state = GAME_STATE.PAUSED; clearInput(); pauseScreen.hidden = false; setStatus("Game paused."); resumeButton.focus({ preventScroll: true });
    applyAdaptiveMusicMix("paused", .2);
  }

  function resumeGame() {
    if (state !== GAME_STATE.PAUSED) return;
    pauseScreen.hidden = true; state = GAME_STATE.PLAYING; collisionGrace = Math.max(collisionGrace, .65); previousTimestamp = performance.now();
    applyHorrorLevelMix(false);
    setStatus("Game resumed."); playfield.focus({ preventScroll: true });
  }

  function randomLightningDelay() {
    const minimum = level === 3 ? 5 : level === 2 ? 7 : 9;
    const range = level === 3 ? 6 : level === 2 ? 8 : 10;
    return minimum + Math.random() * range;
  }

  function updateLightning(delta) {
    lightningTimer -= delta;
    lightningIntensity = Math.max(0, lightningIntensity - delta * 1.1);
    if (lightningEchoTimer > 0) {
      lightningEchoTimer -= delta;
      if (lightningEchoTimer <= 0) lightningIntensity = Math.max(lightningIntensity, level === 3 ? .095 : level === 2 ? .075 : .055);
    }
    if (lightningTimer <= 0) {
      lightningIntensity = level === 3 ? .22 : level === 2 ? .17 : .13;
      lightningEchoTimer = .16 + Math.random() * .08;
      lightningTimer = randomLightningDelay();
      playThunder(.52 + Math.random() * 1.05);
    }
  }

  function updateObstacles(delta) {
    const movement = currentWorldSpeed() * delta;
    obstacles.forEach((obstacle) => { obstacle.x -= movement; });
    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -80);
    appendObstacleIfNeeded();
  }

  function update(delta) {
    worldTime += delta; updateAmbientParticles(delta); updateLightning(delta); updateFeedback(delta); updateHorrorAudio(delta);
    environmentBlend = Math.min(1, environmentBlend + delta / 1.8);
    if (state === GAME_STATE.INTRO) {
      introTimer += delta;
      if (introTimer >= .36 && startScreen.hidden === false) {
        startScreen.hidden = true;
        startScreen.classList.remove("is-leaving");
        transitionKicker.textContent = "Level 1";
        transitionTitle.textContent = "Awakening";
        transitionSubtitle.textContent = "The path begins";
        transitionNote.hidden = true;
        transitionRule.hidden = true;
        transitionScreen.classList.add("screen--intro");
        transitionScreen.hidden = false;
      }
      if (introTimer >= 1.55) beginPlaying();
      return;
    }
    if (state === GAME_STATE.PLAYING) {
      collisionGrace = Math.max(0, collisionGrace - delta);
      const movement = currentWorldSpeed() * delta;
      scrollDistance += movement; serpent.update(delta); updateObstacles(delta); elements.forEach((element) => { element.x -= movement; }); updateParticles(delta);
      maintainElementStream();
      const touchedElement = elements.find((element) => Math.hypot(serpent.x - element.x, serpent.y - elementFloatY(element)) < serpent.headRadius + element.radius + 5);
      if (touchedElement) {
        if (touchedElement.type === elementRules[level].target) collectElement(touchedElement);
        else triggerWrongElementDeath(touchedElement);
      }
      if (state === GAME_STATE.PLAYING && collisionGrace <= 0 && hasCollision()) triggerCollision();
      return;
    }
    if (state === GAME_STATE.LEVEL_TRANSITION) {
      levelTransitionTimer += delta; updateParticles(delta); serpent.updateGrowth(delta);
      if (!levelTransitionPresented && levelTransitionTimer >= 0.34) {
        levelTransitionPresented = true;
        transitionScreen.hidden = false;
        audioHooks.levelComplete();
      }
      if (levelTransitionTimer >= 2.65) enterLevel(level + 1);
      return;
    }
    if (state === GAME_STATE.DYING) {
      deathTimer += delta; serpent.alpha = Math.max(0, 1 - deathTimer / 1.05); updateParticles(delta);
      if (deathTimer >= 1.1) completeGameOver();
    }
  }

  function hasCollision() {
    const radius = serpent.headRadius * .82;
    if (serpent.y - radius < BOUNDARY || serpent.y + radius > WORLD_HEIGHT - BOUNDARY) return true;
    if (obstacles.some((obstacle) => pointHitsObstacle(serpent.x, serpent.y, radius))) return true;
    if (serpent.body.length > 70) {
      for (let index = 24; index < serpent.body.length; index += 1) {
        const segment = serpent.body[index];
        if (Math.hypot(serpent.x - segment.x, serpent.y - segment.y) < serpent.headRadius * .95) return true;
      }
    }
    return false;
  }

  function pointHitsObstacle(x, y, padding = 0) {
    return obstacles.some((obstacle) => {
      const bounds = columnShaftBounds(obstacle);
      const insideX = x + padding > bounds.left && x - padding < bounds.right;
      if (!insideX) return false;

      const sampleX = [x - padding, x, x + padding].map((pointX) => clamp((pointX - bounds.left) / bounds.width, 0, 1));
      const topLimit = Math.max(...sampleX.map((position) => fractureYAt(obstacle, true, position)));
      const bottomLimit = Math.min(...sampleX.map((position) => fractureYAt(obstacle, false, position)));
      return y - padding < topLimit || y + padding > bottomLimit;
    });
  }

  function createBurst(x, y, type, count) {
    const colors = {
      fire: ["#fff0ad", "#ffad45", "#f36c2b"],
      water: ["#d9fbff", "#54d8f2", "#287cd4"],
      gold: ["#fff7c2", "#ffd25f", "#b87a18"],
      "wrong-fire": ["#ffd091", "#ff653f", "#9f211d"],
      "wrong-water": ["#baf6ff", "#35a7e8", "#254f9d"],
      speed: ["#d8ff92", "#86e96e", "#f0d36b"],
      death: ["#d5d0b8", "#688f75", "#2d5147"],
    };
    const palette = colors[type] || colors.fire;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 42 + Math.random() * (type === "death" ? 145 : 105);
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, radius: 1.5 + Math.random() * 3.5, life: .55 + Math.random() * .7, maxLife: 1.25, color: palette[Math.floor(Math.random() * palette.length)] });
    }
  }

  function updateParticles(delta) {
    particles.forEach((particle) => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vx *= Math.pow(.96, delta * 60); particle.vy *= Math.pow(.96, delta * 60); particle.life -= delta; });
    particles = particles.filter((particle) => particle.life > 0);
  }

  function updateFeedback(delta) {
    headGlowTimer = Math.max(0, headGlowTimer - delta);
    speedPulseTimer = Math.max(0, speedPulseTimer - delta);
    collisionPulseTimer = Math.max(0, collisionPulseTimer - delta);
    feedbackWaves.forEach((wave) => {
      if (state === GAME_STATE.PLAYING) wave.x -= currentWorldSpeed() * delta * 0.32;
      wave.life -= delta;
    });
    feedbackWaves = feedbackWaves.filter((wave) => wave.life > 0);
    scorePopups.forEach((popup) => {
      if (state === GAME_STATE.PLAYING) popup.x -= currentWorldSpeed() * delta * 0.2;
      popup.y -= (reducedMotionQuery.matches ? 12 : 30) * delta;
      popup.life -= delta;
    });
    scorePopups = scorePopups.filter((popup) => popup.life > 0);
  }

  function updateAmbientParticles(delta) {
    ambientMotes.forEach((mote) => { mote.x -= mote.speed * delta * (level === 3 ? 1.35 : 1); if (mote.x < -12) mote.x = WORLD_WIDTH + 12; });
  }

  function render() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = canvas.width / pixelRatio;
    const displayHeight = canvas.height / pixelRatio;
    context.setTransform(pixelRatio * displayWidth / WORLD_WIDTH, 0, 0, pixelRatio * displayHeight / WORLD_HEIGHT, 0, 0);
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawEnvironment(); drawObstacles(); drawElements(); drawFeedbackWaves(); drawSerpent(); drawParticles(); drawScorePopups(); drawAmbientMotes(); drawBoundary(); drawSpeedMotion(); drawAtmosphere();
  }

  function drawEnvironment() {
    const activeEnvironment = environmentImages[level];
    if (activeEnvironment?.complete && activeEnvironment.naturalWidth) {
      drawCinematicEnvironment();
      return;
    }
    const palette = palettes[level];
    const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    sky.addColorStop(0, palette.skyTop); sky.addColorStop(.53, palette.skyBottom); sky.addColorStop(1, palette.ground);
    context.fillStyle = sky; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawMoon(); drawClouds(); drawMountainLayer(270, 84, palette.far, .035, .84); drawMountainLayer(330, 116, palette.palace, .085, .94);
    drawLandmarkCastle(palette); drawDistantKingdom(palette); drawFloatingLanterns(); drawMidgroundKingdom(palette);
    const ground = context.createLinearGradient(0, 350, 0, WORLD_HEIGHT);
    ground.addColorStop(0, "rgba(18,47,46,.34)"); ground.addColorStop(1, palette.ground);
    context.fillStyle = ground; context.fillRect(0, 365, WORLD_WIDTH, WORLD_HEIGHT - 365);
    drawFog(palette); drawTerrainLines(palette); drawForegroundVegetation(palette);
    if (lightningIntensity > 0) { context.fillStyle = `rgba(190,215,230,${lightningIntensity})`; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT * .72); }
  }

  function drawCinematicEnvironment() {
    const currentImage = environmentImages[level];
    const previousImage = environmentImages[environmentFromLevel];
    const easedBlend = environmentBlend * environmentBlend * (3 - 2 * environmentBlend);

    if (environmentBlend < 1 && previousImage?.complete && previousImage.naturalWidth) {
      drawCinematicBackdrop(previousImage, environmentFromLevel, 1);
      drawCinematicBackdrop(currentImage, level, easedBlend);
    } else {
      drawCinematicBackdrop(currentImage, level, 1);
    }

    const readability = context.createLinearGradient(0, 90, 0, 660);
    readability.addColorStop(0, "rgba(3,10,13,.03)");
    readability.addColorStop(.28, "rgba(3,12,14,.14)");
    readability.addColorStop(.58, "rgba(2,11,13,.22)");
    readability.addColorStop(1, "rgba(2,9,11,.1)");
    context.fillStyle = readability;
    context.fillRect(0, 70, WORLD_WIDTH, 610);

    drawCinematicCloudVeils();
    drawOccupiedWindows(level, easedBlend);
    drawLivingAtmosphericLights("behind");
    drawLivingFogLayers();
    drawFogIllumination();
    drawLivingAtmosphericLights("front");
    drawCinematicForegroundVeil();

    if (lightningIntensity > 0) {
      context.save();
      context.globalCompositeOperation = "screen";
      const skyFlash = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT * .82);
      skyFlash.addColorStop(0, `rgba(195,211,231,${lightningIntensity * 1.05})`);
      skyFlash.addColorStop(.5, `rgba(170,194,218,${lightningIntensity * .55})`);
      skyFlash.addColorStop(1, "rgba(150,180,205,0)");
      context.fillStyle = skyFlash;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT * .84);
      context.restore();
    }
  }

  function drawCinematicBackdrop(image, imageLevel, alpha) {
    const overscan = 58;
    const drift = Math.sin(scrollDistance * (0.00055 + imageLevel * 0.00008) + imageLevel) * 16;
    const rise = imageLevel === 1 ? -6 : imageLevel === 2 ? -10 : -14;
    context.save();
    context.globalAlpha = alpha;
    context.filter = imageLevel === 1 ? "saturate(.88) contrast(.96)" : imageLevel === 2 ? "saturate(.91) contrast(1.01)" : "saturate(.88) contrast(1.04)";
    context.drawImage(image, -overscan / 2 + drift, rise - overscan / 3, WORLD_WIDTH + overscan, WORLD_HEIGHT + overscan);
    context.restore();
  }

  function drawOccupiedWindows(environmentLevel, blendAlpha) {
    const windows = occupiedWindows[environmentLevel] || [];
    context.save();
    context.globalCompositeOperation = "screen";
    windows.forEach((windowLight, index) => {
      const slowWave = (Math.sin(worldTime * windowLight.rate + windowLight.phase) + 1) / 2;
      const secondaryWave = (Math.sin(worldTime * windowLight.rate * .37 + windowLight.phase * 2.1) + 1) / 2;
      const occasionalDim = secondaryWave < .13 ? secondaryWave / .13 : 1;
      const opacity = (windowLight.minimum + slowWave * (windowLight.maximum - windowLight.minimum)) * occasionalDim * blendAlpha;
      const glowRadius = 15 + (index % 4) * 4;
      const glow = context.createRadialGradient(windowLight.x, windowLight.y, 0, windowLight.x, windowLight.y, glowRadius);
      glow.addColorStop(0, `rgba(255,205,119,${opacity * .8})`);
      glow.addColorStop(.42, `rgba(255,171,69,${opacity * .28})`);
      glow.addColorStop(1, "rgba(255,147,46,0)");
      context.fillStyle = glow;
      context.beginPath(); context.arc(windowLight.x, windowLight.y, glowRadius, 0, Math.PI * 2); context.fill();
      context.fillStyle = `rgba(255,220,148,${Math.min(.72, opacity * 1.6)})`;
      context.fillRect(windowLight.x - windowLight.width / 2, windowLight.y - windowLight.height / 2, windowLight.width, windowLight.height);
    });
    context.restore();
  }

  function drawCinematicCloudVeils() {
    const cloudLayers = [
      { y: 72, height: 92, speed: .004, alpha: .045, tone: "194,207,222" },
      { y: 156, height: 126, speed: .011, alpha: .035, tone: "143,158,180" },
      { y: 250, height: 142, speed: .024, alpha: .027, tone: "132,145,164" },
    ];
    context.save();
    context.globalCompositeOperation = "screen";
    cloudLayers.forEach((layer, layerIndex) => {
      const offset = wrap(scrollDistance * layer.speed + worldTime * (1.2 + layerIndex * .45), 520);
      for (let cloudIndex = -1; cloudIndex < 4; cloudIndex += 1) {
        const x = cloudIndex * 460 - offset - 90;
        const y = layer.y + Math.sin(worldTime * .045 + cloudIndex * 1.9 + layerIndex) * 18;
        const cloud = context.createRadialGradient(x + 210, y, 8, x + 210, y, 225);
        cloud.addColorStop(0, `rgba(${layer.tone},${layer.alpha})`);
        cloud.addColorStop(.45, `rgba(${layer.tone},${layer.alpha * .58})`);
        cloud.addColorStop(1, `rgba(${layer.tone},0)`);
        context.fillStyle = cloud;
        context.beginPath(); context.ellipse(x + 210, y, 225, layer.height, 0, 0, Math.PI * 2); context.fill();
      }
    });
    context.restore();
  }

  function createLivingLightSprite(color) {
    const sprite = document.createElement("canvas");
    sprite.width = 128;
    sprite.height = 128;
    const spriteContext = sprite.getContext("2d");
    const [red, green, blue] = color;
    const halo = spriteContext.createRadialGradient(64, 64, 0, 64, 64, 62);
    halo.addColorStop(0, `rgba(${red},${green},${blue},.9)`);
    halo.addColorStop(.14, `rgba(${red},${green},${blue},.58)`);
    halo.addColorStop(.45, `rgba(${red},${green},${blue},.2)`);
    halo.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    spriteContext.fillStyle = halo;
    spriteContext.fillRect(0, 0, 128, 128);
    return sprite;
  }

  function createLivingFogTexture(layer, layerIndex) {
    const texture = document.createElement("canvas");
    texture.width = 768;
    texture.height = 256;
    const textureContext = texture.getContext("2d");
    const [red, green, blue] = layer.tone;

    for (let lobe = 0; lobe < 9; lobe += 1) {
      const x = 42 + lobe * 86 + Math.sin(layer.phase + lobe * 1.7) * 32;
      const y = 112 + Math.cos(layer.phase * 1.3 + lobe * 2.1) * 42;
      const radius = 112 + (lobe % 3) * 26;
      const fog = textureContext.createRadialGradient(x, y, 3, x, y, radius);
      fog.addColorStop(0, `rgba(${red},${green},${blue},.82)`);
      fog.addColorStop(.36, `rgba(${red},${green},${blue},.5)`);
      fog.addColorStop(.72, `rgba(${red},${green},${blue},.16)`);
      fog.addColorStop(1, `rgba(${red},${green},${blue},0)`);
      textureContext.fillStyle = fog;
      textureContext.beginPath();
      textureContext.ellipse(x, y, radius, 42 + (lobe % 4) * 9 + layerIndex * 2, Math.sin(lobe * 1.3) * .08, 0, Math.PI * 2);
      textureContext.fill();
    }

    textureContext.save();
    textureContext.globalCompositeOperation = "destination-out";
    for (let opening = 0; opening < 4; opening += 1) {
      const x = 130 + opening * 176 + Math.sin(layer.phase + opening) * 28;
      const y = 112 + Math.cos(layer.phase * 1.5 + opening) * 22;
      const hole = textureContext.createRadialGradient(x, y, 2, x, y, 72);
      hole.addColorStop(0, "rgba(0,0,0,.52)");
      hole.addColorStop(.55, "rgba(0,0,0,.18)");
      hole.addColorStop(1, "rgba(0,0,0,0)");
      textureContext.fillStyle = hole;
      textureContext.beginPath(); textureContext.ellipse(x, y, 76, 30, 0, 0, Math.PI * 2); textureContext.fill();
    }
    textureContext.restore();
    return texture;
  }

  function drawLivingAtmosphericLights(pass) {
    const drawBehindFog = pass === "behind";
    const levelCount = level === 1 ? 20 : level === 2 ? 22 : livingAtmosphericLights.length;
    const span = 1480;
    context.save();
    context.globalCompositeOperation = "screen";

    livingAtmosphericLights.slice(0, levelCount).forEach((light) => {
      if (light.behindFog !== drawBehindFog) return;
      const depthScale = light.depth === "far" ? .74 : light.depth === "mid" ? 1 : 1.18;
      const xTravel = scrollDistance * light.parallax;
      const xDrift = Math.sin(worldTime * light.driftRate + light.phase) * light.driftX;
      const x = wrap(light.baseX - xTravel + xDrift + 110, span) - 110;
      const irregularY = Math.sin(worldTime * light.driftRate * 1.37 + light.phase * 1.9) * light.driftY
        + Math.sin(worldTime * light.driftRate * .43 + light.phase) * light.driftY * .42;
      const y = light.baseY + irregularY;
      if (x < -70 || x > WORLD_WIDTH + 70 || y < 66 || y > WORLD_HEIGHT - 36) return;

      const breathe = .76 + Math.sin(worldTime * light.pulseRate + light.phase) * .16
        + Math.sin(worldTime * light.pulseRate * .39 + light.phase * 2.4) * .08;
      const fadeWave = (Math.sin(worldTime * light.pulseRate * .34 + light.phase * 1.31) + 1) * .5;
      const fade = light.fades ? clamp((fadeWave - .08) / .42, 0, 1) : 1;
      const lightningSuppression = 1 - clamp(lightningIntensity * 2.4, 0, .42);
      const diffusion = light.behindFog ? 1.52 : 1;
      const saturation = light.behindFog ? .68 : 1;
      const decoyScale = light.largeDecoy ? (light.depth === "near" ? 1.46 : 1.32) : 1;
      const radius = light.radius * depthScale * diffusion * decoyScale * (1 + Math.sin(worldTime * .031 + light.phase) * .07);
      const alpha = light.alpha * breathe * fade * lightningSuppression * (light.behindFog ? .68 : 1);
      const [red, green, blue] = light.color;
      const sprite = livingLightSprites[light.colorIndex];
      context.globalAlpha = alpha * (light.behindFog ? saturation * 1.15 : 1.28);
      context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);

      const coreAlpha = alpha * (light.behindFog ? 1.65 : 2.8);
      context.globalAlpha = 1;
      context.fillStyle = `rgba(${red},${green},${blue},${Math.min(.62, coreAlpha)})`;
      context.beginPath(); context.arc(x, y, light.core * (light.behindFog ? .72 : 1), 0, Math.PI * 2); context.fill();
    });
    context.restore();
  }

  function drawLivingFogLayers() {
    context.save();
    context.globalCompositeOperation = "screen";
    livingFogLayers.forEach((layer, layerIndex) => {
      const spacing = 410;
      const travel = (scrollDistance * layer.parallax + worldTime * layer.drift) * layer.direction;
      const offset = wrap(travel + layer.phase * 71, spacing);
      const densityBreath = .91 + Math.sin(worldTime * (.025 + layerIndex * .006) + layer.phase) * .09;
      const shapeBreath = 1 + Math.sin(worldTime * (.018 + layerIndex * .004) + layer.phase * 1.7) * .065;
      const lightningReveal = lightningIntensity * (layerIndex < 2 ? .3 : .22);
      const levelDensity = level === 3 ? 1.08 : level === 2 ? 1.03 : 1;
      const alpha = (layer.alpha * densityBreath * levelDensity) + lightningReveal;
      const texture = livingFogTextures[layerIndex];

      for (let patchIndex = -2; patchIndex < layer.patches + 1; patchIndex += 1) {
        const anchorX = patchIndex * spacing - offset;
        const anchorY = layer.y + Math.sin(worldTime * .037 + patchIndex * 1.73 + layer.phase) * (8 + layerIndex * 2.3);
        const patchPhase = layer.phase + patchIndex * 1.13;
        const width = layer.width * 1.5 * shapeBreath * (.94 + Math.sin(patchPhase) * .06);
        const height = layer.height * 1.9 * (2 - shapeBreath) * (.94 + Math.cos(patchPhase * 1.3) * .06);
        context.globalAlpha = alpha * (.84 + Math.sin(patchPhase * 1.7) * .12);
        context.drawImage(texture, anchorX - width * .5, anchorY - height * .5, width, height);
      }
    });
    context.globalAlpha = 1;
    context.restore();
  }

  function drawFogIllumination() {
    const moonPositions = { 1: [1040, 115], 2: [960, 108], 3: [1060, 104] };
    const castlePositions = { 1: [948, 350], 2: [875, 338], 3: [810, 348] };
    const [moonX, moonY] = moonPositions[level];
    const [castleX, castleY] = castlePositions[level];
    context.save();
    context.globalCompositeOperation = "screen";

    const moonMist = context.createRadialGradient(moonX, moonY, 18, moonX, moonY, 238);
    moonMist.addColorStop(0, `rgba(190,207,219,${.035 + lightningIntensity * .12})`);
    moonMist.addColorStop(.48, `rgba(170,191,205,${.016 + lightningIntensity * .05})`);
    moonMist.addColorStop(1, "rgba(163,187,202,0)");
    context.fillStyle = moonMist;
    context.beginPath(); context.ellipse(moonX, moonY + 30, 238, 112, 0, 0, Math.PI * 2); context.fill();

    const castleMist = context.createRadialGradient(castleX, castleY, 8, castleX, castleY, 178);
    castleMist.addColorStop(0, "rgba(235,169,86,.036)");
    castleMist.addColorStop(.4, "rgba(205,139,69,.018)");
    castleMist.addColorStop(1, "rgba(180,121,67,0)");
    context.fillStyle = castleMist;
    context.beginPath(); context.ellipse(castleX, castleY + 22, 190, 82, 0, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  function drawCinematicForegroundVeil() {
    const foreground = context.createLinearGradient(0, WORLD_HEIGHT * .72, 0, WORLD_HEIGHT);
    foreground.addColorStop(0, "rgba(2,8,10,0)");
    foreground.addColorStop(1, level === 3 ? "rgba(2,5,9,.42)" : "rgba(2,10,11,.34)");
    context.fillStyle = foreground;
    context.fillRect(0, WORLD_HEIGHT * .7, WORLD_WIDTH, WORLD_HEIGHT * .3);
  }

  function drawMoon() {
    const x = WORLD_WIDTH * .78 - wrap(scrollDistance * .008, 80), y = 118;
    const glow = context.createRadialGradient(x, y, 10, x, y, 88);
    glow.addColorStop(0, "rgba(220,229,213,.17)"); glow.addColorStop(1, "rgba(220,229,213,0)");
    context.fillStyle = glow; context.beginPath(); context.arc(x, y, 88, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(215,225,209,.21)"; context.beginPath(); context.arc(x, y, 28, 0, Math.PI * 2); context.fill();
  }

  function drawClouds() {
    [
      { parallax: .026, yOffset: 0, scale: 1, opacity: 1 },
      { parallax: .082, yOffset: 92, scale: .72, opacity: .62 },
    ].forEach((layer, layerIndex) => {
      const parallax = scrollDistance * layer.parallax;
      clouds.forEach((cloud, index) => {
        if (layerIndex === 1 && index % 2 === 0) return;
        const x = wrap(cloud.x - parallax + layerIndex * 91, WORLD_WIDTH + 300) - 150;
        const y = cloud.y + layer.yOffset + Math.sin(worldTime * (.12 + layerIndex * .05) + cloud.phase) * 8;
        context.fillStyle = `rgba(188,205,203,${cloud.opacity * layer.opacity})`; context.beginPath();
        context.ellipse(x, y, cloud.width * .55 * layer.scale, 21 * layer.scale, 0, 0, Math.PI * 2);
        context.ellipse(x + cloud.width * .28 * layer.scale, y - 10, cloud.width * .35 * layer.scale, 25 * layer.scale, 0, 0, Math.PI * 2);
        context.ellipse(x - cloud.width * .25 * layer.scale, y + 5, cloud.width * .3 * layer.scale, 17 * layer.scale, 0, 0, Math.PI * 2); context.fill();
      });
    });
  }

  function drawMountainLayer(baseY, amplitude, color, parallax, opacity) {
    const offset = wrap(scrollDistance * parallax, 340);
    context.save(); context.globalAlpha = opacity; context.fillStyle = color; context.beginPath(); context.moveTo(-360, WORLD_HEIGHT);
    for (let x = -360; x <= WORLD_WIDTH + 360; x += 85) {
      const worldX = x + offset;
      context.lineTo(x, baseY - Math.abs(Math.sin(worldX * .012 + parallax * 30)) * amplitude);
    }
    context.lineTo(WORLD_WIDTH + 360, WORLD_HEIGHT); context.closePath(); context.fill(); context.restore();
  }

  function drawLandmarkCastle(palette) {
    const span = 2380;
    const offset = wrap(scrollDistance * .065, span);
    context.save();
    for (let repeat = -1; repeat <= 1; repeat += 1) {
      const x = 630 - offset + repeat * span;
      if (x < -620 || x > WORLD_WIDTH + 250) continue;
      const base = 354;
      context.fillStyle = level === 1 ? "#16363b" : level === 2 ? "#172d3d" : "#20182e";

      context.beginPath();
      context.moveTo(x - 235, base);
      context.lineTo(x - 205, base - 54);
      context.lineTo(x - 142, base - 76);
      context.lineTo(x - 82, base - 146);
      context.lineTo(x + 25, base - 174);
      context.lineTo(x + 142, base - 112);
      context.lineTo(x + 225, base - 78);
      context.lineTo(x + 272, base);
      context.closePath();
      context.fill();

      const towers = [
        { dx: -145, width: 62, height: 112 },
        { dx: -42, width: 82, height: 238 },
        { dx: 72, width: 66, height: 143 },
        { dx: 164, width: 52, height: 96 },
      ];
      towers.forEach((tower, towerIndex) => {
        const tx = x + tower.dx;
        const top = base - tower.height;
        context.fillRect(tx, top, tower.width, tower.height);
        context.beginPath();
        context.moveTo(tx - 18, top + 5);
        context.lineTo(tx + tower.width / 2, top - 28 - (towerIndex % 2) * 14);
        context.lineTo(tx + tower.width + 18, top + 5);
        context.lineTo(tx + tower.width + 5, top + 11);
        context.lineTo(tx - 5, top + 11);
        context.closePath();
        context.fill();
        context.fillRect(tx - 8, top + 28, tower.width + 16, 7);

        for (let row = 0; row < 3; row += 1) {
          const flicker = Math.sin(worldTime * (.33 + towerIndex * .08) + towerIndex * 2.1 + row * 1.7);
          if (flicker < -.72) continue;
          const alpha = .25 + (flicker + 1) * .11;
          context.fillStyle = `rgba(255,185,88,${alpha})`;
          context.fillRect(tx + tower.width * .48, top + 48 + row * 22, 5, 10);
          context.fillStyle = palette.palace;
        }
      });

      context.fillRect(x - 230, base - 30, 480, 30);
      context.fillRect(x - 265, base - 11, 550, 11);

      context.save();
      const gateGlow = context.createRadialGradient(x + 2, base - 38, 2, x + 2, base - 38, 54);
      gateGlow.addColorStop(0, "rgba(255,202,112,.22)");
      gateGlow.addColorStop(1, "rgba(255,160,60,0)");
      context.fillStyle = gateGlow;
      context.beginPath(); context.arc(x + 2, base - 38, 54, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(255,191,91,.25)";
      context.beginPath();
      context.moveTo(x - 12, base - 8);
      context.lineTo(x - 12, base - 42);
      context.arc(x + 2, base - 42, 14, Math.PI, 0);
      context.lineTo(x + 16, base - 8);
      context.closePath(); context.fill();
      context.restore();

      context.strokeStyle = `rgba(158,180,184,${.1 + lightningIntensity * 1.8})`;
      context.lineWidth = 1.2;
      context.strokeRect(x - 230, base - 30, 480, 30);

      for (let lamp = 0; lamp < 12; lamp += 1) {
        const lx = x - 210 + lamp * 39;
        const pulse = .28 + Math.sin(worldTime * (.4 + lamp % 3 * .09) + lamp * 1.43) * .12;
        context.fillStyle = `rgba(255,174,69,${pulse})`;
        context.beginPath(); context.arc(lx, base - 18, 2.4, 0, Math.PI * 2); context.fill();
      }
    }
    context.restore();
  }

  function drawDistantKingdom(palette) {
    const span = 1680, offset = wrap(scrollDistance * .14, span);
    context.save(); context.fillStyle = palette.palace; context.strokeStyle = "rgba(129,148,143,.11)"; context.lineWidth = 1;
    for (let index = -1; index < 8; index += 1) {
      const x = index * 245 - offset, base = 354 + (index % 2) * 18, towerHeight = 78 + (index % 4) * 28;
      context.fillRect(x, base - towerHeight, 72, towerHeight); context.beginPath(); context.moveTo(x - 13, base - towerHeight); context.lineTo(x + 36, base - towerHeight - 38 - (index % 3) * 10); context.lineTo(x + 85, base - towerHeight); context.closePath(); context.fill();
      context.fillRect(x + 86, base - 46, 128, 46); context.strokeRect(x, base - towerHeight, 72, towerHeight);
    }
    const lightLimit = level === 1 ? 30 : level === 2 ? 40 : palaceLights.length;
    palaceLights.slice(0, lightLimit).forEach((light) => {
      const x = wrap(light.worldX - offset, span) - 100, y = 294 + light.row * 19 + Math.sin(light.phase) * 5;
      const flicker = Math.sin(worldTime * light.frequency + light.phase);
      const active = light.mode === 0 || (light.mode === 1 ? flicker > -.82 : light.mode === 2 ? flicker > -.35 : flicker > -.62);
      if (!active || x < -20 || x > WORLD_WIDTH + 20) return;
      const alpha = light.mode === 0 ? .24 : .13 + (flicker + 1) * .1;
      context.fillStyle = `rgba(255,184,82,${alpha})`; context.fillRect(x, y, 4, 8);
      context.fillStyle = `rgba(255,169,65,${alpha * .18})`; context.beginPath(); context.arc(x + 2, y + 4, 12, 0, Math.PI * 2); context.fill();
    });
    context.restore();
  }

  function drawFloatingLanterns() {
    const count = level === 1 ? 7 : level === 2 ? 11 : floatingLanterns.length;
    context.save();
    floatingLanterns.slice(0, count).forEach((lantern, index) => {
      const span = 1940;
      const x = wrap(lantern.worldX - scrollDistance * lantern.depth + Math.sin(worldTime * .18 + lantern.phase) * 10, span) - 180;
      const rise = wrap(worldTime * lantern.rise + lantern.phase * 37, 260);
      const y = lantern.baseY - rise * .52;
      if (x < -20 || x > WORLD_WIDTH + 20 || y < 70) return;
      const pulse = .2 + Math.sin(worldTime * .55 + lantern.phase) * .06;
      const size = lantern.size * (lantern.depth + .55);
      context.fillStyle = `rgba(255,188,91,${pulse})`;
      context.fillRect(x - size * .55, y - size, size * 1.1, size * 1.7);
      context.fillStyle = `rgba(255,168,65,${pulse * .16})`;
      context.beginPath(); context.arc(x, y, size * 4.2, 0, Math.PI * 2); context.fill();
    });
    context.restore();
  }

  function drawMidgroundKingdom(palette) {
    const span = 1960, offset = wrap(scrollDistance * .34, span);
    context.save(); context.fillStyle = palette.middle;
    for (let index = -1; index < 7; index += 1) {
      const x = index * 340 - offset, base = 430, height = 84 + (index % 3) * 34;
      context.fillRect(x, base - height, 115, height); context.beginPath(); context.moveTo(x - 18, base - height); context.lineTo(x + 57, base - height - 26); context.lineTo(x + 132, base - height); context.closePath(); context.fill();
      context.fillRect(x + 140, base - 45, 154, 45);
      for (let pillar = 0; pillar < 4; pillar += 1) context.fillRect(x + 150 + pillar * 38, base - 76, 10, 76);
    }
    context.restore();
  }

  function drawFog(palette) {
    context.save(); context.fillStyle = palette.fog;
    for (let layer = 0; layer < 2; layer += 1) {
      const speed = layer === 0 ? .2 : .48;
      const offset = wrap(scrollDistance * speed + worldTime * (7 + layer * 4), 520);
      for (let index = -1; index < 5; index += 1) {
        const x = index * 420 - offset, y = 420 + layer * 92 + Math.sin(index + worldTime * .18) * 16;
        context.beginPath(); context.ellipse(x, y, 260, 34 + layer * 14, 0, 0, Math.PI * 2); context.fill();
      }
    }
    context.restore();
  }

  function drawTerrainLines(palette) {
    context.strokeStyle = "rgba(121,154,136,.075)"; context.lineWidth = 1;
    for (let row = 0; row < 7; row += 1) {
      const y = 440 + row * 39, offset = wrap(scrollDistance * (.46 + row * .035), 180);
      context.beginPath(); context.moveTo(-180 - offset, y);
      for (let x = -180; x <= WORLD_WIDTH + 220; x += 120) context.quadraticCurveTo(x + 55 - offset, y - 7 + Math.sin(x * .02 + row) * 4, x + 120 - offset, y);
      context.stroke();
    }
    context.fillStyle = palette.ground; context.globalAlpha = .22; context.fillRect(0, 660, WORLD_WIDTH, 60); context.globalAlpha = 1;
  }

  function drawForegroundVegetation(palette) {
    const offset = wrap(scrollDistance * .88, 86);
    context.fillStyle = palette.foreground; context.beginPath(); context.moveTo(0, WORLD_HEIGHT);
    for (let x = -90; x <= WORLD_WIDTH + 90; x += 16) {
      const sway = Math.sin(worldTime * .85 + x * .09) * 3, height = 12 + ((x + 200) % 37) * .65;
      context.lineTo(x - offset + sway, WORLD_HEIGHT - height); context.lineTo(x - offset + 5, WORLD_HEIGHT);
    }
    context.closePath(); context.fill(); context.globalAlpha = .48; context.beginPath(); context.moveTo(0, 0); context.lineTo(0, 120); context.bezierCurveTo(100, 80, 135, 122, 190, 0); context.closePath(); context.fill(); context.globalAlpha = 1;

    const bambooOffset = wrap(scrollDistance * 1.04, 760);
    context.save();
    context.strokeStyle = "rgba(4,17,18,.72)";
    context.fillStyle = "rgba(4,17,18,.72)";
    context.lineWidth = 5;
    for (let cluster = -1; cluster < 4; cluster += 1) {
      const baseX = cluster * 380 - bambooOffset;
      for (let stem = 0; stem < 4; stem += 1) {
        const x = baseX + stem * 17;
        const sway = Math.sin(worldTime * (.45 + stem * .05) + cluster * 1.4) * (4 + stem);
        const height = 68 + stem * 18 + (cluster % 2) * 12;
        context.beginPath(); context.moveTo(x, WORLD_HEIGHT); context.quadraticCurveTo(x + sway * .35, WORLD_HEIGHT - height * .55, x + sway, WORLD_HEIGHT - height); context.stroke();
        for (let leaf = 1; leaf < 4; leaf += 1) {
          const ly = WORLD_HEIGHT - height * (leaf * .22 + .18);
          const side = (leaf + stem) % 2 === 0 ? -1 : 1;
          context.beginPath(); context.ellipse(x + sway * .45 + side * 10, ly, 11, 3.4, side * -.38, 0, Math.PI * 2); context.fill();
        }
      }
    }
    context.restore();
  }

  function columnShaftBounds(obstacle) {
    const insetRatios = [.07, .055, .095, .04];
    const inset = obstacle.width * insetRatios[obstacle.kind];
    return { left: obstacle.x + inset, right: obstacle.x + obstacle.width - inset, width: obstacle.width - inset * 2 };
  }

  function fractureProfile(obstacle, position) {
    const phase = obstacle.seed * .173 + obstacle.kind * 1.91;
    const amplitude = [10, 13, 15, 12][obstacle.kind] * (level === 1 ? .82 : level === 2 ? 1 : 1.12);
    const broad = Math.sin(position * Math.PI * 2.35 + phase) * amplitude * .48;
    const detail = Math.sin(position * Math.PI * 7.2 + phase * 1.7) * amplitude * .25;
    const split = Math.sin(position * Math.PI * 13.4 + phase * .63) * amplitude * .13;
    return broad + detail + split;
  }

  function fractureChip(obstacle, fromTop, position) {
    const phase = obstacle.seed * .287 + obstacle.kind * 2.17 + (fromTop ? .4 : 1.6);
    const ridge = Math.max(0, Math.sin(position * Math.PI * 9 + phase));
    const missing = ridge > .72 ? (ridge - .72) * (level + 1) * 8 : 0;
    return fromTop ? -missing : missing;
  }

  function fractureYAt(obstacle, fromTop, position) {
    const baseline = fromTop ? obstacle.topHeight : obstacle.bottomStart;
    return baseline + fractureProfile(obstacle, position) + fractureChip(obstacle, fromTop, position);
  }

  function traceColumnPiece(obstacle, fromTop) {
    const bounds = columnShaftBounds(obstacle);
    const steps = 18;
    context.beginPath();
    context.moveTo(bounds.left, fromTop ? 0 : WORLD_HEIGHT);
    context.lineTo(bounds.right, fromTop ? 0 : WORLD_HEIGHT);
    for (let step = steps; step >= 0; step -= 1) {
      const position = step / steps;
      context.lineTo(bounds.left + bounds.width * position, fractureYAt(obstacle, fromTop, position));
    }
    context.closePath();
  }

  function drawObstacles() {
    obstacles.forEach((obstacle, index) => {
      drawArchitecturalColumnPiece(obstacle, true, index);
      drawArchitecturalColumnPiece(obstacle, false, index);
      drawFractureDebris(obstacle, index);
    });
  }

  function drawArchitecturalColumnPiece(obstacle, fromTop, index) {
    const bounds = columnShaftBounds(obstacle);
    const variant = obstacle.kind;
    const moonlit = ["#7d8785", "#89918d", "#717b78", "#92938b"][variant];
    const stoneMid = ["#3d4947", "#424c48", "#35413f", "#4a4b47"][variant];
    const stoneDark = ["#152321", "#17231f", "#13201f", "#1b201e"][variant];
    const warmBounce = ["rgba(155,112,68,.12)", "rgba(167,120,72,.15)", "rgba(135,101,67,.1)", "rgba(176,129,72,.16)"][variant];

    context.save();
    traceColumnPiece(obstacle, fromTop);
    context.clip();

    const stoneGradient = context.createLinearGradient(bounds.left, 0, bounds.right, 0);
    stoneGradient.addColorStop(0, stoneDark);
    stoneGradient.addColorStop(.16, stoneMid);
    stoneGradient.addColorStop(.38, moonlit);
    stoneGradient.addColorStop(.55, stoneMid);
    stoneGradient.addColorStop(.82, stoneDark);
    stoneGradient.addColorStop(1, "#091412");
    context.fillStyle = stoneGradient;
    context.fillRect(bounds.left, 0, bounds.width, WORLD_HEIGHT);

    const verticalShade = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    verticalShade.addColorStop(0, fromTop ? "rgba(190,210,203,.08)" : "rgba(0,0,0,.1)");
    verticalShade.addColorStop(.55, "rgba(0,0,0,0)");
    verticalShade.addColorStop(1, fromTop ? "rgba(0,0,0,.12)" : "rgba(183,139,84,.08)");
    context.fillStyle = verticalShade;
    context.fillRect(bounds.left, 0, bounds.width, WORLD_HEIGHT);

    drawColumnFlutes(obstacle, fromTop, bounds);
    drawColumnWeathering(obstacle, fromTop, bounds, warmBounce);
    drawFractureCracks(obstacle, fromTop, bounds);
    context.restore();

    drawColumnCrownAndBase(obstacle, fromTop, bounds);
    drawBrokenEdge(obstacle, fromTop, bounds);
  }

  function drawColumnFlutes(obstacle, fromTop, bounds) {
    const fluteCount = [7, 8, 6, 9][obstacle.kind];
    const capDepth = [74, 92, 58, 104][obstacle.kind];
    const baseDepth = [58, 66, 50, 76][obstacle.kind];
    const startY = fromTop ? capDepth : WORLD_HEIGHT - baseDepth;
    context.lineCap = "round";
    for (let flute = 1; flute < fluteCount; flute += 1) {
      const position = flute / fluteCount;
      const x = bounds.left + bounds.width * position;
      const edgeY = fractureYAt(obstacle, fromTop, position);
      const endY = fromTop ? edgeY - 7 : edgeY + 7;
      const channel = context.createLinearGradient(x - 3, 0, x + 4, 0);
      channel.addColorStop(0, "rgba(5,12,12,.48)");
      channel.addColorStop(.48, "rgba(18,27,25,.2)");
      channel.addColorStop(1, "rgba(181,198,190,.18)");
      context.strokeStyle = channel;
      context.lineWidth = Math.max(3.5, bounds.width / 22);
      context.beginPath();
      context.moveTo(x, startY);
      context.lineTo(x, endY);
      context.stroke();
    }
  }

  function drawColumnWeathering(obstacle, fromTop, bounds, warmBounce) {
    const edgeCenter = fractureYAt(obstacle, fromTop, .5);
    context.fillStyle = warmBounce;
    context.fillRect(bounds.left + bounds.width * .42, fromTop ? 0 : edgeCenter, bounds.width * .34, fromTop ? edgeCenter : WORLD_HEIGHT - edgeCenter);

    const stainY = fromTop ? edgeCenter - 44 : edgeCenter + 28;
    context.fillStyle = "rgba(25,48,38,.28)";
    context.beginPath();
    context.ellipse(bounds.left + bounds.width * (.2 + (obstacle.seed % .34)), stainY, bounds.width * .18, 18 + obstacle.kind * 3, -.3, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = .22;
    context.fillStyle = "#09110f";
    for (let speck = 0; speck < 12; speck += 1) {
      const px = bounds.left + bounds.width * (((speck * .173) + obstacle.seed * .071) % 1);
      const depth = 26 + ((speck * 17 + obstacle.kind * 11) % 88);
      const py = fromTop ? edgeCenter - depth : edgeCenter + depth;
      context.beginPath();
      context.arc(px, py, 1 + (speck % 3) * .7, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFractureCracks(obstacle, fromTop, bounds) {
    const direction = fromTop ? -1 : 1;
    context.strokeStyle = "rgba(4,10,9,.72)";
    context.lineWidth = 1.35;
    context.lineCap = "round";
    for (let crack = 0; crack < 3; crack += 1) {
      const position = .2 + crack * .29 + Math.sin(obstacle.seed + crack) * .035;
      const startX = bounds.left + bounds.width * position;
      const startY = fractureYAt(obstacle, fromTop, position) + direction * 2;
      const reach = 22 + ((obstacle.kind * 13 + crack * 17) % 34);
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(startX + (crack - 1) * 7, startY + direction * reach * .45);
      context.lineTo(startX + (crack % 2 ? 8 : -6), startY + direction * reach);
      context.stroke();
      if (crack !== 1) {
        context.beginPath();
        context.moveTo(startX + (crack - 1) * 5, startY + direction * reach * .48);
        context.lineTo(startX + (crack === 0 ? 12 : -11), startY + direction * reach * .67);
        context.stroke();
      }
    }
  }

  function drawColumnCrownAndBase(obstacle, fromTop, bounds) {
    const variant = obstacle.kind;
    const x = obstacle.x;
    const width = obstacle.width;
    context.save();
    context.fillStyle = "rgba(50,62,58,.98)";
    context.strokeStyle = "rgba(137,154,147,.52)";
    context.lineWidth = 1.25;

    if (fromTop) {
      const depths = [72, 90, 56, 101];
      const depth = depths[variant];
      drawStoneBand(x, 6, width, 13, 4);
      drawStoneBand(x + width * .04, 20, width * .92, 11, 3);
      drawStoneBand(x + width * .09, 33, width * .82, 10, 2);

      if (variant === 0 || variant === 3) {
        drawIonicScroll(x + width * .24, 48, width * .17, variant === 3);
        drawIonicScroll(x + width * .76, 48, width * .17, variant === 3);
      }
      if (variant === 1 || variant === 3) drawCorinthianLeaves(x, 43, width, depth - 46, variant === 3 ? 5 : 4);
      if (variant === 2) {
        context.fillStyle = "rgba(22,34,32,.75)";
        context.beginPath();
        context.moveTo(x + width * .12, 43);
        context.lineTo(x + width * .88, 43);
        context.lineTo(x + width * .73, depth);
        context.lineTo(x + width * .27, depth - 5);
        context.closePath();
        context.fill();
      }
      drawStoneBand(bounds.left, depth - 9, bounds.width, 12, 2);
    } else {
      const baseDepth = [58, 66, 50, 76][variant];
      drawStoneBand(x + width * .1, WORLD_HEIGHT - baseDepth, width * .8, 12, 2);
      drawStoneBand(x + width * .05, WORLD_HEIGHT - baseDepth + 13, width * .9, 14, 3);
      drawStoneBand(x, WORLD_HEIGHT - baseDepth + 29, width, 17, 4);
      drawStoneBand(x - width * .035, WORLD_HEIGHT - 18, width * 1.07, 18, 3);
      context.fillStyle = "rgba(11,24,20,.44)";
      context.fillRect(x + width * .08, WORLD_HEIGHT - 8, width * .84, 8);
    }
    context.restore();
  }

  function drawStoneBand(x, y, width, height, radius) {
    const gradient = context.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, "#192521");
    gradient.addColorStop(.35, "#66716b");
    gradient.addColorStop(.58, "#3f4b46");
    gradient.addColorStop(1, "#111b18");
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    context.stroke();
  }

  function drawIonicScroll(centerX, centerY, radius, deep) {
    context.strokeStyle = deep ? "rgba(171,154,112,.55)" : "rgba(135,151,143,.62)";
    context.lineWidth = Math.max(2, radius * .16);
    context.beginPath();
    for (let point = 0; point <= 24; point += 1) {
      const angle = point / 24 * Math.PI * 2.15;
      const r = radius * (1 - point / 30);
      const px = centerX + Math.cos(angle) * r;
      const py = centerY + Math.sin(angle) * r * .72;
      if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.stroke();
  }

  function drawCorinthianLeaves(x, y, width, depth, count) {
    context.fillStyle = "rgba(88,102,94,.68)";
    context.strokeStyle = "rgba(159,174,164,.38)";
    for (let leaf = 0; leaf < count; leaf += 1) {
      const centerX = x + width * (.16 + leaf * (.68 / Math.max(1, count - 1)));
      const lean = (leaf - (count - 1) / 2) * width * .035;
      context.beginPath();
      context.moveTo(centerX, y + depth);
      context.quadraticCurveTo(centerX - width * .09, y + depth * .55, centerX + lean, y);
      context.quadraticCurveTo(centerX + width * .09, y + depth * .55, centerX, y + depth);
      context.fill();
      context.stroke();
    }
  }

  function drawBrokenEdge(obstacle, fromTop, bounds) {
    const steps = 24;
    context.save();
    context.lineJoin = "bevel";
    context.strokeStyle = "rgba(4,9,8,.88)";
    context.lineWidth = 8;
    context.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const position = step / steps;
      const x = bounds.left + bounds.width * position;
      const y = fractureYAt(obstacle, fromTop, position);
      if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    context.strokeStyle = fromTop ? "rgba(151,166,158,.72)" : "rgba(103,116,109,.56)";
    context.lineWidth = 2.2;
    context.translate(0, fromTop ? -2.5 : 2.5);
    context.stroke();
    context.restore();
  }

  function drawFractureDebris(obstacle, index) {
    if (reducedMotionQuery.matches) return;
    const bounds = columnShaftBounds(obstacle);
    context.save();
    for (let piece = 0; piece < 3; piece += 1) {
      const seed = obstacle.seed * (piece + 1.7) + index * 2.3;
      const position = .18 + ((seed * .173) % .64);
      const side = piece % 2 === 0 ? true : false;
      const edgeY = fractureYAt(obstacle, side, position);
      const fall = wrap(worldTime * (8 + piece * 2.3) + seed * 19, 52);
      const x = bounds.left + bounds.width * position + Math.sin(worldTime * .8 + seed) * 3;
      const y = side ? edgeY + 5 + fall : edgeY + 4 + fall * .6;
      if (y > obstacle.bottomStart - 5 && y < obstacle.bottomStart + 8) continue;
      context.translate(x, y);
      context.rotate(worldTime * (.18 + piece * .05) + seed);
      context.fillStyle = piece === 1 ? "rgba(104,116,108,.58)" : "rgba(55,67,62,.72)";
      context.fillRect(-2 - piece * .4, -1.5, 4 + piece * .7, 3 + piece * .35);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    context.restore();
  }

  function drawFireElement(element) {
    const floatY = elementFloatY(element), pulse = 1 + Math.sin(worldTime * 7 + element.phase) * .07;
    const glow = context.createRadialGradient(element.x, floatY, 3, element.x, floatY, 48 * pulse);
    glow.addColorStop(0, "rgba(255,246,176,.98)"); glow.addColorStop(.26, "rgba(255,180,65,.75)"); glow.addColorStop(1, "rgba(255,105,26,0)");
    context.fillStyle = glow; context.beginPath(); context.arc(element.x, floatY, 48 * pulse, 0, Math.PI * 2); context.fill();
    context.save(); context.translate(element.x, floatY); context.scale(pulse, pulse); context.fillStyle = "#ff8b2f"; context.beginPath(); context.moveTo(0, 18); context.bezierCurveTo(-17, 11, -15, -6, -4, -23); context.bezierCurveTo(-2, -10, 10, -18, 8, -34); context.bezierCurveTo(24, -18, 21, 6, 9, 17); context.closePath(); context.fill();
    context.fillStyle = "#fff3a8"; context.beginPath(); context.moveTo(0, 14); context.bezierCurveTo(-9, 7, -7, -2, 1, -13); context.bezierCurveTo(11, -3, 11, 9, 5, 15); context.closePath(); context.fill(); context.restore();
    for (let index = 0; index < 5; index += 1) { const age = wrap(worldTime * (.45 + index * .03) + index * .19 + element.phase, 1); const px = element.x + Math.sin(index * 3.1 + worldTime * 2) * (8 + index * 2); const py = floatY - 22 - age * 34; context.fillStyle = `rgba(255,${150 + index * 12},56,${.55 * (1 - age)})`; context.beginPath(); context.arc(px, py, 2.4 - age * 1.4, 0, Math.PI * 2); context.fill(); }
  }

  function drawWaterElement(element) {
    const floatY = elementFloatY(element), pulse = 1 + Math.sin(worldTime * 5.4 + element.phase) * .055;
    const glow = context.createRadialGradient(element.x, floatY, 2, element.x, floatY, 52 * pulse);
    glow.addColorStop(0, "rgba(230,255,255,.95)"); glow.addColorStop(.25, "rgba(84,220,244,.68)"); glow.addColorStop(1, "rgba(24,123,188,0)");
    context.fillStyle = glow; context.beginPath(); context.arc(element.x, floatY, 52 * pulse, 0, Math.PI * 2); context.fill();
    context.save(); context.translate(element.x, floatY); context.scale(pulse, pulse);
    const drop = context.createLinearGradient(-12, -25, 13, 22);
    drop.addColorStop(0, "#ddffff"); drop.addColorStop(.35, "#52d9ef"); drop.addColorStop(1, "#1676bc");
    context.fillStyle = drop; context.strokeStyle = "rgba(225,255,255,.85)"; context.lineWidth = 1.4;
    context.beginPath(); context.moveTo(0, -29); context.bezierCurveTo(13, -11, 20, -2, 17, 10); context.bezierCurveTo(14, 25, -14, 25, -17, 10); context.bezierCurveTo(-20, -2, -11, -14, 0, -29); context.closePath(); context.fill(); context.stroke();
    context.fillStyle = "rgba(255,255,255,.62)"; context.beginPath(); context.ellipse(-6, -3, 3.2, 9, .48, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(209,252,255,.48)"; context.lineWidth = 1.1;
    context.beginPath(); context.arc(2, 8, 8, .2, 2.55); context.stroke(); context.restore();
    context.save(); context.strokeStyle = "rgba(99,224,247,.38)"; context.lineWidth = 1.25;
    for (let index = 0; index < 3; index += 1) { const ripple = wrap(worldTime * .7 + element.phase + index / 3, 1); context.globalAlpha = 1 - ripple; context.beginPath(); context.ellipse(element.x, floatY + 23, 10 + ripple * 25, 3 + ripple * 7, 0, 0, Math.PI * 2); context.stroke(); }
    context.restore();
  }

  function drawGoldElement(element) {
    const floatY = elementFloatY(element), pulse = 1 + Math.sin(worldTime * 6.1 + element.phase) * .06;
    const glow = context.createRadialGradient(element.x, floatY, 2, element.x, floatY, 54 * pulse);
    glow.addColorStop(0, "rgba(255,252,205,.98)"); glow.addColorStop(.28, "rgba(248,204,72,.72)"); glow.addColorStop(1, "rgba(178,103,18,0)");
    context.fillStyle = glow; context.beginPath(); context.arc(element.x, floatY, 54 * pulse, 0, Math.PI * 2); context.fill();
    context.save(); context.translate(element.x, floatY); context.rotate(worldTime * .55 + element.phase); context.scale(pulse, pulse);
    const gold = context.createLinearGradient(-20, -22, 20, 23); gold.addColorStop(0, "#fff6ad"); gold.addColorStop(.36, "#eebd3f"); gold.addColorStop(.68, "#9d5d15"); gold.addColorStop(1, "#ffe985");
    context.fillStyle = gold; context.strokeStyle = "rgba(255,248,184,.9)"; context.lineWidth = 1.35;
    context.beginPath(); context.moveTo(0, -25); context.lineTo(17, -7); context.lineTo(13, 19); context.lineTo(-6, 26); context.lineTo(-20, 5); context.lineTo(-13, -17); context.closePath(); context.fill(); context.stroke();
    context.strokeStyle = "rgba(255,247,187,.46)"; context.beginPath(); context.moveTo(0, -25); context.lineTo(-2, 18); context.moveTo(-20, 5); context.lineTo(17, -7); context.stroke(); context.restore();
    context.save(); context.translate(element.x, floatY); context.rotate(-worldTime * .35);
    context.strokeStyle = "rgba(255,232,119,.55)"; context.lineWidth = 1.2;
    for (let index = 0; index < 4; index += 1) { context.rotate(Math.PI / 2); context.beginPath(); context.moveTo(25, 0); context.lineTo(31, 0); context.stroke(); }
    context.restore();
  }

  function drawElements() {
    if (state === GAME_STATE.LEVEL_TRANSITION || state === GAME_STATE.GAME_OVER) return;
    elements.forEach((element) => {
      if (element.x < -80 || element.x > WORLD_WIDTH + 90) return;
      if (element.type === ELEMENT.WATER) drawWaterElement(element);
      else if (element.type === ELEMENT.GOLD) drawGoldElement(element);
      else drawFireElement(element);
    });
  }

  function createSerpentScaleSprite(fill, shadow, highlight, ventral = false) {
    const sprite = document.createElement("canvas");
    sprite.width = 32;
    sprite.height = 24;
    const spriteContext = sprite.getContext("2d");
    const gradient = spriteContext.createLinearGradient(0, 3, 0, 21);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(.4, fill);
    gradient.addColorStop(1, shadow);
    spriteContext.fillStyle = gradient;
    spriteContext.strokeStyle = "rgba(3,25,34,.72)";
    spriteContext.lineWidth = 1.2;
    spriteContext.beginPath();
    if (ventral) {
      spriteContext.roundRect(3, 6, 26, 12, 5);
    } else {
      spriteContext.moveTo(16, 2);
      spriteContext.bezierCurveTo(27, 3, 30, 9, 16, 22);
      spriteContext.bezierCurveTo(2, 9, 5, 3, 16, 2);
      spriteContext.closePath();
    }
    spriteContext.fill();
    spriteContext.stroke();
    spriteContext.strokeStyle = "rgba(225,252,249,.38)";
    spriteContext.lineWidth = 1;
    spriteContext.beginPath();
    spriteContext.moveTo(8, ventral ? 8 : 7);
    spriteContext.quadraticCurveTo(16, ventral ? 5 : 3, 24, ventral ? 8 : 7);
    spriteContext.stroke();
    return sprite;
  }

  function serpentRadiusAt(position) {
    const progress = clamp(position, 0, 1);
    const neckRise = progress < .11 ? lerp(10.6, 13.6, progress / .11) : 13.6;
    const taper = 1 - Math.pow(Math.max(0, (progress - .12) / .88), 1.42) * .79;
    return Math.max(2.6, neckRise * taper);
  }

  function getSerpentRenderSpine() {
    const body = serpent.body;
    const speedFrequency = 3.25 + Math.min(speedTier * .16, .8);
    return body.map((segment, index) => {
      const previous = body[Math.max(0, index - 1)];
      const next = body[Math.min(body.length - 1, index + 1)];
      const smoothedX = index === 0 ? segment.x : (previous.x + segment.x * 2 + next.x) / 4;
      const smoothedY = index === 0 ? segment.y : (previous.y + segment.y * 2 + next.y) / 4;
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy) || 1;
      const waveStrength = reducedMotionQuery.matches || index === 0 ? 0 : Math.min(1.15, index / Math.max(1, body.length - 1) * 1.65);
      const wave = Math.sin(worldTime * speedFrequency - index * .47) * waveStrength;
      return {
        x: smoothedX - dy / length * wave,
        y: smoothedY + dx / length * wave,
      };
    });
  }

  function serpentPointFrame(points, index) {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    return { angle: Math.atan2(dy, dx), nx: -dy / length, ny: dx / length };
  }

  function traceSerpentRibbon(points) {
    const last = Math.max(1, points.length - 1);
    context.beginPath();
    points.forEach((point, index) => {
      const frame = serpentPointFrame(points, index);
      const radius = serpentRadiusAt(index / last);
      const x = point.x + frame.nx * radius;
      const y = point.y + frame.ny * radius;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const point = points[index];
      const frame = serpentPointFrame(points, index);
      const radius = serpentRadiusAt(index / last);
      context.lineTo(point.x - frame.nx * radius, point.y - frame.ny * radius);
    }
    context.closePath();
  }

  function serpentLightingResponse() {
    const nearestFire = elements.filter((element) => element.type === ELEMENT.FIRE).sort((a, b) => Math.abs(a.x - serpent.x) - Math.abs(b.x - serpent.x))[0];
    const fireY = nearestFire ? elementFloatY(nearestFire) : -999;
    const fireDistance = nearestFire ? Math.hypot(serpent.x - nearestFire.x, serpent.y - fireY) : 999;
    const firelight = clamp(1 - fireDistance / 230, 0, 1) * .24 + clamp(headGlowTimer / .55, 0, 1) * .28;
    const columnShadow = obstacles.some((obstacle) => {
      const bounds = columnShaftBounds(obstacle);
      return serpent.x > bounds.left - 42 && serpent.x < bounds.right + 48;
    }) ? .13 : 0;
    return { firelight, lightning: clamp(lightningIntensity * 2.7, 0, .48), columnShadow };
  }

  function drawSerpent() {
    if (!serpent) return;
    const points = getSerpentRenderSpine();
    const lighting = serpentLightingResponse();
    context.save();
    context.globalAlpha = serpent.alpha;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.save();
    context.translate(0, 3);
    traceSerpentRibbon(points);
    context.fillStyle = "rgba(0,9,15,.38)";
    context.fill();
    context.restore();

    traceSerpentRibbon(points);
    const bodyGradient = context.createLinearGradient(0, serpent.y - 24, 0, serpent.y + 28);
    bodyGradient.addColorStop(0, lighting.columnShadow ? "#07384d" : "#0a5570");
    bodyGradient.addColorStop(.28, "#087c91");
    bodyGradient.addColorStop(.58, "#0b6d83");
    bodyGradient.addColorStop(1, "#183d52");
    context.fillStyle = bodyGradient;
    context.fill();
    context.strokeStyle = `rgba(121,218,225,${.28 + lighting.lightning * .52})`;
    context.lineWidth = 1.05;
    context.stroke();

    drawSerpentScales(points, lighting);
    drawSerpentRim(points, lighting);
    drawSerpentHead(lighting);
    context.restore();
  }

  function drawSerpentScales(points, lighting) {
    const last = Math.max(1, points.length - 1);
    const stride = points.length > 90 ? 4 : 3;
    for (let index = 2; index < points.length - 1; index += stride) {
      const point = points[index];
      const frame = serpentPointFrame(points, index);
      const progress = index / last;
      const radius = serpentRadiusAt(progress);
      const scaleLength = clamp(radius * .72, 3.5, 8.8);
      const staggeredRow = Math.floor(index / stride) % 2 === 0;
      const rows = radius > 5 ? (staggeredRow ? [-.42, .42] : [0]) : [0];
      rows.forEach((row, rowIndex) => {
        const offset = row * radius;
        const sprite = row > .32 && Math.abs(frame.angle) > .1 ? serpentScaleSprites.ventral : rows.length === 1 ? serpentScaleSprites.dorsal : serpentScaleSprites.side;
        context.save();
        context.translate(point.x + frame.nx * offset, point.y + frame.ny * offset);
        context.rotate(frame.angle);
        context.globalAlpha = serpent.alpha * (.55 + (1 - progress) * .22 + lighting.lightning * .35);
        context.drawImage(sprite, -scaleLength * .55, -scaleLength * .42, scaleLength * 1.1, scaleLength * .84);
        if (lighting.firelight > .025 && index < 15) {
          context.globalAlpha = serpent.alpha * lighting.firelight * (1 - index / 18) * .9;
          context.drawImage(serpentScaleSprites.warm, -scaleLength * .55, -scaleLength * .42, scaleLength * 1.1, scaleLength * .84);
        }
        context.restore();
      });
    }
  }

  function drawSerpentRim(points, lighting) {
    const last = Math.max(1, points.length - 1);
    context.save();
    context.globalCompositeOperation = "screen";
    context.strokeStyle = `rgba(113,225,236,${.25 + lighting.lightning * .62})`;
    context.lineWidth = 1.4;
    context.beginPath();
    points.forEach((point, index) => {
      const frame = serpentPointFrame(points, index);
      const radius = serpentRadiusAt(index / last);
      const x = point.x - frame.nx * radius * .72;
      const y = point.y - frame.ny * radius * .72;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
    context.strokeStyle = `rgba(60,191,207,${.11 + lighting.lightning * .28})`;
    context.lineWidth = 4.2;
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y - .8); else context.lineTo(point.x, point.y - .8);
    });
    context.stroke();
    context.restore();
  }

  function drawSerpentHead(lighting) {
    const breathe = 1 + Math.sin(worldTime * 2.7) * .014;
    const bob = reducedMotionQuery.matches ? 0 : Math.sin(worldTime * 1.35) * .38;
    context.save();
    context.translate(serpent.x, serpent.y + bob);
    context.rotate(serpent.angle);
    context.scale(1.2, breathe * 1.2);

    if (headGlowTimer > 0) {
      const glowStrength = clamp(headGlowTimer / .9, 0, 1);
      const headGlow = context.createRadialGradient(2, 0, 5, 2, 0, 38);
      headGlow.addColorStop(0, `rgba(255,203,114,${.26 * glowStrength})`);
      headGlow.addColorStop(.45, `rgba(255,158,61,${.1 * glowStrength})`);
      headGlow.addColorStop(1, "rgba(255,151,45,0)");
      context.fillStyle = headGlow;
      context.beginPath(); context.arc(2, 0, 38, 0, Math.PI * 2); context.fill();
    }

    const headGradient = context.createLinearGradient(-12, -12, 14, 12);
    headGradient.addColorStop(0, lighting.columnShadow ? "#0b4e64" : "#168ba0");
    headGradient.addColorStop(.36, "#18a7b8");
    headGradient.addColorStop(.68, "#08748d");
    headGradient.addColorStop(1, "#083b55");
    context.fillStyle = headGradient;
    context.strokeStyle = `rgba(128,226,230,${.36 + lighting.lightning * .7})`;
    context.lineWidth = 1.05;
    context.beginPath();
    context.moveTo(-12, -6.8);
    context.quadraticCurveTo(-2, -12.2, 7, -9.8);
    context.quadraticCurveTo(13.5, -7.2, 15.4, -2.4);
    context.quadraticCurveTo(17, 0, 15.4, 2.4);
    context.quadraticCurveTo(13.5, 7.2, 7, 9.8);
    context.quadraticCurveTo(-2, 12.2, -12, 6.8);
    context.quadraticCurveTo(-8.5, 0, -12, -6.8);
    context.closePath();
    context.fill();
    context.stroke();

    drawSerpentFacialScales(lighting);

    const blinkPhase = wrap(worldTime + Math.sin(worldTime * .17) * .7, 5.7);
    const eyeScale = blinkPhase > 5.48 ? .18 : 1;
    [-1, 1].forEach((side) => {
      context.save();
      context.translate(6.6, side * 6.1);
      context.scale(1, eyeScale);
      context.fillStyle = "#6a4121";
      context.beginPath(); context.ellipse(0, 0, 3.2, 2.25, side * .08, 0, Math.PI * 2); context.fill();
      const iris = context.createRadialGradient(-.7, -.6, .2, 0, 0, 2.4);
      iris.addColorStop(0, "#efce79");
      iris.addColorStop(.5, "#b77a32");
      iris.addColorStop(1, "#57351f");
      context.fillStyle = iris;
      context.beginPath(); context.ellipse(.2, 0, 2.35, 1.72, side * .08, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#071114";
      context.beginPath(); context.ellipse(.65, 0, .55, 1.55, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(241,252,245,.82)";
      context.beginPath(); context.arc(-.55, -.72, .48, 0, Math.PI * 2); context.fill();
      context.restore();
    });

    context.fillStyle = "rgba(4,22,30,.72)";
    [-1, 1].forEach((side) => { context.beginPath(); context.ellipse(12.3, side * 2.25, .72, .48, 0, 0, Math.PI * 2); context.fill(); });
    context.strokeStyle = "rgba(4,28,38,.76)";
    context.lineWidth = .9;
    context.beginPath(); context.moveTo(14.8, 2.4); context.quadraticCurveTo(8.5, 4.3, 1, 5.2); context.stroke();

    if (lighting.firelight > 0) {
      context.fillStyle = `rgba(255,177,78,${lighting.firelight * .34})`;
      context.beginPath(); context.ellipse(7, -2, 10, 7.4, -.15, 0, Math.PI * 2); context.fill();
    }
    if (lighting.lightning > 0) {
      context.fillStyle = `rgba(183,230,242,${lighting.lightning * .38})`;
      context.beginPath(); context.ellipse(1, -4, 12, 5, -.16, 0, Math.PI * 2); context.fill();
    }

    drawSerpentTongue();
    context.restore();
  }

  function drawSerpentFacialScales(lighting) {
    context.strokeStyle = `rgba(4,54,68,${.55 + lighting.lightning * .25})`;
    context.lineWidth = .62;
    const plates = [
      [-5, -4.5, 3.7, 2.5, -.2],
      [-3, 3.7, 3.4, 2.2, .2],
      [1.3, -2.2, 3.5, 2.2, -.1],
      [1.6, 3.2, 3.2, 2, .12],
      [8.5, 0, 3.6, 2.6, 0],
    ];
    plates.forEach(([x, y, rx, ry, rotation]) => {
      context.beginPath(); context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); context.stroke();
    });
  }

  function drawSerpentTongue() {
    if (reducedMotionQuery.matches) return;
    const tonguePhase = wrap(worldTime + Math.sin(worldTime * .113) * 1.6, 7.4);
    if (tonguePhase > .34) return;
    const extension = Math.sin(tonguePhase / .34 * Math.PI) * 10.5;
    context.strokeStyle = "rgba(132,54,71,.9)";
    context.lineWidth = .85;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(15.2, 0);
    context.lineTo(15.2 + extension * .76, 0);
    context.moveTo(15.2 + extension * .76, 0);
    context.lineTo(15.2 + extension, -2.3);
    context.moveTo(15.2 + extension * .76, 0);
    context.lineTo(15.2 + extension, 2.3);
    context.stroke();
  }

  function drawFeedbackWaves() {
    feedbackWaves.forEach((wave) => {
      const progress = 1 - wave.life / wave.maxLife;
      const alpha = Math.sin(progress * Math.PI);
      const isSpeed = wave.type === "speed";
      const isDeath = wave.type === "death";
      const isWrong = wave.type.startsWith("wrong-");
      const radius = isSpeed ? 28 + progress * 105 : isDeath || isWrong ? 24 + progress * 88 : 16 + progress * 52;
      const colors = { water: "87,219,245", gold: "247,207,76", fire: "255,173,69", "wrong-fire": "231,88,46", "wrong-water": "51,160,220" };
      const color = isDeath ? "224,214,180" : isSpeed ? "240,211,107" : colors[wave.type] || "255,173,69";
      context.save();
      context.globalAlpha = alpha;
      context.strokeStyle = `rgba(${color},${isSpeed || isWrong ? 0.72 : 0.62})`;
      context.lineWidth = isSpeed ? 4 - progress * 2.2 : 3 - progress * 1.6;
      context.beginPath(); context.arc(wave.x, wave.y, radius, 0, Math.PI * 2); context.stroke();
      const pulse = context.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, radius * 0.82);
      pulse.addColorStop(0, `rgba(${color},${isSpeed ? 0.22 : 0.3})`);
      pulse.addColorStop(1, `rgba(${color},0)`);
      context.fillStyle = pulse;
      context.beginPath(); context.arc(wave.x, wave.y, radius * 0.82, 0, Math.PI * 2); context.fill();
      context.restore();
    });
  }

  function drawScorePopups() {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 24px Georgia, 'Times New Roman', serif";
    scorePopups.forEach((popup) => {
      const progress = 1 - popup.life / popup.maxLife;
      const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
      context.globalAlpha = clamp(alpha, 0, 1);
      context.shadowColor = popup.type === ELEMENT.WATER ? "rgba(66,198,239,.75)" : popup.type === ELEMENT.GOLD ? "rgba(244,195,54,.78)" : "rgba(255,157,48,.75)";
      context.shadowBlur = 12;
      context.fillStyle = popup.type === ELEMENT.WATER ? "#d5faff" : popup.type === ELEMENT.GOLD ? "#fff0a2" : "#ffe3a0";
      context.fillText(popup.text, popup.x, popup.y);
    });
    context.restore();
  }

  function drawSpeedMotion() {
    if (speedPulseTimer <= 0 || reducedMotionQuery.matches) return;
    const strength = clamp(speedPulseTimer / 0.9, 0, 1);
    context.save();
    context.strokeStyle = `rgba(255,215,128,${0.18 * strength})`;
    context.lineWidth = 2;
    for (let index = 0; index < 7; index += 1) {
      const y = 110 + index * 82 + Math.sin(index * 2.3) * 24;
      const x = wrap(worldTime * 760 + index * 191, WORLD_WIDTH + 220) - 220;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + 78 + index * 8, y); context.stroke();
    }
    context.restore();
  }

  function drawParticles() { particles.forEach((particle) => { context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); context.fillStyle = particle.color; context.beginPath(); context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); context.fill(); }); context.globalAlpha = 1; }
  function drawAmbientMotes() { ambientMotes.forEach((mote, index) => { const pulse = .28 + Math.sin(worldTime * 1.1 + mote.phase) * .16, y = mote.y + Math.sin(worldTime * .55 + mote.phase) * mote.drift; context.fillStyle = index % 5 === 0 ? `rgba(255,184,83,${pulse * .8})` : `rgba(170,215,181,${pulse})`; context.beginPath(); context.arc(mote.x, y, mote.radius, 0, Math.PI * 2); context.fill(); }); }

  function drawBoundary() {
    const gradient = context.createLinearGradient(0, 0, WORLD_WIDTH, 0);
    gradient.addColorStop(0, "rgba(224,197,112,.2)"); gradient.addColorStop(.5, "rgba(224,197,112,.48)"); gradient.addColorStop(1, "rgba(224,197,112,.2)");
    context.strokeStyle = gradient; context.lineWidth = 2; context.beginPath(); context.moveTo(0, BOUNDARY); context.lineTo(WORLD_WIDTH, BOUNDARY); context.moveTo(0, WORLD_HEIGHT - BOUNDARY); context.lineTo(WORLD_WIDTH, WORLD_HEIGHT - BOUNDARY); context.stroke();
  }

  function drawAtmosphere() {
    const danger = state === GAME_STATE.DYING ? clamp(deathTimer / .8, 0, .65) : 0;
    const vignette = context.createRadialGradient(640, 360, 150, 640, 360, 760);
    vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, level === 3 ? "rgba(2,5,13,.55)" : "rgba(2,10,13,.38)");
    context.fillStyle = vignette; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (collisionPulseTimer > 0) {
      const impact = clamp(collisionPulseTimer / 0.65, 0, 1);
      const impactColor = deathCause === "wrong-fire"
        ? `rgba(236,76,36,${0.24 * impact})`
        : deathCause === "wrong-water"
          ? `rgba(42,164,225,${0.24 * impact})`
          : `rgba(255,226,164,${0.18 * impact})`;
      context.fillStyle = impactColor;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    if (danger > 0) { context.fillStyle = `rgba(8,10,12,${danger})`; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect(), pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio)), height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }

  function gameLoop(timestamp) {
    resizeCanvas(); const delta = Math.min((timestamp - previousTimestamp) / 1000, .035); previousTimestamp = timestamp;
    fpsFrameCount += 1;
    if (timestamp - fpsWindowStart >= 1000) {
      measuredFps = fpsFrameCount * 1000 / (timestamp - fpsWindowStart);
      fpsFrameCount = 0;
      fpsWindowStart = timestamp;
    }
    update(delta); updateDiagnostics(); render(); window.requestAnimationFrame(gameLoop);
  }

  function setInput(code, active) {
    if (code === "ArrowUp" || code === "KeyW") input.up = active;
    if (code === "ArrowDown" || code === "KeyS") input.down = active;
  }

  document.addEventListener("keydown", (event) => {
    if (CONTROL_KEYS.has(event.code)) {
      event.preventDefault();
      if (state === GAME_STATE.PAUSED && ["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) resumeGame();
      setInput(event.code, true);
    }
    if (event.code === "Escape" && state === GAME_STATE.PLAYING) { event.preventDefault(); pauseGame(); }
    else if (event.code === "Escape" && state === GAME_STATE.PAUSED) { event.preventDefault(); resumeGame(); }
  });

  document.addEventListener("keyup", (event) => { if (!CONTROL_KEYS.has(event.code)) return; event.preventDefault(); setInput(event.code, false); });
  window.addEventListener("blur", pauseGame);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  window.addEventListener("serpent:audio", (event) => playAudioCue(event.detail?.cue, event.detail || {}));
  startButton.addEventListener("click", () => { audioStarted = true; resumeAudio(); startNewRun(true); });
  restartButton.addEventListener("click", () => { audioStarted = true; resumeAudio(); startNewRun(false); });
  resumeButton.addEventListener("click", resumeGame);
  soundToggle.addEventListener("click", toggleSound);
  musicToggle.addEventListener("click", toggleMusic);

  bestValue.textContent = String(bestScore); finalBestValue.textContent = String(bestScore); updateSoundToggle(); updateMusicToggle(); startButton.focus({ preventScroll: true });
  serpent = new LivingSerpent(); initializeObstacleStream(); initializeElementStream(); updateHud();

  window.serpentLivingPath = Object.freeze({
    getSnapshot: () => ({
      state, level, score, bestScore, speedTier, speed: currentWorldSpeed(), levelProgress,
      targetElement: elementRules[level].target,
      segmentCount: serpent?.body.length || 0,
      head: serpent ? { x: serpent.x, y: serpent.y, angle: serpent.angle } : null,
      elements: elements.map((element) => ({ id: element.id, type: element.type, x: element.x, y: elementFloatY(element), radius: element.radius })),
      obstacles: obstacles.map((obstacle) => ({ x: obstacle.x, width: obstacle.width, gapCenter: obstacle.gapCenter, gapSize: obstacle.gapSize })),
      obstacleCount: obstacles.length, scrollDistance, deathReason,
      audio: {
        started: audioStarted,
        enabled: audioEnabled,
        musicEnabled,
        musicMode,
        musicInstances: musicInstanceCount,
        contextState: audioContext?.state || "idle",
      },
    }),
  });

  window.requestAnimationFrame(gameLoop);
})();
