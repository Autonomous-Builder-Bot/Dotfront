/* Dotfront version gate. CacheStorage contains downloaded game assets only;
   player progress and upgrades live in localStorage and are never cleared. */
(() => {
  'use strict';
  const BUILD = 39;
  const scope = './';
  const guarded = new WeakSet();
  let checking = false;

  async function checkUpdate() {
    if (!navigator.onLine) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(scope + 'version.json?ts=' + Date.now(), {
        cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) return false;
      const manifest = await response.json();
      if (!Number.isInteger(manifest.build) || manifest.build <= BUILD) return false;
      // One automatic reload per build per tab guards against a temporary
      // GitHub Pages rollout delay, which could otherwise cause a reload loop.
      const key = 'dotfront_reload_build';
      if (sessionStorage.getItem(key) === String(manifest.build)) return false;
      sessionStorage.setItem(key, String(manifest.build));
      // Only delete Dotfront's downloaded assets. Do NOT clear localStorage,
      // IndexedDB, site data, or unrelated caches on this origin.
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('dotfront-app-'))
          .map(k => caches.delete(k)));
      }
      try {
        const registration = await navigator.serviceWorker?.getRegistration(scope);
        await registration?.update();
      } catch (_) { /* A fresh navigation still works without SW updates. */ }
      const url = new URL(location.href);
      url.searchParams.set('build', String(manifest.build));
      location.replace(url.href);
      return true;
    } catch (_) {
      // Offline and timeouts must never prevent starting a game.
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('#start, #nextLevel, #playLevel, #restartLevel');
    if (!button || guarded.has(button)) {
      if (button) guarded.delete(button);
      return;
    }
    // Capture before app.js's onclick so an old battle isn't launched
    // while a newer release is available.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (checking) return;
    checking = true;
    const original = button.textContent;
    button.textContent = 'CHECKING FOR UPDATES…';
    try {
      if (await checkUpdate()) {
        button.textContent = 'UPDATING GAME…';
        return;
      }
    } finally {
      checking = false;
      if (button.isConnected) button.textContent = original;
    }
    if (button.isConnected) {
      guarded.add(button);
      button.click();
    }
  }, true);

  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(scope + 'sw.js', { updateViaCache: 'none' })
        .then(registration => registration.update()).catch(() => {});
    });
  }
})();
