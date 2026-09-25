/* Lead sheets: a melody line with chord symbols above it. This view decodes the symbols, shows a playable voicing for
   each one, and plays the chart so you can practice either hand against the other. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  let doc = null, sel = 0, kb = null, clock = null, editing = false;

  /* ---------- library ---------- */
  const userCharts = () => state.charts;
  function find(id) {
    return W.Songs.byId(id) || W.CHARTS.filter(c => c.id === id)[0] || userCharts().filter(c => c.id === id)[0] || null;
  }
  const Sheet = W.Sheet = {
    titleOf: id => { const s = find(id); return s ? s.title : null; },
    // Bars of a built-in tune with its melody parsed: [{beats, notes: [{p, d}], slots: [{beat, beats, text, chord}]}]
    parseSong: song => parseSongBars(song),
    // A song with a melody (from Clef, or pasted in). Saves it and shows it.
    openSong(song) {
      const rec = W.Songs.save(song);
      state.sheet.id = rec.id; App.saveNow();
      if (App.current === "sheet") view.show({}); else App.go("sheet");
      return rec;
    },
    // Used by the tutor after a scan, and by the Keys view.
    open(chart) {
      const id = chart.id || "c" + Date.now().toString(36);
      const rec = { id: id, title: chart.title || "Untitled", text: chart.text || "| C |", time: chart.time || [4, 4], tempo: chart.tempo || 92, key: chart.key || "", mine: true };
      const i = userCharts().findIndex(c => c.id === id);
      if (i >= 0) userCharts()[i] = rec; else userCharts().unshift(rec);
      state.sheet.id = id; App.saveNow();
      if (App.current === "sheet") view.show({}); else App.go("sheet");
    }
  };

  /* ---------- parsing ---------- */
  function splitBeats(n, total) { const base = Math.floor(total / n), extra = total - base * n; return Array.from({ length: n }, (_, i) => n > total ? total / n : base + (i < extra ? 1 : 0)); }
  function parseChartText(text, beatsPerBar) {
    const bars = [];
    String(text || "").split(/\n/).forEach(line => line.split("|").forEach(cell => {
      const tokens = cell.trim().split(/\s+/).filter(Boolean);
      if (!tokens.length) return;
      if (tokens.length === 1 && (tokens[0] === "%" || tokens[0] === "𝄎")) {
        const prev = bars[bars.length - 1];
        bars.push({ beats: beatsPerBar, notes: [], slots: prev ? prev.slots.map(s => Object.assign({}, s, { rep: true })) : [] });
        return;
      }
      const lens = splitBeats(tokens.length, beatsPerBar), slots = []; let at = 0;
      tokens.forEach((tk, i) => {
        if ((tk === "." || tk === "/" || tk === "-") && slots.length) slots[slots.length - 1].beats += lens[i];
        else if (/^n\.?c\.?$/i.test(tk)) slots.push({ beat: at, beats: lens[i], text: "N.C.", chord: null, nc: true });
        else { const ch = T.parseChord(tk); slots.push({ beat: at, beats: lens[i], text: tk, chord: ch, err: !ch }); }
        at += lens[i];
      });
      bars.push({ beats: beatsPerBar, notes: [], slots: slots });
    }));
    return bars;
  }
  function parseSongBars(song) {
    const full = W.Songs.beatsPerBar(song);
    return song.bars.map(b => {
      const beats = b.beats || full;
      const notes = b.n.split(/\s+/).filter(Boolean).map(tok => { const m = tok.split(":"), d = m[1] ? parseFloat(m[1]) : 1; return { p: m[0] === "r" ? null : T.parsePitch(m[0].split("+")[0]), d: d }; });
      const toks = (b.c || "").split(/\s+/).filter(Boolean).map(tk => { const m = tk.split("@"); return { text: m[0], beat: m[1] ? parseFloat(m[1]) : 0 }; });
      const slots = toks.map((t, i) => ({ beat: t.beat, beats: (toks[i + 1] ? toks[i + 1].beat : beats) - t.beat, text: t.text, chord: /^n\.?c\.?$/i.test(t.text) ? null : T.parseChord(t.text), nc: /^n\.?c\.?$/i.test(t.text) }));
      const lh = b.l ? b.l.split(/\s+/).filter(Boolean).map(tok => { const m = tok.split(":"), d = m[1] ? parseFloat(m[1]) : 1; return { ps: m[0] === "r" ? [] : m[0].split("+").map(x => T.parsePitch(x)).filter(Boolean), d: d }; }) : null;
      return { beats: beats, notes: notes, slots: slots, lh: lh, lyric: b.w || "" };
    });
  }

  function build() {
    const src = find(state.sheet.id) || W.SONGS[0];
    state.sheet.id = src.id;
    const melody = !!src.bars, time = src.time || [4, 4], full = melody ? W.Songs.beatsPerBar(src) : time[0];
    const semis = state.sheet.transpose[src.id] || 0, level = state.sheet.simplify;
    let bars = melody ? parseSongBars(src) : parseChartText(src.text, time[0]);

    // key: written on the song, chosen by hand, or worked out from the chords
    const written = bars.reduce((a, b) => a.concat(b.slots.filter(s => s.chord && !s.rep).map(s => s.chord)), []);
    let key0 = (state.sheet.keys && state.sheet.keys[src.id] && T.parseKey(state.sheet.keys[src.id])) || (src.key && T.parseKey(src.key)) || T.detectKey(written) || T.parseKey("C");
    let key = key0;
    if (semis) { key = T.key(T.pcNote(key0.tonic.pc + semis), key0.mode); if (!key.valid) key = T.key(T.enharmonic(key.tonic), key0.mode); }
    const pref = T.prefFor(key) || (key.tonic.a < 0 ? "flat" : undefined);

    const events = []; let start = 0;
    bars.forEach((bar, bi) => {
      bar.start = start;
      bar.slots.forEach(s => {
        if (s.chord) {
          s.written = semis ? T.transposeChord(s.chord, semis, pref) : s.chord;
          s.play = level === "none" ? s.written : (T.simplifyChord(s.written, level) || s.written);
          s.i = events.length;
          events.push({ i: s.i, bar: bi, slot: s, chord: s.play, written: s.written, start: start + s.beat, beats: s.beats });
        }
      });
      if (semis) { bar.notes.forEach(n => { if (n.p) n.p = T.transposePitch(n.p, key0.tonic, key.tonic, semis); }); (bar.lh || []).forEach(n => { n.ps = n.ps.map(p => T.transposePitch(p, key0.tonic, key.tonic, semis)); }); }
      start += bar.beats;
    });
    // keep a transposed melody in a comfortable octave
    if (semis && melody) { const all = bars.reduce((a, b) => a.concat(b.notes.filter(n => n.p).map(n => n.p.midi)), []); const mid = (Math.min.apply(null, all) + Math.max.apply(null, all)) / 2; const shift = mid > 74 ? -12 : mid < 60 ? 12 : 0; if (shift) bars.forEach(b => b.notes.forEach(n => { if (n.p) n.p = T.spellMidi(n.p.midi + shift, n.p); })); }

    doc = { src: src, id: src.id, title: src.title, by: src.by || "", about: src.about || "", notes: src.notes || "", melody: melody, mine: !!src.mine, lh: melody && bars.some(b => b.lh && b.lh.length), time: time, full: full, bars: bars, events: events, total: start, key: key, key0: key0, semis: semis,
      tempo: (state.sheet.tempo && state.sheet.tempo[src.id]) || src.tempo || 92, pickup: bars.length && bars[0].beats < time[0] ? bars[0].beats : 0 };
    revoice();
    if (sel >= events.length) sel = 0;
  }
  function revoice() { let prev = null; doc.events.forEach(ev => { ev.voice = T.voice(ev.chord, state.sheet.voicing, prev); prev = ev.voice; }); }

  /* ---------- playback ---------- */
  function stop() { if (clock) { clock.stop(); clock = null; } A.allOff(); paintTransport(); $$("#v-sheet .bar.now, #v-sheet .barbg.now").forEach(x => x.classList.remove("now")); }
  function play() {
    if (!A.init()) return;
    const s = state.sheet, full = doc.full, countIn = doc.pickup ? full + (full - doc.pickup) : full;
    const mel = [], lh = []; doc.bars.forEach(b => { let t = b.start; b.notes.forEach(n => { if (n.p) mel.push({ start: t, d: n.d, midi: n.p.midi }); t += n.d; }); let tl = b.start; (b.lh || []).forEach(n => { if (n.ps.length) lh.push({ start: tl, d: n.d, midis: n.ps.map(p => p.midi) }); tl += n.d; }); });
    clock = new A.Clock({
      bpm: doc.tempo, beatsPerBar: full,
      onBeat: (i, time) => {
        const spb = 60 / clock.job.bpm;
        if (i < countIn) { A.click(time, (doc.pickup ? i : i) % full === 0, false); return; }
        let g = i - countIn;
        if (g >= doc.total) { if (!s.loop) return false; g = g % doc.total; }
        const bar = doc.bars.filter(b => g >= b.start && g < b.start + b.beats)[0];
        if (s.click) A.click(time, bar && g === bar.start, true);
        if (s.chords && doc.lh && state.sheet.written !== false) lh.forEach(n => { if (n.start >= g && n.start < g + 1) A.play(n.midis, { when: time + (n.start - g) * spb, dur: Math.max(0.2, n.d * spb * 0.95), strum: 0.008, vel: 0.5 }); });
        else if (s.chords) doc.events.forEach(ev => { if (ev.start >= g && ev.start < g + 1) A.play(ev.voice.lh.concat(ev.voice.rh), { when: time + (ev.start - g) * spb, dur: Math.max(0.3, ev.beats * spb * 0.97), strum: 0.01, vel: doc.melody && s.melody ? 0.46 : 0.6 }); });
        if (s.melody) mel.forEach(n => { if (n.start >= g && n.start < g + 1) A.play([n.midi], { when: time + (n.start - g) * spb, dur: n.d * spb * 0.95, vel: 0.8 }); });
      },
      onTick: i => {
        if (i < countIn) { $("#shCount").textContent = "Count-in " + (i % full + 1); return; }
        $("#shCount").textContent = "";
        let g = (i - countIn) % doc.total;
        const bi = doc.bars.findIndex(b => g >= b.start && g < b.start + b.beats);
        $$("#v-sheet .bar").forEach((x, k) => x.classList.toggle("now", k === bi));
        $$("#v-sheet .barbg").forEach(x => x.classList.toggle("now", +x.getAttribute("data-bar") === bi));
        const ev = doc.events.filter(e => e.start >= g && e.start < g + 1)[0];
        if (ev && ev.i !== sel) select(ev.i, true);
      },
      onEnd: () => stop()
    });
    clock.start(); paintTransport();
  }

  /* ---------- painting ---------- */
  function paintTransport() {
    const on = !!(clock && clock.running()), s = state.sheet, go = $("#shPlay");
    if (!go || !doc) return;
    go.innerHTML = on ? App.STOP + " Stop" : App.PLAY + " Play"; go.classList.toggle("stop", on);
    $("#shTempo").innerHTML = doc.tempo + "<small>bpm</small>";
    [["shLoop", s.loop], ["shClick", s.click], ["shMel", s.melody], ["shChords", s.chords]].forEach(p => { const b = $("#" + p[0]); if (b) b.classList.toggle("on", !!p[1]); });
    $("#shMel").hidden = !doc.melody;
    if (!on) $("#shCount").textContent = "";
  }

  function paintNotation() {
    const box = $("#shNotation"); box.hidden = !doc.melody; if (!doc.melody) return;
    const showTones = state.sheet.tones !== false;
    App.paper($("#shPaper"), w => {
      const song = { sig: doc.key.sig, time: doc.time, bars: doc.bars.map(b => {
        let t = 0;
        const notes = b.notes.map(n => {
          const at = t; t += n.d; if (!n.p || !showTones) return { p: n.p, d: n.d };
          const slot = b.slots.filter(s => s.chord && at >= s.beat && at < s.beat + s.beats)[0];
          return { p: n.p, d: n.d, cls: slot && slot.play.pcs.indexOf(n.p.pc) >= 0 ? "tone" : "" };
        });
        return { beats: b.beats, notes: notes, lh: state.sheet.written === false ? null : b.lh, lyric: state.sheet.lyrics === false ? "" : b.lyric, chords: b.slots.filter(s => s.chord || s.nc).map(s => ({ beat: s.beat, text: s.chord ? s.play.symbol : "N.C.", i: s.chord ? s.i : -1 })) };
      }) };
      W.Staff.leadSheet($("#shPaper"), song, { width: w, space: w < 480 ? 8 : 9.5, lh: doc.lh && state.sheet.written !== false });
      $$("#shPaper .chord").forEach(x => x.classList.toggle("sel", +x.getAttribute("data-ci") === sel));
    });
  }

  function paintChart() {
    const cad = T.findCadences(doc.events.map(e => e.chord));
    $("#shChart").innerHTML = doc.bars.map((b, bi) => `<div class="bar" data-bar="${bi}"><span class="bn">${doc.pickup ? (bi === 0 ? "" : bi) : bi + 1}</span>${
      b.slots.length ? b.slots.map(s => s.chord
        ? `<button class="cs ${s.rep ? "rep" : ""} ${s.i === sel ? "sel" : ""}" data-ci="${s.i}" style="flex-grow:${s.beats}"><b>${s.rep ? "%" : esc(s.play.symbol)}</b><span>${esc(T.numeral(s.play, doc.key))}</span></button>`
        : `<span class="cs ${s.err ? "err" : "rep"}" style="flex-grow:${s.beats}" title="${s.err ? "Woodshed can't read this symbol" : "No chord"}"><b>${esc(s.text)}</b><span>${s.err ? "?" : ""}</span></span>`).join("")
        : `<span class="cs rep"><b>–</b></span>`}</div>`).join("");
    const bad = doc.bars.reduce((n, b) => n + b.slots.filter(s => s.err).length, 0);
    $("#shCads").innerHTML = cad.map(c => `<span class="cad">${esc(c.label)}<small>bar${doc.events[c.from].bar !== doc.events[c.to].bar ? "s" : ""} ${doc.events[c.from].bar + (doc.pickup ? 0 : 1)}${doc.events[c.from].bar !== doc.events[c.to].bar ? "–" + (doc.events[c.to].bar + (doc.pickup ? 0 : 1)) : ""}</small></span>`).join("") +
      (bad ? `<span class="cad" style="color:var(--felt);background:var(--felt-dim)">${bad} symbol${bad > 1 ? "s" : ""} couldn't be read. Check the spelling in the editor.</span>` : "");
  }

  function select(i, fromPlayback) {
    sel = i;
    $$("#shChart .cs").forEach(x => x.classList.toggle("sel", +x.getAttribute("data-ci") === sel));
    $$("#shPaper .chord").forEach(x => x.classList.toggle("sel", +x.getAttribute("data-ci") === sel));
    paintSelected();
    if (!fromPlayback) hear();
  }
  function hear() { const ev = doc.events[sel]; if (ev) App.playChord(ev.voice.lh.concat(ev.voice.rh), { dur: 1.8 }); }

  function paintSelected() {
    const ev = doc.events[sel], box = $("#shSel");
    if (!ev) { box.innerHTML = `<p class="sub">No chords yet. Add some in the editor below, like <span class="mono">| C | Am7 | Dm7 G7 | C |</span>.</p>`; return; }
    const ch = ev.chord, v = ev.voice, style = T.VOICINGS.filter(x => x.id === state.sheet.voicing)[0];
    const spell = m => T.pitchName(T.spellIn(m, ch.notes.concat(ch.bass ? [ch.bass] : []), T.prefFor(doc.key)));
    const simplified = ev.written.ascii !== ch.ascii;
    box.innerHTML = `
      <div>
        <span class="eyebrow">Bar ${ev.bar + (doc.pickup ? 0 : 1)} · <b>${esc(T.numeral(ch, doc.key))}</b> in ${esc(T.keyName(doc.key))}</span>
        <div class="big-sym mt-s">${esc(ch.symbol)}</div>
        <div class="spoken">${esc(ch.spoken)}</div>
        ${simplified ? `<p class="sub mt-s">Written as <b>${esc(ev.written.symbol)}</b>. You're seeing the simplified version.</p>` : ""}
        <ul class="explain mt">${T.explain(ch).map(x => `<li><code>${esc(x.t)}</code><span>${esc(x.d)}</span></li>`).join("")}</ul>
      </div>
      <div>
        <div class="row between"><span class="eyebrow">How to play it · ${esc(style.name)}</span><div class="row gap-s"><button class="btn small" id="shHear">${App.PLAY} Hear</button><a class="btn ghost small" href="#/chords?ch=${encodeURIComponent(ch.ascii)}">Explore</a></div></div>
        <div class="kb mid dense mt-s" id="shKb"></div>
        <div class="legend"><span><i class="l-lh"></i>Left hand</span><span><i class="l-rh"></i>Right hand</span></div>
        <div class="hands">${v.lh.length ? `<span><b>LH</b>  ${v.lh.map(spell).join("  ")}</span>` : ""}${v.rh.length ? `<span><b class="r">RH</b>  ${v.rh.map(spell).join("  ")}</span>` : (doc.melody || state.sheet.voicing !== "comp" ? `<span><b class="r">RH</b>  plays the melody</span>` : "")}</div>
        <div class="paper mt" id="shStaff"></div>
        <p class="sub mt">${esc(style.blurb)}</p>
      </div>`;
    if (kb) kb.destroy();
    kb = new W.Keyboard($("#shKb"), { from: 36, to: 84, fit: true, labels: "c" });
    kb.mark(v.lh.map(m => ({ midi: m, cls: "lh", label: T.name(T.spellIn(m, ch.notes.concat(ch.bass ? [ch.bass] : []), T.prefFor(doc.key))) }))
      .concat(v.rh.map(m => ({ midi: m, cls: "rh", label: T.name(T.spellIn(m, ch.notes, T.prefFor(doc.key))) }))));
    W.activeKeyboard = kb;
    const names = ch.notes.concat(ch.bass ? [ch.bass] : []), pref = T.prefFor(doc.key);
    const pitches = v.lh.concat(v.rh).map(m => T.spellIn(m, names, pref));
    App.paper($("#shStaff"), w => W.Staff.render($("#shStaff"), { clef: "grand", sig: doc.key.sig, width: Math.min(w, 280), space: 9, items: [{ pitches: pitches, staffEach: v.lh.map(() => "bass").concat(v.rh.map(() => "treble")), clsEach: v.lh.map(() => "lh").concat(v.rh.map(() => "hl")) }], aria: ch.spoken + " voicing" }));
    $("#shHear").addEventListener("click", hear);
  }

  function paintHeader() {
    const opt = (c, label) => `<option value="${esc(c.id)}" ${c.id === doc.id ? "selected" : ""}>${esc(label || c.title)}</option>`;
    const mineS = W.Songs.mine();
    $("#shPick").innerHTML = `${mineS.length ? `<optgroup label="My songs">${mineS.map(s => opt(s)).join("")}</optgroup>` : ""}<optgroup label="Tunes with melody">${W.SONGS.map(s => opt(s)).join("")}</optgroup><optgroup label="Chord charts">${W.CHARTS.map(c => opt(c)).join("")}</optgroup>${userCharts().length ? `<optgroup label="My charts">${userCharts().map(c => opt(c)).join("")}</optgroup>` : ""}`;
    $("#shTitle").textContent = doc.title;
    $("#shBy").textContent = [doc.by, doc.time[0] + "/" + doc.time[1], T.keyName(doc.key) + (doc.semis ? " (transposed " + (doc.semis > 0 ? "+" : "") + doc.semis + ")" : ""), doc.bars.length - (doc.pickup ? 1 : 0) + " bars"].filter(Boolean).join(" · ");
    $("#shAbout").innerHTML = esc(doc.about) + (doc.notes ? `<details class="more" style="margin-top:8px;border-top:0;padding-top:0"><summary>How to play it</summary><div class="body">${esc(doc.notes).replace(/\n+/g, "<br>")}</div></details>` : "");
    $("#shWritten").hidden = !doc.lh; $("#shWritten").classList.toggle("on", state.sheet.written !== false);
    $$("#shVoicing button").forEach(b => b.classList.toggle("on", b.getAttribute("data-voicing") === state.sheet.voicing));
    $$("#shSimplify button").forEach(b => b.classList.toggle("on", b.getAttribute("data-simplify") === state.sheet.simplify));
    const ks = $("#shKey"), cur = (state.sheet.keys && state.sheet.keys[doc.id]) || "";
    ks.innerHTML = `<option value="">Key: ${doc.src.key ? "as written" : "auto-detect"}</option>` + T.CIRCLE.map(c => `<option value="${esc(T.name(c.major.tonic, true))}" ${cur === T.name(c.major.tonic, true) ? "selected" : ""}>${esc(T.keyName(c.major))}</option>`).join("") + T.CIRCLE.map(c => `<option value="${esc(T.name(c.minor.tonic, true))}m" ${cur === T.name(c.minor.tonic, true) + "m" ? "selected" : ""}>${esc(T.keyName(c.minor))}</option>`).join("");
    ks.hidden = doc.melody;
    $("#shTones").classList.toggle("on", state.sheet.tones !== false);
    paintEditor();
  }

  function paintEditor() {
    const box = $("#shEdit"), src = doc.src;
    if (doc.melody && doc.mine) {
      box.innerHTML = `<span class="eyebrow">Edit this song</span>
        <label class="field">Song text<textarea id="edSong" rows="10" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(W.Songs.toText(src))}</textarea></label>
        <p class="sub mt-s">One bar per line: <span class="mono">notes | chords | left hand</span>. Notes are <span class="mono">E4</span> (a beat) or <span class="mono">E4:.5</span> (half a beat), <span class="mono">r:1</span> is a rest, and <span class="mono">C3+E3+G3:2</span> strikes three notes together. A chord lands on beat one unless you say <span class="mono">G7@2</span>. Beats are quarter notes, so an eighth is .5 even in 6/8.</p>
        <p class="sub" id="edProblems"></p>
        <div class="row mt"><button class="btn small" id="edSongSave">Save</button><a class="btn ghost small" href="#/piano?learn=${encodeURIComponent(doc.id)}">Learn the melody</a><button class="btn ghost small" onclick="W.Tutor.open()">Ask Clef to fix a bar</button><button class="btn ghost small" id="edSongDel">Delete</button></div>`;
      return;
    }
    if (doc.melody) { box.innerHTML = `<span class="eyebrow">Make it yours</span><p class="sub">This tune is built in. Learn its melody note by note on the Piano page, or copy its chords into a chart of your own and change them.</p><div class="row mt"><a class="btn small" href="#/piano?learn=${encodeURIComponent(doc.id)}">Learn the melody</a><button class="btn ghost small" id="edCopy">Copy chords to a new chart</button><button class="btn ghost small" id="edNew">Blank chart</button></div>`; return; }
    box.innerHTML = `
      <span class="eyebrow">${doc.mine ? "Edit this chart" : "Chart text"}</span>
      <div class="grid2" style="grid-template-columns:minmax(0,1fr) auto auto;align-items:end">
        <label class="field">Title<input type="text" id="edTitle" value="${esc(src.title)}"></label>
        <label class="field">Time<select id="edTime"><option value="4" ${doc.time[0] === 4 ? "selected" : ""}>4/4</option><option value="3" ${doc.time[0] === 3 ? "selected" : ""}>3/4</option><option value="2" ${doc.time[0] === 2 ? "selected" : ""}>2/4</option><option value="6" ${doc.time[0] === 6 ? "selected" : ""}>6/8</option></select></label>
      </div>
      <label class="field mt-s">Chords<textarea id="edText" rows="5" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(src.text)}</textarea></label>
      <p class="sub mt-s">Bars go between <span class="mono">|</span> lines. Two chords in a bar share it: <span class="mono">| Dm7 G7 |</span>. A dot holds the chord another beat: <span class="mono">| C . . G |</span>. <span class="mono">%</span> repeats the last bar. Any spelling works: <span class="mono">C-7</span>, <span class="mono">CΔ</span>, <span class="mono">Cø</span>, <span class="mono">C7(b9)</span>, <span class="mono">C/E</span>.</p>
      <div class="row mt"><button class="btn small" id="edSave">${doc.mine ? "Save" : "Save as my chart"}</button><button class="btn ghost small" id="edNew">New blank chart</button>${doc.mine ? `<button class="btn ghost small" id="edDel">Delete</button>` : ""}</div>`;
  }

  function refresh(keepSel) { stop(); build(); if (!keepSel) sel = 0; paintHeader(); paintNotation(); paintChart(); paintSelected(); paintTransport(); App.save(); }

  const view = W.views.sheet = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Lead sheets</h1><p>A lead sheet gives you a melody and chord symbols, and leaves the rest to you. Tap any chord to see what the symbol means and one good way to play it.</p></div>
        <div class="row"><select id="shPick" class="grow" aria-label="Choose a chart" style="max-width:420px"></select><button class="btn ghost" onclick="W.Tutor.open('scan')">Scan my sheet music</button></div>
        <div class="transport mt">
          <button class="btn" id="shPlay" style="min-width:98px"></button>
          <div class="tempo"><button data-tempo="-4" aria-label="Slower">−</button><b id="shTempo"></b><button data-tempo="4" aria-label="Faster">+</button></div>
          <button class="toggle" id="shLoop">Loop</button><button class="toggle" id="shClick">Click</button><button class="toggle" id="shChords">Chords</button><button class="toggle" id="shMel">Melody</button>
          <span class="sub mono" id="shCount"></span>
        </div>
        <div class="card mt">
          <div class="row between"><div><h2 class="title" id="shTitle"></h2><p class="sub" id="shBy"></p></div>
            <div class="row gap-s"><div class="tempo" title="Transpose"><button data-tr="-1" aria-label="Transpose down">−</button><b style="min-width:74px;font-size:12.5px">Transpose</b><button data-tr="1" aria-label="Transpose up">+</button></div><select id="shKey" aria-label="Key"></select></div></div>
          <p class="sub mt-s" id="shAbout"></p>
          <div id="shNotation" class="mt"><div class="paper" id="shPaper"></div><div class="row between mt-s"><span class="sub">Turn <b>Melody</b> off and play it yourself over the chords, or turn <b>Chords</b> off and comp under the tune.</span><div class="row gap-s"><button class="toggle" id="shWritten" style="height:36px" hidden>Written left hand</button><button class="toggle" id="shTones" style="height:36px">Highlight chord tones</button></div></div></div>
          <div class="chart mt" id="shChart"></div>
          <div class="row mt-s gap-s" id="shCads"></div>
        </div>
        <div class="card mt">
          <div class="row between"><span class="eyebrow">Left-hand style</span><div class="seg" id="shSimplify"><button data-simplify="none">As written</button><button data-simplify="seventh">Sevenths</button><button data-simplify="triad">Triads only</button></div></div>
          <div class="seg mt-s" id="shVoicing">${T.VOICINGS.map(v => `<button data-voicing="${v.id}">${esc(v.name)}</button>`).join("")}</div>
          <div class="sel-panel mt" id="shSel"></div>
        </div>
        <div class="card mt" id="shEdit"></div>
        <div class="card mt"><span class="eyebrow">How to play from a lead sheet</span>
          <div class="prose"><ol>
            <li><b>Roots first.</b> Play the melody with your right hand and only the root of each chord with your left, landing exactly on the beat where the symbol sits. Choose “Bass notes only” above.</li>
            <li><b>Add the chord.</b> Move to “Left-hand chord”. Notice how each shape is the closest inversion to the last one, so your hand barely travels.</li>
            <li><b>Give it rhythm.</b> Break the left hand up: root on beat one, the rest of the chord on beats two and three, or roll it as an arpeggio.</li>
            <li><b>Go lean.</b> On jazz charts switch to shells: root and 7th in the left hand, and let the right hand carry the 3rd under the melody.</li>
            <li><b>Read ahead.</b> Spot the ii–V–I patterns flagged under the chart. Once your hands know that move in a key, three chords become one thought.</li>
          </ol><p>Symbols too dense? “Sevenths” or “Triads only” strips the 9s, 13s and alterations. The simpler chord is always a legal thing to play.</p></div>
        </div>`;

      $("#shPick").addEventListener("change", e => { state.sheet.id = e.target.value; refresh(); });
      $("#shKey").addEventListener("change", e => { state.sheet.keys = state.sheet.keys || {}; if (e.target.value) state.sheet.keys[doc.id] = e.target.value; else delete state.sheet.keys[doc.id]; refresh(true); });
      $("#shPlay").addEventListener("click", () => (clock && clock.running()) ? stop() : play());
      [["shLoop", "loop"], ["shClick", "click"], ["shMel", "melody"], ["shChords", "chords"]].forEach(p => $("#" + p[0]).addEventListener("click", () => { state.sheet[p[1]] = !state.sheet[p[1]]; App.save(); paintTransport(); }));
      $("#shTones").addEventListener("click", () => { state.sheet.tones = state.sheet.tones === false; App.save(); paintHeader(); paintNotation(); });
      $("#shWritten").addEventListener("click", () => { state.sheet.written = state.sheet.written === false; App.save(); paintHeader(); paintNotation(); });
      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("[data-tempo]"))) { doc.tempo = Math.max(40, Math.min(220, doc.tempo + (+b.getAttribute("data-tempo")))); state.sheet.tempo[doc.id] = doc.tempo; if (clock) clock.job.bpm = doc.tempo; App.save(); paintTransport(); }
        else if ((b = e.target.closest("[data-tr]"))) { let n = (state.sheet.transpose[doc.id] || 0) + (+b.getAttribute("data-tr")); if (n > 6) n -= 12; if (n < -6) n += 12; state.sheet.transpose[doc.id] = n; refresh(true); App.toast("Now in " + T.keyName(doc.key)); }
        else if ((b = e.target.closest("[data-voicing]"))) { state.sheet.voicing = b.getAttribute("data-voicing"); revoice(); paintHeader(); paintSelected(); hear(); App.save(); }
        else if ((b = e.target.closest("[data-simplify]"))) { state.sheet.simplify = b.getAttribute("data-simplify"); refresh(true); }
        else if ((b = e.target.closest("[data-ci]"))) select(+b.getAttribute("data-ci"));
        else if (e.target.id === "edSave") {
          const rec = { id: doc.mine ? doc.id : null, title: $("#edTitle").value.trim() || "Untitled", text: $("#edText").value, time: [+$("#edTime").value, +$("#edTime").value === 6 ? 8 : 4], tempo: doc.tempo };
          Sheet.open(rec); App.toast("Saved to My charts");
        }
        else if (e.target.id === "edNew") Sheet.open({ title: "My chart", text: "| C | Am | F | G |" });
        else if (e.target.id === "edSongSave") {
          const r = W.Songs.fromText($("#edSong").value);
          if (!r.song) { $("#edProblems").textContent = r.problems.join(" "); return; }
          r.song.id = doc.id; W.Songs.save(r.song); refresh(true); App.toast(r.problems.length ? "Saved, with " + r.problems.length + " bar" + (r.problems.length > 1 ? "s" : "") + " mended" : "Song saved");
          if (r.problems.length) $("#edProblems").textContent = r.problems.join(" ");
        }
        else if (e.target.id === "edSongDel") { const b2 = e.target; if (b2.dataset.sure) { W.Songs.remove(doc.id); state.sheet.id = "ode"; refresh(); App.toast("Song deleted"); } else { b2.dataset.sure = "1"; b2.textContent = "Tap again to delete"; } }
        else if (e.target.id === "edCopy") Sheet.open({ title: doc.title + " (my chords)", time: doc.time, tempo: doc.tempo, key: T.name(doc.key.tonic, true) + (doc.key.mode === "minor" ? "m" : ""), text: doc.bars.filter(b => b.beats >= doc.time[0]).map((b, i) => "| " + (b.slots.map(s => s.written ? s.written.ascii : s.text).join(" ") || "%") + ((i + 1) % 4 === 0 ? " |\n" : " ")).join("").trim() + (doc.bars.length % 4 ? " |" : "") });
        else if (e.target.id === "edDel") { const b2 = e.target; if (b2.dataset.sure) { state.charts = App.state.charts = userCharts().filter(c => c.id !== doc.id); state.sheet.id = "ode"; refresh(); App.toast("Chart deleted"); } else { b2.dataset.sure = "1"; b2.textContent = "Tap again to delete"; } }
      });
    },
    show(params) {
      if (params.text) { Sheet.open({ id: "from-keys", title: params.title || "Progression", text: params.text }); history.replaceState(null, "", "#/sheet"); return; }
      refresh(true);
    },
    hide() { stop(); }
  };
})();
