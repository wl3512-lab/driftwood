// Init script for browser test runs: keeps the game silent on the tester's
// machine. Usage: agent-browser open <url> --init-script scripts/test-mute.js
// Sets the game's own mute preference, and belts-and-braces stubs every
// audio path so the CRT cover and pet voices stay quiet too.
(function () {
  try { localStorage.setItem("dw_audio_muted", "1"); } catch (_) {}
  // Driftwood v2: pets speak their written lines, word for word (no AI
  // rewording, no thinking pause), so test runs are deterministic. A run that
  // wants the live AI sets window.__dwAI = true in a later init script.
  try { window.__dwAI = false; } catch (_) {}
  // Never test against the service worker's cached bundle: a reload after an
  // edit would otherwise run the previous sketch.js (cache-first) and the
  // results would describe code that no longer exists.
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      // and stop the page re-registering it for the next load
      navigator.serviceWorker.register = function () { return Promise.reject(new Error("service worker disabled for test runs")); };
    }
    if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
  } catch (_) {}
  try { if (window.speechSynthesis) window.speechSynthesis.speak = function () {}; } catch (_) {}
  try {
    var mute = function (Ctor) {
      if (!Ctor) return Ctor;
      return function () {
        var ctx = new (Function.prototype.bind.apply(Ctor, [null].concat([].slice.call(arguments))))();
        try { ctx.destination.channelCount = 1; ctx.suspend(); ctx.resume = function () { return Promise.resolve(); }; } catch (_) {}
        return ctx;
      };
    };
    window.AudioContext = mute(window.AudioContext);
    window.webkitAudioContext = mute(window.webkitAudioContext);
  } catch (_) {}
  try {
    var play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.apply(this, arguments); };
  } catch (_) {}
})();
