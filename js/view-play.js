/* Piano: somewhere to just play. Pick a sound, use the sustain pedal, and Woodshed names what you're holding and
   writes it on the grand staff. Record a take and hear it back. Or learn a tune: Woodshed lights the next note of the
   melody, waits for you to find it, and plays the chords underneath as you go. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  // Octaves shown for each key size, by the keyboard's width: a phone gets 1, 2 or 3; a laptop 3, 5 or 7.
  const ZOOM = {
    l: w => w < 700 ? 1 : w < 1000 ? 2 : 3,
    m: w => w < 500 ? 2 : w < 700 ? 3 : w < 900 ? 4 : 5,
    s: w => w < 500 ? 3 : w < 700 ? 4 : w < 900 ? 5 : 7
  };
  const COMPOUND = { 13: "Minor 9th", 14: "Major 9th", 15: "Minor 10th", 16: "Major 10th", 17: "Perfect 11th", 18: "Augmented 11th", 19: "Perfect 12th", 20: "Minor 13th", 21: "Major 13th", 22: "Minor 14th", 23: "Major 14th", 24: "Two octaves" };
  const BLACK = [1, 3, 6, 8, 10];
  let kb = null, ringTimer = 0, demoWanted = null, pedalPress = null, learn = null, listen = null;
  const ringing = new Map();                              // midi -> when it stops counting as still ringing (pedal)
  const rec = { on: false, t0: 0, events: [], play: null, tick: 0 };
  const P = () => state.play;
  const mutedNote = () => A.muted() ? ' <span class="error">Sound is muted (quiet mode). Tap the speaker at the top to hear it.</span>' : "";
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
  const clock = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  /* ---------- what's sounding, named ---------- */
  function sounding() {
    const now = performance.now(), held = kb ? kb.held() : [];
    ringing.forEach((until, m) => { if (until <= now) ringing.delete(m); });
    return uniq(held.concat(Array.from(ringing.keys()))).sort((a, b) => a - b);
  }
  function describe(ms) {
    if (ms.length === 1) {
      const p = T.spellIn(ms[0], null), pc = T.mod(ms[0], 12);
      return { big: T.pitchName(p), sub: ms[0] === 60 ? "Middle C" : BLACK.indexOf(pc) >= 0 ? "Also written " + T.name(T.enharmonic(p)) : "", pitches: [p] };
    }
    const pcs = uniq(ms.map(m => T.mod(m, 12)));
    if (pcs.length === 1) {
      const n = Math.round((ms[ms.length - 1] - ms[0]) / 12);
      return { big: n === 1 ? "Octave" : n + " octaves", sub: "The same note, " + T.name(T.spellIn(ms[0], null)) + ", in " + ms.length + " places", pitches: ms.map(m => T.spellIn(m, null)) };
    }
    if (ms.length === 2) {
      const semis = ms[1] - ms[0], a = T.spellIn(ms[0], null), b = T.spellIn(ms[1], null);
      const name = semis <= 12 ? T.INTERVAL_NAMES[semis] : COMPOUND[semis] || T.INTERVAL_NAMES[semis % 12] + " plus " + Math.floor(semis / 12) + " octaves";
      return { big: name, sub: T.pitchName(a) + " up to " + T.pitchName(b) + ", " + semis + " half step" + (semis === 1 ? "" : "s"), pitches: [a, b], small: true };
    }
    const hits = T.identify(ms);
    if (!hits.length && pcs.length === 2) {
      const semis = T.mod(pcs[1] - pcs[0], 12);
      return { big: T.INTERVAL_NAMES[semis], sub: T.name(T.spellIn(ms[0], null)) + " and " + T.name(T.spellIn(pcs[1], null)) + ", with doublings", pitches: ms.map(m => T.spellIn(m, null)), small: true };
    }
    if (!hits.length) return { big: "?", sub: "No chord name for these. It may be a cluster, or a chord missing a note.", pitches: ms.map(m => T.spellIn(m, null)), none: true };
    const ch = hits[0], names = ch.notes.concat(ch.bass ? [ch.bass] : []);
    return { big: ch.symbol, sub: ch.spoken, chord: ch, also: hits.slice(1, 3), pitches: ms.map(m => T.spellIn(m, names)) };
  }
  function paintNow() {
    const box = $("#pNow"); if (!box) return;
    const ms = sounding();
    box.classList.toggle("idle", !ms.length);
    if (!ms.length) return;                                // keep the last reading, dimmed, to look at
    const d = describe(ms);
    $("#pName").innerHTML = esc(d.big);
    $("#pName").className = "now-name" + (d.small ? " small" : "") + (d.none ? " none" : "");
    $("#pSub").textContent = d.sub;
    $("#pNotes").textContent = d.pitches.map(p => T.name(p)).join("  ");
    $("#pAlso").innerHTML = d.chord ? (d.also.length ? "Also reads as " + d.also.map(h => "<b>" + esc(h.symbol) + "</b>").join(", ") + ". " : "") + `<a href="#/chords?ch=${encodeURIComponent(d.chord.ascii)}">Explore ${esc(d.chord.symbol)}</a>` : "";
    App.paper($("#pStaff"), w => W.Staff.render($("#pStaff"), { clef: "grand", width: Math.min(w, 250), space: 8.5, items: [{ pitches: d.pitches }], aria: d.big }));
  }
  function ringFor(m) { return 1400 + Math.max(0, 72 - m) * 55; }   // how long a pedalled note keeps counting

  /* ---------- sounds ---------- */
  function statusText(ins) {
    if (!ins.set) return "Built in, nothing to download.";
    const st = A.status(ins.id);
    if (st.state === "ready") return st.failed ? "Ready (a few notes borrowed from their neighbours)." : "Ready, and kept for offline use.";
    if (st.state === "loading") return "Downloading " + Math.round(100 * st.loaded / Math.max(1, st.total)) + "%…";
    if (st.state === "error") return "Couldn't download it just now; the synth fills in until it can.";
    return st.saved ? "Saved on this device." : "A " + A.SIZES[ins.set] + " download the first time, then it works offline.";
  }
  function paintSounds() {
    const cur = A.instrument();
    const row = $("#pSounds");
    row.innerHTML = A.FAMILIES.map(fam => `<span class="sound-fam">${esc(fam[1])}</span>` + A.INSTRUMENTS.filter(i => i.family === fam[0]).map(ins => `<button type="button" class="sound ${ins.id === cur ? "on" : ""}" data-inst="${ins.id}" role="radio" aria-checked="${ins.id === cur}"><i class="st ${ins.set ? A.status(ins.id).state : "ready"}" data-st="${ins.id}" aria-hidden="true"></i>${esc(ins.name)}</button>`).join("")).join("");
    // keep the chosen sound in sight on a phone, where the row scrolls sideways
    const on = row.querySelector(".sound.on");
    if (on && (on.offsetLeft < row.scrollLeft || on.offsetLeft + on.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = on.offsetLeft - 24;
    paintBlurb();
  }
  function paintBlurb() {
    const ins = A.INSTRUMENTS.filter(i => i.id === A.instrument())[0], el = $("#pBlurb");
    if (el && ins) el.innerHTML = esc(ins.blurb) + ' <span class="' + (ins.set ? A.status(ins.id).state : "ready") + '">' + esc(statusText(ins)) + "</span>" + mutedNote();
  }
  function choose(id) {
    A.init(); A.setInstrument(id); state.settings.instrument = id; App.save(); paintSounds();
    if (A.status(id).state === "ready") demo(); else demoWanted = id;
  }
  function demo() { if (!learn) A.play([48, 55, 60, 64, 67, 72], { strum: 0.075, dur: 1.9, vel: 0.6 }); }

  /* ---------- the pedal ---------- */
  function paintPedal(down) {
    const b = $("#pPedal"); if (!b) return;
    b.classList.toggle("on", down); b.setAttribute("aria-pressed", String(down));
    $("#pPedalState").textContent = down ? "Down: notes ring on" : "Up";
  }

  /* ---------- recording ---------- */
  function recEvent(type, midi, vel) {
    if (!rec.on) return;
    const now = performance.now();
    if (!rec.t0) { if (type !== "on") return; rec.t0 = now; if (A.pedalDown()) rec.events.push([0, "pd"]); }
    rec.events.push(type === "on" ? [Math.round(now - rec.t0), "on", midi, +vel.toFixed(2)] : [Math.round(now - rec.t0), type, midi]);
  }
  function recToggle() {
    if (rec.play) stopTake();
    if (!rec.on) {
      rec.on = true; rec.t0 = 0; rec.events = [];
      rec.tick = setInterval(paintRec, 250);
    } else {
      rec.on = false; clearInterval(rec.tick);
      if (rec.events.some(e => e[1] === "on")) {
        if (A.pedalDown()) rec.events.push([Math.round(performance.now() - rec.t0), "pu"]);
        P().take = { events: rec.events, at: Date.now() }; App.save();
        App.toast("Take saved. Press Play back to hear it");
      }
    }
    paintRec();
  }
  // Turn key and pedal events into notes with real lengths: a key let go with the pedal down rings until it lifts.
  function takeNotes(events) {
    const notes = [], open = {}, held = new Map(); let ped = false, last = 0;
    const end = (n, at) => { n.off = Math.max(at, n.on + 40); notes.push(n); };
    events.forEach(e => {
      const ms = e[0], type = e[1], m = e[2]; last = Math.max(last, ms);
      if (type === "on") { if (open[m]) end(open[m], ms); if (held.has(m)) { end(held.get(m), ms); held.delete(m); } open[m] = { m: m, v: e[3] || 0.7, on: ms }; }
      else if (type === "off") { const n = open[m]; if (!n) return; delete open[m]; if (ped) held.set(m, n); else end(n, ms); }
      else if (type === "pd") ped = true;
      else if (type === "pu") { ped = false; held.forEach(n => end(n, ms)); held.clear(); }
    });
    Object.keys(open).forEach(k => end(open[k], last + 400)); held.forEach(n => end(n, last + 400));
    return notes.sort((a, b) => a.on - b.on);
  }
  function playTake() {
    const take = P().take; if (!take || !A.init()) return;
    if (rec.play) return stopTake();
    const notes = takeNotes(take.events), t0 = A.now() + 0.15, total = notes.reduce((m, n) => Math.max(m, n.off), 0);
    let i = 0;
    const pump = () => { const horizon = A.now() + 0.5; while (i < notes.length && t0 + notes[i].on / 1000 < horizon) { const n = notes[i++]; A.playNote(n.m, n.v, t0 + n.on / 1000, (n.off - n.on) / 1000); } };
    rec.play = { timer: setInterval(pump, 100), end: setTimeout(stopTake, total + 1200), t0: performance.now(), total: total };
    pump(); paintRec();
    clearInterval(rec.tick); rec.tick = setInterval(paintRec, 250);
  }
  function stopTake() {
    if (!rec.play) return;
    clearInterval(rec.play.timer); clearTimeout(rec.play.end); rec.play = null; clearInterval(rec.tick);
    A.allOff(); paintRec();
  }
  function paintRec() {
    const r = $("#pRec"), p = $("#pPlayTake"), info = $("#pRecInfo"); if (!r) return;
    const take = P().take, notes = take ? take.events.filter(e => e[1] === "on").length : 0;
    r.classList.toggle("live", rec.on);
    r.innerHTML = rec.on ? App.STOP + " Stop recording" : '<i class="rec-dot" aria-hidden="true"></i> Record';
    p.disabled = !take || rec.on;
    p.innerHTML = rec.play ? App.STOP + " Stop" : App.PLAY + " Play back";
    if (rec.on) info.textContent = rec.t0 ? "Recording " + clock((performance.now() - rec.t0) / 1000) + " · " + rec.events.filter(e => e[1] === "on").length + " notes" : "Recording starts with your first note";
    else if (rec.play) info.textContent = "Playing " + clock((performance.now() - rec.play.t0) / 1000) + " / " + clock(rec.play.total / 1000);
    else if (take) { const sec = take.events[take.events.length - 1][0] / 1000; info.textContent = "Last take: " + (sec < 10 ? sec.toFixed(1) + " s" : clock(sec)) + ", " + notes + " note" + (notes === 1 ? "" : "s"); }
    else info.textContent = "";
  }

  /* ---------- learn a melody ---------- */
  function tune(id) { return W.Songs.byId(id) || W.SONGS[0]; }
  function prep(song) {
    const bars = W.Sheet.parseSong(song), notes = [], chords = [];
    let at = 0;
    bars.forEach((b, bi) => {
      let t = 0;
      b.notes.forEach((n, ni) => { if (n.p) notes.push({ p: n.p, midi: n.p.midi, bar: bi, ni: ni, beat: at + t }); t += n.d; });
      b.slots.forEach(s => { if (s.chord) chords.push({ ch: s.chord, beat: at + s.beat, beats: s.beats }); });
      at += b.beats;
    });
    // each chord sounds when you reach the first melody note inside it
    chords.forEach(c => { const n = notes.filter(x => x.beat >= c.beat - 1e-6)[0]; if (n && !n.chord) n.chord = c; });
    const key = T.parseKey(song.key || "C") || T.parseKey("C");
    return { song: song, bars: bars, notes: notes, chords: chords, key: key, pos: 0, clean: 0, misses: 0, missed: false, t0: 0 };
  }
  // Left hand under the tune: a bass note, then the chord close together below middle C.
  function accompany(ch) {
    const ps = T.chordPitches(ch, 3, 0), root = 45 + T.mod(ch.root.pc - 45, 12);
    const upper = ps.slice(0, 4).map(p => p.midi - ps[0].midi + root);
    const bassPc = (ch.bass || ch.root).pc, bass = 33 + T.mod(bassPc - 33, 12);
    return [bass].concat(upper);
  }
  // Two lines of the tune at a time (the one you're on and the next), so the music sits right above the keys.
  function paintSheet(L, nowIdx) {
    const box = $("#pLSheet"); if (!box) return;
    const curBar = nowIdx != null && L.notes[Math.min(nowIdx, L.notes.length - 1)] ? L.notes[Math.min(nowIdx, L.notes.length - 1)].bar : 0;
    const lit = {}; if (nowIdx != null && L.notes[nowIdx]) lit[L.notes[nowIdx].bar + ":" + L.notes[nowIdx].ni] = "now";
    const doneTo = nowIdx == null ? -1 : nowIdx;
    const doneSet = {}; L.notes.slice(0, Math.max(0, doneTo)).forEach(n => { doneSet[n.bar + ":" + n.ni] = true; });
    const song = { sig: L.key.sig, time: L.song.time, bars: L.bars.map((b, bi) => ({
      beats: b.beats,
      notes: b.notes.map((n, ni) => ({ p: n.p, d: n.d, cls: lit[bi + ":" + ni] || (doneSet[bi + ":" + ni] ? "done" : "") })),
      chords: b.slots.filter(s => s.chord).map(s => ({ beat: s.beat, text: s.chord.symbol, i: -1 }))
    })) };
    App.paper(box, w => {
      const per = w > 900 ? 4 : w > 560 ? 3 : 2, pickup = song.bars.length && song.bars[0].beats < song.time[0] ? 1 : 0, starts = [0];
      for (let b = per + pickup; b < song.bars.length; b += per) starts.push(b);
      let line = 0; starts.forEach((b, i) => { if (curBar >= b) line = i; });
      const from = starts[line], to = starts[line + 2] || song.bars.length;
      W.Staff.leadSheet(box, { sig: song.sig, time: song.time, bars: song.bars.slice(from, to) }, { width: w, space: w < 480 ? 7.5 : 8.5, perLine: per, noTime: from > 0 });
      $("#pLWhere").textContent = song.bars.length > to - from ? "Bars " + (from + 1 - (from ? pickup : 0)) + "–" + (to - pickup) + " of " + (song.bars.length - pickup) : "";
    });
  }
  function paintLearn() {
    const song = tune(P().song), best = (P().best || {})[song.id];
    const opt = s => `<option value="${esc(s.id)}" ${s.id === song.id ? "selected" : ""}>${esc(s.title)}</option>`, mineS = W.Songs.mine();
    $("#pSong").innerHTML = (mineS.length ? `<optgroup label="My songs">${mineS.map(opt).join("")}</optgroup><optgroup label="Built in">` : "") + W.SONGS.map(opt).join("") + (mineS.length ? "</optgroup>" : "");
    $("#pLGo").innerHTML = learn ? App.STOP + " Stop" : App.PLAY + " Start";
    $("#pLGo").classList.toggle("stop", !!learn);
    $("#pLListen").innerHTML = listen ? App.STOP + " Stop listening" : "Listen first";
    $("#pLListen").disabled = !!learn;
    $("#pSong").disabled = !!learn || !!listen;
    if (!learn && !listen) {
      paintSheet(prep(song), null);
      $("#pLMsg").textContent = best != null ? "Your best: " + best + "% right first time" : "";
    }
  }
  function learnStart() {
    stopListen(); stopTake();
    learn = prep(tune(P().song)); learn.t0 = performance.now(); A.init();
    paintLearn(); next();
    $("#pCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function learnStop() { learn = null; if (kb) kb.mark([], false); paintLearn(); }
  function next() {
    const n = learn.notes[learn.pos];
    if (!n) return finish();
    const ahead = learn.notes.slice(learn.pos, learn.pos + 4).map(x => x.midi);
    kb.reveal(ahead);
    kb.mark([{ midi: n.midi, cls: "next", label: T.name(n.p) }], false);
    paintSheet(learn, learn.pos);
    $("#pLMsg").textContent = "Note " + (learn.pos + 1) + " of " + learn.notes.length + (learn.misses ? " · " + learn.misses + " miss" + (learn.misses > 1 ? "es" : "") : "");
  }
  function attempt(midi) {
    const n = learn.notes[learn.pos]; if (!n) return;
    if (midi === n.midi) {
      if (!learn.missed) learn.clean++;
      learn.missed = false;
      if (n.chord) { learn.prevChord = n.chord; A.play(accompany(n.chord.ch), { dur: Math.min(3.2, Math.max(1.1, n.chord.beats * 60 / (learn.song.tempo || 96) * 1.3)), vel: 0.42, strum: 0.012 }); }
      learn.pos++;
      next();
    } else {
      learn.misses++; learn.missed = true;
      flash(midi);
      const same = T.mod(midi, 12) === T.mod(n.midi, 12);
      $("#pLMsg").textContent = same ? "Right note, wrong octave: " + T.pitchName(n.p) + " is the lit key." : "That was " + T.midiName(midi) + ". Look for " + T.pitchName(n.p) + ", the lit key.";
    }
  }
  function flash(midi) { const k = kb && kb.keys[midi]; if (!k) return; k.classList.remove("wrong"); void k.offsetWidth; k.classList.add("wrong"); setTimeout(() => k.classList.remove("wrong"), 450); }
  function finish() {
    const L = learn, total = L.notes.length, pct = Math.round(100 * L.clean / total), secs = (performance.now() - L.t0) / 1000;
    const best = P().best = P().best || {}, prev = best[L.song.id];
    best[L.song.id] = Math.max(prev || 0, pct);
    App.record("learn", L.song.id, pct >= 90, 0);
    learn = null; kb.mark([], false);
    const tonic = L.key.tonic, triad = T.chordPitches(T.chordFrom(tonic, L.key.mode === "minor" ? "m" : "maj"), 4, 0).map(p => p.midi);
    setTimeout(() => A.play(triad, { strum: 0.06, dur: 1.6, vel: 0.5 }), 250);
    paintLearn();
    paintSheet(L, total);
    $("#pLMsg").innerHTML = `<b>${pct === 100 ? "Clean run!" : pct >= 90 ? "Nicely done." : "Made it."}</b> ${L.clean} of ${total} notes right first time (${pct}%), ${clock(secs)}.` + (prev != null && pct > prev ? " A new best." : "");
  }
  function startListen() {
    if (listen) return stopListen();
    stopTake();
    const L = prep(tune(P().song)); if (!A.init()) return;
    const spb = 60 / (L.song.tempo || 96), t0 = A.now() + 0.2, events = [];
    L.notes.forEach((n, k) => { const nx = L.notes[k + 1], len = (nx ? nx.beat - n.beat : 1) * spb; events.push({ t: n.beat * spb, run: () => { A.playNote(n.midi, 0.74, t0 + n.beat * spb, Math.min(len * 0.95, 2.5)); }, k: k }); });
    L.chords.forEach(c => events.push({ t: c.beat * spb, run: () => { A.play(accompany(c.ch), { when: t0 + c.beat * spb, dur: c.beats * spb * 0.97, vel: 0.42, strum: 0.01 }); } }));
    events.sort((a, b) => a.t - b.t);
    const end = L.notes.length ? (L.notes[L.notes.length - 1].beat + 2) * spb : 0;
    let i = 0;
    listen = { L: L, timers: [], pump: setInterval(() => { const h = A.now() + 0.5; while (i < events.length && t0 + events[i].t < h) { const e = events[i++]; e.run(); if (e.k != null) listen.timers.push(setTimeout(() => paintSheet(L, e.k), Math.max(0, (t0 + e.t - A.now()) * 1000))); } }, 100) };
    listen.timers.push(setTimeout(stopListen, (t0 - A.now() + end) * 1000 + 300));
    paintLearn();
  }
  function stopListen() {
    if (!listen) return;
    clearInterval(listen.pump); listen.timers.forEach(clearTimeout); listen = null;
    A.allOff(); paintLearn();
  }

  /* ---------- the view ---------- */
  const view = W.views.piano = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Piano</h1><p>Pick a sound and play. Woodshed names every chord as you play it.</p></div>
        <div class="sounds" id="pSounds" role="radiogroup" aria-label="Choose a sound"></div>
        <p class="sub sound-blurb" id="pBlurb"></p>
        <div class="card mt play-card" id="pCard">
          <div class="row between"><div class="seg" id="pMode"><button data-mode="free">Free play</button><button data-mode="learn">Learn a melody</button></div><span class="sub mono" id="pLWhere"></span></div>
          <div class="now-row mt" id="pFree">
            <div class="now idle" id="pNow" aria-live="polite">
              <span class="eyebrow">You're playing</span>
              <div class="now-name" id="pName"><span class="ph">Play something</span></div>
              <div class="spoken" id="pSub">Chords, intervals and single notes, named as you play them.</div>
              <p class="note-txt mt-s" id="pNotes"></p>
              <p class="sub mt-s" id="pAlso"></p>
            </div>
            <div class="paper now-staff" id="pStaff"></div>
          </div>
          <div class="mt" id="pLearn" hidden>
            <div class="row between"><select id="pSong" aria-label="Choose a tune"></select><div class="row gap-s"><button type="button" class="btn small" id="pLGo"></button><button type="button" class="btn ghost small" id="pLListen"></button></div></div>
            <div class="paper mt-s" id="pLSheet"></div>
            <p class="sub mt-s learn-msg" id="pLMsg" aria-live="polite"></p>
          </div>
          <div class="kb big mt" id="pKb"></div>
          <div class="deck mt">
            <button type="button" class="pedal" id="pPedal" aria-pressed="false" title="Sustain pedal: tap to latch, hold for a moment">
              <svg viewBox="0 0 40 24" aria-hidden="true"><path d="M4 17c0-2.8 3.4-5 8.5-5.6L33 9c1.8-.2 3 .9 3 2.4v3.2c0 1.5-1.2 2.6-3 2.4l-20.5-2.4C8.6 14.2 6 15 6 17z"/><circle cx="7" cy="17" r="3"/></svg>
              <span><b>Sustain pedal</b><small id="pPedalState">Up</small></span>
            </button>
            <div class="deck-tools">
              <div class="seg" id="pZoom" aria-label="Key size"><button data-zoom="l">Big keys</button><button data-zoom="m">Medium</button><button data-zoom="s">More keys</button></div>
              <div class="seg" id="pLabels" aria-label="Key labels"><button data-l="c">C only</button><button data-l="all">Letters</button><button data-l="none">None</button></div>
            </div>
          </div>
          <div class="row mt rec-row" id="pRecRow">
            <button type="button" class="btn ghost small" id="pRec"></button>
            <button type="button" class="btn ghost small" id="pPlayTake"></button>
            <span class="sub mono" id="pRecInfo"></span>
          </div>
          <details class="more"><summary>Playing from a computer or a MIDI keyboard</summary><div class="body">
            <p>The home row plays: <span class="mono">A S D F G H J K L ;</span> are white keys from C, <span class="mono">W E T Y U O P</span> the black keys. <span class="mono">Z</span> and <span class="mono">X</span> move an octave, and the <b>space bar</b> is the sustain pedal while you hold it.</p>
            <p>On the on-screen pedal, a quick tap latches it down until you tap again; hold it and it lifts when you let go. Strike a key near its front edge for a louder note.</p>
            <p>A digital piano plugged in by USB plays here too (Chrome or Edge on a computer; connect it in Tools). Its sustain pedal works as well.</p>
            <p><b>Learn a melody</b> lights the next note of the tune on the keys and waits for you. Get it right and Woodshed plays the chords underneath, so you hear the harmony your right hand is singing over.</p>
          </div></details>
        </div>
        </div>`;

      kb = new W.Keyboard($("#pKb"), {
        from: 21, to: 108, center: 60, octaves: ZOOM[P().zoom] || ZOOM.m, labels: state.settings.labels, pedal: true,
        onDown: (m, v) => {
          ringing.delete(m); recEvent("on", m, v == null ? 0.7 : v); paintNow();
          if (learn) attempt(m);
        },
        onUp: m => {
          if (A.pedalDown()) ringing.set(m, performance.now() + ringFor(m));
          recEvent("off", m); paintNow();
          clearTimeout(ringTimer); ringTimer = setTimeout(paintNow, 1500);
        }
      });

      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("[data-inst]"))) choose(b.getAttribute("data-inst"));
        else if ((b = e.target.closest("[data-mode]"))) { if (learn) learnStop(); stopListen(); P().mode = b.getAttribute("data-mode"); App.save(); this.paintMode(); }
        else if ((b = e.target.closest("[data-zoom]"))) { P().zoom = b.getAttribute("data-zoom"); App.save(); kb.moved = false; kb.setOctaves(ZOOM[P().zoom]); this.paintTools(); }
        else if ((b = e.target.closest("#pLabels [data-l]"))) { state.settings.labels = b.getAttribute("data-l"); App.save(); kb.o.labels = state.settings.labels; kb.paint(); this.paintTools(); }
        else if (e.target.closest("#pRec")) recToggle();
        else if (e.target.closest("#pPlayTake")) playTake();
        else if (e.target.closest("#pLGo")) { if (learn) learnStop(); else learnStart(); }
        else if (e.target.closest("#pLListen")) startListen();
      });
      $("#pSong").addEventListener("change", e => { P().song = e.target.value; App.save(); paintLearn(); });

      // The pedal: a quick tap latches it, a longer press is momentary.
      const pb = $("#pPedal");
      pb.addEventListener("pointerdown", e => {
        if (e.button) return;
        e.preventDefault(); A.init();
        pedalPress = { t0: performance.now(), wasDown: A.pedalDown() };
        if (!pedalPress.wasDown) A.pedal(true);
        try { pb.setPointerCapture(e.pointerId); } catch (x) {}
      });
      const lift = () => { if (!pedalPress) return; if (pedalPress.wasDown || performance.now() - pedalPress.t0 > 450) A.pedal(false); pedalPress = null; };
      pb.addEventListener("pointerup", lift);
      pb.addEventListener("pointercancel", lift);
      pb.addEventListener("click", e => { if (e.detail === 0) A.pedal(!A.pedalDown()); });   // Enter / space on the focused button
      A.onPedal(down => { paintPedal(down); recEvent(down ? "pd" : "pu"); if (!down) { ringing.clear(); paintNow(); } });

      A.onStatus((id, st) => {
        const dot = document.querySelector('#pSounds [data-st="' + id + '"]');
        if (dot) dot.className = "st " + st.state;
        if (id === A.instrument()) paintBlurb();
        if (st.state === "ready" && demoWanted === id && A.instrument() === id) { demoWanted = null; if (App.current === "piano") demo(); }
      });
      this.paintTools();
    },
    paintMode() {
      const m = P().mode === "learn" ? "learn" : "free";
      $$("#pMode button").forEach(b => b.classList.toggle("on", b.getAttribute("data-mode") === m));
      $("#pFree").hidden = m !== "free"; $("#pLearn").hidden = m !== "learn"; $("#pRecRow").hidden = m !== "free";
      if (m === "learn") paintLearn(); else { $("#pLWhere").textContent = ""; paintNow(); }
    },
    paintTools() {
      $$("#pZoom button").forEach(b => b.classList.toggle("on", b.getAttribute("data-zoom") === (P().zoom || "m")));
      $$("#pLabels button").forEach(b => b.classList.toggle("on", b.getAttribute("data-l") === state.settings.labels));
    },
    show(params) {
      W.activeKeyboard = kb;
      kb.o.labels = state.settings.labels; kb.layout(true);
      paintSounds(); paintPedal(A.pedalDown()); paintRec(); this.paintTools();
      if (params.learn && W.Songs.byId(params.learn)) { P().song = params.learn; P().mode = "learn"; App.save(); history.replaceState(null, "", "#/piano"); if (learn) learnStop(); }
      this.paintMode();
      if (P().mode === "learn") setTimeout(() => $("#pCard").scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    },
    hide() {
      // leave nothing latched or running behind
      if (rec.on) recToggle();
      stopTake(); stopListen(); if (learn) learnStop();
      A.pedal(false); ringing.clear();
      if (kb) kb.liftAll();
    }
  };
})();
