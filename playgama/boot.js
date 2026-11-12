/* Playgama-only bootloader. It starts Dotfront even if the Bridge SDK is unavailable. */
(function () {
  'use strict';
  const GAME_SAVE = 'dotfront_campaign_v1';
  const TUTORIAL_SAVE = 'dotfront_tutorial_v2';
  const MAX_INIT_MS = 9000;
  const MAX_STORAGE_MS = 5000;
  let sdk = null, hostPaused = false, lastPlaying = null;
  let writeQueue = Promise.resolve();

  function localGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function localSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function deadline(promise, ms) {
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => setTimeout(() => reject(Error('Bridge request timed out')), ms))
    ]);
  }
  function normalizeProgress(raw) {
    if (raw && typeof raw === 'object') raw = JSON.stringify(raw);
    if (typeof raw !== 'string' || raw.length > 100000) return null;
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') return null;
      const completed = Array.isArray(value.completed) ? value.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 200) : [];
      const owned = Array.isArray(value.owned) ? value.owned.filter(s => typeof s === 'string' && s.length < 100) : [];
      return { unlocked: Math.max(1, Math.min(200, Number(value.unlocked) || 1)), completed, owned };
    } catch (_) { return null; }
  }
  function reconcileProgress(local, cloud) {
    // A newly unlocked mission may not have been completed if an older device saved it.
    if (!local) return cloud;
    if (!cloud) return local;
    return {
      unlocked: Math.min(200, Math.max(local.unlocked, cloud.unlocked)),
      completed: [...new Set([...local.completed, ...cloud.completed])].sort((a,b)=>a-b),
      owned: [...new Set([...local.owned, ...cloud.owned])]
    };
  }
  function getSdk() { return sdk; }
  function write(key, value) {
    localSet(key, value);
    if (!sdk || !sdk.storage || typeof sdk.storage.set !== 'function') return;
    // Serial writes avoid older responses overwriting newer progress.
    writeQueue = writeQueue.catch(() => {}).then(() => sdk.storage.set(key, value)).catch(err => {
      console.warn('Playgama save failed. Local backup preserved.', err);
    });
  }
  function send(message) {
    try { if (sdk && sdk.platform && sdk.platform.sendMessage) sdk.platform.sendMessage(message); }
    catch (_) {}
  }
  function updatePlaying(playing) {
    playing = Boolean(playing && !hostPaused && !document.hidden);
    if (playing === lastPlaying) return;
    lastPlaying = playing;
    send(playing ? 'gameplay_started' : 'gameplay_stopped');
  }
  window.DotfrontPlaygama = {
    getSdk, write, updatePlaying, get isPaused() { return hostPaused; },
    isReady() { return !!sdk; }
  };

  async function connect() {
    const bridge = window.bridge;
    if (!bridge || typeof bridge.initialize !== 'function') return;
    await deadline(bridge.initialize(), MAX_INIT_MS);
    sdk = bridge;
    if (bridge.platform && typeof bridge.platform.on === 'function') {
      const event = (bridge.EVENT_NAME && bridge.EVENT_NAME.PAUSE_STATE_CHANGED) || 'pause_state_changed';
      bridge.platform.on(event, value => {
        hostPaused = Boolean(value);
        window.DotfrontAudio?.setHostPaused(hostPaused);
        if (hostPaused) updatePlaying(false);
      });
    }
    if (bridge.platform) {
      window.DotfrontAudio?.setPlatformEnabled(bridge.platform.isAudioEnabled !== false);
      if (typeof bridge.platform.on === 'function') {
        const event = (bridge.EVENT_NAME && bridge.EVENT_NAME.AUDIO_STATE_CHANGED) || 'audio_state_changed';
        bridge.platform.on(event, value => window.DotfrontAudio?.setPlatformEnabled(value));
      }
    }
    if (bridge.storage && typeof bridge.storage.get === 'function') {
      const results = await Promise.allSettled([
        deadline(bridge.storage.get(GAME_SAVE), MAX_STORAGE_MS),
        deadline(bridge.storage.get(TUTORIAL_SAVE), MAX_STORAGE_MS)
      ]);
      if (results[0].status === 'fulfilled') {
        const cloud = normalizeProgress(results[0].value);
        const local = normalizeProgress(localGet(GAME_SAVE));
        const merged = reconcileProgress(local, cloud);
        if (merged) {
          const value = JSON.stringify(merged);
          localSet(GAME_SAVE, value);
          if (cloud && JSON.stringify(cloud) !== value) write(GAME_SAVE, value);
        }
      }
      if (results[1].status === 'fulfilled' &&
          results[1].value === 'done') localSet(TUTORIAL_SAVE, 'done');
    }
  }

  function bootGame() {
    const script = document.createElement('script');
    script.src = './app.js';
    script.onload = () => send('game_ready');
    script.onerror = () => {
      const node = document.getElementById('playgamaLoading');
      if (node) node.textContent = 'Game could not load. Please refresh.';
    };
    document.body.appendChild(script);
    const loading = document.getElementById('playgamaLoading');
    if (loading) loading.remove();
  }

  connect().catch(error => console.warn('Playgama SDK unavailable; running offline fallback.', error))
    .then(bootGame, bootGame);
})();
