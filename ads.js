/* Dotfront — AdSense H5 Games Ads bridge.
 * No ads are fetched or shown until an approved H5 publisher is connected.
 * Once approved, load Google's official Ad Placement API tag in index.html,
 * then call DotfrontAds.setReady() after that script loads successfully.
 * Never substitute normal banner code for H5 gaming interstitials.
 */
(function () {
  'use strict';
  const MILESTONE_EVERY = 5;
  const MIN_GAP_MS = 8 * 60 * 1000;
  const MAX_IMPRESSIONS_PER_SESSION = 2;
  let pendingMilestone = 0;
  let lastViewedAt = 0;
  let viewedThisSession = 0;
  let providerReady = false;
  let requesting = false;

  function markVictory(level, firstCompletion) {
    if (firstCompletion && Number.isInteger(level) && level > 0 && level % MILESTONE_EVERY === 0) {
      pendingMilestone = level;
    }
  }

  function setReady() {
    // Only call after Google H5 Games Ads approval and a successful SDK load.
    providerReady = true;
  }

  function clearPending() {
    pendingMilestone = 0;
  }

  function beforeNextBattle(startBattle) {
    if (typeof startBattle !== 'function') return;
    if (requesting) return;
    const level = pendingMilestone;
    pendingMilestone = 0;
    const now = Date.now();
    if (!level || !providerReady || typeof window.adBreak !== 'function' ||
        viewedThisSession >= MAX_IMPRESSIONS_PER_SESSION ||
        (lastViewedAt && now - lastViewedAt < MIN_GAP_MS)) {
      startBattle();
      return;
    }

    requesting = true;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      requesting = false;
      startBattle();
    };
    try {
      // Called synchronously by the player's Next/Play button.
      // Google's adBreakDone executes even when no ad was filled.
      window.adBreak({
        type: 'next',
        name: 'dotfront-after-level-' + level,
        beforeAd: () => {}, // Victory / menu overlay already pauses gameplay.
        afterAd: () => {},
        adBreakDone: (info) => {
          if (info && info.breakStatus === 'viewed') {
            lastViewedAt = Date.now();
            viewedThisSession++;
          }
          finish();
        }
      });
    } catch (error) {
      console.warn('Dotfront ad break unavailable; continuing game.', error);
      finish();
    }
  }

  window.DotfrontAds = Object.freeze({ markVictory, beforeNextBattle, clearPending, setReady });
})();
