// Init script for browser test runs: keeps the game silent on the tester's
// machine. Usage: agent-browser open <url> --init-script scripts/test-mute.js
// Sets the game's own mute preference, and belts-and-braces stubs every
// audio path so the CRT cover and pet voices stay quiet too.
(function () {
  try { localStorage.setItem("dw_audio_muted", "1"); } catch (_) {}
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
