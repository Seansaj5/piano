/* Chords: build any chord and see it four ways (symbol, formula, staff, keys), or press keys and have it named. */
(function () {
  "use strict";
  const W = self.W, T = W.T, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  const ROOTS_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const ROOTS_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let kb = null, findKb = null, mode = "build", labelMode = "names";

  function current() {
    const s = state.chords;
    return (s.sym && T.parseChord(s.sym)) || T.chordFrom(T.parseNote(s.root) || T.parseNote("C"), s.q) || T.parseChord("C");
  }
  function matchQuality(ch) {
    const sig = ch.pcs.map(p => T.mod(p - ch.root.pc, 12)).join(",");
    return T.QUALITIES.filter(q => T.chordFrom(T.parseNote("C"), q.id).pcs.join(",") === sig)[0] || null;
  }
  function baseOctave(ch) { return ch.root.pc >= 7 ? 3 : 4; }

  const view = W.views.chords = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Chords</h1><p>Pick a root and a quality, or type any symbol you've seen on a lead sheet. Everything updates together: the formula, the staff and the keys.</p></div>
        <div class="row between"><div class="seg" id="chMode"><button data-mode="build" class="on">Build a chord</button><button data-mode="find">Name what I play</button></div></div>
        <div id="chBuild" class="mt">
          <div class="grid2 wide-left">
            <div class="card">
              <div class="row between"><span class="eyebrow">Root</span><div class="seg" id="chAcc"><button data-acc="flat">♭ names</button><button data-acc="sharp">♯ names</button></div></div>
              <div class="rootgrid mt-s" id="chRoots"></div>
              <div id="chQuals" class="mt"></div>
              <label class="field mt">Or type a symbol<input type="text" id="chType" placeholder="F#m7b5, Bb13, C/E, AΔ9 …" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
            </div>
            <div class="card" id="chResult"></div>
          </div>
          <div class="grid2 mt">
            <div class="card"><span class="eyebrow">Reading the symbol</span><ul class="explain" id="chExplain"></ul></div>
            <div class="card"><span class="eyebrow">Where this chord lives</span><div id="chHomes"></div>
              <details class="more"><summary>Inversions, and why they matter</summary><div class="body"><p>An inversion is the same notes with a different one on the bottom. Inversions let your hand stay in one place: <b>C → F/C → G/B</b> barely moves, while three root-position chords jump all over.</p><p>When a lead sheet says just “F”, you are free to pick whichever inversion sits closest to the chord before it.</p></div></details>
            </div>
          </div>
        </div>
        <div id="chFind" class="mt" hidden>
          <div class="card">
            <div class="row between"><span class="eyebrow">Tap the keys you're holding</span><div class="row gap-s"><button class="btn ghost small" id="findPlay">${App.PLAY} Play</button><button class="btn ghost small" id="findClear">Clear</button></div></div>
            <div class="found mt-s" id="findOut"></div>
            <div class="kb mt" id="findKb"></div>
            <p class="sub mt">Tap keys to select them. With a MIDI keyboard connected, just hold the chord.</p>
          </div>
        </div>`;

      $("#chQuals").innerHTML = ["Triads", "Sevenths", "Sixths & adds", "Extended", "Altered"].map(g =>
        `<div class="group-label">${g}</div><div class="chips">${T.QUALITIES.filter(q => q.group === g).map(q => `<button class="chip sym" data-q="${esc(q.id)}">${esc(q.sym ? T.degreeText(q.sym) : "major")}</button>`).join("")}</div>`).join("");

      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("[data-mode]"))) { mode = b.getAttribute("data-mode"); this.paintMode(); }
        else if ((b = e.target.closest("[data-root]"))) { state.chords.root = b.getAttribute("data-root"); state.chords.sym = ""; state.chords.inv = 0; this.update(true); }
        else if ((b = e.target.closest("[data-q]"))) { state.chords.q = b.getAttribute("data-q"); state.chords.sym = ""; state.chords.inv = 0; this.update(true); }
        else if ((b = e.target.closest("[data-acc]"))) { state.chords.acc = b.getAttribute("data-acc"); const n = T.parseNote(state.chords.root); state.chords.root = (state.chords.acc === "sharp" ? ROOTS_SHARP : ROOTS_FLAT)[n.pc]; if (state.chords.sym) { const c = current(); state.chords.sym = ""; state.chords.root = (state.chords.acc === "sharp" ? ROOTS_SHARP : ROOTS_FLAT)[c.root.pc]; } this.update(); }
        else if ((b = e.target.closest("[data-inv]"))) { state.chords.inv = +b.getAttribute("data-inv"); this.update(true); }
        else if ((b = e.target.closest("[data-lab]"))) { labelMode = b.getAttribute("data-lab"); this.update(); }
        else if ((b = e.target.closest("[data-play]"))) { App.playChord(this.pitches().map(p => p.midi), { arp: b.getAttribute("data-play") === "arp", dur: 2 }); }
      });
      $("#chType").addEventListener("input", e => {
        const v = e.target.value.trim(), ch = v && T.parseChord(v);
        e.target.style.borderColor = v && !ch ? "var(--felt)" : "";
        if (ch) { state.chords.sym = ch.ascii; state.chords.inv = 0; const q = matchQuality(ch); if (q && !ch.bass) { state.chords.q = q.id; } state.chords.root = T.name(ch.root, true); this.update(false, true); }
      });
      $("#findClear").addEventListener("click", () => { findKb.setSelected([]); this.paintFound([]); });
      $("#findPlay").addEventListener("click", () => { if (findKb.selected.length) App.playChord(findKb.selected); });
    },

    pitches() {
      const ch = current(), maxInv = Math.min(ch.notes.length, 4) - 1, inv = ch.notes.length > 4 ? 0 : Math.min(state.chords.inv || 0, maxInv);
      let ps = T.chordPitches(ch, baseOctave(ch), inv);
      if (ch.bass && ch.pcs.indexOf(ch.bass.pc) < 0) { const low = ps[0].midi; let m = low - T.mod(low - ch.bass.pc, 12); if (m === low) m -= 12; ps = [T.spellMidi(m, ch.bass)].concat(ps); }
      else if (ch.bass && inv === 0) { const i = ch.pcs.indexOf(ch.bass.pc); if (i > 0 && ch.notes.length <= 4) ps = T.chordPitches(ch, baseOctave(ch), i); }
      return ps;
    },

    paintMode() {
      $$("#chMode button").forEach(b => b.classList.toggle("on", b.getAttribute("data-mode") === mode));
      $("#chBuild").hidden = mode !== "build"; $("#chFind").hidden = mode !== "find";
      if (mode === "find") {
        if (!findKb) findKb = new W.Keyboard($("#findKb"), { from: 36, to: 84, minKey: 26, toggle: true, labels: state.settings.labels, onToggle: sel => this.paintFound(sel) });
        W.activeKeyboard = findKb;
        W.Midi.onNote = () => { const held = W.Midi.heldNotes(); if (held.length >= 2) { findKb.setSelected(held); this.paintFound(held); } };
        this.paintFound(findKb.selected);
      } else { W.Midi.onNote = null; if (kb) W.activeKeyboard = kb; }
    },

    paintFound(sel) {
      const out = $("#findOut"), pref = state.chords.acc === "sharp" ? "sharp" : "flat";
      if (sel.length < 2) { out.innerHTML = `<p class="sub">Nothing selected yet. Try C, E and G.</p>`; return; }
      const names = sel.slice().sort((a, b) => a - b).map(m => T.name(T.spellIn(m, null, pref))).join("  ");
      const hits = T.identify(sel, pref);
      if (!hits.length) { out.innerHTML = `<div class="big-sym" style="color:var(--mute)">?</div><p class="sub">${esc(names)} doesn't match a chord Woodshed knows. It may be a cluster, or missing a note.</p>`; return; }
      const best = hits[0];
      out.innerHTML = `<div class="big-sym">${esc(best.symbol)}</div><div class="spoken">${esc(best.spoken)}</div>
        <p class="note-txt mt-s">${esc(names)}</p>
        ${hits.length > 1 ? `<p class="sub mt-s">Could also be read as ${hits.slice(1, 4).map(h => `<b>${esc(h.symbol)}</b>`).join(", ")}. The bass note usually decides.</p>` : ""}
        <div class="row mt-s"><a class="btn ghost small" href="#/chords?ch=${encodeURIComponent(best.ascii)}&build=1">Open in the builder</a></div>`;
    },

    update(play, fromTyping) {
      const ch = current(), q = matchQuality(ch), s = state.chords;
      App.save();
      const roots = s.acc === "sharp" ? ROOTS_SHARP : ROOTS_FLAT;
      $("#chRoots").innerHTML = roots.map(r => `<button data-root="${r}" class="${T.parseNote(r).pc === ch.root.pc ? "on" : ""}">${esc(T.name(T.parseNote(r)))}</button>`).join("");
      $$("#chAcc button").forEach(b => b.classList.toggle("on", b.getAttribute("data-acc") === (s.acc || "flat")));
      $$("#chQuals .chip").forEach(b => b.classList.toggle("on", !!q && !ch.bass && b.getAttribute("data-q") === q.id));
      if (!fromTyping) $("#chType").value = s.sym ? s.sym : "";

      const canInvert = ch.notes.length <= 4 && !ch.bass, size = ch.notes.length;
      const inv = canInvert ? Math.min(s.inv || 0, size - 1) : 0;
      const ps = this.pitches(), hand = labelMode === "lh" ? "lh" : "rh";
      const fing = (labelMode === "rh" || labelMode === "lh") && canInvert ? T.chordFingering(size, inv, hand) : null;
      $("#chResult").innerHTML = `
        <span class="eyebrow">${q ? esc(q.group) : "Chord"}</span>
        <div class="big-sym">${esc(ch.symbol)}</div>
        <div class="spoken">${esc(ch.spoken)}</div>
        ${q ? `<p class="sub mt-s">${esc(q.feel)}</p>` : ""}
        <div class="formula mt">${ch.iv.map((d, i) => `<div class="deg ${i === 0 ? "rootdeg" : ""}"><b>${esc(T.name(ch.notes[i]))}</b><span>${esc(T.degreeText(d))}</span></div>`).join("")}</div>
        ${canInvert ? `<div class="row mt"><div class="seg">${Array.from({ length: size }, (_, i) => `<button data-inv="${i}" class="${i === inv ? "on" : ""}">${i === 0 ? "Root" : T.ordinal(i)}</button>`).join("")}</div></div>` : ""}
        <div class="paper mt" id="chStaff"></div>
        <div class="kb mid mt" id="chKb"></div>
        <div class="row between mt">
          <div class="row gap-s"><button class="btn small" data-play="block">${App.PLAY} Play</button><button class="btn ghost small" data-play="arp">Arpeggio</button></div>
          <div class="seg"><button data-lab="names" class="${labelMode === "names" ? "on" : ""}">Names</button><button data-lab="rh" class="${labelMode === "rh" ? "on" : ""}">RH fingers</button><button data-lab="lh" class="${labelMode === "lh" ? "on" : ""}">LH fingers</button></div>
        </div>
        ${q && q.alias.length > 1 ? `<p class="sub mt">Also written: <span class="also">${q.alias.filter(a => a !== q.sym).map(a => esc(T.name(ch.root) + T.degreeText(a))).join("   ")}</span></p>` : ""}
        ${labelMode !== "names" && !fing ? `<p class="sub mt-s">Fingering is shown for three- and four-note chords. Bigger chords get split between the hands.</p>` : ""}`;

      App.paper($("#chStaff"), w => W.Staff.render($("#chStaff"), { clef: ps[0].midi < 55 ? "grand" : "treble", width: Math.min(w, 300), space: 10, items: [{ pitches: ps, label: ch.symbol }], aria: ch.spoken }));
      if (kb) kb.destroy();
      const lo = Math.min(48, ps[0].midi - T.mod(ps[0].midi, 12)), hi = Math.max(lo + 24, ps[ps.length - 1].midi + (12 - T.mod(ps[ps.length - 1].midi, 12)));
      kb = new W.Keyboard($("#chKb"), { from: lo, to: hi, fit: true, labels: "none" });
      kb.mark(ps.map((p, i) => ({ midi: p.midi, cls: p.pc === ch.root.pc ? "root" : "rh", label: fing ? fing[i] : T.name(p) })));
      if (mode === "build") W.activeKeyboard = kb;

      $("#chExplain").innerHTML = T.explain(ch).map(x => `<li><code>${esc(x.t)}</code><span>${esc(x.d)}</span></li>`).join("");
      const homes = T.homesOf(ch);
      $("#chHomes").innerHTML = homes.length
        ? `<p class="sub">It is built from the notes of these keys. Tap one to see its neighbours.</p><div class="chips mt-s">${homes.map(h => `<a class="chip" style="display:inline-flex;align-items:center;text-decoration:none" href="#/keys?key=${encodeURIComponent(T.name(h.key.tonic, true) + (h.key.mode === "minor" ? "m" : ""))}">${esc(T.keyShort(h.key))}<small>${esc(h.numeral)}</small></a>`).join("")}</div>`
        : `<p class="sub">This one doesn't sit naturally in any single major or minor key. It is a colour chord, usually a dominant leading somewhere${ch.family === "dom" ? ": it pulls toward " + esc(T.name(T.simplify(T.up(ch.root, "4")))) : ""}.</p>`;
      if (play) App.playChord(ps.map(p => p.midi));
    },

    show(params) {
      if (params.ch) { const ch = T.parseChord(params.ch); if (ch) { state.chords.sym = ch.ascii; state.chords.root = T.name(ch.root, true); state.chords.inv = 0; const q = matchQuality(ch); if (q && !ch.bass) { state.chords.q = q.id; state.chords.sym = ""; } if (ch.root.a > 0) state.chords.acc = "sharp"; else if (ch.root.a < 0) state.chords.acc = "flat"; mode = "build"; } }
      this.paintMode(); this.update();
    },
    hide() { W.Midi.onNote = null; }
  };
})();
