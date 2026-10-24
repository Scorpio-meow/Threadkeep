const SOUND_EFFECT_FILES = {
  save: 'sounds/save.ogg',
  copy: 'sounds/copy.ogg',
  delete: 'sounds/delete.ogg',
  undo: 'sounds/undo.ogg',
  complete: 'sounds/complete.ogg',
  error: 'sounds/error.ogg'
};
const BACKGROUND_MUSIC_FILE = 'sounds/background-music.ogg';
const SOUND_EFFECT_GAIN = 0.6;
const BACKGROUND_MUSIC_GAIN = 0.3;
const MUSIC_FADE_IN_SECONDS = 1.8;
const MUSIC_FADE_OUT_SECONDS = 0.4;
const soundAudio = {
  context: null,
  buffers: new Map(),
  music: null,
  effectsEnabled: false,
  musicEnabled: false,
  preferencesReady: null,
  listeners: new Set(),
  waitingForGesture: false
};
function applySoundPreferences(stored) {
  if (SOUND_EFFECTS_KEY in stored) soundAudio.effectsEnabled = stored[SOUND_EFFECTS_KEY] !== false;
  if (BACKGROUND_MUSIC_KEY in stored) soundAudio.musicEnabled = stored[BACKGROUND_MUSIC_KEY] === true;
}
function loadSoundPreferences() {
  if (!soundAudio.preferencesReady) {
    soundAudio.preferencesReady = chrome.storage.local.get([SOUND_EFFECTS_KEY, BACKGROUND_MUSIC_KEY]).then((stored) => {
      soundAudio.effectsEnabled = stored[SOUND_EFFECTS_KEY] !== false;
      soundAudio.musicEnabled = stored[BACKGROUND_MUSIC_KEY] === true;
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !(SOUND_EFFECTS_KEY in changes || BACKGROUND_MUSIC_KEY in changes)) return;
      const next = {};
      if (SOUND_EFFECTS_KEY in changes) next[SOUND_EFFECTS_KEY] = changes[SOUND_EFFECTS_KEY].newValue;
      if (BACKGROUND_MUSIC_KEY in changes) next[BACKGROUND_MUSIC_KEY] = changes[BACKGROUND_MUSIC_KEY].newValue;
      applySoundPreferences(next);
      soundAudio.listeners.forEach((listener) => listener());
    });
  }
  return soundAudio.preferencesReady;
}
function onSoundPreferencesChange(listener) {
  soundAudio.listeners.add(listener);
}
function getSoundContext() {
  if (!soundAudio.context) {
    soundAudio.context = new AudioContext({ latencyHint: 'interactive' });
  }
  return soundAudio.context;
}
async function resumeSoundContext() {
  const context = getSoundContext();
  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch (_) { }
  }
  return context.state === 'running';
}
function loadAudioBuffer(path) {
  if (!soundAudio.buffers.has(path)) {
    const context = getSoundContext();
    const pending = fetch(chrome.runtime.getURL(path))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    pending.catch(() => soundAudio.buffers.delete(path));
    soundAudio.buffers.set(path, pending);
  }
  return soundAudio.buffers.get(path);
}
async function playSound(name) {
  try {
    await loadSoundPreferences();
    if (!soundAudio.effectsEnabled || !(name in SOUND_EFFECT_FILES)) return;
    if (!(await resumeSoundContext())) return;
    const context = getSoundContext();
    const buffer = await loadAudioBuffer(SOUND_EFFECT_FILES[name]);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = SOUND_EFFECT_GAIN;
    source.connect(gain).connect(context.destination);
    source.start();
  } catch (err) {
    console.warn('[Threadkeep] 無法播放音效:', err);
  }
}
function fadeMusicTo(value, seconds) {
  const { gain } = soundAudio.music;
  const now = getSoundContext().currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(value, now + seconds);
}
async function startBackgroundMusic() {
  const buffer = await loadAudioBuffer(BACKGROUND_MUSIC_FILE);
  if (soundAudio.music || !soundAudio.musicEnabled || document.hidden) return;
  const context = getSoundContext();
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(context.destination);
  source.start();
  soundAudio.music = { source, gain };
  fadeMusicTo(BACKGROUND_MUSIC_GAIN, MUSIC_FADE_IN_SECONDS);
}
function stopBackgroundMusic() {
  if (!soundAudio.music) return;
  const { source } = soundAudio.music;
  fadeMusicTo(0, MUSIC_FADE_OUT_SECONDS);
  source.stop(getSoundContext().currentTime + MUSIC_FADE_OUT_SECONDS);
  soundAudio.music = null;
}
function resumeMusicOnGesture() {
  if (soundAudio.waitingForGesture) return;
  soundAudio.waitingForGesture = true;
  const resume = () => {
    soundAudio.waitingForGesture = false;
    document.removeEventListener('pointerdown', resume, true);
    document.removeEventListener('keydown', resume, true);
    void syncBackgroundMusic();
  };
  document.addEventListener('pointerdown', resume, true);
  document.addEventListener('keydown', resume, true);
}
async function syncBackgroundMusic() {
  try {
    await loadSoundPreferences();
    if (!soundAudio.musicEnabled || document.hidden) {
      stopBackgroundMusic();
      return;
    }
    if (!(await resumeSoundContext())) {
      resumeMusicOnGesture();
      return;
    }
    await startBackgroundMusic();
  } catch (err) {
    console.warn('[Threadkeep] 無法播放背景音樂:', err);
  }
}
function setupBackgroundMusic() {
  onSoundPreferencesChange(() => void syncBackgroundMusic());
  document.addEventListener('visibilitychange', () => void syncBackgroundMusic());
  void syncBackgroundMusic();
}
async function setupSoundSwitches({ effectsSwitch, musicSwitch }) {
  await loadSoundPreferences();
  const sync = () => {
    if (effectsSwitch) effectsSwitch.checked = soundAudio.effectsEnabled;
    if (musicSwitch) musicSwitch.checked = soundAudio.musicEnabled;
  };
  sync();
  onSoundPreferencesChange(sync);
  if (effectsSwitch) {
    effectsSwitch.addEventListener('change', async () => {
      await chrome.storage.local.set({ [SOUND_EFFECTS_KEY]: effectsSwitch.checked });
      if (effectsSwitch.checked) void playSound('save');
    });
  }
  if (musicSwitch) {
    musicSwitch.addEventListener('change', () => {
      void chrome.storage.local.set({ [BACKGROUND_MUSIC_KEY]: musicSwitch.checked });
    });
  }
}