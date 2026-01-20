const MODES = {
  pomodoro: 'pomodoro',
  short: 'short',
  long: 'long',
};

const STORAGE_KEY = 'pomodoer_emanuella_prefs_v1';

const elements = {
  modeTabs: document.querySelectorAll('.mode-tab'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  startPauseBtn: document.getElementById('start-pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  cycleCount: document.getElementById('cycle-count'),
  completedCount: document.getElementById('completed-count'),
  focusDuration: document.getElementById('focus-duration'),
  shortBreakDuration: document.getElementById('short-break-duration'),
  longBreakDuration: document.getElementById('long-break-duration'),
  cyclesToLongBreak: document.getElementById('cycles-to-long-break'),
  autoStartNext: document.getElementById('auto-start-next'),
  soundEnabled: document.getElementById('sound-enabled'),
  dailyGoal: document.getElementById('daily-goal'),
  progressFill: document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
  themeToggle: document.getElementById('theme-toggle'),
  endSound: document.getElementById('end-sound'),
};

let state = {
  currentMode: MODES.pomodoro,
  remainingSeconds: 25 * 60,
  isRunning: false,
  cycle: 1,
  completedPomodoros: 0,
  intervalId: null,
};

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);

    if (typeof prefs.focusDuration === 'number') {
      elements.focusDuration.value = prefs.focusDuration;
    }
    if (typeof prefs.shortBreakDuration === 'number') {
      elements.shortBreakDuration.value = prefs.shortBreakDuration;
    }
    if (typeof prefs.longBreakDuration === 'number') {
      elements.longBreakDuration.value = prefs.longBreakDuration;
    }
    if (typeof prefs.cyclesToLongBreak === 'number') {
      elements.cyclesToLongBreak.value = prefs.cyclesToLongBreak;
    }
    if (typeof prefs.dailyGoal === 'number') {
      elements.dailyGoal.value = prefs.dailyGoal;
    }
    if (typeof prefs.autoStartNext === 'boolean') {
      elements.autoStartNext.checked = prefs.autoStartNext;
    }
    if (typeof prefs.soundEnabled === 'boolean') {
      elements.soundEnabled.checked = prefs.soundEnabled;
    }
    applyTheme('dark');
  } catch (e) {
  }
}

function savePreferences() {
  const prefs = {
    focusDuration: Number(elements.focusDuration.value) || 25,
    shortBreakDuration: Number(elements.shortBreakDuration.value) || 5,
    longBreakDuration: Number(elements.longBreakDuration.value) || 15,
    cyclesToLongBreak: Number(elements.cyclesToLongBreak.value) || 4,
    dailyGoal: Number(elements.dailyGoal.value) || 8,
    autoStartNext: elements.autoStartNext.checked,
    soundEnabled: elements.soundEnabled.checked,
    theme: 'dark',
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
  }

  updateProgress();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', 'dark');
  elements.themeToggle.textContent = '🌙';
}

function toggleTheme() {
  applyTheme('dark');
  savePreferences();
}

function getCurrentModeDurationSeconds(mode) {
  const focus = Number(elements.focusDuration.value) || 25;
  const shortBreak = Number(elements.shortBreakDuration.value) || 5;
  const longBreak = Number(elements.longBreakDuration.value) || 15;

  if (mode === MODES.short) return shortBreak * 60;
  if (mode === MODES.long) return longBreak * 60;
  return focus * 60;
}

function changeMode(mode) {
  if (state.isRunning) {
    stopTimer();
  }
  state.currentMode = mode;
  state.remainingSeconds = getCurrentModeDurationSeconds(mode);
  updateModeTabs();
  updateTimerDisplay();
  updateStartPauseLabel();
}

function updateModeTabs() {
  elements.modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === state.currentMode);
  });
}

function formatTimePart(value) {
  return String(value).padStart(2, '0');
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;
  elements.minutes.textContent = formatTimePart(minutes);
  elements.seconds.textContent = formatTimePart(seconds);
}

