/* Study: the quiet tab. Chord school (every chord type from the ground up, in all twelve keys), lessons you can read
   anywhere, flashcards with a memory of what you know, and pointers to the drills that never make a sound. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  const S = () => state.study;
  const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
  const IV_NAMES = { "1": "root", "b2": "flat 2nd", "2": "2nd", "b3": "minor 3rd", "3": "major 3rd", "4": "4th", "#4": "sharp 4th", "b5": "flat 5th", "5": "5th", "#5": "sharp 5th", "6": "6th", "bb7": "diminished 7th", "b7": "flat 7th", "7": "major 7th", "b9": "flat 9th", "9": "9th", "#9": "sharp 9th", "11": "11th", "#11": "sharp 11th", "b13": "flat 13th", "13": "13th" };
  const quiet = () => A.muted();

  /* =====================================================================
     CHORD SCHOOL
     ===================================================================== */
  const UNITS = [
    { id: "maj", stage: "Triads", name: "Major", also: ["C", "Cmaj", "CM"], derive: "Start here: the shape every other chord is measured against. Root, then 4 half steps up (the major 3rd), then 3 more (the 5th).", tip: "Root position is fingers 1–3–5 in the right hand, 5–3–1 in the left. Hear it as home.", uses: "Nearly every pop, folk and classical piece. I, IV and V in a major key are all major." },
    { id: "m", stage: "Triads", name: "Minor", also: ["Cm", "C-", "Cmin"], derive: "Take the major chord and lower the middle note one half step. That single note is the whole difference between bright and sad.", tip: "Same fingers as major. Root and 5th stay put; only the 3rd moves.", uses: "vi and ii in major keys; i and iv in minor keys." },
    { id: "dim", stage: "Triads", name: "Diminished", also: ["Cdim", "C°", "Cm♭5"], derive: "Take the minor chord and lower the 5th a half step too. Two minor 3rds stacked: 3 half steps, then 3 more. Everything squeezed in.", tip: "It sounds like a question. It usually resolves up a half step (Bdim → C) or leads home as the vii° chord.", uses: "vii° in major keys, ii° in minor keys, passing chords in jazz and gospel." },
    { id: "aug", stage: "Triads", name: "Augmented", also: ["Caug", "C+", "C(♯5)"], derive: "Take the major chord and raise the 5th a half step: two major 3rds, 4 and 4. Perfectly symmetrical, so C+, E+ and G♯+ share the same three notes.", tip: "Floating and unresolved. Usually the raised 5th climbs on to the 6th next: C → C+ → C6.", uses: "Turnarounds, the end of a phrase leading to IV, film music, ‘Oh! Darling’." },
    { id: "sus4", stage: "Triads", name: "Sus4", also: ["Csus4", "Csus", "C4"], derive: "Take the major chord and push the 3rd up to the 4th. No 3rd means no major or minor colour. Pop and guitar charts often write it C4.", tip: "Play Csus4 then C and hear the 4th fall to the 3rd. That fall is the whole point.", uses: "Pop intros, gospel, and Gsus4 → G right before a chorus." },
    { id: "sus2", stage: "Triads", name: "Sus2", also: ["Csus2", "C2"], derive: "Pull the 3rd down to the 2nd instead. Csus2 (C D G) has exactly the notes of Gsus4 (G C D).", tip: "Open and airy. Rock between sus2 and the plain chord for a shimmering pad.", uses: "Ballads, ambient piano, Coldplay-style intros." },
    { id: "5", stage: "Triads", name: "Power chord", also: ["C5"], derive: "Root and 5th only, often with the root doubled an octave up. No 3rd at all, so it fits over anything.", tip: "In the left hand: 5 on the root, 1 on the 5th, or 5–2–1 with the octave. Rock's left hand.", uses: "Rock, punk and metal riffs, and as a bass shape under any melody." },
    { id: "7", stage: "Sevenths", name: "Dominant 7th", also: ["C7"], derive: "Major chord plus the flat 7th, a whole step below the root's octave: C E G B♭. The tritone between the 3rd and the 7th makes it pull hard.", tip: "C7 wants to go to F. Play C7 → F and feel the tug. Only the V chord in a key is naturally a 7.", uses: "V7 everywhere; every chord in a blues." },
    { id: "maj7", stage: "Sevenths", name: "Major 7th", also: ["Cmaj7", "CΔ7", "CΔ", "CM7", "Cma7"], derive: "Major chord plus the natural 7th, a half step below the octave: C E G B. The 7th rubs against the root; that rub is the warmth.", tip: "A resting chord, not a pushing one. Leave the root to the left hand and let the right play E G B.", uses: "I and IV in jazz, bossa nova, neo-soul, lo-fi." },
    { id: "m7", stage: "Sevenths", name: "Minor 7th", also: ["Cm7", "C-7", "Cmin7"], derive: "Minor chord plus the flat 7th: C E♭ G B♭. The 7th softens the minor.", tip: "The ii chord in every ii–V–I: Dm7 → G7 → Cmaj7. Learn it inside that move.", uses: "Jazz, R&B, funk vamps (Dm7 all night)." },
    { id: "m7b5", stage: "Sevenths", name: "Half-diminished", also: ["Cm7♭5", "Cø", "Cø7"], derive: "Diminished triad plus the flat 7th: C E♭ G♭ B♭. Diminished on the bottom, a minor 7th on top: ‘half’ diminished.", tip: "It's the ii chord of minor keys: Dm7♭5 → G7 → Cm. That's where it lives.", uses: "Minor ii–V–i, jazz standards, dramatic pop bridges." },
    { id: "dim7", stage: "Sevenths", name: "Diminished 7th", also: ["Cdim7", "C°7"], derive: "Diminished triad plus a diminished 7th (𝄫7, the same key as the 6th): C E♭ G♭ B𝄫. Four minor 3rds, so any note can be the root.", tip: "Slide it up a half step into the next chord: C♯dim7 → Dm7. The drum roll of harmony.", uses: "Classical, ragtime, gospel passing chords, silent-movie suspense." },
    { id: "mmaj7", stage: "Sevenths", name: "Minor major 7th", also: ["Cm(maj7)", "CmΔ7", "C-Δ7", "CmM7"], derive: "Minor chord plus the natural 7th: C E♭ G B. Minor on the bottom, a major 7th on top. Tense and cinematic.", tip: "Play Cm → Cm(maj7) → Cm7 → Cm6: a line walking down from the root. James Bond.", uses: "Spy themes, film noir, the i chord in minor jazz." },
    { id: "7sus4", stage: "Sevenths", name: "7sus4", also: ["C7sus4", "C7sus"], derive: "Dominant 7th with the 3rd pushed up to the 4th: C F G B♭. A dominant that floats instead of pushing.", tip: "Play G7sus4 → G7 → C: first the sus resolves, then the 7th does.", uses: "Gospel, 70s pop, funk, the chord right before a big chorus." },
    { id: "6", stage: "Sixths and adds", name: "Sixth", also: ["C6", "CM6"], derive: "Major chord plus the 6th: C E G A. The same notes as Am7, with C as the root.", tip: "The relaxed ending chord of swing and doo-wop. End on C6 instead of C: finished, but sweet.", uses: "Swing, the Beatles, the last chord of a jazz tune." },
    { id: "m6", stage: "Sixths and adds", name: "Minor sixth", also: ["Cm6", "C-6"], derive: "Minor chord plus the natural 6th: C E♭ G A. Bittersweet.", tip: "Same notes as Am7♭5. Try Cm → Cm6 and hear it lean.", uses: "Film noir, bossa nova, minor endings." },
    { id: "add9", stage: "Sixths and adds", name: "Add9", also: ["Cadd9", "C(add9)", "Cadd2", "C2 (on some charts)"], derive: "Major chord plus the 9th, which is the 2nd an octave up: C E G D. ‘Add’ means add: there is no 7th in it.", tip: "Voice it with the 9th on top, or tucked next to the root. Sparkle without jazz.", uses: "Pop ballads, singer-songwriter piano, Oasis, Adele." },
    { id: "9", stage: "Extended and altered", name: "Dominant 9th", also: ["C9"], derive: "C7 plus the 9th: C E G B♭ D. Five notes; leave the 5th out and one hand can play it.", tip: "Left hand root and 7th, right hand 3rd and 9th: the funk shell.", uses: "Funk, blues, soul, James Brown's whole career." },
    { id: "maj9", stage: "Extended and altered", name: "Major 9th", also: ["Cmaj9", "CΔ9", "CM9"], derive: "Cmaj7 plus the 9th: C E G B D. Lush.", tip: "Rootless: E G B D in the right hand over a C in the left.", uses: "Neo-soul, lo-fi hip-hop, Stevie Wonder." },
    { id: "m9", stage: "Extended and altered", name: "Minor 9th", also: ["Cm9", "C-9"], derive: "Cm7 plus the 9th: C E♭ G B♭ D. Smooth minor.", tip: "Left hand C, right hand E♭ G B♭ D. Two bars of Dm9 and you're in a neo-soul record.", uses: "R&B, jazz ballads." },
    { id: "7#5", stage: "Extended and altered", name: "Augmented 7th", also: ["C7♯5", "C+7", "Caug7"], derive: "C7 with the 5th raised: C E G♯ B♭. A dominant leaning even harder forward.", tip: "G7♯5 → Cm: the raised 5th (D♯, really E♭) is the minor 3rd of the next chord.", uses: "The V of minor keys, jazz turnarounds." },
    { id: "7b9", stage: "Extended and altered", name: "Dominant flat 9", also: ["C7♭9", "C7(♭9)"], derive: "C7 plus a flat 9th: C E G B♭ D♭. Dark: the top four notes make a dim7 chord.", tip: "Leave the root to the left hand; the right plays E G B♭ D♭, which is Edim7. It slides down into the I chord.", uses: "Minor ii–V–i, tango, Latin, jazz." },
    { id: "7#9", stage: "Extended and altered", name: "Hendrix chord", also: ["C7♯9", "C7(♯9)"], derive: "C7 plus a sharp 9th: C E G B♭ D♯. A major 3rd and a minor 3rd (spelled ♯9) in the same chord. Gritty.", tip: "E7♯9 is ‘Purple Haze’. Play it with the ♯9 on top, loud.", uses: "Blues-rock, funk, the last chord of a jam." },
    { id: "13", stage: "Extended and altered", name: "Dominant 13th", also: ["C13"], derive: "C7 plus the 9th and the 13th (the 6th, up high): C E G B♭ D A. Six notes; drop the 5th, and usually the 9th.", tip: "Left hand root and 7th, right hand 3rd, 13th and 9th: the big-band chord.", uses: "Big band, jazz endings, soul." }
  ];
  const STAGES = ["Triads", "Sevenths", "Sixths and adds", "Extended and altered"];
  const unitById = id => UNITS.filter(u => u.id === id)[0] || UNITS[0];
  const mast = (u, r) => { const m = S().chords[u] = S().chords[u] || {}; return m[r] = m[r] || { n: 0, ok: 0, run: 0 }; };
  const rootDone = (u, r) => mast(u, r).run >= 2;
  const unitDone = u => ROOTS.filter(r => rootDone(u, r)).length;
  W.School = {
    UNITS: UNITS,
    next() { const u = UNITS.filter(x => unitDone(x.id) < 12)[0]; return u ? { id: u.id, name: u.name, sub: unitDone(u.id) ? unitDone(u.id) + " of 12 keys learned. Keep going." : u.derive.split(". ")[0] + "." } : null; }
  };
  function chordOf(unit, root) { return T.chordFrom(T.parseNote(root), unit); }
  function shape(ch) { const oct = ch.root.pc >= 7 ? 3 : 4; return T.chordPitches(ch, oct, 0).map(p => { let m = p.midi; while (m > 83) m -= 12; while (m < 48) m += 12; return { p: p, midi: m }; }); }
  // "C♭ (the B key)": the proper spelling, plus the key you actually press when they differ in a confusing way
  const easyName = p => { const n = T.name(p), simple = T.midiName(p.midi).replace(/-?\d+$/, ""); return simple === n || (Math.abs(p.a) <= 1 && !/^[EB]♯|^[CF]♭/.test(n)) ? n : n + " (the " + simple + " key)"; };

  let kb = null, prac = { mode: "build", step: 0, wrongs: 0 }, buildTimer = 0;
  function paintSchoolHome(el) {
    const nxt = W.School.next();
    el.innerHTML = `
      <div class="card">
        <div class="row between"><div><span class="eyebrow">Chord school</span><p class="sub">One chord type at a time: what it is, how to build it from one you already know, then play it in all twelve keys until your hands know it. A key counts as learned after you get it right twice running.</p></div>${nxt ? `<button class="btn" data-unit="${nxt.id}">Continue: ${esc(nxt.name)}</button>` : `<span class="quiet-badge"><i></i>All 24 learned</span>`}</div>
      </div>
      ${STAGES.map(st => `<div class="group-label" style="margin-top:18px">${esc(st)}</div><div class="units">${UNITS.filter(u => u.stage === st).map(u => { const d = unitDone(u.id), c = chordOf(u.id, "C"); return `<button class="unit ${d === 12 ? "done" : ""}" data-unit="${u.id}"><b>${esc(c.symbol)}<small>${esc(u.name)}</small></b><span>${esc(c.notes.map(n => T.name(n)).join(" "))}</span><div class="meter"><i style="width:${Math.round(d / 12 * 100)}%"></i></div></button>`; }).join("")}</div>`).join("")}
      <div class="card mt-l">
        <span class="eyebrow">How chords are written</span>
        <p class="sub">Charts spell the same chord many ways. Every one of these opens in the Chords tab if you type it.</p>
        <div class="lesson"><table><tr><th>Written</th><th>Means</th><th>Notes (from C)</th></tr>
        ${[["C", "major"], ["Cm · C- · Cmin", "minor"], ["Cdim · C°", "diminished"], ["Caug · C+", "augmented"], ["Csus4 · Csus · C4", "sus4"], ["Csus2 · C2", "sus2"], ["C5", "power chord"], ["C7", "dominant 7th"], ["Cmaj7 · CΔ · CM7", "major 7th"], ["Cm7 · C-7", "minor 7th"], ["Cm7♭5 · Cø", "half-diminished"], ["Cdim7 · C°7", "diminished 7th"], ["C6 / Cm6", "sixth / minor sixth"], ["Cadd9 · C(add9)", "add 9"], ["C9 · Cmaj9 · Cm9", "ninths"], ["C7♭9 · C7♯9 · C7♯5", "altered dominants"], ["C13", "dominant 13th"], ["C/E", "C chord with E in the bass (slash chord)"], ["N.C.", "no chord: melody alone"]].map(r => { const ch = T.parseChord(r[0].split(" · ")[0].split(" / ")[0]); return `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${ch && r[0] !== "N.C." ? esc(ch.notes.map(n => T.name(n)).join(" ")) : ""}</td></tr>`; }).join("")}
        </table></div>
      </div>`;
  }
  function paintUnit(el) {
    const u = unitById(S().unit), root = S().root, ch = chordOf(u.id, root), q = T.quality(u.id), sh = shape(ch);
    const fingR = T.chordFingering(ch.notes.length, 0, "rh"), fingL = T.chordFingering(ch.notes.length, 0, "lh");
    const learned = unitDone(u.id), idx = UNITS.indexOf(u), prev = UNITS[idx - 1], next = UNITS[idx + 1];
    el.innerHTML = `
      <div class="row between"><button class="btn ghost small" data-school="home">‹ All chord types</button><div class="row gap-s">${prev ? `<button class="btn ghost small" data-unit="${prev.id}">‹ ${esc(prev.name)}</button>` : ""}${next ? `<button class="btn ghost small" data-unit="${next.id}">${esc(next.name)} ›</button>` : ""}</div></div>
      <div class="hero mt-s" style="margin-bottom:12px"><h1 style="font-size:clamp(28px,5vw,40px)">${esc(ch.symbol)} <em>${esc(u.name.toLowerCase())}</em></h1><p>${esc(u.stage)} · ${learned} of 12 keys learned</p></div>
      <div class="school">
        <div class="card">
          <span class="eyebrow">What it is</span>
          <div class="spoken" style="margin-top:0">${esc(ch.spoken)}. ${esc(q.feel)}</div>
          <div class="formula-row mt">${ch.iv.map((d, i) => `<div class="deg ${i === 0 ? "rootdeg" : ""}"><b>${esc(T.degreeText(d))}</b><span>${esc(T.name(ch.notes[i]))}</span><i>${T.degree(d).semis} half steps</i></div>`).join("")}</div>
          <p class="prose mt">${esc(u.derive)}</p>
          <div class="mt"><span class="eyebrow" style="display:block;margin-bottom:6px">Also written</span>${u.also.map(a => `<span class="alias">${esc(a.replace(/^C/, T.name(ch.root)))}</span>`).join("")}</div>
          <div class="paper mt" id="scStaff"></div>
          <div class="kb mini mt" id="scKb"></div>
          <p class="note-txt mt-s">${esc(sh.map(x => easyName(x.p)).join("  ·  "))}</p>
          ${fingR ? `<p class="sub mt-s">Fingers, root position: right hand <span class="mono">${fingR.join(" ")}</span>, left hand <span class="mono">${fingL.join(" ")}</span>.</p>` : `<p class="sub mt-s">Five or six notes: split them, root and 7th in the left hand, the rest in the right.</p>`}
          <div class="row mt"><button class="btn small" id="scHear">${App.PLAY} Hear it</button><a class="btn ghost small" href="#/chords?ch=${encodeURIComponent(ch.ascii)}">Inversions and more</a></div>
          <details class="more" open><summary>How to use it</summary><div class="body"><p>${esc(u.tip)}</p><p><b>Where you'll meet it:</b> ${esc(u.uses)}</p></div></details>
        </div>
        <div class="card">
          <div class="row between"><span class="eyebrow">Practice · ${esc(ch.symbol)}</span><div class="seg" id="scMode"><button data-pmode="build">Build it step by step</button><button data-pmode="test">Play it from memory</button></div></div>
          <div class="roots12 mt-s" id="scRoots">${ROOTS.map(r => { const m = mast(u.id, r); return `<button data-root="${r}" class="${r === root ? "on" : ""} ${rootDone(u.id, r) ? "done" : ""}" style="--p:${Math.min(100, m.run * 50)}%">${esc(T.name(T.parseNote(r)))}<i></i></button>`; }).join("")}</div>
          <p class="build-msg mt" id="scMsg"></p>
          <div class="kb mid" id="scPrac"></div>
          <div class="row mt" id="scBtns"></div>
          <p class="sub mt-s" id="scSession"></p>
        </div>
      </div>`;
    App.paper($("#scStaff"), w => W.Staff.render($("#scStaff"), { clef: "grand", width: Math.min(w, 260), space: 9, items: [{ pitches: sh.map(x => T.spellMidi(x.midi, x.p)), staff: "treble", label: ch.symbol }], aria: ch.spoken }));
    const show = new W.Keyboard($("#scKb"), { from: 48, to: 83, fit: true, labels: "none", sound: true });
    show.mark(sh.map((x, i) => ({ midi: x.midi, cls: i === 0 ? "root" : "rh", label: T.name(x.p) })));
    if (kb) kb.destroy();
    kb = new W.Keyboard($("#scPrac"), { from: 48, to: 84, fit: true, toggle: true, labels: state.settings.labels, sound: true, onToggle: sel => onToggle(sel) });
    W.activeKeyboard = kb;
    $("#scHear").addEventListener("click", () => hearChord(ch));
    startPractice();
  }
  function hearChord(ch) { App.playChord(shape(ch).map(x => x.midi), { dur: 1.8 }); }
  function target() { return chordOf(S().unit, S().root); }
  function startPractice() {
    clearTimeout(buildTimer);
    const ch = target(), sh = shape(ch);
    prac.step = 0; prac.wrongs = 0; prac.done = false; prac.have = []; prac.marks = [];
    kb.setSelected([]); kb.mark([], false);
    $$("#scMode button").forEach(b => b.classList.toggle("on", b.getAttribute("data-pmode") === prac.mode));
    if (prac.mode === "build") {
      $("#scMsg").innerHTML = `<b>Step 1 of ${sh.length}:</b> tap the root, <b>${esc(T.name(ch.root))}</b>. Any octave.`;
      $("#scBtns").innerHTML = `<button class="btn ghost small" id="scShow">Show me</button>`;
    } else {
      $("#scMsg").innerHTML = `Play <b>${esc(ch.symbol)}</b>: tap its ${sh.length} notes, then check.`;
      $("#scBtns").innerHTML = `<button class="btn small" id="scCheck">Check</button><button class="btn ghost small" id="scClear">Clear</button><button class="btn ghost small" id="scShow">Show me</button>`;
    }
    const m = mast(S().unit, S().root);
    $("#scSession").textContent = m.n ? `${T.name(ch.root)}${T.quality(S().unit).sym}: ${m.ok} of ${m.n} right, ${m.run} in a row.` + (rootDone(S().unit, S().root) ? " Learned." : "") : "";
  }
  function onToggle(sel) {
    if (prac.done) return;
    const ch = target(), sh = shape(ch);
    if (prac.mode === "build") {
      const added = sel.filter(m => !(prac.have || []).some(h => h === m))[0];
      if (added == null) { prac.have = sel.slice(); return; }          // a deselect; ignore
      const want = ch.notes[prac.step];
      if (T.mod(added, 12) === want.pc) {
        prac.have = sel.slice();
        kb.mark((prac.marks = (prac.marks || []).concat([{ midi: added, cls: prac.step === 0 ? "root" : "good", label: T.name(want) }])), false);
        prac.step++;
        if (prac.step >= sh.length) return buildDone();
        const d = ch.iv[prac.step], semis = T.degree(d).semis, prevSemis = T.degree(ch.iv[prac.step - 1]).semis;
        $("#scMsg").innerHTML = `<span class="ok">Yes.</span> <b>Step ${prac.step + 1} of ${sh.length}:</b> the ${esc(IV_NAMES[d] || d)} is ${semis} half steps above ${esc(T.name(ch.root))} (${semis - prevSemis} above the last note): <b>${esc(easyName(sh[prac.step].p))}</b>.`;
      } else {
        prac.wrongs++;
        kb.setSelected(sel.filter(m => m !== added));
        const wrongName = T.midiName(added).replace(/-?\d+$/, "");
        $("#scMsg").innerHTML = `<span class="no">That's ${esc(wrongName)}.</span> You want the ${esc(IV_NAMES[ch.iv[prac.step]] || ch.iv[prac.step])} of ${esc(ch.symbol)}: count ${T.degree(ch.iv[prac.step]).semis} half steps up from ${esc(T.name(ch.root))} to <b>${esc(easyName(sh[prac.step].p))}</b>.`;
      }
    }
  }
  function buildDone() {
    const ch = target();
    prac.done = true;
    const m = mast(S().unit, S().root), clean = prac.wrongs === 0;
    m.n++; if (clean) { m.ok++; m.run++; } else m.run = 0;
    App.record("school", S().unit + ":" + S().root, clean, 0);
    if (!quiet()) hearChord(ch);
    const nxt = nextRoot();
    $("#scMsg").innerHTML = `<span class="ok">${clean ? "Clean." : "Built."}</span> <b>${esc(ch.symbol)}</b> is ${esc(ch.notes.map(n => T.name(n)).join(" – "))}.${clean ? "" : " Once more without a slip and it counts."} ${nxt ? `Next: <b>${esc(T.name(T.parseNote(nxt)))}${esc(T.quality(S().unit).sym)}</b>.` : "Every key done."}`;
    $("#scBtns").innerHTML = `<button class="btn small" id="scNext">${nxt ? "Next key ›" : "Again"}</button><button class="btn ghost small" id="scAgain">Same key again</button>`;
    paintRoots();
  }
  function checkTest() {
    if (prac.done) return;
    const ch = target(), sh = shape(ch), picked = kb.selected.slice();
    if (!picked.length) { App.toast("Tap the notes first"); return; }
    const pcs = picked.map(m => T.mod(m, 12)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b), want = ch.pcs.slice().sort((a, b) => a - b);
    const ok = pcs.join() === want.join();
    prac.done = true;
    const m = mast(S().unit, S().root);
    m.n++; if (ok) { m.ok++; m.run++; } else m.run = 0;
    App.record("school", S().unit + ":" + S().root, ok, 0);
    kb.setSelected([]);
    kb.mark(sh.map((x, i) => ({ midi: x.midi, cls: "good", label: T.name(x.p) })).concat(picked.filter(p => want.indexOf(T.mod(p, 12)) < 0).map(p => ({ midi: p, cls: "bad", label: "×" }))), false);
    if (!quiet()) hearChord(ch);
    const nxt = nextRoot();
    $("#scMsg").innerHTML = ok ? `<span class="ok">Right.</span> <b>${esc(ch.symbol)}</b> = ${esc(ch.notes.map(n => T.name(n)).join(" – "))}. ${nxt ? `Next: <b>${esc(T.name(T.parseNote(nxt)))}${esc(T.quality(S().unit).sym)}</b>.` : ""}`
      : `<span class="no">Not quite.</span> <b>${esc(ch.symbol)}</b> is ${esc(ch.notes.map(n => T.name(n)).join(" – "))} (${esc(ch.iv.map(T.degreeText).join(" "))}). The green keys show it; red were extras.`;
    $("#scBtns").innerHTML = `<button class="btn small" id="scNext">${nxt ? "Next key ›" : "Again"}</button><button class="btn ghost small" id="scAgain">Same key again</button>`;
    paintRoots();
  }
  function nextRoot() {
    const u = S().unit, i = FIFTHS.indexOf(S().root);
    for (let k = 1; k <= 12; k++) { const r = FIFTHS[(i + k) % 12]; if (!rootDone(u, r)) return r; }
    return null;
  }
  function paintRoots() {
    const u = S().unit;
    $$("#scRoots button").forEach(b => { const r = b.getAttribute("data-root"), m = mast(u, r); b.classList.toggle("on", r === S().root); b.classList.toggle("done", rootDone(u, r)); b.style.setProperty("--p", Math.min(100, m.run * 50) + "%"); });
    const learned = unitDone(u); const h = $("#v-study .hero p"); if (h) h.textContent = unitById(u).stage + " · " + learned + " of 12 keys learned";
  }
  function showMe() {
    const ch = target(), sh = shape(ch);
    kb.mark(sh.map((x, i) => ({ midi: x.midi, cls: i === 0 ? "root" : "rh", label: T.name(x.p) })), false);
    if (!quiet()) hearChord(ch);
    $("#scMsg").innerHTML = `<b>${esc(ch.symbol)}</b>: ${esc(sh.map(x => easyName(x.p)).join(" – "))}. Look, then clear it and try.`;
    if (prac.mode === "test") $("#scBtns").innerHTML = `<button class="btn small" id="scCheck">Check</button><button class="btn ghost small" id="scClear">Clear</button>`;
    else { prac.done = true; $("#scBtns").innerHTML = `<button class="btn small" id="scAgain">Try it</button>`; }
  }

  /* =====================================================================
     LESSONS
     ===================================================================== */
  const P = (n, o) => T.pitch(T.parseNote(n), o);
  const FIG = {
    trebleLines: el => W.Staff.render(el, { clef: "treble", width: 300, space: 10, items: ["E4", "G4", "B4", "D5", "F5"].map(n => ({ pitches: [T.parsePitch(n)], label: n[0] })) }),
    trebleSpaces: el => W.Staff.render(el, { clef: "treble", width: 300, space: 10, items: ["F4", "A4", "C5", "E5"].map(n => ({ pitches: [T.parsePitch(n)], label: n[0] })) }),
    bassLines: el => W.Staff.render(el, { clef: "bass", width: 300, space: 10, items: ["G2", "B2", "D3", "F3", "A3"].map(n => ({ pitches: [T.parsePitch(n)], label: n[0] })) }),
    bassSpaces: el => W.Staff.render(el, { clef: "bass", width: 300, space: 10, items: ["A2", "C3", "E3", "G3"].map(n => ({ pitches: [T.parsePitch(n)], label: n[0] })) }),
    middleC: el => W.Staff.render(el, { clef: "grand", width: 260, space: 9, items: [{ pitches: [T.parsePitch("C4")], staff: "treble", label: "C4" }, { pitches: [T.parsePitch("C4")], staff: "bass", label: "C4" }] }),
    values: el => W.Staff.leadSheet(el, { sig: 0, time: [4, 4], bars: [{ notes: [{ p: P("B", 4), d: 4 }] }, { notes: [{ p: P("B", 4), d: 2 }, { p: P("B", 4), d: 2 }] }, { notes: [1, 1, 1, 1].map(() => ({ p: P("B", 4), d: 1 })) }, { notes: [1, 2, 3, 4, 5, 6, 7, 8].map(() => ({ p: P("B", 4), d: 0.5 })) }] }, { width: Math.min(560, el.clientWidth || 400), space: 8, perLine: 4 }),
    dotted: el => W.Staff.leadSheet(el, { sig: 0, time: [4, 4], bars: [{ notes: [{ p: P("B", 4), d: 3 }, { p: P("B", 4), d: 1 }] }, { notes: [{ p: P("B", 4), d: 1.5 }, { p: P("B", 4), d: 0.5 }, { p: P("B", 4), d: 2 }] }, { notes: [{ p: P("B", 4), d: 1 }, { p: null, d: 1 }, { p: P("B", 4), d: 0.5 }, { p: P("B", 4), d: 0.5 }, { p: null, d: 1 }] }] }, { width: Math.min(480, el.clientWidth || 400), space: 8, perLine: 3 }),
    sigs: el => W.Staff.render(el, { clef: "treble", width: 300, space: 10, sig: 3, items: [] }),
    sigsFlat: el => W.Staff.render(el, { clef: "treble", width: 300, space: 10, sig: -3, items: [] }),
    intervals: el => W.Staff.render(el, { clef: "treble", width: 340, space: 9, items: [["E4", "2nd"], ["F4", "3rd"], ["G4", "4th"], ["A4", "5th"], ["B4", "6th"], ["C5", "7th"], ["D5", "8ve"]].map(x => ({ pitches: [T.parsePitch("D4"), T.parsePitch(x[0])], label: x[1] })) }),
    scale: el => W.Staff.leadSheet(el, { sig: 0, time: [4, 4], bars: [{ notes: ["C4", "D4", "E4", "F4"].map(n => ({ p: T.parsePitch(n), d: 1 })) }, { notes: ["G4", "A4", "B4", "C5"].map(n => ({ p: T.parsePitch(n), d: 1 })) }] }, { width: Math.min(420, el.clientWidth || 380), space: 9, perLine: 2 }),
    scaleKb: el => { const k = new W.Keyboard(el, { from: 60, to: 72, fit: true, labels: "none", sound: true }); const f = T.fingering(T.parseNote("C"), "major"); k.mark(T.scalePitches(T.scale(T.parseNote("C"), "major"), 4).map((p, i) => ({ midi: p.midi, cls: i === 0 || i === 7 ? "root" : "scale", label: String(f.rh[i] || 5) }))); },
    triads: el => W.Staff.render(el, { clef: "treble", width: 340, space: 9, items: ["C", "Cm", "Cdim", "Caug"].map(s => { const c = T.parseChord(s); return { pitches: T.chordPitches(c, 4, 0), label: c.symbol }; }) }),
    sevenths: el => W.Staff.render(el, { clef: "treble", width: 380, space: 8.5, items: ["Cmaj7", "C7", "Cm7", "Cm7b5", "Cdim7"].map(s => { const c = T.parseChord(s); return { pitches: T.chordPitches(c, 4, 0), label: c.symbol }; }) }),
    inversions: el => W.Staff.render(el, { clef: "treble", width: 300, space: 9, items: [0, 1, 2].map(i => ({ pitches: T.chordPitches(T.parseChord("C"), 4, i), label: ["Root", "1st inv", "2nd inv"][i] })) }),
    lead: el => W.Staff.leadSheet(el, { sig: 0, time: [4, 4], bars: [{ notes: ["E4", "E4", "F4", "G4"].map(n => ({ p: T.parsePitch(n), d: 1 })), chords: [{ beat: 0, text: "C", i: -1 }] }, { notes: ["G4", "F4", "E4", "D4"].map(n => ({ p: T.parsePitch(n), d: 1 })), chords: [{ beat: 0, text: "G7", i: -1 }] }] }, { width: Math.min(420, el.clientWidth || 380), space: 9, perLine: 2 }),
    cadence: el => W.Staff.render(el, { clef: "grand", width: 320, space: 8.5, items: [["Dm7", "ii"], ["G7", "V"], ["Cmaj7", "I"]].map(x => { const c = T.parseChord(x[0]), v = T.voice(c, "lh", null); return { pitches: v.lh.concat(v.rh).map(m => T.spellIn(m, c.notes)), staffEach: v.lh.map(() => "bass").concat(v.rh.map(() => "treble")), label: x[1] + "  " + c.symbol }; }) })
  };
  const fig = (name, cap) => `<div class="paper center" data-fig="${name}"></div>${cap ? `<div class="fig-cap">${esc(cap)}</div>` : ""}`;
  const LESSONS = [
    { id: "staff", title: "The staff and the note names", min: 6, blurb: "Lines, spaces, both clefs, middle C, and ledger lines.", body: `
      <p>Music is written on a <b>staff</b> of five lines. Each line and each space is one letter name, A to G, then it starts again. The <b>clef</b> at the left says which letters go where.</p>
      <h3>Treble clef (the right hand, mostly)</h3>${fig("trebleLines", "Lines, bottom to top: E G B D F. Every Good Boy Does Fine.")}${fig("trebleSpaces", "Spaces spell F A C E.")}
      <h3>Bass clef (the left hand, and the trombone)</h3>${fig("bassLines", "Lines: G B D F A. Good Boys Do Fine Always.")}${fig("bassSpaces", "Spaces: A C E G. All Cows Eat Grass.")}
      <h3>Middle C joins them</h3>${fig("middleC", "Middle C sits on a short ledger line just under the treble staff and just above the bass staff. It is the same key.")}
      <p><b>Ledger lines</b> are little extra lines for notes that spill above or below the staff. Count them the same way: every line and space is one letter.</p>
      <p>The number after a note name is its <b>octave</b>: C4 is middle C, C5 the C above, C3 the C below. Every octave starts on C.</p>
      <p><b>Don't memorise every note by mnemonic forever.</b> Learn a few landmarks cold (middle C, treble G on the second line, bass F on the fourth line, the C's) and read the rest by steps and skips from them. The Note reading drill and the flashcards make this automatic.</p>` },
    { id: "rhythm", title: "Rhythm and time signatures", min: 7, blurb: "Note values, dots, rests, and counting 4/4 and 3/4.", body: `
      <p>How long a note lasts is shown by its shape. In 4/4 the quarter note is the beat.</p>${fig("values", "Whole (4 beats) · two halves (2 each) · four quarters (1 each) · eight eighths (½ each).")}
      <p>A <b>dot</b> adds half the note's value again: a dotted half is 3 beats, a dotted quarter is 1½. A <b>tie</b> (a curve joining two of the same note) adds their lengths. <b>Rests</b> are silences of the same lengths.</p>${fig("dotted", "Dotted half + quarter · dotted quarter + eighth + half · quarter, rest, two eighths, rest.")}
      <h3>Time signatures</h3>
      <p>The top number is <b>how many beats in a bar</b>; the bottom says <b>which note gets the beat</b> (4 = quarter, 8 = eighth). <code>4/4</code> is four quarter beats a bar (count 1 2 3 4). <code>3/4</code> is a waltz: 1 2 3. <code>2/4</code> is a march. <code>6/8</code> has six eighths grouped in two threes, so you feel two big beats: ONE-and-a TWO-and-a.</p>
      <h3>Counting</h3>
      <p>Say the beats out loud: quarters are "1 2 3 4", eighths are "1 & 2 & 3 & 4 &", sixteenths "1 e & a 2 e & a". Clap a bar before you play it. If a rhythm won't sit, halve the tempo and count every subdivision; speed comes back on its own.</p>
      <p>The Rhythm values drill is silent and lives in Train. The metronome in Tools is how you check yourself with sound.</p>` },
    { id: "keys", title: "Sharps, flats and key signatures", min: 7, blurb: "The order of sharps and flats, how to name any key at a glance, and the circle.", body: `
      <p>A <b>sharp</b> (♯) raises a note a half step, a <b>flat</b> (♭) lowers it, a <b>natural</b> (♮) cancels either. Written next to a note, an accidental lasts until the end of the bar.</p>
      <p>A <b>key signature</b> at the start of each line sets the sharps or flats for the whole piece. The sharps always appear in the same order, <b>F C G D A E B</b> (Father Charles Goes Down And Ends Battle); the flats in reverse, <b>B E A D G C F</b> (Battle Ends And Down Goes Charles's Father).</p>
      ${fig("sigs", "Three sharps (F♯ C♯ G♯): A major, or F♯ minor.")}${fig("sigsFlat", "Three flats (B♭ E♭ A♭): E♭ major, or C minor.")}
      <h3>Naming the key in one look</h3>
      <ul><li><b>Sharps:</b> the last sharp, up a half step. Last sharp G♯ → A major.</li><li><b>Flats:</b> the second-to-last flat names the key. B♭ E♭ A♭ → E♭ major. One flat is F major (just memorise it).</li><li><b>Minor:</b> every signature also belongs to a minor key three half steps below the major: A major shares with F♯ minor. Which one you're in is decided by the ear (where the music comes to rest).</li></ul>
      <h3>The circle of fifths</h3>
      <p>Line the keys up so each step clockwise adds a sharp (C G D A E B F♯) and each step counter-clockwise adds a flat (F B♭ E♭ A♭ D♭ G♭). Neighbours share six of seven notes, which is why songs drift between them easily. The Keys tab has it drawn out; the Key signatures drill and the two signature flashcard decks make it fast.</p>` },
    { id: "intervals", title: "Intervals", min: 6, blurb: "Counting letters and half steps; the sound of each one.", body: `
      <p>An <b>interval</b> is the distance between two notes. Its <b>number</b> comes from counting letter names, including both ends: C to E is a 3rd (C D E). Its <b>quality</b> comes from the half steps.</p>${fig("intervals", "From D: a 2nd, 3rd, 4th, 5th, 6th, 7th and an octave.")}
      <div class="lesson"><table><tr><th>Half steps</th><th>Name</th><th>Sounds like</th></tr>
      <tr><td>1</td><td>minor 2nd</td><td>Jaws</td></tr><tr><td>2</td><td>major 2nd</td><td>Happy Birthday (first two notes)</td></tr><tr><td>3</td><td>minor 3rd</td><td>Greensleeves</td></tr><tr><td>4</td><td>major 3rd</td><td>When the Saints</td></tr><tr><td>5</td><td>perfect 4th</td><td>Here Comes the Bride</td></tr><tr><td>6</td><td>tritone</td><td>The Simpsons</td></tr><tr><td>7</td><td>perfect 5th</td><td>Twinkle, Twinkle</td></tr><tr><td>8</td><td>minor 6th</td><td>The Entertainer (3rd–4th note)</td></tr><tr><td>9</td><td>major 6th</td><td>My Bonnie</td></tr><tr><td>10</td><td>minor 7th</td><td>Somewhere (West Side Story)</td></tr><tr><td>11</td><td>major 7th</td><td>Take On Me (chorus)</td></tr><tr><td>12</td><td>octave</td><td>Over the Rainbow</td></tr></table></div>
      <p>Unisons, 4ths, 5ths and octaves are <b>perfect</b>; 2nds, 3rds, 6ths and 7ths are <b>major</b> or <b>minor</b> (a half step smaller). One more half step than major or perfect is <b>augmented</b>; one less than minor or perfect is <b>diminished</b>.</p>
      <p>Chords are just intervals stacked: a major triad is a major 3rd with a minor 3rd on top. Get 3rds and 5ths into your eyes and hands and chord spelling becomes counting.</p>` },
    { id: "scales", title: "Major and minor scales", min: 7, blurb: "The whole-step / half-step pattern, the three minors, and fingering.", body: `
      <p>A <b>major scale</b> is the pattern <b>W W H W W W H</b> (whole steps and half steps) from any note. From C that's all the white keys.</p>${fig("scale", "C major. The half steps fall between E–F and B–C.")}${fig("scaleKb", "Right-hand fingering: 1 2 3 then thumb under, 1 2 3 4 5. The left hand is 5 4 3 2 1 3 2 1.")}
      <p>Every major key uses the same fingering idea: groups of three and four, with the thumb tucking under after 3 or 4. Sharps and flats change which group starts where; the Keys tab shows the standard fingering for all of them.</p>
      <h3>Minor scales</h3>
      <ul><li><b>Natural minor</b>: the notes of the relative major, starting on the 6th. A minor = C major from A. Pattern W H W W H W W.</li><li><b>Harmonic minor</b>: raise the 7th (A B C D E F G♯). That G♯ creates the E7 chord that pulls back to Am.</li><li><b>Melodic minor</b>: raise the 6th and 7th going up (F♯ G♯), natural minor coming down. Smoother to sing.</li></ul>
      <p>Scale <b>degrees</b> have names: 1 tonic, 2 supertonic, 3 mediant, 4 subdominant, 5 dominant, 6 submediant, 7 leading tone. The dominant (5) and leading tone (7) are the ones that pull home; a lot of harmony is just that pull.</p>` },
    { id: "triads", title: "Triads", min: 6, blurb: "Major, minor, diminished, augmented, and inversions.", body: `
      <p>A <b>triad</b> is three notes stacked in 3rds: a root, a 3rd and a 5th. Four kinds, made from two sizes of 3rd:</p>${fig("triads", "C major (4+3), C minor (3+4), C diminished (3+3), C augmented (4+4).")}
      <ul><li><b>Major</b>: root, major 3rd (4 half steps), perfect 5th (7). Bright.</li><li><b>Minor</b>: lower the 3rd one half step. Darker.</li><li><b>Diminished</b>: lower the 5th as well. Tense, wants to move.</li><li><b>Augmented</b>: major with the 5th raised. Floating.</li></ul>
      <h3>Inversions</h3>${fig("inversions", "C E G, then E G C, then G C E: the same chord, a different note on the bottom.")}
      <p>An inversion moves the bottom note up an octave. Inversions let your hand stay put: C → F/C → G/B barely moves, while three root-position chords leap around. On a lead sheet, a plain "F" means any inversion you like: pick the one nearest the chord before it.</p>
      <p>Chord school walks through every triad type in every key with your hands on the keyboard.</p>` },
    { id: "sevenths", title: "Seventh chords and their symbols", min: 8, blurb: "The five sevenths, how symbols are written, and what Δ, ø and ° mean.", body: `
      <p>Add a 7th on top of a triad and you get the chords jazz, pop and gospel run on. Five you must know:</p>${fig("sevenths", "Cmaj7 · C7 · Cm7 · Cm7♭5 · Cdim7")}
      <div class="lesson"><table><tr><th>Symbol</th><th>Also written</th><th>Formula</th><th>Made of</th></tr>
      <tr><td>Cmaj7</td><td>CΔ, CΔ7, CM7</td><td>1 3 5 7</td><td>major triad + major 7th</td></tr><tr><td>C7</td><td></td><td>1 3 5 ♭7</td><td>major triad + minor 7th (dominant)</td></tr><tr><td>Cm7</td><td>C-7, Cmin7</td><td>1 ♭3 5 ♭7</td><td>minor triad + minor 7th</td></tr><tr><td>Cm7♭5</td><td>Cø, Cø7</td><td>1 ♭3 ♭5 ♭7</td><td>diminished triad + minor 7th (half-diminished)</td></tr><tr><td>Cdim7</td><td>C°7</td><td>1 ♭3 ♭5 𝄫7</td><td>diminished triad + diminished 7th</td></tr></table></div>
      <p><b>Reading a symbol:</b> the capital letter is the root. What follows says the quality: nothing or "maj" for major, "m" or "-" for minor, "dim" or "°" for diminished, "+" or "aug" for augmented, "sus" for a suspended 3rd. A plain number (7, 9, 13) means a <b>dominant</b> chord with a flat 7th; "maj7" or Δ means the natural 7th. Things in brackets, like (♭9), alter or add one note. A slash, C/E, puts that note in the bass.</p>
      <p>In a major key, the 7th chords fall in a fixed pattern: Imaj7, iim7, iiim7, IVmaj7, V7, vim7, viim7♭5. Only V is a dominant 7: that's why "G7" means "we're going to C".</p>` },
    { id: "numerals", title: "Roman numerals and progressions", min: 7, blurb: "Chords as numbers, so one pattern works in every key.", body: `
      <p>Number the notes of a scale 1 to 7 and build a triad on each. Written as Roman numerals, upper-case for major, lower-case for minor, ° for diminished:</p>
      <div class="lesson"><table><tr><th>Major key</th><th>I</th><th>ii</th><th>iii</th><th>IV</th><th>V</th><th>vi</th><th>vii°</th></tr><tr><td>in C</td><td>C</td><td>Dm</td><td>Em</td><td>F</td><td>G</td><td>Am</td><td>Bdim</td></tr><tr><td>in G</td><td>G</td><td>Am</td><td>Bm</td><td>C</td><td>D</td><td>Em</td><td>F♯dim</td></tr><tr><td>in E♭</td><td>E♭</td><td>Fm</td><td>Gm</td><td>A♭</td><td>B♭</td><td>Cm</td><td>Ddim</td></tr></table></div>
      <p>Minor keys: i ii° III iv v VI VII, and V is usually made major (with the raised 7th) so it pulls home.</p>
      <h3>Progressions worth owning</h3>
      <ul><li><b>I – V – vi – IV</b>: C G Am F. Half of pop.</li><li><b>I – IV – V</b>: every folk song, and the 12-bar blues (I I I I / IV IV I I / V IV I V).</li><li><b>ii – V – I</b>: Dm7 G7 Cmaj7. Jazz, and the end of most phrases anywhere.</li><li><b>vi – IV – I – V</b>: Am F C G. The same four chords starting from the sad one.</li><li><b>I – vi – IV – V</b>: 50s doo-wop.</li></ul>${fig("cadence", "ii–V–I in C with a close left-hand voicing: the hand barely moves.")}
      <p>Once you think in numerals, transposing is free: play the numbers in the new key. The Keys tab lists every key's chords, and the Roman numerals drill (silent) makes the translation instant.</p>` },
    { id: "leadsheet", title: "Reading a lead sheet", min: 8, blurb: "What's on the page, what isn't, and how to build a left hand.", body: `
      <p>A <b>lead sheet</b> gives you one staff of melody and chord symbols above it. Nothing tells you what the left hand plays: that is yours to build, and it is the most useful skill in popular piano.</p>${fig("lead", "The first two bars of Ode to Joy as a lead sheet.")}
      <h3>The ladder</h3>
      <ol><li><b>Roots only.</b> Right hand melody, left hand just the root of each chord on the beat where the symbol sits.</li><li><b>Blocked chords.</b> Left hand plays the whole triad, choosing the inversion nearest the last one.</li><li><b>Rhythm.</b> Root on beat 1, the rest of the chord on 2 and 3; or roll it as an arpeggio; or root–5th–octave for a ballad.</li><li><b>Shells.</b> Root and 7th only in the left hand, 3rd (and the tune) in the right. Instantly jazzier.</li><li><b>Rootless.</b> Leave the root out and play 3–5–7–9. Hand barely moves through a ii–V–I.</li></ol>
      <p><b>Symbols you'll see:</b> <code>%</code> repeat the last bar · <code>N.C.</code> no chord · <code>C/E</code> E in the bass · <code>Csus</code> = Csus4 · <code>C2</code> = Cadd9 or Csus2 · <code>C4</code> = Csus4 · <code>C5</code> power chord · brackets like <code>C7(♭9)</code> add one altered note · a chord in parentheses is optional.</p>
      <p>The Lead sheets tab does all five ladder steps for any chart, and highlights which melody notes are chord tones. Ask Clef to write out a song you like and you have a lead sheet for it in a minute.</p>` },
    { id: "hands", title: "Hands, fingers and posture", min: 5, blurb: "Sitting, curved fingers, thumb-under, and the fingerings that never change.", body: `
      <p><b>Sit</b> so your forearms are level with the keys, elbows a little in front of your body, feet flat. Shoulders down. If you're tense in the neck, the sound is tense.</p>
      <p><b>Curve the fingers</b> as if holding a ball; play from the fingertip, not the pad; keep the wrist loose and level. The thumb plays on its side. Weight comes from the arm, not from pressing.</p>
      <h3>Fingering that always works</h3>
      <ul><li><b>Scales:</b> right hand 1 2 3 1 2 3 4 5 going up; left hand 5 4 3 2 1 3 2 1. Thumb never on a black key in the standard fingerings.</li><li><b>Triads, root position:</b> right 1 3 5, left 5 3 1. First inversion right 1 2 5; second inversion right 1 3 5.</li><li><b>Four-note chords:</b> right 1 2 3 5, left 5 3 2 1.</li><li><b>Octaves:</b> 1 and 5, wrist loose, drop from above.</li></ul>
      <p>Write fingering in when a passage breaks down: nine times out of ten, the fix is a different finger, not more repetition. Practise hands separately until each is easy, then together at half speed.</p>` },
    { id: "terms", title: "Dynamics, articulation and tempo words", min: 5, blurb: "The Italian on the page, decoded.", body: `
      <div class="lesson"><table><tr><th>Mark</th><th>Means</th></tr>
      <tr><td>pp · p · mp</td><td>very soft · soft · medium soft</td></tr><tr><td>mf · f · ff</td><td>medium loud · loud · very loud</td></tr><tr><td>cresc. / &lt;</td><td>gradually louder</td></tr><tr><td>dim. / decresc. / &gt;</td><td>gradually softer</td></tr><tr><td>sfz · fp</td><td>sudden accent · loud then instantly soft</td></tr>
      <tr><td>legato (slur)</td><td>smooth, connected</td></tr><tr><td>staccato (dot)</td><td>short, detached</td></tr><tr><td>tenuto (line)</td><td>held full length, leaned on</td></tr><tr><td>accent (&gt;)</td><td>this note louder</td></tr><tr><td>fermata</td><td>hold longer than written</td></tr>
      <tr><td>largo · adagio · andante</td><td>very slow (≈40–60) · slow (≈60–76) · walking (≈76–108)</td></tr><tr><td>moderato · allegro · presto</td><td>moderate (≈108–120) · fast (≈120–168) · very fast (168+)</td></tr><tr><td>rit. / rall.</td><td>gradually slower</td></tr><tr><td>accel.</td><td>gradually faster</td></tr><tr><td>a tempo</td><td>back to the original speed</td></tr><tr><td>rubato</td><td>freely, stretching the time</td></tr>
      <tr><td>D.C. al Fine</td><td>go back to the start, play to "Fine"</td></tr><tr><td>D.S. al Coda</td><td>go back to the sign 𝄋, then jump to the coda 𝄌</td></tr><tr><td>8va / 8vb</td><td>an octave higher / lower than written</td></tr><tr><td>simile</td><td>keep doing the same (pedal, pattern)</td></tr></table></div>
      <p>The Terms flashcard deck has these and more.</p>` },
    { id: "pedal", title: "The sustain pedal", min: 4, blurb: "When to press, when to change, and the one rule beginners break.", body: `
      <p>The right pedal lifts every damper so notes ring after you let go. It makes the piano sing, and it makes everything mush if you hold it through a chord change.</p>
      <p><b>The rule:</b> change the pedal <b>when the harmony changes</b>, and change it <b>just after</b> you play the new chord, not with it. Play the chord, then lift and re-press the pedal in one quick motion. That is "legato pedalling": the old chord clears, the new one is caught.</p>
      <ol><li>Play C. Press the pedal. Lift your hand: it rings.</li><li>Play F. As the F sounds, lift the pedal and press it again straight away. Only F rings.</li><li>Do the same through C – F – G – C. Listen for any smear; if there is one, the pedal came up too late.</li></ol>
      <p>Less is more: melodies that move by step usually want no pedal at all. On the Piano page, the pedal button and the space bar work exactly like the real thing, so you can practise the timing.</p>` },
    { id: "practice", title: "How to practise", min: 5, blurb: "Small chunks, slow tempo, hands apart, and why short daily sessions win.", body: `
      <ul><li><b>Daily beats long.</b> Twenty minutes every day builds more than two hours on Sunday. Skills settle in during sleep.</li><li><b>Chunk it.</b> Never play a whole piece through and hope. Take two bars, fix them, join them to the next two.</li><li><b>Slow enough to be right.</b> Find the tempo where you can play a passage perfectly three times in a row; that is today's tempo. Then add 4 bpm.</li><li><b>Hands apart first.</b> Each hand alone until it is easy, then together at half speed.</li><li><b>Stop at the mistake.</b> When a bar breaks, don't restart from the top: loop that bar, starting one beat before it.</li><li><b>Say it out loud.</b> Count rhythms, name chords, sing the melody. What you can say, you can play.</li><li><b>Finish with music.</b> End every session playing something you already know well, so you leave the piano feeling good about it.</li></ul>
      <p>The Today tab builds an 18-minute session from these ideas: a scale, chord school, a lead sheet, a drill. Tick them off and the streak takes care of itself.</p>` }
  ];

  /* =====================================================================
     FLASHCARDS
     ===================================================================== */
  const TERMS = [["allegro", "fast and lively"], ["andante", "at a walking pace"], ["adagio", "slow"], ["largo", "very slow, broad"], ["presto", "very fast"], ["moderato", "moderate speed"], ["vivace", "lively, brisk"], ["lento", "slow"], ["ritardando (rit.)", "gradually slower"], ["accelerando", "gradually faster"], ["a tempo", "back to the original speed"], ["crescendo", "gradually louder"], ["diminuendo", "gradually softer"], ["forte (f)", "loud"], ["piano (p)", "soft"], ["mezzo", "medium (mf, mp)"], ["fortissimo (ff)", "very loud"], ["pianissimo (pp)", "very soft"], ["legato", "smooth and connected"], ["staccato", "short and detached"], ["fermata", "hold the note longer"], ["da capo (D.C.)", "from the beginning"], ["dal segno (D.S.)", "from the sign"], ["coda", "the tail: an ending section"], ["fine", "the end"], ["rubato", "with freedom in the tempo"], ["sforzando (sfz)", "a sudden strong accent"], ["tenuto", "held for full value"], ["marcato", "marked, accented"], ["sempre", "always"], ["poco a poco", "little by little"], ["molto", "very, much"], ["con moto", "with motion"], ["cantabile", "in a singing style"], ["dolce", "sweetly"], ["8va", "an octave higher than written"]];
  const noteCard = (clef, midi) => { const p = T.spellIn(midi, null); return { k: clef + midi, front: el => { el.innerHTML = '<div class="paper-in paper center"></div>'; W.Staff.render(el.firstChild, { clef: clef, width: 220, space: 12, items: [{ pitches: [p] }] }); }, a: T.pitchName(p), hint: clef === "treble" ? "Lines E G B D F, spaces F A C E" : "Lines G B D F A, spaces A C E G" }; };
  const DECKS = [
    { id: "treble", name: "Treble notes", blurb: "D4 to G5 on the staff.", cards: () => [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 60, 59, 57, 81, 83, 84].map(m => noteCard("treble", m)) },
    { id: "bassnotes", name: "Bass notes", blurb: "F2 to E4 in bass clef. Left hand, and trombone.", cards: () => [41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 40, 38, 36].map(m => noteCard("bass", m)) },
    { id: "sigmaj", name: "Key signatures: major", blurb: "See the signature, say the major key.", cards: () => { const out = []; for (let s = -7; s <= 7; s++) out.push({ k: "s" + s, front: el => { el.innerHTML = '<div class="paper-in paper center"></div>'; W.Staff.render(el.firstChild, { clef: "treble", sig: s, width: 230, space: 11, items: [] }); }, a: T.keyName(T.keyFromSig(s, "major")), hint: s > 0 ? "Last sharp, up a half step" : s < 0 ? "Second-to-last flat names it" : "No sharps or flats" }); return out; } },
    { id: "sigmin", name: "Key signatures: minor", blurb: "The same signatures, the relative minor.", cards: () => { const out = []; for (let s = -7; s <= 7; s++) out.push({ k: "s" + s, front: el => { el.innerHTML = '<div class="paper-in paper center"></div>'; W.Staff.render(el.firstChild, { clef: "treble", sig: s, width: 230, space: 11, items: [] }); }, a: T.keyName(T.keyFromSig(s, "minor")), hint: "Three half steps below the major key" }); return out; } },
    { id: "intervals", name: "Intervals", blurb: "Half-step counts both ways.", cards: () => { const out = []; for (let s = 1; s <= 12; s++) { const top = T.spellIn(60 + s, null); out.push({ k: "n" + s, q: T.INTERVAL_NAMES[s], a: s + " half step" + (s > 1 ? "s" : "") + " · C to " + T.name(top), hint: "Count the half steps" }); out.push({ k: "c" + s, q: "C up to " + T.name(top), a: T.INTERVAL_NAMES[s] + " (" + s + " half steps)", hint: "Letters give the number, half steps the quality" }); } return out; } },
    { id: "symbols", name: "Chord symbols → notes", blurb: "Read a symbol, spell the chord.", cards: () => { const out = []; ["C", "F", "G", "D", "Bb", "Eb", "A", "Ab"].forEach(r => ["", "m", "dim", "7", "maj7", "m7", "sus4", "m7b5"].forEach(q => { const ch = T.parseChord(r + q); out.push({ k: r + q, q: ch.symbol, sym: true, a: ch.notes.map(n => T.name(n)).join("  "), hint: ch.spoken }); })); return out; } },
    { id: "formulas", name: "Chord formulas", blurb: "Each chord type as scale degrees.", cards: () => UNITS.map(u => { const ch = chordOf(u.id, "C"); return { k: u.id, q: u.name + (ch.symbol !== "C" ? " (" + ch.symbol + ")" : " (C)"), a: ch.iv.map(T.degreeText).join(" "), hint: u.derive.split(".")[0] }; }) },
    { id: "terms", name: "Terms on the page", blurb: "Tempo, dynamics and articulation words.", cards: () => TERMS.map(t => ({ k: t[0], q: t[0], a: t[1], hint: "" })) },
    { id: "degrees", name: "Scale degrees", blurb: "The 6th of A♭? The dominant of E? Names and numbers.", cards: () => { const out = []; ["tonic", "supertonic", "mediant", "subdominant", "dominant", "submediant", "leading tone"].forEach((n, i) => out.push({ k: "d" + i, q: "Degree " + (i + 1) + " is called…", a: n, hint: "" })); FIFTHS.forEach((k, i) => { const key = T.parseKey(k), notes = T.keyScale(key).notes, d = (i * 5) % 6 + 1; out.push({ k: "k" + k, q: T.ordinal(d + 1) + " degree of " + T.keyName(key), a: T.name(notes[d]), hint: notes.map(x => T.name(x)).join(" ") }); }); return out; } },
    { id: "numerals", name: "Roman numerals", blurb: "IV in E major, vi in F, V7 in B♭…", cards: () => { const out = []; FIFTHS.forEach((k, i) => { const key = T.parseKey(k), dia = T.diatonicChords(key); [1, 3, 4, 5].forEach(j => { const d = dia[j]; out.push({ k: k + d.numeral, q: d.numeral + " in " + T.keyName(key), a: d.chord.symbol, hint: dia.map(x => x.numeral + "=" + x.chord.symbol).join("  ") }); }); }); return out; } },
    { id: "tbn", name: "Trombone positions", blurb: "A note in bass clef, the slide position.", cards: () => [46, 45, 44, 43, 42, 41, 40, 53, 52, 51, 50, 49, 48, 47, 58, 57, 56, 55, 62, 60, 65, 63, 70].map(m => { const p = T.spellIn(m, null, "flat"), ps = W.Tbn ? W.Tbn.positions(m) : []; return { k: "t" + m, front: el => { el.innerHTML = '<div class="paper-in paper center"></div>'; W.Staff.render(el.firstChild, { clef: "bass", width: 220, space: 12, items: [{ pitches: [p] }] }); }, a: T.pitchName(p) + " · " + (ps.length ? W.Tbn.ORD[ps[0].pos] + " position" + (ps.length > 1 && ps[1].partial !== 7 ? " (or " + W.Tbn.ORD[ps[1].pos] + ")" : "") : ""), hint: "Each position out is a half step lower" }; }) }
  ];
  let deck = null, cards = [], card = null, flipped = false, lastKey = "";
  const boxes = id => (S().cards[id] = S().cards[id] || {});
  function openDeck(id) {
    deck = DECKS.filter(d => d.id === id)[0]; if (!deck) return;
    cards = deck.cards(); card = null; lastKey = "";
    S().deck = id; App.save();
    nextCard(false);
  }
  function nextCard(paint) {
    const bx = boxes(deck.id), pool = [];
    cards.forEach(c => { if (c.k === lastKey && cards.length > 1) return; const b = bx[c.k] || 0; for (let i = 0; i < 4 - b; i++) pool.push(c); if (b === 3 && Math.random() < 0.25) pool.push(c); });
    card = App.pick(pool.length ? pool : cards); lastKey = card.k; flipped = false;
    if (paint !== false) paintCard();
  }
  function paintCard() {
    const el = $("#flash"), bx = boxes(deck.id), known = cards.filter(c => (bx[c.k] || 0) >= 3).length;
    $("#deckName").textContent = deck.name; $("#deckProg").textContent = known + " of " + cards.length + " known";
    $("#deckMeter").style.width = Math.round(100 * known / cards.length) + "%";
    if (!flipped) {
      if (card.front) { el.innerHTML = ""; card.front(el); el.insertAdjacentHTML("beforeend", '<div class="tap">Tap to flip</div>'); }
      else el.innerHTML = `<div><div class="q ${card.sym ? "sym" : ""}">${esc(card.q)}</div><div class="tap">Tap to flip</div></div>`;
      $("#flashBtns").hidden = true;
    } else {
      el.innerHTML = `<div><div class="a">${esc(card.a)}</div>${card.hint ? `<div class="hint">${esc(card.hint)}</div>` : ""}</div>`;
      $("#flashBtns").hidden = false;
    }
  }
  function gradeCard(g) {
    const bx = boxes(deck.id), b = bx[card.k] || 0;
    bx[card.k] = g === 0 ? 0 : g === 1 ? Math.max(0, Math.min(2, b)) : Math.min(3, b + 1);
    App.record("cards", deck.id + ":" + card.k, g === 2, 0);
    nextCard();
  }

  /* =====================================================================
     GLOSSARY
     ===================================================================== */
  const GLOSS = [["Accidental", "A sharp, flat or natural written next to a note; it lasts to the end of the bar."], ["Arpeggio", "A chord played one note at a time."], ["Bar (measure)", "The space between two bar lines, holding the number of beats the time signature says."], ["Cadence", "A chord move that ends a phrase: V–I (full), IV–I (plagal, the ‘amen’), ending on V (half)."], ["Chord tone", "A note that belongs to the current chord. Melody notes that aren't chord tones are passing or neighbour notes."], ["Chromatic", "Moving by half steps; using notes outside the key."], ["Comping", "Playing the chords in rhythm under a melody or a soloist."], ["Diatonic", "Using only the notes of the key."], ["Dominant", "The 5th degree of the scale, and the chord built on it (V). It pulls home to I."], ["Enharmonic", "Two names for the same key: F♯ and G♭."], ["Extension", "A 9th, 11th or 13th added above a seventh chord."], ["Fake book", "A collection of lead sheets."], ["Half step (semitone)", "The smallest step on the piano: any key to the very next one."], ["Harmony", "The chords, and how they follow each other."], ["Interval", "The distance between two notes, named by counting letters (3rd, 5th) and half steps (major, minor, perfect)."], ["Inversion", "The same chord with a different note on the bottom."], ["Key", "The home note and scale a piece is built around."], ["Lead sheet", "Melody plus chord symbols, nothing else written out."], ["Ledger line", "A short line for notes above or below the staff."], ["Modulation", "Changing key in the middle of a piece."], ["Octave", "The same letter name eight notes up: twelve half steps."], ["Passing chord", "A chord placed between two others to connect them, often a dim7."], ["Pedal tone", "One bass note held under changing chords."], ["Pickup (anacrusis)", "A short bar of notes before the first full bar."], ["Relative keys", "A major and a minor key with the same key signature: C major and A minor."], ["Rootless voicing", "A jazz left-hand chord that leaves out the root: 3–5–7–9."], ["Shell voicing", "Root and 7th (or root and 3rd) only."], ["Slash chord", "C/E: a C chord with E as the lowest note."], ["Suspension (sus)", "The 3rd of a chord replaced by the 4th or 2nd, wanting to resolve."], ["Tonic", "The home note of the key, degree 1, and the chord on it (I)."], ["Transpose", "Move a whole piece to another key."], ["Triad", "A three-note chord in 3rds: root, 3rd, 5th."], ["Tritone", "Six half steps, half an octave. The restless interval inside every dominant 7th."], ["Turnaround", "The chords at the end of a section that lead back to the top, like I–vi–ii–V."], ["Voice leading", "Moving each note of one chord to the nearest note of the next, so the hands barely travel."], ["Voicing", "Which notes of a chord you play, in which octave and hand."], ["Whole step (tone)", "Two half steps: C to D."]];

  /* =====================================================================
     THE VIEW
     ===================================================================== */
  const TABS = [["school", "Chord school"], ["lessons", "Lessons"], ["cards", "Flashcards"], ["drills", "Quiet drills"], ["glossary", "Glossary"]];
  const view = W.views.study = {
    mount(el) {
      el.innerHTML = `
        <div class="hero" style="margin-bottom:12px"><h1>Study</h1><p>The quiet room. Everything here works with the sound off: learn chords from the ground up, read, drill with flashcards, and take the silent drills anywhere. <span class="quiet-badge"><i></i>No sound needed</span></p></div>
        <div class="row between"><div class="seg" id="stTabs">${TABS.map(t => `<button data-tab="${t[0]}">${esc(t[1])}</button>`).join("")}</div><button class="btn ghost small" id="stMute"></button></div>
        <div class="mt" id="stBody"></div>`;
      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("[data-tab]"))) { S().tab = b.getAttribute("data-tab"); S().unitOpen = false; S().lesson = ""; S().deck = ""; App.save(); this.paint(); }
        else if (e.target.closest("#stMute")) { App.setMuted(!state.settings.muted); this.paintMute(); }
        else if ((b = e.target.closest("[data-unit]"))) { S().unit = b.getAttribute("data-unit"); S().unitOpen = true; S().tab = "school"; App.save(); this.paint(); window.scrollTo(0, 0); }
        else if ((b = e.target.closest("[data-school]"))) { S().unitOpen = false; App.save(); this.paint(); }
        else if ((b = e.target.closest("[data-root]"))) { S().root = b.getAttribute("data-root"); App.save(); paintUnit($("#stBody")); }
        else if ((b = e.target.closest("[data-pmode]"))) { prac.mode = b.getAttribute("data-pmode"); startPractice(); }
        else if (e.target.closest("#scCheck")) checkTest();
        else if (e.target.closest("#scClear")) { kb.setSelected([]); }
        else if (e.target.closest("#scShow")) showMe();
        else if (e.target.closest("#scNext")) { const n = nextRoot(); if (n) S().root = n; App.save(); paintUnit($("#stBody")); }
        else if (e.target.closest("#scAgain")) startPractice();
        else if ((b = e.target.closest("[data-lesson]"))) { S().lesson = b.getAttribute("data-lesson"); S().seen[S().lesson] = true; App.save(); this.paint(); window.scrollTo(0, 0); }
        else if ((b = e.target.closest("[data-deck]"))) { openDeck(b.getAttribute("data-deck")); this.paint(); }
        else if (e.target.closest("#deckBack")) { deck = null; S().deck = ""; App.save(); this.paint(); }
        else if (e.target.closest("#flash") && deck) { flipped = !flipped; paintCard(); }
        else if ((b = e.target.closest("[data-grade]")) && deck) gradeCard(+b.getAttribute("data-grade"));
        else if (e.target.closest("#deckReset") && deck) { S().cards[deck.id] = {}; App.save(); nextCard(); }
      });
      document.addEventListener("keydown", e => {
        if (App.current !== "study" || !deck || e.metaKey || e.ctrlKey || /input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); flipped = !flipped; paintCard(); }
        else if (flipped && /^[123]$/.test(e.key)) gradeCard(+e.key - 1);
      });
      $("#stBody").addEventListener("input", e => { if (e.target.id === "glSearch") this.paintGlossary(e.target.value); });
    },
    paintMute() { const b = $("#stMute"); if (b) b.textContent = state.settings.muted ? "Quiet mode on · tap for sound" : "Sound on · tap for quiet mode"; },
    paint() {
      const tab = S().tab || "school", body = $("#stBody");
      $$("#stTabs button").forEach(b => b.classList.toggle("on", b.getAttribute("data-tab") === tab));
      this.paintMute();
      if (kb) { kb.destroy(); kb = null; }
      if (tab === "school") { if (S().unitOpen) paintUnit(body); else paintSchoolHome(body); }
      else if (tab === "lessons") this.paintLessons(body);
      else if (tab === "cards") this.paintCards(body);
      else if (tab === "drills") this.paintDrills(body);
      else this.paintGlossary("");
    },
    paintLessons(body) {
      const L = LESSONS.filter(l => l.id === S().lesson)[0];
      if (!L) {
        const read = LESSONS.filter(l => S().seen[l.id]).length;
        body.innerHTML = `<p class="sub">${LESSONS.length} short lessons, ${read} read. Each one ends with the drill or flashcards that make it stick.</p><div class="lesson-list mt-s">${LESSONS.map(l => `<button class="tile ${S().seen[l.id] ? "read" : ""}" data-lesson="${l.id}"><b>${esc(l.title)}<small>${l.min} min</small></b><span>${esc(l.blurb)}</span></button>`).join("")}</div>`;
        return;
      }
      const i = LESSONS.indexOf(L), prev = LESSONS[i - 1], next = LESSONS[i + 1];
      const links = { staff: [["Note reading drill", "#/train?d=read&quiet=1"], ["Treble flashcards", "#/study?tab=cards&deck=treble"], ["Bass flashcards", "#/study?tab=cards&deck=bassnotes"]], rhythm: [["Rhythm values drill", "#/train?d=rhythm"], ["Metronome", "#/tools"]], keys: [["Key signatures drill", "#/train?d=sig&quiet=1"], ["Major flashcards", "#/study?tab=cards&deck=sigmaj"], ["Circle of fifths", "#/keys"]], intervals: [["Written intervals drill", "#/train?d=wint"], ["Interval flashcards", "#/study?tab=cards&deck=intervals"], ["Ear: intervals (sound)", "#/train?d=interval"]], scales: [["Scale degrees drill", "#/train?d=degree"], ["Scales with fingering", "#/keys"]], triads: [["Chord school: major", "#/study?unit=maj"], ["Chord school: diminished", "#/study?unit=dim"]], sevenths: [["Chord school: dominant 7th", "#/study?unit=7"], ["Symbol flashcards", "#/study?tab=cards&deck=symbols"], ["Play the chord (drill)", "#/train?d=spell&quiet=1"]], numerals: [["Roman numerals drill", "#/train?d=numeral"], ["Numeral flashcards", "#/study?tab=cards&deck=numerals"]], leadsheet: [["Lead sheets", "#/sheet"], ["Ask Clef to write a song", "#clef-write"]], hands: [["Scales with fingering", "#/keys"]], terms: [["Terms flashcards", "#/study?tab=cards&deck=terms"]], pedal: [["Piano page", "#/piano"]], practice: [["Today's session", "#/today"]] }[L.id] || [];
      body.innerHTML = `<div class="row between"><button class="btn ghost small" data-lesson="">‹ All lessons</button><div class="row gap-s">${prev ? `<button class="btn ghost small" data-lesson="${prev.id}">‹ Previous</button>` : ""}${next ? `<button class="btn ghost small" data-lesson="${next.id}">Next: ${esc(next.title)} ›</button>` : ""}</div></div>
        <article class="card lesson mt"><h2>${esc(L.title)}</h2><p class="sub mt-s">${esc(L.blurb)} · ${L.min} min read</p><div class="prose mt">${L.body}</div>
        ${links.length ? `<div class="row mt-l">${links.map(l => l[1] === "#clef-write" ? `<button class="btn ghost small" onclick="W.Tutor.open('write')">${esc(l[0])}</button>` : `<a class="btn ${l === links[0] ? "" : "ghost"} small" href="${l[1]}">${esc(l[0])}</a>`).join("")}</div>` : ""}</article>`;
      $$("[data-fig]", body).forEach(el => { const f = FIG[el.getAttribute("data-fig")]; if (f) App.paper(el, () => f(el)); });
    },
    paintCards(body) {
      if (!deck) {
        body.innerHTML = `<p class="sub">Tap a card to flip it, then say how it went. Cards you miss come back sooner; three "got it"s in a row and a card is known.</p><div class="decks mt-s">${DECKS.map(d => { const bx = boxes(d.id), n = d.cards().length, known = Object.keys(bx).filter(k => bx[k] >= 3).length; return `<button class="tile" data-deck="${d.id}"><b>${esc(d.name)}</b><span>${esc(d.blurb)}</span><div class="acc">${known} of ${n} known</div><div class="meter"><i style="width:${Math.round(100 * known / n)}%"></i></div></button>`; }).join("")}</div>`;
        return;
      }
      body.innerHTML = `<div class="row between"><button class="btn ghost small" id="deckBack">‹ All decks</button><span class="sub mono" id="deckProg"></span></div>
        <div class="card mt"><div class="row between"><h2 class="title" id="deckName"></h2><button class="btn ghost small" id="deckReset">Start over</button></div><div class="meter mt-s"><i id="deckMeter"></i></div>
        <div class="flash mt" id="flash" role="button" tabindex="0"></div>
        <div class="flash-btns" id="flashBtns" hidden><button class="btn ghost" data-grade="0">Again</button><button class="btn ghost" data-grade="1">Hard</button><button class="btn" data-grade="2">Got it</button></div>
        <p class="sub mt-s" style="text-align:center">Space flips · 1, 2, 3 to answer</p></div>`;
      paintCard();
    },
    paintDrills(body) {
      const D = (W.DRILLS || []).filter(d => d.quiet), loud = (W.DRILLS || []).filter(d => !d.quiet && d.id !== "interval" && d.id !== "quality");
      const tile = (d, q) => { const acc = App.accuracy(d.id); return `<a class="tile" href="#/train?d=${d.id}${q ? "&quiet=1" : ""}"><b>${esc(d.name)}</b><span>${esc(d.blurb)}</span><div class="acc">${acc == null ? "Not tried yet" : acc + "% so far"}</div></a>`; };
      body.innerHTML = `<p class="sub">Drills that show you everything and play you nothing. The second group normally makes sound, but opened from here it stays silent.</p>
        <div class="drills mt-s">${D.map(d => tile(d, false)).join("")}</div>
        <div class="group-label" style="margin-top:20px">Silent versions</div><div class="drills">${loud.map(d => tile(d, true)).join("")}</div>`;
    },
    paintGlossary(qs) {
      const body = $("#stBody"), q = (qs || "").trim().toLowerCase();
      const hits = GLOSS.filter(g => !q || g[0].toLowerCase().indexOf(q) >= 0 || g[1].toLowerCase().indexOf(q) >= 0);
      if (!body.querySelector("#glSearch")) body.innerHTML = `<label class="field">Search<input type="text" id="glSearch" placeholder="tritone, sus, voicing…" autocomplete="off"></label><dl class="gloss mt" id="glList"></dl>`;
      $("#glList").innerHTML = hits.map(g => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join("") || `<dd class="sub">Nothing for “${esc(qs)}”. Ask Clef.</dd>`;
    },
    show(params) {
      if (params.unit && UNITS.some(u => u.id === params.unit)) { S().tab = "school"; S().unit = params.unit; S().unitOpen = true; }
      else if (params.tab) { S().tab = params.tab; S().unitOpen = false; if (params.tab !== "cards") deck = null; }
      if (params.deck) { S().tab = "cards"; openDeck(params.deck); }
      else if (S().tab === "cards" && S().deck && !deck) openDeck(S().deck);
      if (params.lesson) { S().tab = "lessons"; S().lesson = params.lesson; S().seen[params.lesson] = true; }
      if (params.unit || params.tab || params.deck || params.lesson) history.replaceState(null, "", "#/study");
      App.save();
      this.paint();
    },
    hide() { clearTimeout(buildTimer); if (kb) { kb.destroy(); kb = null; } }
  };
})();
