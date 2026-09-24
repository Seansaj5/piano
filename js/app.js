/* Woodshed app core: saved state, routing, the practice timer, the metronome, and the Today and Tools views.
   Each other view lives in its own file and registers itself on W.views. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio;
  const App = W.App = {};
  W.views = W.views || {};

  /* ---------- small helpers ---------- */
  const $ = App.$ = (sel, rootEl) => (rootEl || document).querySelector(sel);
  const $$ = App.$$ = (sel, rootEl) => Array.from((rootEl || document).querySelectorAll(sel));
  const esc = App.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  App.PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  App.STOP = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg>';
  let toastTimer = 0;
  App.toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600); };
  App.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  App.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Redraw notation when its box changes width (rotation, sidebar, first reveal of a hidden view).
  const papers = new Map();
  const ro = self.ResizeObserver ? new ResizeObserver(entries => entries.forEach(en => {
    const p = papers.get(en.target); if (!p) return;
    const w = Math.round(en.contentRect.width);
    if (w > 0 && w !== p.w) { p.w = w; p.draw(w); }
  })) : null;
  App.paper = (el, draw) => {
    const w = Math.round(el.clientWidth - 16) > 0 ? Math.round(el.getBoundingClientRect().width - 16) : 0;
    papers.set(el, { w: w, draw: wd => draw(Math.max(140, wd)) });
    if (ro) { ro.unobserve(el); ro.observe(el); }
    if (w > 0) draw(w);
  };

  /* ---------- saved state ---------- */
  const STORE = "ws.v1";
  const defaults = () => ({
    settings: { labels: "c", volume: 0.8, midiSound: false, instrument: "grand", room: "room" },
    play: { zoom: "m", mode: "free", song: "ode", take: null, best: {} },
    stats: {}, log: {}, charts: [],
    sheet: { id: "ode", voicing: "lh", simplify: "none", loop: true, click: true, melody: true, chords: true, tempo: {}, transpose: {} },
    metro: { bpm: 92, beats: 4, accent: true },
    chords: { root: "C", q: "maj", inv: 0 },
    keys: { sig: 0, mode: "major", scale: "auto", hand: "rh", sevenths: false },
    train: {}
  });
  function load() {
    const d = defaults();
    try {
      const s = JSON.parse(localStorage.getItem(STORE)) || {};
      Object.keys(d).forEach(k => { if (s[k] && typeof s[k] === "object" && !Array.isArray(d[k])) d[k] = Object.assign(d[k], s[k]); else if (s[k] != null) d[k] = s[k]; });
    } catch (e) {}
    return d;
  }
  const state = App.state = load();
  let saveTimer = 0;
  App.save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(App.saveNow, 250); };
  App.saveNow = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };

  /* ---------- days, streaks, practice time ---------- */
  const pad = n => String(n).padStart(2, "0");
  const dayKey = App.dayKey = d => { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const dayNumber = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const dayLog = App.dayLog = key => (state.log[key || dayKey()] = state.log[key || dayKey()] || { sec: 0, done: {}, answers: 0 });
  const practiced = l => l && (l.sec >= 60 || l.answers >= 5 || Object.keys(l.done || {}).length > 0);
  App.streak = () => {
    let n = 0; const d = new Date();
    if (!practiced(state.log[dayKey(d)])) d.setDate(d.getDate() - 1);      // today still counts as "not broken yet"
    while (practiced(state.log[dayKey(d)])) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  App.weekSeconds = () => { let s = 0; const d = new Date(); for (let i = 0; i < 7; i++) { const l = state.log[dayKey(d)]; if (l) s += l.sec; d.setDate(d.getDate() - 1); } return s; };
  const mins = sec => Math.round(sec / 60);

  const timer = { on: false, t0: 0, tick: 0 };
  function timerPaint() {
    const b = $("#timerBtn"), sec = dayLog().sec;
    b.classList.toggle("live", timer.on);
    $("#timerTxt").textContent = timer.on ? Math.floor(sec / 60) + ":" + pad(sec % 60) : (sec >= 60 ? mins(sec) + " min today" : "Start practice");
  }
  App.timerToggle = () => {
    timer.on = !timer.on;
    clearInterval(timer.tick);
    if (timer.on) timer.tick = setInterval(() => { dayLog().sec++; timerPaint(); if (dayLog().sec % 10 === 0) App.saveNow(); }, 1000);
    else { App.saveNow(); App.toast(mins(dayLog().sec) + " min logged today"); if (App.current === "today") W.views.today.show(); }
    timerPaint();
  };

  /* ---------- drill stats (shared with the Train view and the tutor) ---------- */
  App.record = (drill, item, ok, ms) => {
    const s = state.stats[drill] = state.stats[drill] || { n: 0, ok: 0, run: 0, best: 0, ms: 0, items: {} };
    s.n++; if (ok) { s.ok++; s.run++; s.best = Math.max(s.best, s.run); } else s.run = 0;
    if (ok && ms) s.ms = s.ms ? Math.round(s.ms * 0.85 + ms * 0.15) : ms;
    const it = s.items[item] = s.items[item] || { n: 0, ok: 0 };
    it.n++; if (ok) it.ok++;
    dayLog().answers++;
    App.save();
    return s;
  };
  App.accuracy = drill => { const s = state.stats[drill]; return s && s.n ? Math.round(100 * s.ok / s.n) : null; };
  // The items someone misses most, for adaptive picking and for the tutor's context.
  App.weakItems = (drill, max) => {
    const s = state.stats[drill]; if (!s) return [];
    return Object.keys(s.items).map(k => ({ k: k, n: s.items[k].n, acc: s.items[k].ok / s.items[k].n }))
      .filter(x => x.n >= 2 && x.acc < 0.75).sort((a, b) => a.acc - b.acc).slice(0, max || 5);
  };

  /* ---------- sound helpers ---------- */
  App.playChord = (midis, opts) => { const o = opts || {}; A.play(midis.slice().sort((a, b) => a - b), { dur: o.dur || 1.6, strum: o.arp ? 0.2 : 0.018, vel: o.vel }); };

  /* ---------- metronome ---------- */
  const TEMPO_MARKS = [[0, "Largo"], [60, "Adagio"], [76, "Andante"], [108, "Moderato"], [120, "Allegro"], [168, "Presto"]];
  App.tempoName = bpm => { let n = "Largo"; TEMPO_MARKS.forEach(m => { if (bpm >= m[0]) n = m[1]; }); return n; };
  const metro = App.metro = {
    clock: null,
    running: () => !!(metro.clock && metro.clock.running()),
    start() {
      const m = state.metro;
      metro.clock = new A.Clock({
        bpm: m.bpm, beatsPerBar: m.beats,
        onBeat: (i, t) => { A.click(t, m.accent && i % m.beats === 0); },
        onTick: i => { metro.pulse(i % m.beats); }
      });
      metro.clock.start(); metro.paint();
    },
    stop() { if (metro.clock) metro.clock.stop(); metro.clock = null; metro.paint(); metro.pulse(-1); },
    toggle() { A.init(); metro.running() ? metro.stop() : metro.start(); },
    setBpm(bpm) { state.metro.bpm = Math.max(30, Math.min(240, Math.round(bpm))); if (metro.clock) metro.clock.job.bpm = state.metro.bpm; App.save(); metro.paint(); },
    setBeats(n) { state.metro.beats = n; App.save(); if (metro.running()) { metro.stop(); metro.start(); } metro.paint(); },
    pulse(beat) {
      const mini = $("#metroMini"); mini.classList.toggle("pulse", beat >= 0);
      if (beat >= 0) setTimeout(() => mini.classList.remove("pulse"), 90);
      $$("#v-tools .beat").forEach((b, i) => b.classList.toggle("on", i === beat));
    },
    paint() {
      $("#metroMiniTxt").textContent = state.metro.bpm;
      $("#metroMini").classList.toggle("live", metro.running());
      if (W.views.tools.painted) W.views.tools.paintMetro();
    }
  };
  let taps = [];
  App.tapTempo = () => {
    const now = performance.now();
    taps = taps.filter(t => now - t < 2500); taps.push(now);
    if (taps.length >= 2) { const gaps = taps.slice(1).map((t, i) => t - taps[i]); metro.setBpm(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)); }
    A.click(0, false, true);
  };

  /* ---------- routing ---------- */
  App.go = (view, params) => {
    const q = params ? "?" + Object.keys(params).map(k => k + "=" + encodeURIComponent(params[k])).join("&") : "";
    const hash = "#/" + view + q;
    if (location.hash === hash) route(); else location.hash = hash;
  };
  function route() {
    const m = /^#\/([a-z]+)(?:\?(.*))?$/.exec(location.hash) || [null, "today", ""];
    const name = W.views[m[1]] ? m[1] : "today", params = {};
    (m[2] || "").split("&").forEach(kv => { if (kv) { const p = kv.split("="); params[p[0]] = decodeURIComponent(p[1] || ""); } });
    if (App.current && App.current !== name && W.views[App.current].hide) W.views[App.current].hide();
    App.current = name; document.body.setAttribute("data-view", name);
    $$(".view").forEach(v => { v.hidden = v.id !== "v-" + name; });
    $$("#tabs a").forEach(a => a.classList.toggle("on", a.getAttribute("data-v") === name));
    const v = W.views[name], el = $("#v-" + name);
    if (!v.mounted) { v.mount(el); v.mounted = true; }
    if (v.show) v.show(params);
    if (!params.keep) window.scrollTo(0, 0);
  }

  App.start = () => {
    A.setVolume(state.settings.volume);
    A.setInstrument(A.INSTRUMENTS.some(i => i.id === state.settings.instrument) ? state.settings.instrument : "grand");
    A.setRoom(state.settings.room);
    W.Midi.sound = !!state.settings.midiSound;
    $("#timerBtn").addEventListener("click", App.timerToggle);
    $("#metroMini").addEventListener("click", () => metro.toggle());
    window.addEventListener("hashchange", route);
    document.addEventListener("visibilitychange", () => { if (document.hidden) App.saveNow(); });
    window.addEventListener("pagehide", App.saveNow);
    // The first touch anywhere unlocks audio, so the first key press is not silent. iPhones only accept some gestures
    // (a touchend or a click, not always a pointerdown), so keep trying until the context is really running.
    const GESTURES = ["pointerdown", "touchend", "click", "keydown"];
    const unlock = () => { const c = A.init(); if (c && c.state === "running") GESTURES.forEach(g => document.removeEventListener(g, unlock, true)); };
    GESTURES.forEach(g => document.addEventListener(g, unlock, true));
    // Fetch the chosen piano in the background once the page has settled, so it is ready by the first note.
    setTimeout(() => A.preload(), 1500);
    timerPaint(); metro.paint(); route();
    if (W.Tutor) W.Tutor.start();
  };

  /* ---------- daily picks ---------- */
  App.keyOfDay = () => {
    const n = dayNumber(), spot = T.CIRCLE[n % 12];
    return Math.floor(n / 12) % 2 ? spot.minor : spot.major;
  };
  App.chordOfDay = () => {
    const n = dayNumber(), k = App.keyOfDay();
    const pool = k.mode === "minor" ? ["m7", "m9", "m6", "m7b5", "mmaj7", "m11", "madd9"] : ["maj7", "6", "add9", "7", "9", "sus4", "maj9", "13", "69", "7sus4"];
    const deg = k.mode === "minor" ? [1, 4, 1, 2][n % 4] : [1, 4, 5, 1][n % 4];
    const rootNote = T.keyScale(k).notes[deg - 1];
    let q = pool[n % pool.length];
    if (k.mode === "major" && deg === 5 && ["maj7", "6", "maj9", "69", "add9"].indexOf(q) >= 0) q = "9";
    if (k.mode === "major" && deg !== 5 && ["7", "9", "13", "7sus4"].indexOf(q) >= 0) q = "maj7";
    if (k.mode === "minor" && deg === 2) q = "m7b5";
    return T.chordFrom(rootNote, q);
  };

  /* =====================================================================
     TODAY
     ===================================================================== */
  W.views.today = {
    mount(el) {
      el.addEventListener("click", e => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const act = b.getAttribute("data-act");
        if (act === "hear") App.playChord(T.chordPitches(T.parseChord(b.getAttribute("data-ch")), 4, 0).map(p => p.midi), { arp: false });
        else if (act === "check") { const id = b.getAttribute("data-id"), d = dayLog().done; if (d[id]) delete d[id]; else d[id] = true; App.save(); this.show(); }
        else if (act === "timer") App.timerToggle();
      });
    },
    show() {
      const el = $("#v-today"), k = App.keyOfDay(), ch = App.chordOfDay(), hr = new Date().getHours();
      const hello = hr < 5 ? "Late-night session" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
      const log = dayLog(), streak = App.streak();
      const dia = T.diatonicChords(k), primary = (k.mode === "minor" ? [0, 3, 4, 5] : [0, 3, 4, 5]).map(i => dia[i]);
      const sheetId = state.sheet.id, sheetTitle = (W.Sheet && W.Sheet.titleOf(sheetId)) || "Ode to Joy";
      const voicing = T.VOICINGS.filter(v => v.id === state.sheet.voicing)[0] || T.VOICINGS[1];
      const drills = (W.DRILLS || []);
      let weakest = drills[0];
      drills.forEach(d => { const a = App.accuracy(d.id), b = App.accuracy(weakest.id); if (a == null ? b != null : (b != null && a < b)) weakest = d; });
      const untouched = drills.filter(d => App.accuracy(d.id) == null)[0];
      const drill = untouched || weakest;
      const kq = { key: T.keyShort(k).replace("♯", "#").replace("♭", "b") };
      const plan = [
        { id: "scale", what: T.keyName(k) + " scale", sub: "Hands separate, then together. Slow enough to be even.", min: 3, href: "#/keys?key=" + encodeURIComponent(kq.key) },
        { id: "chords", what: "Primary chords in " + T.keyShort(k), sub: primary.slice(0, 3).map(d => d.chord.symbol).join(" · ") + ". Root position, then each inversion.", min: 4, href: "#/keys?key=" + encodeURIComponent(kq.key) },
        { id: "sheet", what: "Lead sheet: " + sheetTitle, sub: "Voicing: " + voicing.name.toLowerCase() + ". Loop it with the click on.", min: 8, href: "#/sheet" },
        { id: "drill", what: drill ? drill.name : "Note reading", sub: "Twenty questions. Accuracy first, speed second.", min: 3, href: "#/train" + (drill ? "?d=" + drill.id : "") }
      ];
      el.innerHTML = `
        <div class="hero"><h1>${hello}. <em>Let's play.</em></h1><p>${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}. One key a day, around the circle of fifths.</p></div>
        <div class="stats">
          <div class="stat ${streak ? "hot" : ""}"><b>${streak}</b><span>day streak</span></div>
          <div class="stat"><b>${mins(log.sec)}</b><span>min today</span></div>
          <div class="stat"><b>${mins(App.weekSeconds())}</b><span>min this week</span></div>
        </div>
        <div class="grid2 wide-left mt">
          <div class="card">
            <span class="eyebrow">Key of the day</span>
            <div class="kod">
              <div>
                <div class="big-key">${esc(T.name(k.tonic))}<small>${k.mode}</small></div>
                <p class="sub mt-s">${esc(T.sigText(k.sig))}${k.sig ? ": " + T.sigNotes(k.sig).map(n => T.name(n)).join(" ") : ""}. Relative ${k.mode === "minor" ? "major" : "minor"}: ${esc(T.keyName(T.relative(k)))}.</p>
                <div class="chips mt">${primary.map(d => `<button class="chip sym" data-act="hear" data-ch="${esc(d.chord.ascii)}">${esc(d.chord.symbol)}<small>${esc(d.numeral)}</small></button>`).join("")}</div>
              </div>
              <div class="paper center" id="kodStaff"></div>
            </div>
            <div class="row mt"><a class="btn" href="${plan[0].href}">Open this key</a></div>
          </div>
          <div class="card">
            <span class="eyebrow">Chord of the day</span>
            <div class="big-sym" style="font-size:clamp(38px,8vw,54px)">${esc(ch.symbol)}</div>
            <div class="spoken">${esc(ch.spoken)}</div>
            <p class="note-txt mt-s">${ch.notes.map(n => T.name(n)).join("  ")}</p>
            <div class="kb mini mt" id="codKb"></div>
            <div class="row mt"><button class="btn ghost small" data-act="hear" data-ch="${esc(ch.ascii)}">${App.PLAY} Hear it</button><a class="btn ghost small" href="#/chords?ch=${encodeURIComponent(ch.ascii)}">Explore</a></div>
          </div>
        </div>
        <div class="card mt">
          <div class="row between"><span class="eyebrow">Today's session · about 18 minutes</span><button class="btn small ${timer.on ? "stop" : "ghost"}" data-act="timer">${timer.on ? "Stop timer" : "Start timer"}</button></div>
          <ul class="plan mt-s">${plan.map(p => `<li class="${log.done[p.id] ? "done" : ""}"><button class="check" data-act="check" data-id="${p.id}" aria-label="Mark done">✓</button><div class="what grow">${esc(p.what)}<small>${esc(p.sub)}</small></div><span class="mins">${p.min} min</span><a class="btn ghost small" href="${p.href}">Go</a></li>`).join("")}</ul>
        </div>
        <div class="mt-l"><span class="eyebrow">Jump in</span></div>
        <div class="quick mt-s">
          <a class="tile" href="#/piano"><b>Piano</b><span>Just play: a real grand, a sustain pedal, and every chord named as you play it.</span></a>
          <a class="tile" href="#/piano?learn=${encodeURIComponent(state.play.song || "ode")}"><b>Learn a melody</b><span>Woodshed lights each note and plays the chords under you.</span></a>
          <a class="tile" href="#/sheet"><b>Lead sheets</b><span>Decode the chord symbols over a melody and hear how to voice them.</span></a>
          <a class="tile" href="#/chords"><b>Chord explorer</b><span>Every chord, every inversion, on the keys and the staff.</span></a>
          <a class="tile" href="#/keys"><b>Circle of fifths</b><span>Signatures, scales with fingering, and the chords in each key.</span></a>
          <a class="tile" href="#/train"><b>Drills</b><span>Note reading, key signatures, chord spelling, ear training.</span></a>
          <button class="tile" onclick="W.Tutor.open('scan')"><b>Scan sheet music</b><span>Photograph a page and have Clef break it down.</span></button>
          <a class="tile" href="#/tools"><b>Metronome</b><span>Tap tempo, time signatures, and a MIDI keyboard hookup.</span></a>
        </div>`;
      App.paper($("#kodStaff"), w => W.Staff.render($("#kodStaff"), { clef: "treble", sig: k.sig, width: Math.min(w, 210), space: 9, items: [] }));
      const kb = new W.Keyboard($("#codKb"), { from: 48, to: 83, fit: true, labels: "none" });
      const ps = T.chordPitches(ch, 3, 0); const shift = ps[ps.length - 1].midi > 83 ? -12 : 0;
      kb.mark(ps.map((p, i) => ({ midi: p.midi + shift, cls: i === 0 ? "root" : "rh", label: T.name(p) })));
    }
  };

  /* =====================================================================
     TOOLS
     ===================================================================== */
  W.views.tools = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Tools</h1><p>A metronome you will actually use, a MIDI hookup, and your practice record.</p></div>
        <div class="grid2">
          <div class="card metro">
            <span class="eyebrow">Metronome</span>
            <div class="bpm"><span id="mBpm"></span><small>bpm</small></div>
            <div class="marking" id="mMark"></div>
            <div class="beats" id="mBeats"></div>
            <input type="range" id="mRange" min="30" max="240" step="1" aria-label="Tempo">
            <div class="row mt" style="justify-content:center">
              <button class="btn ghost" data-m="-5">−5</button><button class="btn ghost" data-m="-1">−1</button>
              <button class="btn" id="mGo" style="min-width:112px"></button>
              <button class="btn ghost" data-m="1">+1</button><button class="btn ghost" data-m="5">+5</button>
            </div>
            <div class="row mt" style="justify-content:center">
              <div class="seg" id="mSig">${[2, 3, 4, 6].map(n => `<button data-b="${n}">${n}/${n === 6 ? 8 : 4}</button>`).join("")}</div>
              <button class="btn ghost" id="mTap">Tap tempo</button>
            </div>
            <div class="row mt" style="justify-content:center"><label class="switch"><input type="checkbox" id="mAccent"> Accent beat one</label></div>
            <details class="more"><summary>How to practice with a metronome</summary><div class="body"><p>Find the fastest tempo where you can play the passage <b>perfectly three times in a row</b>. That is your real tempo today. Work there, then add 4 bpm.</p><p>If a bar keeps breaking down, halve the tempo and loop just that bar. Slow and even beats fast and lumpy every time.</p></div></details>
          </div>
          <div class="stack">
            <div class="card">
              <span class="eyebrow">MIDI keyboard</span>
              <p class="sub" id="midiStatus"></p>
              <div class="row mt"><button class="btn ghost" id="midiGo">Connect a keyboard</button></div>
              <div class="row mt"><label class="switch"><input type="checkbox" id="midiSound"> Play Woodshed's piano sound for MIDI notes</label></div>
              <p class="sub mt-s">Plug a digital piano into this computer by USB and the drills can check what you actually play. Leave the sound off if your piano already makes its own.</p>
            </div>
            <div class="card">
              <span class="eyebrow">Sound &amp; keys</span>
              <label class="field">Piano<select id="instSel">${A.INSTRUMENTS.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join("")}</select></label>
              <p class="sub mt-s" id="instNote"></p>
              <div class="row mt"><span class="sub">Room</span><div class="seg" id="roomSeg">${A.ROOMS.map(r => `<button data-room="${r[0]}">${r[1]}</button>`).join("")}</div></div>
              <label class="field mt">Volume<input type="range" id="vol" min="0" max="1" step="0.01"></label>
              <div class="row mt"><span class="sub">Key labels</span><div class="seg" id="lblSeg"><button data-l="c">C only</button><button data-l="all">All white keys</button><button data-l="none">None</button></div></div>
              <div class="row mt"><button class="btn ghost small" id="dlAll">Keep every piano offline</button><span class="sub" id="dlNote"></span></div>
              <p class="sub mt">On a computer the home row plays notes: <span class="mono">A S D F G H J K</span> are the white keys from C, <span class="mono">W E T Y U</span> the black keys, <span class="mono">Z</span> / <span class="mono">X</span> shift the octave. On the Piano page the <span class="mono">space bar</span> is the sustain pedal.</p>
            </div>
            <div class="card">
              <span class="eyebrow">Practice record</span>
              <dl class="kv" id="record"></dl>
              <div class="row mt"><button class="btn ghost small" id="resetStats">Reset drill stats</button></div>
            </div>
            <div class="card">
              <span class="eyebrow">About</span>
              <p class="prose">Woodshed runs entirely in your browser and works offline once loaded. Your progress is stored on this device only. The grand piano is the <a href="https://archive.org/details/SalamanderGrandPianoV3" target="_blank" rel="noopener">Salamander Grand</a> by Alexander Holm (CC BY 3.0), a Yamaha C5; the upright is <a href="https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html" target="_blank" rel="noopener">Upright Piano KW</a> from FreePats (CC0), a Kawai. Notation glyphs come from <a href="https://github.com/steinbergmedia/bravura" target="_blank" rel="noopener">Bravura</a> (SIL Open Font License). “Woodshedding” is musician slang for shutting yourself away to practice until it's right.</p>
            </div>
          </div>
        </div>`;
      el.addEventListener("click", e => {
        const m = e.target.closest("[data-m]"); if (m) return metro.setBpm(state.metro.bpm + (+m.getAttribute("data-m")));
        const b = e.target.closest("[data-b]"); if (b) return metro.setBeats(+b.getAttribute("data-b"));
        const l = e.target.closest("[data-l]"); if (l) { state.settings.labels = l.getAttribute("data-l"); App.save(); this.show(); App.toast("Key labels updated"); }
        const r = e.target.closest("[data-room]"); if (r) { state.settings.room = r.getAttribute("data-room"); A.setRoom(state.settings.room); App.save(); this.paintSound(); A.play([48, 60, 64, 67, 72], { strum: 0.05, dur: 0.5, vel: 0.62 }); }
      });
      $("#instSel").addEventListener("change", e => {
        A.init(); A.setInstrument(e.target.value); state.settings.instrument = e.target.value; App.save(); this.paintSound();
        const go = () => A.play([48, 55, 60, 64, 67, 72], { strum: 0.075, dur: 1.9, vel: 0.6 });
        if (A.status(e.target.value).state === "ready") go(); else A.load(e.target.value).then(() => { if (A.instrument() === e.target.value && App.current === "tools") go(); });
      });
      A.onStatus(() => { if (App.current === "tools") this.paintSound(); });
      $("#dlAll").addEventListener("click", () => {
        const ids = A.INSTRUMENTS.filter(i => i.set).map(i => i.id);
        $("#dlNote").textContent = "Downloading…";
        Promise.all(ids.map(id => A.cache(id))).then(bad => { $("#dlNote").textContent = bad.some(n => n) ? "Some sounds didn't download. Try again with a connection." : "Every piano is saved on this device."; });
      });
      $("#mGo").addEventListener("click", () => metro.toggle());
      $("#mTap").addEventListener("click", App.tapTempo);
      $("#mRange").addEventListener("input", e => metro.setBpm(+e.target.value));
      $("#mAccent").addEventListener("change", e => { state.metro.accent = e.target.checked; App.save(); });
      $("#vol").addEventListener("input", e => { state.settings.volume = +e.target.value; A.setVolume(+e.target.value); App.save(); });
      $("#vol").addEventListener("change", () => A.play([60, 64, 67], { dur: 0.8 }));
      $("#midiSound").addEventListener("change", e => { state.settings.midiSound = W.Midi.sound = e.target.checked; App.save(); });
      $("#midiGo").addEventListener("click", () => W.Midi.connect().then(() => this.paintMidi()).catch(err => { $("#midiStatus").textContent = err.message || "MIDI access was refused."; }));
      $("#resetStats").addEventListener("click", e => {
        const b = e.currentTarget;
        if (b.dataset.sure) { state.stats = {}; App.saveNow(); delete b.dataset.sure; b.textContent = "Reset drill stats"; this.show(); App.toast("Drill stats cleared"); }
        else { b.dataset.sure = "1"; b.textContent = "Tap again to confirm"; setTimeout(() => { delete b.dataset.sure; b.textContent = "Reset drill stats"; }, 3000); }
      });
      W.Midi.onChange(() => this.paintMidi());
      this.painted = true;
    },
    paintMetro() {
      const m = state.metro;
      $("#mBpm").textContent = m.bpm; $("#mMark").textContent = App.tempoName(m.bpm); $("#mRange").value = m.bpm;
      const go = $("#mGo"); go.innerHTML = metro.running() ? App.STOP + " Stop" : App.PLAY + " Start"; go.classList.toggle("stop", metro.running());
      const beats = $("#mBeats");
      if (beats.children.length !== m.beats) beats.innerHTML = Array.from({ length: m.beats }, (_, i) => `<span class="beat ${i === 0 ? "first" : ""}"></span>`).join("");
      $$("#mSig button").forEach(b => b.classList.toggle("on", +b.getAttribute("data-b") === m.beats));
      $("#mAccent").checked = m.accent;
    },
    paintSound() {
      const id = A.instrument(), ins = A.INSTRUMENTS.filter(i => i.id === id)[0], st = A.status(id);
      $("#instSel").value = id;
      $("#instNote").textContent = ins.blurb + (ins.set ? " " + (st.state === "ready" ? "Ready, and kept for offline use." : st.state === "loading" ? "Downloading " + Math.round(100 * st.loaded / Math.max(1, st.total)) + "%." : st.state === "error" ? "Couldn't download it just now, so the simple synth fills in." : st.saved ? "Saved on this device." : "It downloads the first time you play.") : "");
      $$("#roomSeg button").forEach(b => b.classList.toggle("on", b.getAttribute("data-room") === A.room()));
    },
    paintMidi() {
      const s = $("#midiStatus");
      if (!W.Midi.supported) { s.textContent = "This browser has no Web MIDI. Chrome or Edge on a computer does; Safari and iPhones do not."; $("#midiGo").disabled = true; return; }
      s.textContent = !W.Midi.access ? "Not connected." : W.Midi.inputs.length ? "Connected: " + W.Midi.inputs.join(", ") : "MIDI is allowed, but no keyboard is plugged in yet.";
    },
    show() {
      this.paintMetro(); this.paintMidi(); this.paintSound();
      $("#vol").value = state.settings.volume; $("#midiSound").checked = !!state.settings.midiSound;
      $$("#lblSeg button").forEach(b => b.classList.toggle("on", b.getAttribute("data-l") === state.settings.labels));
      const days = Object.keys(state.log).filter(k => practiced(state.log[k])).length;
      const total = Object.keys(state.log).reduce((s, k) => s + (state.log[k].sec || 0), 0);
      const answers = Object.keys(state.stats).reduce((s, k) => s + state.stats[k].n, 0);
      $("#record").innerHTML = `<dt>Current streak</dt><dd>${App.streak()} day${App.streak() === 1 ? "" : "s"}</dd><dt>Days practiced</dt><dd>${days}</dd><dt>Time logged</dt><dd>${mins(total)} min</dd><dt>Drill questions answered</dt><dd>${answers}</dd>`;
    }
  };
})();
