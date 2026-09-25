/* A tuner that listens: the microphone into an analyser, a pitch found by autocorrelation (the McLeod normalised
   square-difference), then note, cents and clarity handed to whoever asked. Used on the Trombone page. */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var A = W.Audio;
  var stream = null, src = null, analyser = null, raf = 0, buf = null, hist = [], listeners = [];
  var Tuner = W.Tuner = { running: false, error: "" };

  function pitchOf(x, sr) {
    var N = x.length, rms = 0, i, tau;
    for (i = 0; i < N; i++) rms += x[i] * x[i];
    rms = Math.sqrt(rms / N);
    if (rms < 0.008) return { rms: rms };
    var maxTau = Math.floor(sr / 45), minTau = Math.floor(sr / 1200), nsdf = new Float32Array(maxTau + 1);
    for (tau = minTau; tau <= maxTau; tau++) {
      var ac = 0, m = 0;
      for (i = 0; i + tau < N; i++) { ac += x[i] * x[i + tau]; m += x[i] * x[i] + x[i + tau] * x[i + tau]; }
      nsdf[tau] = m ? 2 * ac / m : 0;
    }
    // first clear peak after the first dip below zero, then the best of the early peaks
    var peaks = [], t = minTau;
    while (t <= maxTau && nsdf[t] > 0) t++;
    while (t < maxTau) {
      while (t < maxTau && nsdf[t] <= 0) t++;
      var best = -1, at = t;
      while (t < maxTau && nsdf[t] > 0) { if (nsdf[t] > best) { best = nsdf[t]; at = t; } t++; }
      if (best > 0) peaks.push([at, best]);
      if (peaks.length > 12) break;
    }
    if (!peaks.length) return { rms: rms };
    var top = 0; peaks.forEach(function (p) { top = Math.max(top, p[1]); });
    var chosen = null; for (i = 0; i < peaks.length; i++) if (peaks[i][1] >= top * 0.9) { chosen = peaks[i]; break; }
    tau = chosen[0];
    // parabolic touch-up around the peak
    var a = nsdf[tau - 1] || 0, b = nsdf[tau], c = nsdf[tau + 1] || 0, den = a - 2 * b + c;
    var frac = den ? 0.5 * (a - c) / den : 0;
    var hz = sr / (tau + (Math.abs(frac) < 1 ? frac : 0));
    return { hz: hz, clarity: chosen[1], rms: rms };
  }

  function tick() {
    if (!Tuner.running) return;
    analyser.getFloatTimeDomainData(buf);
    var p = pitchOf(buf, analyser.context.sampleRate), out = { rms: p.rms, hz: 0, midi: 0, note: 0, cents: 0, clarity: 0 };
    if (p.hz && p.clarity > 0.8) {
      hist.push(p.hz); if (hist.length > 5) hist.shift();
      var sorted = hist.slice().sort(function (u, v) { return u - v; }), hz = sorted[Math.floor(sorted.length / 2)];
      var midi = 69 + 12 * Math.log2(hz / 440), note = Math.round(midi);
      out = { rms: p.rms, hz: hz, midi: midi, note: note, cents: Math.round((midi - note) * 100), clarity: p.clarity };
    } else hist = [];
    listeners.forEach(function (fn) { try { fn(out); } catch (e) {} });
    raf = setTimeout(tick, 60);
  }

  Tuner.start = function () {
    if (Tuner.running) return Promise.resolve();
    var ctx = A.init(); Tuner.error = "";
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { Tuner.error = "This browser can't open the microphone here. On a phone it needs the https site."; return Promise.reject(new Error(Tuner.error)); }
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (st) {
      stream = st; src = ctx.createMediaStreamSource(st);
      analyser = ctx.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 40;
      src.connect(hp); hp.connect(analyser);           // never to the speakers
      buf = new Float32Array(analyser.fftSize); hist = [];
      Tuner.running = true; tick();
    }, function (err) {
      Tuner.error = err && err.name === "NotAllowedError" ? "Microphone access was refused. Allow it for this site and try again." : "No microphone found.";
      throw err;
    });
  };
  Tuner.stop = function () {
    Tuner.running = false; clearTimeout(raf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    try { if (src) src.disconnect(); } catch (e) {}
    stream = src = analyser = null; hist = [];
  };
  Tuner.onPitch = function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };
  Tuner._pitchOf = pitchOf;
})(typeof self !== "undefined" ? self : globalThis);