function updateStartPauseLabel() {
  elements.startPauseBtn.textContent = state.isRunning ? 'Pausar' : 'Começar';
}

function playEndSound() {
  if (!elements.soundEnabled.checked) return;
  try {
    elements.endSound.currentTime = 0;
    elements.endSound.play();
  } catch (e) { }
}

function handleSessionEnd() {
  playEndSound();

  if (state.currentMode === MODES.pomodoro) {
    state.completedPomodoros += 1;
    elements.completedCount.textContent = String(state.completedPomodoros);
    updateProgress();

    const cyclesToLong = Number(elements.cyclesToLongBreak.value) || 4;
    if (state.cycle >= cyclesToLong) {
      state.cycle = 1;
      elements.cycleCount.textContent = String(state.cycle);
      changeMode(MODES.long);
    } else {
      state.cycle += 1;
      elements.cycleCount.textContent = String(state.cycle);
      changeMode(MODES.short);
    }
  } else {
    changeMode(MODES.pomodoro);
  }

  if (elements.autoStartNext.checked) {
    startTimer();
  }
}

function tick() {
  if (state.remainingSeconds <= 0) {
    stopTimer(false);
    handleSessionEnd();
    return;
  }
  state.remainingSeconds -= 1;
  updateTimerDisplay();
}

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  state.intervalId = setInterval(tick, 1000);
  updateStartPauseLabel();
}

function stopTimer(updateLabel = true) {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  if (updateLabel) updateStartPauseLabel();
}

function resetTimer() {
  stopTimer();
  state.remainingSeconds = getCurrentModeDurationSeconds(state.currentMode);
  updateTimerDisplay();
}

function onStartPauseClick() {
  if (state.isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function clampInput(input, min, max, fallback) {
  const value = Number(input.value);
  if (Number.isNaN(value)) {
    input.value = fallback;
    return;
  }
  const clamped = Math.min(Math.max(value, min), max);
  input.value = clamped;
}

function handleDurationChange() {
  clampInput(elements.focusDuration, 5, 120, 25);
  clampInput(elements.shortBreakDuration, 1, 30, 5);
  clampInput(elements.longBreakDuration, 5, 60, 15);
  clampInput(elements.cyclesToLongBreak, 1, 12, 4);
  clampInput(elements.dailyGoal, 1, 48, 8);

  savePreferences();

  if (!state.isRunning) {
    state.remainingSeconds = getCurrentModeDurationSeconds(state.currentMode);
    updateTimerDisplay();
  }
}

function updateProgress() {
  const goal = Number(elements.dailyGoal.value) || 8;
  const progress = Math.min(state.completedPomodoros, goal);
  const percent = Math.min((progress / goal) * 100, 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressLabel.textContent = `${progress} / ${goal}`;
}

function initEvents() {
  elements.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (!mode) return;
      changeMode(mode);
    });
  });

  elements.startPauseBtn.addEventListener('click', onStartPauseClick);
  elements.resetBtn.addEventListener('click', resetTimer);

  elements.focusDuration.addEventListener('change', handleDurationChange);
  elements.shortBreakDuration.addEventListener('change', handleDurationChange);
  elements.longBreakDuration.addEventListener('change', handleDurationChange);
  elements.cyclesToLongBreak.addEventListener('change', handleDurationChange);
  elements.autoStartNext.addEventListener('change', savePreferences);
  elements.soundEnabled.addEventListener('change', savePreferences);
  elements.dailyGoal.addEventListener('change', handleDurationChange);

  elements.themeToggle.addEventListener('click', toggleTheme);
}

function init() {
  loadPreferences();
  state.remainingSeconds = getCurrentModeDurationSeconds(state.currentMode);
  updateTimerDisplay();
  updateModeTabs();
  updateStartPauseLabel();
  updateProgress();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);


