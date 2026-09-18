/* Woodshed sound: a small synthesized piano, a metronome and a bar-based sequencer, all on one AudioContext.
   Nothing is downloaded, so it works offline. The context is created on the first user gesture (browsers
   refuse to start audio before one). */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var A = W.Audio = {};

  var ctx = null, master = null, wet = null, wave = null;
  var voices = {};           // midi -> [voice, ...] currently sounding
  var volume = 0.8, muted = false;

  A.ready = function () { return !!ctx; };
  A.now = function () { return ctx ? ctx.currentTime : 0; };

  A.init = function () {
    if (ctx) { if (ctx.state !== "running") ctx.resume(); return ctx; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    // iOS routes Web Audio through the ringer switch unless the session is marked as playback.
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    ctx = new AC({ latencyHint: "interactive" });

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    master = ctx.createGain(); master.gain.value = muted ? 0 : volume;
    comp.connect(master); master.connect(ctx.destination);
    A._bus = comp;

    // A short synthetic room: decaying noise as an impulse response.
    var len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.16;
    wet.connect(conv); conv.connect(comp);

    // Harmonic recipe for the string tone: strong fundamental, quickly thinning overtones.
    var amps = [0, 1, 0.52, 0.3, 0.2, 0.11, 0.09, 0.05, 0.04, 0.025, 0.02, 0.012, 0.01];
    var real = new Float32Array(amps.length), imag = new Float32Array(amps.length);
    for (var h = 1; h < amps.length; h++) imag[h] = amps[h];
    wave = ctx.createPeriodicWave(real, imag);
    if (ctx.state !== "running") ctx.resume();
    return ctx;
  };

  A.setVolume = function (v) { volume = v; if (master) master.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.02); };
  A.setMuted = function (m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.02); };

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  // Start a note. when = context time (defaults to now). Returns the voice so it can be released.
  A.noteOn = function (midi, velocity, when) {
    if (!A.init()) return null;
    var t = Math.max(when || 0, ctx.currentTime), v = velocity == null ? 0.7 : velocity;
    var f = freq(midi);
    var pos = Math.min(1, Math.max(0, (midi - 28) / 68));       // 0 = low bass, 1 = high treble
    var decay = 5.5 - pos * 4.2;                                  // low strings ring longer
    var peak = (0.2 + 0.5 * v * v) * (1 - pos * 0.35);

    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.setPeriodicWave(wave); o2.setPeriodicWave(wave);
    o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 3 + pos * 4;   // two strings, slightly apart
    var mix2 = ctx.createGain(); mix2.gain.value = 0.55;

    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.4;
    var bright = Math.min(14000, f * (3 + 9 * v)), dull = Math.min(9000, f * 1.8 + 250);
    lp.frequency.setValueAtTime(bright, t);
    lp.frequency.exponentialRampToValueAtTime(dull, t + 0.9 + (1 - pos) * 1.2);       // the tone mellows as it rings

    var amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(peak * 0.42, t + 0.22);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    // hammer thump: a very short filtered noise burst
    var nlen = Math.floor(ctx.sampleRate * 0.03), nb = ctx.createBuffer(1, nlen, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var i = 0; i < nlen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nlen);
    var noise = ctx.createBufferSource(); noise.buffer = nb;
    var nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = Math.min(6000, f * 4); nf.Q.value = 0.7;
    var ng = ctx.createGain(); ng.gain.value = 0.12 * v;

    o1.connect(lp); o2.connect(mix2); mix2.connect(lp); lp.connect(amp);
    noise.connect(nf); nf.connect(ng); ng.connect(amp);
    amp.connect(A._bus); amp.connect(wet);
    o1.start(t); o2.start(t); noise.start(t);
    var end = t + decay + 0.1;
    o1.stop(end); o2.stop(end);

    var voice = { midi: midi, amp: amp, o1: o1, o2: o2, end: end, released: false };
    (voices[midi] = voices[midi] || []).push(voice);
    o1.onended = function () { var l = voices[midi] || [], k = l.indexOf(voice); if (k >= 0) l.splice(k, 1); try { amp.disconnect(); } catch (e) {} };
    return voice;
  };

  A.release = function (voice, when) {
    if (!voice || voice.released || !ctx) return;
    voice.released = true;
    var t = Math.max(when || 0, ctx.currentTime);
    try {
      voice.amp.gain.cancelScheduledValues(t);
      voice.amp.gain.setTargetAtTime(0.0001, t, 0.09);        // damper falls
      voice.o1.stop(t + 0.6); voice.o2.stop(t + 0.6);
    } catch (e) {}
  };
  A.noteOff = function (midi, when) { (voices[midi] || []).slice().forEach(function (v) { A.release(v, when); }); };
  A.allOff = function () { Object.keys(voices).forEach(function (m) { A.noteOff(+m); }); };

  // Play notes for a fixed length. opts: {dur, vel, strum (seconds between notes), when}
  A.play = function (midis, opts) {
    if (!A.init()) return;
    var o = opts || {}, t0 = Math.max(o.when || 0, ctx.currentTime + 0.01), dur = o.dur || 1.4;
    midis.forEach(function (m, i) {
      var t = t0 + i * (o.strum || 0);
      var v = A.noteOn(m, o.vel == null ? 0.66 : o.vel, t);
      A.release(v, t + dur);
    });
  };
  // One after another (scales, arpeggios). Returns total seconds.
  A.sequence = function (midis, stepSec, opts) {
    if (!A.init()) return 0;
    var o = opts || {}, t0 = ctx.currentTime + 0.03;
    midis.forEach(function (m, i) {
      var v = A.noteOn(m, o.vel == null ? 0.62 : o.vel, t0 + i * stepSec);
      A.release(v, t0 + i * stepSec + stepSec * (o.legato || 1.05));
    });
    return midis.length * stepSec;
  };

  A.click = function (when, accent, soft) {
    if (!A.init()) return;
    var t = Math.max(when || 0, ctx.currentTime);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((accent ? 0.34 : 0.22) * (soft ? 0.5 : 1), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = accent ? 2000 : 1400; f.Q.value = 2;
    o.connect(f); f.connect(g); g.connect(A._bus);
    o.start(t); o.stop(t + 0.07);
  };

  /* ---------- clock: one look-ahead scheduler shared by the metronome and the chart player ---------- */
  // job: {bpm, beatsPerBar, onBeat(beatIndex, time) -> schedules audio; onTick(beatIndex) -> UI, runs near the audible moment}
  function Clock(job) {
    this.job = job; this.timer = null; this.beat = 0; this.nextTime = 0; this.uiQueue = []; this.raf = 0;
  }
  Clock.prototype.start = function () {
    if (!A.init()) return;
    var self = this;
    this.stop();
    this.beat = 0; this.nextTime = ctx.currentTime + 0.12;
    this.timer = setInterval(function () { self.pump(); }, 25);
    this.pump();
    var draw = function () {
      var now = ctx.currentTime;
      while (self.uiQueue.length && self.uiQueue[0].t <= now + 0.02) { var e = self.uiQueue.shift(); if (self.job.onTick) self.job.onTick(e.beat); }
      self.raf = requestAnimationFrame(draw);
    };
    this.raf = requestAnimationFrame(draw);
  };
  Clock.prototype.pump = function () {
    while (this.nextTime < ctx.currentTime + 0.12) {
      var go = this.job.onBeat(this.beat, this.nextTime);
      this.uiQueue.push({ beat: this.beat, t: this.nextTime });
      if (go === false) { this.stop(true); return; }
      this.nextTime += 60 / this.job.bpm;
      this.beat++;
    }
  };
  Clock.prototype.stop = function (natural) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (!natural) { cancelAnimationFrame(this.raf); this.uiQueue = []; }
    else { var self = this; setTimeout(function () { cancelAnimationFrame(self.raf); if (self.job.onEnd) self.job.onEnd(); }, 400); }
  };
  Clock.prototype.running = function () { return !!this.timer; };
  A.Clock = Clock;
})(typeof self !== "undefined" ? self : globalThis);
