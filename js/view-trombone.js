/* Trombone: slide positions for every note, a tuner that listens to you play, long-tone drones from a real trombone,
   scales with positions, the position chart, and bass-clef reading. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  // Tenor trombone in B♭. First position sounds the harmonic series on B♭1; each position out is a half step lower.
  const PARTIALS = [null, 34, 46, 53, 58, 62, 65, 68, 70, 72, 74];
  const TUNE = { 5: -14, 7: -31, 9: 4, 10: -14 };      // how far the natural partial sits from equal temperament, in cents
  const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];
  const DIST = ["", "all the way in", "about 3¼ in / 8 cm out", "about 6½ in / 17 cm, just before the bell", "about 10 in / 26 cm, level with the bell rim", "about 14 in / 36 cm", "about 18½ in / 47 cm", "about 23 in / 58 cm, nearly full stretch"];
  const Tbn = W.Tbn = {
    PARTIALS: PARTIALS, ORD: ORD,
    // Every way to play a note: [{pos, partial, cents, alt}], the everyday position first.
    positions(midi) {
      const out = [];
      for (let n = 1; n < PARTIALS.length; n++) { const p = PARTIALS[n] - midi + 1; if (p >= 1 && p <= 7) out.push({ pos: p, partial: n, cents: TUNE[n] || 0 }); }
      out.sort((a, b) => (a.partial === 7) - (b.partial === 7) || a.partial - b.partial);
      out.forEach((o, i) => { o.alt = i > 0; });
      return out;
    },
    text(midi) { const ps = Tbn.positions(midi); return ps.length ? ORD[ps[0].pos] + (ps.length > 1 ? " (or " + ps.slice(1).map(p => ORD[p.pos]).join(", ") + ")" : "") : "out of range"; }
  };
  const S = () => state.tbn;
  const NOTE_LO = 34, NOTE_HI = 74;
  let kb = null, drone = null, tunerOff = null, scaleTimer = 0;
  const spell = m => T.spellIn(m, null, "flat");

  /* ---------- slide drawing ---------- */
  function slideSvg(pos) {
    // slide length grows with the position; marks at each position along the outer slide
    const x0 = 60, len = 470, pxPer = len / 6.6, ext = (pos - 1) * pxPer;
    let marks = "";
    for (let p = 1; p <= 7; p++) { const x = x0 + 40 + (p - 1) * pxPer; marks += `<circle class="mark ${p === pos ? "on" : ""}" cx="${x}" cy="118" r="5"/><text class="${p === pos ? "on" : ""}" x="${x}" y="140">${p}</text>`; }
    return `<svg class="slide" viewBox="0 0 640 150" role="img" aria-label="Slide in ${ORD[pos]} position">
      <path class="bell" d="M14 22c14 0 26 10 30 18h-30z"/><path class="tube" d="M42 40h18a8 8 0 0 1 8 8v0h-56"/>
      <path class="tube" d="M20 62H${x0 + 40 + ext}M20 96H${x0 + 40 + ext}"/>
      <path class="tube inner" d="M${x0 + 40 + ext} 62v0a17 17 0 0 1 0 34"/>
      <path class="tube" d="M${x0 + 6} 56v46"/>
      ${marks}
      <text x="${x0 + 40 + ext}" y="52" style="font-size:11px">${esc(ORD[pos])}</text>
    </svg>`;
  }

  /* ---------- find the position ---------- */
  function paintNote() {
    const m = S().note, p = spell(m), ps = Tbn.positions(m), main = ps[0];
    $("#tbNote").textContent = T.pitchName(p);
    $("#tbPos").innerHTML = main ? `${esc(ORD[main.pos])}<small>${main.partial}${main.partial === 1 ? "st" : main.partial === 2 ? "nd" : main.partial === 3 ? "rd" : "th"} partial${main.cents ? ", lips " + (main.cents < 0 ? "up" : "down") + " " + Math.abs(main.cents) + "¢" : ""}</small>` : "–";
    $("#tbAlts").innerHTML = ps.length > 1 ? "Also: " + ps.slice(1).map(a => `<b>${esc(ORD[a.pos])}</b> (${a.partial}th partial${a.partial === 7 ? ", flat, avoid" : a.cents ? ", " + a.cents + "¢" : ""})`).join(", ") + "." : (ps.length ? "Only one way to play this one." : "Below the tenor trombone's range without an F attachment.");
    $("#tbDist").textContent = main ? "Slide " + DIST[main.pos] + "." : "";
    $("#tbSlide").innerHTML = slideSvg(main ? main.pos : 1);
    App.paper($("#tbStaff"), w => W.Staff.render($("#tbStaff"), { clef: "bass", width: Math.min(w, 220), space: 10, items: [{ pitches: [p], label: T.pitchName(p) }], aria: T.pitchName(p) + " on the bass staff" }));
    if (kb) kb.mark([{ midi: m, cls: "root", label: ORD[main ? main.pos : 0] }]);
    $$("#tbChart button").forEach(b => b.classList.toggle("on", +b.getAttribute("data-m") === m));
  }
  function setNote(m) { S().note = Math.max(NOTE_LO, Math.min(NOTE_HI, m)); App.save(); paintNote(); }
  function hear(m, dur) { A.using("trombone", () => A.play([m], { dur: dur || 1.6, vel: 0.62 })); }

  /* ---------- tuner ---------- */
  function paintTuner(p) {
    const tn = $("#tuNote"), needle = $("#tuNeedle"); if (!tn) return;
    if (!p || !p.hz) { tn.textContent = Tuner.running ? "…" : ""; tn.className = "tn"; $("#tuCents").textContent = Tuner.running ? (p && p.rms > 0.008 ? "Listening… hold a steady note" : "Play a long note") : ""; needle.style.left = "50%"; needle.className = "needle"; $("#tuHint").textContent = ""; return; }
    const sp = spell(p.note), inTune = Math.abs(p.cents) <= 8, ps = Tbn.positions(p.note);
    tn.innerHTML = esc(T.pitchName(sp)) + `<small>${p.hz.toFixed(1)} Hz</small>`; tn.className = "tn" + (inTune ? " in" : "");
    $("#tuCents").textContent = (p.cents > 0 ? "+" : "") + p.cents + " cents" + (inTune ? " · in tune" : p.cents > 0 ? " · sharp: push the slide out a touch, or relax" : " · flat: pull in a touch, or firm up");
    needle.style.left = (50 + Math.max(-50, Math.min(50, p.cents)) * 0.9) + "%"; needle.className = "needle" + (inTune ? " in" : "");
    $("#tuHint").textContent = ps.length ? "That note lives in " + ORD[ps[0].pos] + " position" + (ps[0].cents ? " (the partial sits " + ps[0].cents + "¢, so aim your lips)" : "") + "." : "";
  }
  const Tuner = W.Tuner;
  function tunerToggle() {
    if (Tuner.running) { Tuner.stop(); if (tunerOff) tunerOff(); tunerOff = null; paintTunerBtn(); paintTuner(null); return; }
    A.init();
    Tuner.start().then(() => { tunerOff = Tuner.onPitch(paintTuner); paintTunerBtn(); paintTuner(null); }, () => { $("#tuHint").textContent = Tuner.error; paintTunerBtn(); });
  }
  function paintTunerBtn() { const b = $("#tuGo"); if (b) { b.innerHTML = Tuner.running ? App.STOP + " Stop listening" : App.PLAY + " Start the tuner"; b.classList.toggle("stop", Tuner.running); } }

  /* ---------- drone ---------- */
  function droneToggle() {
    if (drone) { A.keyUp(drone); drone = null; paintDrone(); return; }
    A.init();
    A.using("trombone", () => { drone = A.noteOn(S().drone, 0.5); });
    paintDrone();
  }
  function paintDrone() {
    const m = S().drone; $("#drNote").textContent = T.pitchName(spell(m)) + " · " + Tbn.text(m) + " position";
    $("#drGo").innerHTML = drone ? App.STOP + " Stop the drone" : App.PLAY + " Start the drone"; $("#drGo").classList.toggle("stop", !!drone);
    $$("#drPick button").forEach(b => b.classList.toggle("on", +b.getAttribute("data-d") === m));
  }

  /* ---------- scales ---------- */
  const SCALE_KEYS = ["Bb", "F", "Eb", "Ab", "C", "G", "Db", "D", "Gb", "A", "E", "B"];
  function scaleNotes() {
    const tonic = T.parseNote(S().scale) || T.parseNote("Bb"), type = S().scaleType || "major";
    let start = 46 + T.mod(tonic.pc - 46, 12); if (start > 53) start -= 12;         // begin between B♭2 and F3
    if (type === "chromatic") { const out = []; for (let m = start; m <= start + 12; m++) out.push(spell(m)); return out; }
    const sc = T.scale(tonic, type === "minor" ? "minor" : type === "blues" ? "blues" : "major");
    return T.scalePitches(sc, Math.floor(start / 12) - 1).filter(p => p.midi >= start && p.midi <= NOTE_HI);
  }
  function paintScale() {
    const notes = scaleNotes(), key = T.parseKey(S().scale + (S().scaleType === "minor" ? "m" : "")) || T.parseKey("Bb");
    $$("#scKeys button").forEach(b => b.classList.toggle("on", b.getAttribute("data-k") === S().scale));
    $$("#scType button").forEach(b => b.classList.toggle("on", b.getAttribute("data-t") === (S().scaleType || "major")));
    $("#scList").innerHTML = notes.map(p => { const ps = Tbn.positions(p.midi); return `<button class="nt" data-m="${p.midi}"><b>${esc(T.pitchName(p))}</b><span>${ps.length ? ps[0].pos + (ps.length > 1 ? "/" + ps[1].pos : "") : "–"}</span></button>`; }).join("");
    App.paper($("#scStaff"), w => W.Staff.render($("#scStaff"), { clef: "bass", sig: S().scaleType === "major" || S().scaleType === "minor" ? key.sig : 0, width: w, space: w < 480 ? 8 : 9, maxSlot: 6, items: notes.map(p => ({ pitches: [p], label: String((Tbn.positions(p.midi)[0] || {}).pos || "") })), aria: "Scale with slide positions" }));
  }
  function playScale() {
    clearTimeout(scaleTimer); const notes = scaleNotes().map(p => p.midi), up = notes.concat(notes.slice(0, -1).reverse());
    A.init();
    const step = 0.55;
    A.using("trombone", () => A.sequence(up, step, { legato: 0.92, vel: 0.6 }));
    up.forEach((m, i) => setTimeout(() => $$("#scList .nt").forEach(b => b.classList.toggle("on", +b.getAttribute("data-m") === m)), i * step * 1000));
    scaleTimer = setTimeout(() => $$("#scList .nt").forEach(b => b.classList.remove("on")), up.length * step * 1000 + 200);
  }

  /* ---------- the chart ---------- */
  function chartHtml() {
    let rows = "";
    for (let n = 2; n <= 8; n++) {
      rows += `<tr><td class="p">${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}${n === 7 ? " (flat)" : ""}</td>`;
      for (let p = 1; p <= 7; p++) { const m = PARTIALS[n] - (p - 1); rows += `<td><button data-m="${m}" class="${n === 7 ? "flat" : ""}">${esc(T.name(spell(m)))}<small style="font-size:10px;opacity:.6">${Math.floor(m / 12) - 1}</small></button></td>`; }
      rows += "</tr>";
    }
    return `<table class="pos-table"><thead><tr><th>Partial</th>${[1, 2, 3, 4, 5, 6, 7].map(p => `<th>${p}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  W.views.trombone = {
    mount(el) {
      el.innerHTML = `
        <div class="hero"><h1>Trombone</h1><p>Seven slide positions, one harmonic series each. Find any note's position, check your tuning with the microphone, hold long tones against a real trombone, and read bass clef.</p></div>
        <div class="tbn-hero">
          <div class="card">
            <div class="row between"><span class="eyebrow">Find the position</span><button class="btn small" id="tbHear">${App.PLAY} Hear it</button></div>
            <div class="row" style="align-items:flex-start;gap:16px">
              <div class="paper center" id="tbStaff" style="width:220px;max-width:45%"></div>
              <div class="grow"><div class="posbig" id="tbPos"></div><div class="sub" style="font:600 20px var(--display);color:var(--ink)" id="tbNote"></div><p class="pos-alts" id="tbAlts"></p><p class="sub mt-s" id="tbDist"></p></div>
            </div>
            <div id="tbSlide"></div>
            <div class="kb mid dense mt" id="tbKb"></div>
            <p class="sub mt-s">Tap a key (B♭1 to D5), or a note in the chart below. The bass clef is the trombone's home clef.</p>
          </div>
          <div class="stack">
            <div class="card tuner">
              <span class="eyebrow">Tuner: it listens to you</span>
              <div class="tn" id="tuNote"></div>
              <div class="cents" id="tuCents"></div>
              <div class="gauge"><div class="track"></div><div class="mid"></div><div class="needle" id="tuNeedle"></div><span class="lab" style="left:2px">♭ 50</span><span class="lab" style="right:2px">50 ♯</span></div>
              <p class="hint" id="tuHint"></p>
              <div class="row mt" style="justify-content:center"><button class="btn" id="tuGo"></button></div>
              <p class="sub mt-s">Play a long, steady note a metre from the phone. Green means within 8 cents. Tune the instrument on B♭ and F in first position by pulling the tuning slide, then fix single notes with the slide.</p>
            </div>
            <div class="card">
              <span class="eyebrow">Long tones and drones</span>
              <div class="drone-note" id="drNote"></div>
              <div class="chips mt-s" id="drPick">${[34, 46, 53, 58, 62, 65, 70].map(m => `<button class="chip" data-d="${m}">${esc(T.pitchName(spell(m)))}</button>`).join("")}</div>
              <div class="row mt"><button class="btn" id="drGo"></button><button class="btn ghost" id="drUse">Use the note above</button><a class="btn ghost" href="#/tools">Metronome</a></div>
              <p class="sub mt-s">A real trombone holds the note as long as you like. Match it, then hold yours for eight slow beats: steady, centred, no wobble. The best five minutes of any brass day.</p>
            </div>
          </div>
        </div>
        <div class="card mt">
          <div class="row between"><span class="eyebrow">Scales with positions</span><button class="btn small" id="scPlay">${App.PLAY} Play it</button></div>
          <div class="row"><div class="chips" id="scKeys">${SCALE_KEYS.map(k => `<button class="chip" data-k="${k}">${esc(T.name(T.parseNote(k)))}</button>`).join("")}</div></div>
          <div class="seg mt-s" id="scType"><button data-t="major">Major</button><button data-t="minor">Minor</button><button data-t="blues">Blues</button><button data-t="chromatic">Chromatic</button></div>
          <div class="paper mt" id="scStaff"></div>
          <div class="tbn-scale mt" id="scList"></div>
          <p class="sub mt-s">The small number is the slide position (a second one is a common alternate). B♭, F and E♭ are the trombone's home keys: their scales barely leave positions 1, 3, 4 and 6.</p>
        </div>
        <div class="grid2 mt">
          <div class="card">
            <span class="eyebrow">Position chart</span>
            <div id="tbChart">${chartHtml()}</div>
            <p class="sub mt-s">Rows are partials (the notes of the harmonic series in one position), columns are positions. The 7th partial is naturally flat; use the position in the row above or below instead. The 5th partial runs a little flat too: lip it up.</p>
          </div>
          <div class="stack">
            <div class="card">
              <span class="eyebrow">Read and drill</span>
              <div class="row"><a class="btn" href="#/train?d=pos">Which position?</a><a class="btn ghost" href="#/train?d=read&clef=bass">Bass-clef notes</a><a class="btn ghost" href="#/study?tab=cards&deck=bassnotes">Flashcards</a></div>
              <p class="sub mt-s">Bass clef lines, bottom to top: <b>G B D F A</b> (Good Boys Do Fine Always). Spaces: <b>A C E G</b> (All Cows Eat Grass). The trombone's usual range runs from E2 (7th position, bottom) to B♭4 (1st position, 8th partial) and higher as your lips get strong.</p>
            </div>
            <div class="card">
              <span class="eyebrow">Basics that matter</span>
              <details class="more" open><summary>Sound before everything</summary><div class="body"><p><b>Breathe low and big</b>: fill from the belly, then blow a fast, warm stream, like fogging a window. The lips buzz because the air moves, not because you press.</p><p><b>Embouchure</b>: corners firm, chin flat, mouthpiece roughly two-thirds on the top lip. Say "em" and blow through the middle. Higher notes come from faster air and slightly firmer corners, not from pressure.</p></div></details>
              <details class="more"><summary>The slide</summary><div class="body"><p>Hold it with the fingertips of the right hand, loose wrist. Move it <b>fast between notes and still on them</b>; slow slides smear. First position is all the way in; fourth is roughly level with the bell rim; seventh is nearly full stretch. Play every note first with the tuner running until each position lives in your arm.</p><p>Tune the whole instrument with the tuning slide (on the bell section) on a first-position B♭; then single notes are fixed with the main slide and the ear.</p></div></details>
              <details class="more"><summary>A 15-minute daily routine</summary><div class="body"><ol><li><b>Long tones</b> (4 min): the drone above, B♭2 then F3 then B♭3, eight slow beats each.</li><li><b>Lip slurs</b> (3 min): in one position, slur between partials, B♭2–F3–B♭3–F3–B♭2, then the same in 2nd and 3rd.</li><li><b>Scales</b> (4 min): B♭ major up and down with the positions above, slowly with the click.</li><li><b>A tune</b> (4 min): anything from Lead sheets played an octave down in bass clef, or the melody Clef wrote out for you.</li></ol><p>Empty the water key, and wipe and lubricate the slide every few days.</p></div></details>
            </div>
          </div>
        </div>`;
      kb = new W.Keyboard($("#tbKb"), { from: NOTE_LO, to: NOTE_HI, fit: true, labels: "c", sound: false, onDown: m => { setNote(m); hear(m, 1.2); } });
      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("#tbChart button"))) { setNote(+b.getAttribute("data-m")); hear(S().note, 1.2); }
        else if (e.target.closest("#tbHear")) hear(S().note);
        else if (e.target.closest("#tuGo")) tunerToggle();
        else if (e.target.closest("#drGo")) droneToggle();
        else if (e.target.closest("#drUse")) { S().drone = S().note; App.save(); if (drone) { A.keyUp(drone); drone = null; } paintDrone(); }
        else if ((b = e.target.closest("#drPick button"))) { S().drone = +b.getAttribute("data-d"); App.save(); if (drone) { A.keyUp(drone); drone = null; } paintDrone(); }
        else if ((b = e.target.closest("#scKeys button"))) { S().scale = b.getAttribute("data-k"); App.save(); paintScale(); }
        else if ((b = e.target.closest("#scType button"))) { S().scaleType = b.getAttribute("data-t"); App.save(); paintScale(); }
        else if (e.target.closest("#scPlay")) playScale();
        else if ((b = e.target.closest("#scList .nt"))) { setNote(+b.getAttribute("data-m")); hear(S().note, 1.2); }
      });
    },
    show() {
      W.activeKeyboard = kb; A.load("trombone");
      paintNote(); paintTunerBtn(); paintTuner(null); paintDrone(); paintScale();
    },
    hide() { if (drone) { A.keyUp(drone); drone = null; } if (Tuner.running) { Tuner.stop(); if (tunerOff) tunerOff(); tunerOff = null; } clearTimeout(scaleTimer); }
  };
})();
