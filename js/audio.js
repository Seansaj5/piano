/* Woodshed sound: real pianos recorded note by note (a Yamaha C5 grand and a Kawai upright), a tine electric piano
   and a small synth made on the spot, plus the metronome click and a look-ahead clock, all on one AudioContext.

   Every note is its own voice with its own damper, so notes never cut each other off: a new note only ever damps an
   older strike of the same key, the way a hammer re-striking a string does. Letting go of a key damps the note unless
   the sustain pedal is down. Nothing squeezes the mix while you play; a limiter at the very end only catches peaks.

   Samples download in the background (the service worker keeps them for offline use) and decode into memory. Until
   a sample is ready its notes fall back to the synth, so the first touch is never silent. The context itself is
   created on the first user gesture, because browsers refuse to start audio before one. */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var A = W.Audio = {};

  var ctx = null, nodes = null;
  var volume = 0.8, muted = false, roomId = "room";
  var voices = [];            // every voice that can still make sound, oldest first
  var live = {};              // midi -> the voice a key press started (touch, computer keys, MIDI)
  var pedal = false;
  var subs = { status: [], pedal: [], play: [] };
  var nav = typeof navigator !== "undefined" ? navigator : {};
  var touchy = /iPhone|iPad|Android/i.test(nav.userAgent || "") || (nav.maxTouchPoints || 0) > 1;
  var MAX_VOICES = touchy || (nav.hardwareConcurrency || 8) <= 4 ? 36 : 64;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function dbGain(db) { return Math.pow(10, db / 20); }
  function emit(kind, a, b, c, d) { subs[kind].forEach(function (fn) { try { fn(a, b, c, d); } catch (e) {} }); }
  function range(a, b, step) { var out = []; for (var m = a; m <= b; m += step) out.push(m); return out; }

  /* ---------- the instruments ---------- */
  // Loudness for a strike of velocity v (0..1), in dB below the loudest. A real piano spans more than this; a practice
  // room is happier with soft notes you can still hear.
  function levelFor(v) { return 20 * Math.log10(0.07 + 0.93 * Math.pow(v, 1.7)); }

  // Sample sets. Zones are [lowest key, highest key, recorded key, level trim in dB]; the trims (measured through this
  // engine) even out recordings that came out louder or softer than their neighbours. A layer's `level` is where its recordings sit on levelFor's
  // scale, so a strike of any strength is scaled from the nearest recording: the grand's soft layer was recorded
  // 5.6 dB below its loud one; the upright's files were normalised, so both of its layers sit at the same place.
  var LOUD = levelFor(0.85);
  var SETS = {
    grand: { dir: "samples/grand/", layers: [
      { id: "p", upTo: 0.6, level: LOUD - 5.6, zones: [[21,22,21,0],[23,25,24,0],[26,28,27,0],[29,31,30,0],[32,34,33,0],[35,37,36,0],[38,40,39,0],[41,43,42,-1.1],[44,46,45,2.2],[47,49,48,1.1],[50,52,51,0],[53,55,54,1.8],[56,58,57,3.1],[59,61,60,-1.3],[62,64,63,1.1],[65,67,66,0],[68,70,69,-1.4],[71,73,72,-1.7],[74,76,75,-1.1],[77,79,78,-3.6],[80,82,81,0],[83,85,84,1.9],[86,88,87,-4.9],[89,91,90,0],[92,94,93,0],[95,97,96,0],[98,100,99,1.9],[101,103,102,0],[104,106,105,2.2],[107,108,108,-2.4]] },
      { id: "f", level: LOUD, zones: [[21,22,21,0],[23,25,24,0],[26,28,27,0],[29,31,30,0],[32,34,33,0],[35,37,36,0],[38,40,39,0],[41,43,42,0],[44,46,45,1.2],[47,49,48,1.7],[50,52,51,1.1],[53,55,54,2.8],[56,58,57,2.2],[59,61,60,-2.7],[62,64,63,1.9],[65,67,66,0],[68,70,69,0],[71,73,72,-2.4],[74,76,75,-2.3],[77,79,78,-2.9],[80,82,81,0],[83,85,84,0],[86,88,87,-3.4],[89,91,90,0],[92,94,93,-1.4],[95,97,96,0],[98,100,99,1.1],[101,103,102,1.8],[104,106,105,0],[107,108,108,0]] }
    ] },
    upright: { dir: "samples/upright/", layers: [
      { id: "p", upTo: 0.63, level: LOUD, zones: [[21,22,21,0],[23,25,24,0],[26,28,27,-1.5],[29,31,30,0],[32,34,33,0],[35,37,36,0],[38,40,39,0],[41,43,42,1.8],[44,46,45,0],[47,49,48,2],[50,52,51,3.2],[53,55,54,1],[56,58,57,0],[59,61,60,-1.6],[62,64,63,0],[65,67,66,-3.2],[68,70,69,0],[71,73,72,0],[74,76,75,2.6],[77,79,78,-1.7],[80,82,81,-3.6],[83,85,84,-2.1],[86,88,87,0],[89,91,90,3.5],[92,94,93,1.6],[95,97,96,0],[98,100,99,0],[101,103,102,1.9],[104,106,105,-2.1],[107,108,108,0]] },
      { id: "f", level: LOUD, zones: [[21,22,21,0],[23,23,23,0],[24,25,24,-1],[26,28,27,-2],[29,31,30,0],[32,33,33,0],[34,35,35,0],[36,37,36,1.3],[38,40,39,0],[41,45,42,0],[46,47,47,-1],[48,49,48,2.2],[50,52,51,3.1],[53,55,54,1.3],[56,57,57,0],[58,61,59,0],[62,64,63,0],[65,67,66,0],[68,69,69,0],[70,71,71,0],[72,73,72,-2.1],[74,76,75,-2.1],[77,79,78,0],[80,81,81,-4.1],[82,83,83,-5],[84,85,84,0],[86,88,87,-1.4],[89,91,90,0],[92,93,93,0],[94,95,95,0],[96,97,96,1.3],[98,100,99,1.6],[101,103,102,0],[104,105,105,1.4],[106,107,107,0],[108,108,108,-2.6]] }
    ] }
  };

  var INSTRUMENTS = A.INSTRUMENTS = [
    { id: "grand", name: "Grand piano", blurb: "A Yamaha C5 concert grand, recorded note by note at two strengths.", set: "grand", wet: 1 },
    { id: "bright", name: "Bright grand", blurb: "The same grand with the lid wide open. Cuts through for pop and rock.", set: "grand", vel: 0.08, eq: [["lowshelf", 160, -2.5], ["peaking", 2600, 2, 0.8], ["highshelf", 5200, 4]], wet: 0.65, trim: -1.2 },
    { id: "upright", name: "Upright piano", blurb: "A Kawai upright in a living room, heard from the bench. Warm and close.", set: "upright", wet: 0.75, trim: 0.3 },
    { id: "felt", name: "Felt piano", blurb: "A strip of felt between hammers and strings. Hushed and soft, for late nights.", set: "grand", vel: -0.18, felt: true, wet: 1.6, trim: 4 },
    { id: "honky", name: "Honky-tonk", blurb: "An old saloon upright whose strings have drifted apart. Ragtime ready.", set: "upright", detune: 16, eq: [["peaking", 1800, 3, 0.9], ["highshelf", 4200, 2]], wet: 0.55, trim: -0.2 },
    { id: "epiano", name: "Electric piano", blurb: "Bell-like tines with a bark when you dig in. Made on the spot, nothing to download.", synth: "fm", wet: 0.85, trem: true, trim: 4.2 },
    { id: "synth", name: "Simple synth", blurb: "Woodshed's original sound. Nothing to download.", synth: "basic", wet: 1, trim: 1.5 }
  ];
  var byId = {}; INSTRUMENTS.forEach(function (ins) { byId[ins.id] = ins; });
  var current = INSTRUMENTS[0];

  // Room: reverb length (s) and how much of it comes back.
  var ROOMS = { dry: { len: 0, wet: 0 }, room: { len: 1.7, wet: 0.2 }, hall: { len: 3.2, wet: 0.3 } };

  /* ---------- context and the master chain ---------- */
  A.ready = function () { return !!ctx; };
  A.now = function () { return ctx ? ctx.currentTime : 0; };
  A.context = function () { return ctx; };

  A.init = function () {
    if (ctx) { if (ctx.state !== "running" && !ctx.startRendering) { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); } return ctx; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    // iOS routes Web Audio through the ringer switch unless the session is marked as playback.
    try { if (nav.audioSession) nav.audioSession.type = "playback"; } catch (e) {}
    try { ctx = new AC({ latencyHint: "interactive" }); } catch (e) { ctx = new AC(); }
    build();
    // A silent blip inside the gesture is what finally unlocks audio on older iPhones.
    try { var b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
    if (ctx.state !== "running") { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    load(current);
    return ctx;
  };

  function build() {
    var n = nodes = { buses: {} };
    n.dry = ctx.createGain();
    n.wet = ctx.createGain();
    n.conv = ctx.createConvolver();
    n.wetOut = ctx.createGain();
    n.trim = ctx.createGain(); n.trim.gain.value = dbGain(-4);
    n.master = ctx.createGain(); n.master.gain.value = muted ? 0 : volume;
    // A limiter, not a compressor: it stays out of the way until a big pedalled chord would clip.
    var lim = n.limit = ctx.createDynamicsCompressor();
    lim.threshold.value = -3.5; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.15;
    n.dry.connect(n.trim);
    n.wet.connect(n.conv); n.conv.connect(n.wetOut); n.wetOut.connect(n.trim);
    // and a soft ceiling after it: exactly linear up to 86% of full scale, then rounding off below 1, so the
    // millisecond a limiter lets through on a hard attack can never clip the speaker
    var clip = n.clip = ctx.createWaveShaper(), N = 2049, curve = new Float32Array(N);
    for (var i = 0; i < N; i++) { var x = i / (N - 1) * 2 - 1, a = Math.abs(x); curve[i] = (x < 0 ? -1 : 1) * (a <= 0.86 ? a : 0.86 + 0.14 * Math.tanh((a - 0.86) / 0.14)); }
    clip.curve = curve; clip.oversample = "2x";
    n.trim.connect(n.master); n.master.connect(lim); lim.connect(clip); clip.connect(ctx.destination);
    setRoomNodes();
  }

  // A room made from noise: stereo, darker as it dies away, with a short gap before it arrives.
  function impulse(len) {
    var rate = ctx.sampleRate, frames = Math.max(1, Math.floor(rate * (len + 0.02))), ir = ctx.createBuffer(2, frames, rate);
    var pre = Math.floor(rate * 0.018);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch), lp = 0, seed = ch ? 0.61 : 0.23;
      for (var i = pre; i < frames; i++) {
        var t = (i - pre) / rate, x = Math.random() * 2 - 1;
        var k = 0.72 - 0.62 * Math.min(1, t / len);                   // one-pole lowpass closing over time
        lp += k * (x - lp);
        d[i] = lp * Math.pow(10, -3 * t / len) * (t < 0.004 ? t / 0.004 : 1);   // -60 dB at `len` seconds
      }
      // a few early reflections off the walls
      [0.011, 0.019, 0.027, 0.041].forEach(function (at, j) { var k2 = pre + Math.floor(rate * (at + seed * 0.004)); if (k2 < frames) d[k2] += (j % 2 ? -1 : 1) * 0.5 / (j + 1); });
    }
    return ir;
  }
  function setRoomNodes() {
    if (!nodes) return;
    var r = ROOMS[roomId] || ROOMS.room;
    if (r.len) { if (nodes.irLen !== r.len) { nodes.conv.buffer = impulse(r.len); nodes.irLen = r.len; } }
    nodes.wetOut.gain.value = r.wet;
  }
  A.setRoom = function (id) { roomId = ROOMS[id] ? id : "room"; setRoomNodes(); };
  A.room = function () { return roomId; };
  A.ROOMS = [["dry", "Dry"], ["room", "Room"], ["hall", "Hall"]];

  A.setVolume = function (v) { volume = v; if (nodes) nodes.master.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.02); };
  A.setMuted = function (m) { muted = m; if (nodes) nodes.master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.02); };

  // One bus per instrument: its tone shaping, then the dry path and the reverb send.
  function busFor(ins) {
    var b = nodes.buses[ins.id];
    if (b) return b;
    var input = ctx.createGain(), last = input;
    input.gain.value = dbGain(ins.trim || 0);
    (ins.eq || []).forEach(function (e) {
      var f = ctx.createBiquadFilter(); f.type = e[0]; f.frequency.value = e[1]; f.gain.value = e[2]; if (e[3]) f.Q.value = e[3];
      last.connect(f); last = f;
    });
    if (ins.synth === "fm") {
      var soft = ctx.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 7000; soft.Q.value = 0.3; last.connect(soft); last = soft;
    }
    if (ins.trem && ctx.createStereoPanner) {
      // the suitcase tremolo: the sound swings gently between the speakers
      var pan = ctx.createStereoPanner(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 4.3; depth.gain.value = 0.3; lfo.connect(depth); depth.connect(pan.pan); lfo.start();
      last.connect(pan); last = pan;
    }
    var send = ctx.createGain(); send.gain.value = ins.wet == null ? 1 : ins.wet;
    last.connect(nodes.dry); last.connect(send); send.connect(nodes.wet);
    return (nodes.buses[ins.id] = { input: input });
  }

  /* ---------- samples ---------- */
  var loaded = {};             // set name -> { buffers: {layer: {key: {buf, offset}}}, loaded, total, failed, state, promise }
  var decoder = null;
  function decodeCtx() {
    if (!decoder) { var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext; try { decoder = OAC ? new OAC(2, 1, 44100) : null; } catch (e) { decoder = null; } }
    return decoder || (ctx && !ctx.startRendering ? ctx : null);
  }
  function decode(bytes) {
    return new Promise(function (resolve, reject) {
      var c = decodeCtx(); if (!c) return reject(new Error("No Web Audio"));
      var p = c.decodeAudioData(bytes, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
  }
  // Codecs pad the start with a little silence. Find the hammer and start just before it.
  function prep(buf) {
    var chs = [], c, i, peak = 0, n = Math.min(buf.length, Math.floor(buf.sampleRate * 0.35));
    for (c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
    for (c = 0; c < chs.length; c++) for (i = 0; i < n; i++) { var a = Math.abs(chs[c][i]); if (a > peak) peak = a; }
    var thr = peak * 0.02, on = 0;
    find: for (i = 0; i < n; i++) for (c = 0; c < chs.length; c++) if (Math.abs(chs[c][i]) >= thr) { on = i; break find; }
    return { buf: buf, offset: Math.max(0, on - Math.round(buf.sampleRate * 0.0015)) / buf.sampleRate };
  }
  function setOf(ins) { return ins && ins.set ? ins.set : null; }
  // Which sample sets have been downloaded on this device (the service worker keeps the files).
  function savedSets() { try { return JSON.parse(localStorage.getItem("ws.samples")) || {}; } catch (e) { return {}; } }
  function markSaved(name) { try { var m = savedSets(); m[name] = true; localStorage.setItem("ws.samples", JSON.stringify(m)); } catch (e) {} }
  function urlsOf(name) { var S = SETS[name], out = []; S.layers.forEach(function (L) { L.zones.forEach(function (z) { out.push(S.dir + z[2] + L.id + ".m4a"); }); }); return out; }
  function state(name) { return loaded[name] || (loaded[name] = { buffers: {}, loaded: 0, total: 0, failed: 0, state: "idle" }); }

  function load(ins) {
    var name = setOf(ins); if (!name) return Promise.resolve();
    var S = SETS[name], R = state(name);
    if (R.promise) return R.promise;
    if (typeof fetch !== "function") { R.state = "error"; return Promise.resolve(); }
    var jobs = [];
    S.layers.forEach(function (L) { R.buffers[L.id] = {}; L.zones.forEach(function (z) { jobs.push({ L: L, key: z[2] }); }); });
    if (!jobs.length) { R.state = "error"; return Promise.resolve(); }
    // the middle of the keyboard first, both strengths side by side
    jobs.sort(function (a, b) { return Math.abs(a.key - 62) - Math.abs(b.key - 62) || (a.L.id < b.L.id ? -1 : 1); });
    R.total = jobs.length; R.state = "loading"; notify(name);
    var next = 0;
    function worker() {
      if (next >= jobs.length) return Promise.resolve();
      var j = jobs[next++];
      return fetch(S.dir + j.key + j.L.id + ".m4a")
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); })
        .then(decode)
        .then(function (buf) { R.buffers[j.L.id][j.key] = prep(buf); R.loaded++; }, function () { R.failed++; })
        .then(function () { notify(name); return worker(); });
    }
    R.promise = Promise.all([worker(), worker(), worker(), worker()]).then(function () {
      R.state = R.loaded === 0 ? "error" : "ready";
      if (R.state === "error") R.promise = null;       // let a later attempt (back online) try again
      if (R.state === "ready" && !R.failed) markSaved(name);
      notify(name);
    });
    return R.promise;
  }
  function notify(name) { INSTRUMENTS.forEach(function (ins) { if (ins.set === name) emit("status", ins.id, A.status(ins.id)); }); }

  // {state: "ready" | "loading" | "idle" | "error", loaded, total}
  A.status = function (id) {
    var ins = byId[id] || current, name = setOf(ins);
    if (!name) return { state: "ready", loaded: 1, total: 1 };
    var R = state(name);
    return { state: R.state, loaded: R.loaded, total: R.total || SETS[name].layers.reduce(function (s, L) { return s + L.zones.length; }, 0), failed: R.failed, saved: !!savedSets()[name] };
  };
  // Download an instrument's files for offline use without decoding them into memory. Resolves to the number that failed.
  A.cache = function (id) {
    var name = setOf(byId[id]); if (!name || typeof fetch !== "function") return Promise.resolve(0);
    if (savedSets()[name]) return Promise.resolve(0);
    var urls = urlsOf(name), bad = 0, next = 0;
    function worker() { if (next >= urls.length) return Promise.resolve(); var u = urls[next++]; return fetch(u).then(function (r) { if (!r.ok) bad++; return r.arrayBuffer(); }, function () { bad++; }).then(worker); }
    return Promise.all([worker(), worker(), worker(), worker()]).then(function () { if (!bad) markSaved(name); notify(name); return bad; });
  };
  A.onStatus = function (fn) { subs.status.push(fn); };
  A.load = function (id) { return load(byId[id] || current); };
  A.instrument = function () { return current.id; };
  A.setInstrument = function (id) {
    if (!byId[id]) return;
    var before = setOf(current);
    current = byId[id];
    // Notes still ringing keep their own reference to the audio, so this never cuts anything off.
    if (before && before !== setOf(current) && loaded[before] && loaded[before].state !== "loading") { delete loaded[before]; notify(before); }
    if (ctx || A.preloadAllowed()) load(current);
    emit("status", current.id, A.status(current.id));
  };
  // Start downloading before the first touch, unless the device asked us to save data.
  A.preloadAllowed = function () { var c = nav.connection; return !(c && c.saveData); };
  A.preload = function () { if (A.preloadAllowed()) load(current); };
  // Let the key maps come from outside (the upright's zones live next to its files).
  A._sets = SETS;

  function pickSample(ins, midi, v) {
    var S = SETS[ins.set], R = loaded[ins.set];
    if (!S || !R) return null;
    var li = 0; while (li < S.layers.length - 1 && v > S.layers[li].upTo) li++;
    // this layer first, then the other one
    var order = [li].concat(S.layers.map(function (_, k) { return k; }).filter(function (k) { return k !== li; }));
    for (var o = 0; o < order.length; o++) {
      var L = S.layers[order[o]], bufs = R.buffers[L.id]; if (!bufs) continue;
      var zone = null, k;
      for (k = 0; k < L.zones.length; k++) if (midi >= L.zones[k][0] && midi <= L.zones[k][1]) { zone = L.zones[k]; break; }
      if (zone && bufs[zone[2]]) return { s: bufs[zone[2]], key: zone[2], trim: zone[3] || 0, L: L, li: order[o] };
      // not downloaded yet: the nearest recording within a fourth will do
      var best = null;
      for (k = 0; k < L.zones.length; k++) { var z = L.zones[k], d = Math.abs(z[2] - midi); if (bufs[z[2]] && d <= 5 && (!best || d < Math.abs(best[2] - midi))) best = z; }
      if (best) return { s: bufs[best[2]], key: best[2], trim: best[3] || 0, L: L, li: order[o] };
    }
    return null;
  }

  /* ---------- voices ----------
     Each voice ends in two gain stages: `damp` (the velocity level, later the damper falling) and `kill` (for a
     re-strike or voice stealing). Each is automated at most once, so no ramp is ever cancelled half way, which is
     what used to make released notes jump back up before they faded. */
  function finish(v, srcs, tail) {
    v.srcs = srcs;
    srcs[0].onended = function () {
      var i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1);
      if (live[v.midi] === v) delete live[v.midi];
      setTimeout(function () { try { v.kill.disconnect(); } catch (e) {} }, tail || 0);
    };
    return v;
  }
  function stages(v, level, into) {
    v.damp = ctx.createGain(); v.damp.gain.value = level; v.amp = level;
    v.kill = ctx.createGain();
    v.damp.connect(v.kill); v.kill.connect(into);
    return v.damp;
  }

  function sampleVoice(ins, midi, vel, t) {
    var v = clamp(vel + (ins.vel || 0), 0.02, 1), hit = pickSample(ins, midi, v);
    if (!hit) return null;
    var S = SETS[ins.set], L = hit.L, rate = Math.pow(2, (midi - hit.key) / 12);
    // Softer strikes excite fewer overtones: within each recorded strength, close a lowpass toward the one below it.
    var lo = hit.li ? S.layers[hit.li - 1].upTo : 0, hi = L.upTo || 1, x = clamp((v - lo) / (hi - lo), 0, 1), f0 = freq(midi);
    var cutoff = hit.li === 0 ? Math.max(500, f0 * (3 + 34 * x * x)) : Math.max(900, f0 * (5 + 64 * x * x));
    if (ins.felt) cutoff = Math.min(cutoff, Math.max(f0 * 2.6, 700 + 1900 * v));
    cutoff = Math.min(cutoff, 20000);
    var level = dbGain(levelFor(v) - L.level + hit.trim) * (ins.detune ? 0.72 : 1);
    var voice = { midi: midi, t: t, tau: midi >= 89 ? 0.5 : 0.055 + 0.17 * clamp((72 - midi) / 51, 0, 1) };
    var into = stages(voice, level, busFor(ins).input), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 0.35; lp.frequency.value = cutoff; lp.connect(into);
    if (ins.felt) {
      // felt softens the blow: the tone blooms in over a few milliseconds
      voice.damp.gain.setValueAtTime(0, t); voice.damp.gain.linearRampToValueAtTime(level, t + 0.012); voice.attack = 0.012;
    }
    var srcs = [], cents = ins.detune ? [ins.detune / 2, -ins.detune / 2] : [0];
    cents.forEach(function (c, i) {
      var s = ctx.createBufferSource(); s.buffer = hit.s.buf;
      s.playbackRate.value = rate * Math.pow(2, c / 1200);
      s.connect(lp); s.start(t + i * 0.003, hit.s.offset);
      srcs.push(s);
    });
    voice.end = t + (hit.s.buf.duration - hit.s.offset) / rate;
    return finish(voice, srcs);
  }

  // The fallback while samples download, and the "Simple synth": two strings of harmonics, a felt thump, a lowpass
  // that closes as the note rings.
  var synthWave = null, thump = null;
  function basicVoice(ins, midi, vel, t) {
    var f = freq(midi), pos = clamp((midi - 28) / 68, 0, 1), v = clamp(vel, 0.02, 1);
    var decay = 5.5 - pos * 4.2;
    if (!synthWave) {
      var amps = [0, 1, 0.52, 0.3, 0.2, 0.11, 0.09, 0.05, 0.04, 0.025, 0.02, 0.012, 0.01];
      var re = new Float32Array(amps.length), im = new Float32Array(amps.length);
      for (var h = 1; h < amps.length; h++) im[h] = amps[h];
      synthWave = ctx.createPeriodicWave(re, im);
    }
    if (!thump || thump.sampleRate !== ctx.sampleRate) {
      var nlen = Math.floor(ctx.sampleRate * 0.03); thump = ctx.createBuffer(1, nlen, ctx.sampleRate);
      var nd = thump.getChannelData(0); for (var i = 0; i < nlen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nlen);
    }
    var voice = { midi: midi, t: t, tau: 0.09, end: t + decay };
    var level = dbGain(levelFor(v)) * (1 - pos * 0.3) * 0.42;
    var into = stages(voice, level, busFor(ins.synth ? ins : byId.synth).input);
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.42, t + 0.22);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);   // its own natural decay, never cancelled
    env.connect(into);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), mix2 = ctx.createGain();
    o1.setPeriodicWave(synthWave); o2.setPeriodicWave(synthWave);
    o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 3 + pos * 4; mix2.gain.value = 0.55;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(Math.min(14000, f * (3 + 9 * v)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(9000, f * 1.8 + 250), t + 0.9 + (1 - pos) * 1.2);
    o1.connect(lp); o2.connect(mix2); mix2.connect(lp); lp.connect(env);
    var noise = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    noise.buffer = thump; nf.type = "bandpass"; nf.frequency.value = Math.min(6000, f * 4); nf.Q.value = 0.7; ng.gain.value = 0.12 * v;
    noise.connect(nf); nf.connect(ng); ng.connect(env);
    o1.start(t); o2.start(t); noise.start(t);
    o1.stop(t + decay + 0.05); o2.stop(t + decay + 0.05);
    return finish(voice, [o1, o2, noise]);
  }

  // Electric piano by FM: one pair for the body (its "bark" grows with velocity), one high pair for the tine's ping.
  function fmVoice(ins, midi, vel, t) {
    var f = freq(midi), pos = clamp((midi - 28) / 70, 0, 1), v = clamp(vel, 0.02, 1);
    var voice = { midi: midi, t: t, tau: 0.07 };
    var level = dbGain(levelFor(v)) * 0.34 * (1 - 0.25 * pos);
    var into = stages(voice, level, busFor(ins).input);
    var ring = 1.5 - 1.05 * pos;                                  // bass tines ring longer
    function osc(fr) { var o = ctx.createOscillator(); o.frequency.value = fr; return o; }
    // body
    var c1 = osc(f), m1 = osc(f), i1 = ctx.createGain(), e1 = ctx.createGain();
    var bark = f * (0.35 + 1.5 * v * v);
    i1.gain.setValueAtTime(bark, t); i1.gain.setTargetAtTime(bark * 0.18, t + 0.005, 0.28);
    m1.connect(i1); i1.connect(c1.frequency);
    e1.gain.setValueAtTime(0, t); e1.gain.linearRampToValueAtTime(1, t + 0.003); e1.gain.setTargetAtTime(0, t + 0.004, ring);
    c1.connect(e1); e1.connect(into);
    // tine
    var c2 = osc(f * 2.0), m2 = osc(f * 14), i2 = ctx.createGain(), e2 = ctx.createGain();
    var ping = f * 14 * (0.22 + 0.45 * v);                      // modulation index 0.2-0.7, gone in ~0.1 s
    i2.gain.setValueAtTime(ping, t); i2.gain.setTargetAtTime(0, t + 0.002, 0.035);
    m2.connect(i2); i2.connect(c2.frequency);
    e2.gain.setValueAtTime(0, t); e2.gain.linearRampToValueAtTime(0.16 + 0.2 * v, t + 0.002); e2.gain.setTargetAtTime(0, t + 0.003, 0.18 + 0.2 * (1 - pos));
    c2.connect(e2); e2.connect(into);
    var end = t + ring * 7;
    [c1, m1, c2, m2].forEach(function (o) { o.start(t); o.stop(end); });
    voice.end = end;
    return finish(voice, [c1, m1, c2, m2]);
  }

  function damp(v, when, tau) {
    if (!v || v.damped) return;
    v.damped = true;
    var t = Math.max(when || 0, ctx.currentTime, v.t + (v.attack || 0));
    v.damp.gain.setValueAtTime(v.amp, t);
    v.damp.gain.setTargetAtTime(0, t, tau == null ? v.tau : tau);
    var stop = t + (tau == null ? v.tau : tau) * 8 + 0.05;
    v.srcs.forEach(function (s) { try { s.stop(stop); } catch (e) {} });
  }
  function kill(v, tau) {
    if (!v || v.killed) return;
    v.killed = true;
    if (v.t > ctx.currentTime + 0.003) { v.srcs.forEach(function (s) { try { s.stop(ctx.currentTime); } catch (e) {} }); return; }
    var t = ctx.currentTime;
    v.kill.gain.setValueAtTime(1, t);
    v.kill.gain.setTargetAtTime(0, t, tau);
    var stop = t + tau * 8 + 0.02;
    v.srcs.forEach(function (s) { try { s.stop(stop); } catch (e) {} });
  }

  // Too many strings ringing: let go of the oldest fading tail first, then pedalled notes, then the oldest of all.
  // Notes scheduled for later (a playback running ahead) neither count nor get picked: they haven't started yet.
  function makeRoom() {
    var soon = ctx.currentTime + 0.05, alive = voices.filter(function (v) { return !v.killed && v.t <= soon; });
    if (alive.length < MAX_VOICES) return;
    var pick = function (test) { for (var i = 0; i < alive.length; i++) if (test(alive[i])) return alive[i]; return null; };
    var victim = pick(function (v) { return v.damped; }) || pick(function (v) { return v.sustained; }) || pick(function (v) { return !v.live; }) || alive[0];
    kill(victim, 0.012);
  }

  function strike(midi, vel, t, isLive) {
    if (!A.init()) return null;
    makeRoom();
    var ins = current, v = null;
    if (ins.synth === "fm") v = fmVoice(ins, midi, vel, t);
    else if (ins.set) v = sampleVoice(ins, midi, vel, t);
    if (!v) v = basicVoice(ins, midi, vel, t);
    v.live = !!isLive;
    voices.push(v);
    return v;
  }

  /* ---------- playing ---------- */
  // A key goes down now. Returns the voice, to hand back to keyUp. A later `when` schedules a note instead.
  A.noteOn = function (midi, velocity, when) {
    if (!A.init()) return null;
    var vel = velocity == null ? 0.7 : velocity;
    if (when && when > ctx.currentTime + 0.005) return strike(midi, vel, when, false);
    var old = live[midi];
    if (old && !old.killed) kill(old, 0.035);        // the same string struck again
    var v = strike(midi, vel, ctx.currentTime, true);
    if (v) live[midi] = v;
    return v;
  };
  // The key comes back up. With the pedal down the note keeps ringing until the pedal lifts.
  A.keyUp = function (v) {
    if (!v || !ctx) return;
    if (pedal) { v.sustained = true; return; }
    damp(v);
  };
  A.noteOff = function (midi) { A.keyUp(live[midi]); };
  // A scheduled end for a note, whatever the pedal is doing.
  A.release = function (v, when) { if (v && ctx) damp(v, when); };
  // Silence everything quickly (stop a playback, leave a page).
  A.allOff = function () { if (ctx) voices.slice().forEach(function (v) { kill(v, 0.03); }); };

  A.pedal = function (down) {
    down = !!down;
    if (down === pedal) return;
    pedal = down;
    if (!pedal && ctx) voices.forEach(function (v) { if (v.sustained) { v.sustained = false; damp(v); } });
    emit("pedal", pedal);
  };
  A.pedalDown = function () { return pedal; };
  A.onPedal = function (fn) { subs.pedal.push(fn); };
  // Keyboards listen here to light up the keys the app itself plays: fn(midi, delaySec, durSec).
  A.onPlay = function (fn) { subs.play.push(fn); return function () { var i = subs.play.indexOf(fn); if (i >= 0) subs.play.splice(i, 1); }; };
  function shown(midi, t, dur) { if (subs.play.length) emit("play", midi, Math.max(0, t - ctx.currentTime), dur); }

  // Play notes for a fixed length. opts: {dur, vel, strum (seconds between notes), when}
  A.play = function (midis, opts) {
    if (!A.init()) return;
    var o = opts || {}, t0 = Math.max(o.when || 0, ctx.currentTime + 0.01), dur = o.dur || 1.4;
    midis.forEach(function (m, i) {
      var t = t0 + i * (o.strum || 0), v = strike(m, o.vel == null ? 0.62 : o.vel, t, false);
      damp(v, t + dur);
      shown(m, t, dur);
    });
  };
  // One note with a known length, shown on the keys as it sounds (recorded takes, melodies).
  A.playNote = function (midi, vel, when, dur) {
    if (!A.init()) return null;
    var t = Math.max(when || 0, ctx.currentTime + 0.005), v = strike(midi, vel == null ? 0.65 : vel, t, false);
    damp(v, t + dur); shown(midi, t, dur);
    return v;
  };
  // One after another (scales, arpeggios). Returns total seconds.
  A.sequence = function (midis, stepSec, opts) {
    if (!A.init()) return 0;
    var o = opts || {}, t0 = ctx.currentTime + 0.03;
    midis.forEach(function (m, i) {
      var t = t0 + i * stepSec, len = stepSec * (o.legato || 1.05), v = strike(m, o.vel == null ? 0.6 : o.vel, t, false);
      damp(v, t + len);
      shown(m, t, Math.min(len, stepSec * 0.95));
    });
    return midis.length * stepSec;
  };

  A.click = function (when, accent, soft) {
    if (!A.init()) return;
    var t = Math.max(when || 0, ctx.currentTime);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((accent ? 0.3 : 0.2) * (soft ? 0.5 : 1), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = accent ? 2000 : 1400; f.Q.value = 2;
    o.connect(f); f.connect(g); g.connect(nodes.master);
    o.start(t); o.stop(t + 0.07);
  };

  /* ---------- testing: render into an OfflineAudioContext instead of the speakers ----------
     fn(A, offlineCtx) schedules notes (and may use offlineCtx.suspend(t) to act "live" at time t). */
  A._render = function (seconds, fn, sampleRate) {
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext, sr = sampleRate || 44100;
    var saved = { ctx: ctx, nodes: nodes, voices: voices, live: live, pedal: pedal };
    var off = new OAC(2, Math.ceil(seconds * sr), sr);
    ctx = off; voices = []; live = {}; pedal = false; build();
    try { fn(A, off); } finally { ctx = saved.ctx; nodes = saved.nodes; voices = saved.voices; live = saved.live; pedal = saved.pedal; }
    return off.startRendering();
  };
  // Run fn with the offline graph swapped in (for calls made from suspend() callbacks).
  A._within = function (state, fn) {
    var saved = { ctx: ctx, nodes: nodes, voices: voices, live: live, pedal: pedal };
    ctx = state.ctx; nodes = state.nodes; voices = state.voices; live = state.live; pedal = state.pedal;
    try { fn(A); } finally { state.pedal = pedal; ctx = saved.ctx; nodes = saved.nodes; voices = saved.voices; live = saved.live; pedal = saved.pedal; }
  };
  A._snapshot = function () { return { ctx: ctx, nodes: nodes, voices: voices, live: live, pedal: pedal }; };
  A._voices = function () { return voices.length; };

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
