/* Keys: the circle of fifths, key signatures on the staff, scales with fingering, and the chords that belong to each key. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  let kb = null, flashTimer = 0, useTwin = false, playTimers = [];

  function curKey() {
    const s = state.keys; let sig = s.sig;
    const spot = T.CIRCLE.filter(c => c.sig === sig || (c.twin && c.twin.sig === sig))[0] || T.CIRCLE[0];
    return { key: T.keyFromSig(sig, s.mode), spot: spot };
  }
  function scaleId() { const s = state.keys; return s.scale === "auto" || !s.scale ? (s.mode === "minor" ? "minor" : "major") : s.scale; }
  function native() { const id = scaleId(); return id === (state.keys.mode === "minor" ? "minor" : "major"); }

  function polar(r, deg) { const a = (deg - 90) * Math.PI / 180; return [200 + r * Math.cos(a), 200 + r * Math.sin(a)]; }
  function wedge(r1, r2, a1, a2) {
    const p1 = polar(r2, a1), p2 = polar(r2, a2), p3 = polar(r1, a2), p4 = polar(r1, a1), f = n => n.toFixed(2);
    return `M${f(p1[0])} ${f(p1[1])}A${r2} ${r2} 0 0 1 ${f(p2[0])} ${f(p2[1])}L${f(p3[0])} ${f(p3[1])}A${r1} ${r1} 0 0 0 ${f(p4[0])} ${f(p4[1])}Z`;
  }
  function circleSvg() {
    const { key, spot } = curKey(), rel = T.relative(key);
    let out = "";
    T.CIRCLE.forEach((c, i) => {
      const a1 = i * 30 - 15, a2 = i * 30 + 15, here = c === spot;
      const majOn = here && key.mode === "major", minOn = here && key.mode === "minor";
      const relMaj = here && key.mode === "minor", relMin = here && key.mode === "major";
      out += `<path class="wedge ${majOn ? "on" : relMaj ? "rel" : ""}" data-sig="${c.sig}" data-mode="major" d="${wedge(112, 190, a1, a2)}"/>`;
      out += `<path class="wedge minor ${minOn ? "on" : relMin ? "rel" : ""}" data-sig="${c.sig}" data-mode="minor" d="${wedge(62, 112, a1, a2)}"/>`;
      const pm = polar(146, i * 30), pn = polar(88, i * 30), pc = polar(176, i * 30);
      const majName = T.name(c.major.tonic) + (c.twin ? "" : ""), minName = T.name(c.minor.tonic) + "m";
      out += `<text class="${majOn ? "on" : ""}" x="${pm[0].toFixed(1)}" y="${pm[1].toFixed(1)}" font-size="${c.twin ? 19 : 21}">${esc(majName)}</text>`;
      out += `<text class="minor ${minOn ? "on" : ""}" x="${pn[0].toFixed(1)}" y="${pn[1].toFixed(1)}" font-size="13.5">${esc(minName)}</text>`;
      out += `<text class="count ${majOn ? "on" : ""}" x="${pc[0].toFixed(1)}" y="${pc[1].toFixed(1)}">${c.sig === 0 ? "0" : Math.abs(c.sig) + (c.sig > 0 ? "♯" : "♭")}</text>`;
    });
    out += `<circle class="hub" cx="200" cy="200" r="58"/><text class="hub-a" x="200" y="192">${esc(T.keyShort(key))}</text><text class="hub-b" x="200" y="216">${key.sig === 0 ? "no ♯ or ♭" : Math.abs(key.sig) + (key.sig > 0 ? " sharp" : " flat") + (Math.abs(key.sig) > 1 ? "s" : "")}</text>`;
    return `<svg class="cof" viewBox="0 0 400 400" role="img" aria-label="Circle of fifths">${out}</svg>`;
  }

  App.playProgression = (chords, opts) => {
    const o = opts || {}, ctx = A.init(); if (!ctx) return 0;
    const spb = 60 / (o.bpm || 84), beats = o.beats || 2; let prev = null, t = A.now() + 0.05;
    chords.forEach(ch => { const v = T.voice(ch, "comp", prev); prev = v; A.play(v.lh.concat(v.rh), { when: t, dur: spb * beats * 0.96, strum: 0.012, vel: 0.6 }); t += spb * beats; });
    return chords.length * spb * beats;
  };

  const view = W.views.keys = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Keys &amp; scales</h1><p>Tap any key on the circle. Majors sit on the outside, their relative minors inside. One step clockwise adds a sharp; one step anticlockwise adds a flat.</p></div>
        <div class="grid2">
          <div class="card"><div id="cof"></div>
            <details class="more"><summary>Name a key from its signature in two seconds</summary><div class="body">
              <p><b>Sharps:</b> find the last sharp and go up a half step. Last sharp G♯ means A major.</p>
              <p><b>Flats:</b> the second-to-last flat <i>is</i> the key. B♭ E♭ A♭ means E♭ major. One flat on its own is F.</p>
              <p><b>Minor:</b> drop three half steps from the major. A major shares its signature with F♯ minor. If the piece starts and ends on the minor chord, or the 7th keeps getting raised, you are in the minor.</p>
              <p><b>Order of sharps:</b> F C G D A E B. <b>Order of flats:</b> the same, backwards: B E A D G C F.</p></div></details>
          </div>
          <div class="card" id="keyCard"></div>
        </div>
        <div class="card mt" id="scaleCard"></div>
        <div class="grid2 mt">
          <div class="card"><div class="row between"><span class="eyebrow">Chords in this key</span><div class="seg" id="diaSeg"><button data-sev="0">Triads</button><button data-sev="1">Sevenths</button></div></div><div class="dia mt-s" id="dia"></div><p class="sub mt" id="diaNote"></p></div>
          <div class="card"><span class="eyebrow">Progressions to practice</span><div id="progs"></div></div>
        </div>`;
      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest(".wedge"))) { state.keys.sig = +b.getAttribute("data-sig"); state.keys.mode = b.getAttribute("data-mode"); state.keys.scale = "auto"; this.update(); this.playScale(false); }
        else if ((b = e.target.closest("[data-goto]"))) { const k = T.parseKey(b.getAttribute("data-goto")); if (k) { state.keys.sig = k.sig; state.keys.mode = k.mode; state.keys.scale = "auto"; this.update(); } }
        else if ((b = e.target.closest("[data-sev]"))) { state.keys.sevenths = b.getAttribute("data-sev") === "1"; this.update(); }
        else if ((b = e.target.closest("[data-hand]"))) { state.keys.hand = b.getAttribute("data-hand"); this.update(); }
        else if ((b = e.target.closest("[data-scaleplay]"))) this.playScale(b.getAttribute("data-scaleplay") === "both");
        else if ((b = e.target.closest("[data-dia]"))) this.flashChord(T.parseChord(b.getAttribute("data-dia")), b);
        else if ((b = e.target.closest("[data-prog]"))) { const list = b.getAttribute("data-prog").split(" ").map(T.parseChord); App.playProgression(list, { beats: list.length > 6 ? 2 : 2 }); }
        else if ((b = e.target.closest("[data-sheet]"))) App.go("sheet", { text: b.getAttribute("data-sheet"), title: b.getAttribute("data-title") });
      });
      el.addEventListener("change", e => { if (e.target.id === "scaleSel") { state.keys.scale = e.target.value; this.update(); this.playScale(false); } });
    },

    pitches() {
      const { key } = curKey(), sc = T.scale(key.tonic, scaleId());
      return { sc: sc, ps: T.scalePitches(sc, key.tonic.pc >= 7 ? 3 : 4) };
    },

    playScale(both) {
      playTimers.forEach(clearTimeout); playTimers = [];
      const { ps } = this.pitches(); let seq = ps.map(p => p.midi);
      if (both) seq = seq.concat(seq.slice(0, -1).reverse());
      const step = 0.3; A.sequence(seq, step);
      seq.forEach((m, i) => playTimers.push(setTimeout(() => { const k = kb && kb.keys[m]; if (k) { k.classList.add("down"); setTimeout(() => k.classList.remove("down"), step * 900); } }, 30 + i * step * 1000)));
    },

    flashChord(ch, btn) {
      $$("#dia button").forEach(x => x.classList.toggle("on", x === btn));
      const ps = T.chordPitches(ch, ch.root.pc >= 7 ? 3 : 4, 0);
      App.playChord(ps.map(p => p.midi));
      kb.mark(ps.map(p => ({ midi: p.midi, cls: p.pc === ch.root.pc ? "root" : "rh", label: T.name(p) })), false);
      clearTimeout(flashTimer); flashTimer = setTimeout(() => { this.markScale(); $$("#dia button").forEach(x => x.classList.remove("on")); }, 2200);
    },

    markScale() {
      const { sc, ps } = this.pitches(), hand = state.keys.hand, fing = T.fingering(sc.tonic, sc.def.id);
      kb.mark(ps.map((p, i) => ({ midi: p.midi, cls: p.pc === sc.tonic.pc ? "root" : "scale", label: hand !== "names" && fing ? fing[hand][i] : T.name(p) })), false);
    },

    update() {
      App.save();
      const { key, spot } = curKey(), rel = T.relative(key), par = T.parallel(key);
      $("#cof").innerHTML = circleSvg();
      const twin = spot.twin ? (key.sig === spot.sig ? spot.twin : spot) : null;
      const twinKey = twin ? (key.mode === "minor" ? twin.minor : twin.major) : null;
      const sigNotes = T.sigNotes(key.sig).map(n => T.name(n)).join("  ");
      $("#keyCard").innerHTML = `
        <span class="eyebrow">Key signature</span>
        <div class="big-key">${esc(T.name(key.tonic))}<small>${key.mode}</small></div>
        <p class="sub mt-s">${esc(T.sigText(key.sig))}${sigNotes ? ": <span class='mono' style='color:var(--ink-2)'>" + esc(sigNotes) + "</span>" : ""}</p>
        <div class="paper mt" id="sigStaff"></div>
        <div class="chips mt">
          <button class="chip" data-goto="${esc(T.name(rel.tonic, true) + (rel.mode === "minor" ? "m" : ""))}">Relative: ${esc(T.keyShort(rel))}</button>
          <button class="chip" data-goto="${esc(T.name(par.tonic, true) + (par.mode === "minor" ? "m" : ""))}">Parallel: ${esc(T.keyShort(par))}</button>
          ${twinKey ? `<button class="chip" data-goto="${esc(T.name(twinKey.tonic, true) + (twinKey.mode === "minor" ? "m" : ""))}">Same notes as ${esc(T.keyShort(twinKey))}</button>` : ""}
        </div>
        <p class="sub mt">${key.mode === "major"
          ? `${esc(T.keyShort(rel))} uses the very same notes, starting from the 6th. ${esc(T.keyShort(par))} keeps the same home note but changes three of the others.`
          : `${esc(T.keyShort(rel))} major uses the very same notes. In ${esc(T.keyShort(key))} you will often see the 7th raised to ${esc(T.name(T.up(key.tonic, "7")))}, which turns the V chord major.`}</p>`;
      App.paper($("#sigStaff"), w => W.Staff.render($("#sigStaff"), { clef: "grand", sig: key.sig, width: Math.min(w, 260), space: 9, items: [], aria: T.keyName(key) + " key signature" }));

      const { sc, ps } = this.pitches(), fing = T.fingering(sc.tonic, sc.def.id), hand = state.keys.hand || "rh";
      const groups = {}; T.SCALES.forEach(s => (groups[s.group] = groups[s.group] || []).push(s));
      $("#scaleCard").innerHTML = `
        <div class="row between"><span class="eyebrow">Scale</span>
          <select id="scaleSel" aria-label="Scale type">${Object.keys(groups).map(g => `<optgroup label="${esc(g)}">${groups[g].map(s => `<option value="${s.id}" ${s.id === sc.def.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</optgroup>`).join("")}</select></div>
        <h2 class="title mt-s">${esc(T.name(sc.tonic))} ${esc(sc.def.name.toLowerCase())}</h2>
        <p class="sub">${esc(sc.def.note)}</p>
        <div class="formula mt">${sc.notes.map((n, i) => `<div class="deg ${i === 0 ? "rootdeg" : ""}"><b>${esc(T.name(n))}</b><span>${esc(T.degreeText(sc.iv[i]))}</span></div>`).join("")}</div>
        <div class="paper mt" id="scaleStaff"></div>
        <div class="kb mid mt" id="scaleKb"></div>
        <div class="row between mt">
          <div class="row gap-s"><button class="btn small" data-scaleplay="up">${App.PLAY} Up</button><button class="btn ghost small" data-scaleplay="both">Up &amp; down</button></div>
          <div class="seg"><button data-hand="rh" class="${hand === "rh" ? "on" : ""}">RH fingers</button><button data-hand="lh" class="${hand === "lh" ? "on" : ""}">LH fingers</button><button data-hand="names" class="${hand === "names" ? "on" : ""}">Names</button></div>
        </div>
        <p class="sub mt">${fing ? (hand === "names" ? "" : `Fingering shown going up, one octave: thumb is 1, pinky is 5. ${hand === "rh" ? "Right" : "Left"} hand: <span class="mono" style="color:var(--ink-2)">${fing[hand === "lh" ? "lh" : "rh"].join(" ")}</span>. Coming down, use the same fingers in reverse.`) : "Standard fingerings are shown for major and minor scales. For this one, keep thumbs off the black keys and you will be close."}</p>`;
      App.paper($("#scaleStaff"), w => W.Staff.render($("#scaleStaff"), { clef: "treble", sig: native() ? key.sig : 0, width: Math.min(w, 620), space: 9.5, maxSlot: 6.5, items: ps.map((p, i) => ({ pitches: [p], cls: i === 0 || i === ps.length - 1 ? "hl" : "" })), aria: T.name(sc.tonic) + " " + sc.def.name }));
      if (kb) kb.destroy();
      const lo = ps[0].midi - T.mod(ps[0].midi, 12);
      kb = new W.Keyboard($("#scaleKb"), { from: lo, to: lo + 24, fit: true, labels: "none" });
      this.markScale(); W.activeKeyboard = kb;

      const dia = T.diatonicChords(key, !!state.keys.sevenths);
      $$("#diaSeg button").forEach(b => b.classList.toggle("on", (b.getAttribute("data-sev") === "1") === !!state.keys.sevenths));
      $("#dia").innerHTML = dia.map(d => `<button data-dia="${esc(d.chord.ascii)}"><b>${esc(d.chord.symbol)}</b><span>${esc(d.numeral)}</span></button>`).join("");
      $("#diaNote").textContent = key.mode === "major"
        ? "Upper-case numerals are major, lower-case minor, ° diminished. I, IV and V are the three major chords; ii, iii and vi are minor. The pattern is the same in every major key."
        : "The V chord is shown as major (borrowed from harmonic minor) because that is how minor-key music is nearly always written.";

      const progs = T.PROGRESSIONS.filter(p => p[key.mode]).map(p => {
        const list = T.progression(key, p), text = "| " + list.map(d => d.chord.ascii).join(" | ") + " |";
        return { name: key.mode === "minor" && p.minorName ? p.minorName : (key.mode === "minor" ? p.name.replace(/I/g, "i").replace("iV", "iv") : p.name), about: p.about, chords: list.map(d => d.chord), text: text };
      });
      if (key.mode === "major") { const b = T.bluesIn(key); progs.push({ name: "12-bar blues", about: "Three dominant 7th chords over twelve bars.", chords: b.map(T.parseChord), text: "| " + b.join(" | ") + " |" }); }
      $("#progs").innerHTML = progs.map(p => `<div class="prog"><h3>${esc(p.name)}</h3><p>${esc(p.about)}</p><div class="chords">${p.chords.map(c => esc(c.symbol)).join(" ")}</div>
        <div class="row gap-s"><button class="btn ghost small" data-prog="${esc(p.chords.map(c => c.ascii).join(" "))}">${App.PLAY} Hear it</button><button class="btn ghost small" data-sheet="${esc(p.text)}" data-title="${esc(p.name + " in " + T.keyShort(key))}">Practice as a lead sheet</button></div></div>`).join("");
    },

    show(params) {
      if (params.key) { const k = T.parseKey(params.key); if (k) { state.keys.sig = k.sig; state.keys.mode = k.mode; state.keys.scale = "auto"; } }
      this.update();
    },
    hide() { playTimers.forEach(clearTimeout); clearTimeout(flashTimer); }
  };
})();
