/* Playgama Bridge interstitial provider. Loaded only in Playgama builds. */
(function () {
  'use strict';
  const EVERY = 5;
  const GAP = 8 * 60 * 1000;
  const SESSION_CAP = 2;
  let milestone = 0, lastOpened = 0, openedCount = 0, busy = false;

  function markVictory(level, firstTime) {
    if (firstTime && Number.isInteger(level) && level > 0 && level % EVERY === 0) milestone = level;
  }
  function clearPending() { milestone = 0; }
  function beforeNextBattle(startBattle) {
    if (typeof startBattle !== 'function' || busy) return;
    const level = milestone;
    milestone = 0; // A missed ad is never forced into later gameplay.
    const host = window.DotfrontPlaygama;
    const bridge = host && host.getSdk();
    const ad = bridge && bridge.advertisement;
    if (!level || !ad || !ad.isInterstitialSupported ||
        openedCount >= SESSION_CAP ||
        (lastOpened && Date.now() - lastOpened < GAP)) {
      startBattle();
      return;
    }
    busy = true;
    let finished = false, opened = false, loadingTimer = null;
    const eventName = (bridge.EVENT_NAME && bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED) || 'interstitial_state_changed';
    function unsubscribe() {
      if (loadingTimer) clearTimeout(loadingTimer);
      if (ad.off) try { ad.off(eventName, onState); } catch (_) {}
    }
    function finish() {
      if (finished) return;
      finished = true;
      busy = false;
      unsubscribe();
      startBattle();
    }
    function onState(state) {
      if (state === 'opened') {
        if (!opened) {
          opened = true;
          lastOpened = Date.now();
          openedCount++;
        }
        if (loadingTimer) clearTimeout(loadingTimer);
      }
      if (state === 'closed' || state === 'failed') finish();
    }
    try {
      if (typeof ad.on !== 'function' || typeof ad.showInterstitial !== 'function') {
        finish(); return;
      }
      ad.on(eventName, onState);
      // If an ad never opens, don't leave the player's level button stuck.
      loadingTimer = setTimeout(() => {
        if (opened || ad.interstitialState === 'opened') return;
        finish();
      }, 15000);
      const result = ad.showInterstitial('dotfront_level_' + level);
      if (result && typeof result.catch === 'function') result.catch(finish);
      // Some SDKs return a state immediately without firing a new event.
      if (ad.interstitialState === 'failed' || ad.interstitialState === 'closed') finish();
    } catch (error) {
      console.warn('Interstitial unavailable; continuing Dotfront.', error);
      finish();
    }
  }
  window.DotfrontAds = Object.freeze({ markVictory, clearPending, beforeNextBattle });
})();
