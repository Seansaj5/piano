/* Train: short drills with instant feedback. Each drill makes questions; this file runs them, keeps score,
   and leans toward whatever you have been missing. */
(function () {
  "use strict";
  const W = self.W, T = W.T, A = W.Audio, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc, state = App.state;
  const pick = App.pick, shuffle = App.shuffle;
  const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const SONG_HINT = ["", "the ‘Jaws’ theme", "‘Happy Birthday’ (first two different notes)", "‘Greensleeves’", "‘When the Saints’", "‘Here Comes the Bride’", "‘The Simpsons’ theme", "‘Twinkle, Twinkle’", "‘The Entertainer’ (third to fourth note)", "‘My Bonnie’", "‘Somewhere’ from West Side Story", "‘Take On Me’ chorus", "‘Over the Rainbow’"];

  const opt = (drill, id, fallback) => { const o = state.train[drill] || {}; return o[id] == null ? fallback : o[id]; };

  /* ---------- the drills ---------- */
  const DRILLS = W.DRILLS = [
    {
      id: "read", name: "Note reading", blurb: "A note on the staff. Name it before you can think about it.",
      options: [{ id: "clef", choices: [["treble", "Treble"], ["bass", "Bass"], ["both", "Both clefs"]], def: "treble" }, { id: "ledger", choices: [["no", "On the staff"], ["yes", "With ledger lines"]], def: "no" }],
      make() {
        const clefOpt = opt("read", "clef", "treble"), clef = clefOpt === "both" ? pick(["treble", "bass"]) : clefOpt;
        const ledger = opt("read", "ledger", "no") === "yes", lo = ledger ? -4 : -1, hi = ledger ? 12 : 9;
        const step = lo + Math.floor(Math.random() * (hi - lo + 1)), idx = step + (clef === "treble" ? 30 : 18);
        const p = T.pitch(T.note(T.mod(idx, 7), 0), Math.floor(idx / 7));
        const side = step < 0 ? "below" : "above", out = step < 0 ? -step : step - 8, even = out % 2 === 0;
        const where = step >= 0 && step <= 8 ? (step % 2 === 0 ? "on line " + (step / 2 + 1) + " of the " + clef + " staff, counting from the bottom" : "in space " + ((step + 1) / 2) + " of the " + clef + " staff, counting from the bottom")
          : out === 1 ? "just " + side + " the " + clef + " staff, touching the " + (step < 0 ? "bottom" : "top") + " line"
          : even ? "on the " + T.ordinal(out / 2) + " ledger line " + side + " the " + clef + " staff" : "just " + side + " the " + T.ordinal((out - 1) / 2) + " ledger line " + side + " the " + clef + " staff";
        const memo = clef === "treble" ? "Treble lines, bottom to top: E G B D F. Spaces spell F A C E." : "Bass lines, bottom to top: G B D F A. Spaces: A C E G.";
        return {
          item: clef + ":" + T.pitchName(p), kind: "letters", ask: "Which note is this?", answer: LETTERS[p.l], midi: p.midi,
          render(box) { box.innerHTML = `<div class="paper center" style="max-width:260px;margin:0 auto" id="qStaff"></div>`; W.Staff.render($("#qStaff"), { clef: clef, width: 230, space: 13, items: [{ pitches: [p] }], aria: "A note on the " + clef + " staff" }); },
          reveal(box, ok) { box.innerHTML = `<div class="paper center" style="max-width:260px;margin:0 auto" id="qStaff"></div><div class="kb mini dense mt" id="qKb"></div>`; W.Staff.render($("#qStaff"), { clef: clef, width: 230, space: 13, items: [{ pitches: [p], cls: ok ? "good" : "bad", label: T.pitchName(p) }] }); const k = new W.Keyboard($("#qKb"), { from: 36, to: 84, fit: true, labels: "c", sound: true }); k.mark([{ midi: p.midi, cls: "good", label: LETTERS[p.l] }]); A.play([p.midi], { dur: 1 }); },
          explain: `${T.pitchName(p)} sits ${where}. ${memo}`
        };
      }
    },
    {
      id: "sig", name: "Key signatures", blurb: "See the sharps or flats, say the key. Both the major and its relative minor.",
      options: [{ id: "mode", choices: [["major", "Major"], ["minor", "Minor"], ["both", "Both"]], def: "major" }, { id: "range", choices: [["4", "Up to 4 ♯/♭"], ["7", "All 15"]], def: "4" }],
      make() {
        const max = +opt("sig", "range", "4"), sig = Math.floor(Math.random() * (max * 2 + 1)) - max;
        const modeOpt = opt("sig", "mode", "major"), mode = modeOpt === "both" ? pick(["major", "minor"]) : modeOpt;
        const key = T.keyFromSig(sig, mode), near = shuffle([sig - 1, sig + 1, sig - 2, sig + 2, sig + 3, sig - 3].filter(s => Math.abs(s) <= 7)).slice(0, 2).map(s => T.keyFromSig(s, mode));
        const trap = T.keyFromSig(sig, mode === "major" ? "minor" : "major"), trapAsAsked = T.key(trap.tonic, mode);
        const wrong = near.concat(trapAsAsked.valid && trapAsAsked.sig !== sig ? [trapAsAsked] : [T.keyFromSig(sig > 0 ? sig - 4 : sig + 4, mode)]);
        const rule = sig === 0 ? "No sharps or flats: C major, or A minor." : sig > 0
          ? `The last sharp is ${T.name(T.sigNotes(sig)[sig - 1])}. Up a half step gives ${T.keyName(T.keyFromSig(sig, "major"))}.`
          : sig === -1 ? "One flat is F major. It is the one you simply memorise." : `The second-to-last flat is ${T.name(T.sigNotes(sig)[-sig - 2])}, and that names the key: ${T.keyName(T.keyFromSig(sig, "major"))}.`;
        return {
          item: mode + ":" + sig, kind: "choice", ask: `Which ${mode} key has this signature?`, answer: T.keyName(key),
          choices: shuffle([key].concat(wrong)).map(k => T.keyName(k)).filter((v, i, a) => a.indexOf(v) === i),
          render(box) { box.innerHTML = `<div class="paper center" style="max-width:280px;margin:0 auto" id="qStaff"></div>`; W.Staff.render($("#qStaff"), { clef: "treble", sig: sig, width: 240, space: 12, items: [] }); },
          explain: rule + (mode === "minor" ? ` Its relative minor, three half steps lower, is ${T.keyName(key)}.` : "")
        };
      }
    },
    {
      id: "spell", name: "Play the chord", blurb: "A symbol the way lead sheets write it. Put your fingers on the right notes.",
      options: [{ id: "level", choices: [["triads", "Triads"], ["sevenths", "+ Sevenths"], ["all", "Everything"]], def: "triads" }],
      make() {
        const level = opt("spell", "level", "triads");
        const pool = level === "triads" ? ["maj", "m", "dim", "aug", "sus4"] : level === "sevenths" ? ["maj", "m", "7", "maj7", "m7", "m7b5", "dim7", "6", "sus4"] : ["7", "maj7", "m7", "m7b5", "dim7", "6", "m6", "9", "maj9", "m9", "add9", "7sus4", "13", "7b9", "7#9", "mmaj7"];
        const q = T.quality(pick(pool)), rootName = pick(ROOTS), ch = T.chordFrom(T.parseNote(rootName), q.id);
        const alias = pick(q.alias), shown = T.name(ch.root) + T.degreeText(alias);
        return {
          item: q.id, kind: "keys", ask: "Play this chord", symbol: shown, chord: ch, answer: ch.pcs.slice().sort((a, b) => a - b).join(","),
          render(box) { box.innerHTML = `<div class="big-sym">${esc(shown)}</div>`; },
          explain: `${ch.symbol} is ${ch.spoken}: ${ch.notes.map(n => T.name(n)).join(" – ")} (${ch.iv.map(T.degreeText).join(" ")}).`
        };
      }
    },
    {
      id: "name", name: "Name that chord", blurb: "Notes light up on the keys. Work out the root and the quality.",
      options: [{ id: "level", choices: [["triads", "Triads"], ["sevenths", "+ Sevenths"]], def: "triads" }, { id: "inv", choices: [["no", "Root position"], ["yes", "Inversions too"]], def: "no" }],
      make() {
        const pool = opt("name", "level", "triads") === "triads" ? ["maj", "m", "dim", "aug"] : ["maj", "m", "dim", "7", "maj7", "m7", "m7b5", "dim7"];
        const qid = pick(pool), root = T.parseNote(pick(ROOTS)), ch = T.chordFrom(root, qid);
        const inv = opt("name", "inv", "no") === "yes" ? Math.floor(Math.random() * ch.notes.length) : 0;
        const ps = T.chordPitches(ch, ch.root.pc >= 7 ? 3 : 4, inv);
        const wrong = shuffle(pool.filter(x => x !== qid)).slice(0, 2).map(x => T.chordFrom(root, x)).concat([T.chordFrom(T.parseNote(pick(ROOTS.filter(r => T.parseNote(r).pc !== root.pc))), qid)]);
        return {
          item: qid + (inv ? ":inv" : ""), kind: "choice", ask: "Which chord is this?", answer: ch.symbol, choices: shuffle([ch].concat(wrong)).map(c => c.symbol), hear: () => App.playChord(ps.map(p => p.midi)),
          render(box) { box.innerHTML = `<div class="kb mid" id="qKb"></div>`; const lo = Math.min(48, ps[0].midi - T.mod(ps[0].midi, 12)); const k = new W.Keyboard($("#qKb"), { from: lo, to: lo + 36, fit: true, labels: "c" }); k.mark(ps.map(p => ({ midi: p.midi, cls: "rh" }))); },
          explain: `${ch.symbol}: ${ch.notes.map(n => T.name(n)).join(" – ")}.` + (inv ? ` The root is ${T.name(ch.root)}, but ${T.name(ps[0])} is on the bottom (${T.INVERSION_NAMES[inv].toLowerCase()}). Look for the gap of a 4th: the root is the note on top of it.` : " In root position the notes stack in 3rds from the root.")
        };
      }
    },
    {
      id: "interval", name: "Ear: intervals", blurb: "Two notes. How far apart? The foundation of playing by ear.",
      options: [{ id: "level", choices: [["basic", "Six basics"], ["all", "All twelve"]], def: "basic" }, { id: "how", choices: [["up", "Rising"], ["down", "Falling"], ["together", "Together"]], def: "up" }],
      make() {
        const set = opt("interval", "level", "basic") === "basic" ? [2, 3, 4, 5, 7, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], semis = pick(set), how = opt("interval", "how", "up");
        const low = 52 + Math.floor(Math.random() * 14), notes = how === "down" ? [low + semis, low] : [low, low + semis];
        const hear = () => { if (how === "together") A.play(notes, { dur: 1.8 }); else A.sequence(notes, 0.75, { legato: 1.3 }); };
        return { item: String(semis), kind: "choice", many: set.length > 6, ask: "Which interval?", answer: T.INTERVAL_NAMES[semis], choices: set.map(s => T.INTERVAL_NAMES[s]), hear: hear, auto: true,
          render(box) { box.innerHTML = `<div class="row" style="justify-content:center"><button class="btn" id="qHear">${App.PLAY} Hear it again</button></div>`; },
          explain: `${T.INTERVAL_NAMES[semis]}: ${semis} half step${semis > 1 ? "s" : ""}, ${T.midiName(notes[0])} to ${T.midiName(notes[1])}. A classic reference going up is ${SONG_HINT[semis]}.` };
      }
    },
    {
      id: "quality", name: "Ear: chord quality", blurb: "Major or minor? Dominant or major seventh? Hear the colour.",
      options: [{ id: "level", choices: [["triads", "Four triads"], ["sevenths", "+ Sevenths"]], def: "triads" }],
      make() {
        const NAMES = { maj: "Major", m: "Minor", dim: "Diminished", aug: "Augmented", "7": "Dominant 7th", maj7: "Major 7th", m7: "Minor 7th" };
        const set = opt("quality", "level", "triads") === "triads" ? ["maj", "m", "dim", "aug"] : ["maj", "m", "dim", "aug", "7", "maj7", "m7"], qid = pick(set);
        const ch = T.chordFrom(T.pcNote(Math.floor(Math.random() * 12)), qid), ps = T.chordPitches(ch, 3, 0).map(p => p.midi + (ch.root.pc < 5 ? 12 : 0));
        return { item: qid, kind: "choice", many: set.length > 4, ask: "What kind of chord?", answer: NAMES[qid], choices: set.map(s => NAMES[s]), hear: () => App.playChord(ps, { dur: 2 }), hearArp: () => App.playChord(ps, { arp: true, dur: 2 }), auto: true,
          render(box) { box.innerHTML = `<div class="row" style="justify-content:center"><button class="btn" id="qHear">${App.PLAY} Hear it again</button><button class="btn ghost" id="qArp">One note at a time</button></div>`; },
          explain: `That was ${ch.symbol} (${ch.notes.map(n => T.name(n)).join(" – ")}). ${T.quality(qid).feel}` };
      }
    }
  ];
  const drillById = id => DRILLS.filter(d => d.id === id)[0];

  /* ---------- runner ---------- */
  let cur = null, q = null, answered = false, t0 = 0, session = { n: 0, ok: 0 }, lastItem = "", inputKb = null, nextTimer = 0;

  function makeQuestion(d) {
    // three candidates; take the one you are worst at, never the same item twice running
    const s = state.stats[d.id], cands = [d.make(), d.make(), d.make()].filter(c => c.item !== lastItem);
    const accOf = c => { const it = s && s.items[c.item]; return it && it.n ? it.ok / it.n : 0.6; };
    const best = (cands.length ? cands : [d.make()]).sort((a, b) => accOf(a) - accOf(b))[0];
    lastItem = best.item; return best;
  }

  function next() {
    clearTimeout(nextTimer);
    q = makeQuestion(cur); answered = false; t0 = performance.now();
    const st = state.stats[cur.id] || { run: 0, best: 0 };
    $("#qScore").innerHTML = `<span>Session <b>${session.ok}/${session.n}</b></span><span class="fire">Streak <b>${st.run || 0}</b></span><span>Best <b>${st.best || 0}</b></span>`;
    $("#qAsk").textContent = q.ask;
    q.render($("#qPrompt"));
    $("#qVerdict").innerHTML = ""; $("#qNext").hidden = true;
    const ans = $("#qAnswer");
    if (inputKb) { inputKb.destroy(); inputKb = null; }
    W.activeKeyboard = null;
    if (q.kind === "letters") ans.innerHTML = `<div class="choices letters">${["A", "B", "C", "D", "E", "F", "G"].map(l => `<button class="choice" data-v="${l}">${l}</button>`).join("")}</div>`;
    else if (q.kind === "choice") ans.innerHTML = `<div class="choices ${q.many ? "many" : ""}">${q.choices.map(c => `<button class="choice" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
    else if (q.kind === "keys") {
      ans.innerHTML = `<div class="kb" id="qInput"></div><div class="row mt" style="justify-content:center"><button class="btn" id="qCheck">Check</button><button class="btn ghost" id="qClearKeys">Clear</button></div><p class="sub mt-s" style="text-align:center">Tap the notes, any octave. With a MIDI keyboard, just hold the chord.</p>`;
      inputKb = new W.Keyboard($("#qInput"), { from: 48, to: 84, minKey: 22, toggle: true, labels: state.settings.labels });
      W.activeKeyboard = inputKb;
    }
    if (q.auto && q.hear) setTimeout(q.hear, 250);
  }

  function grade(given) {
    if (answered) return; answered = true;
    const ok = given === q.answer, ms = performance.now() - t0;
    session.n++; if (ok) session.ok++;
    const st = App.record(cur.id, q.item, ok, ms);
    $$("#qAnswer .choice").forEach(b => { b.disabled = true; const v = b.getAttribute("data-v"); if (v === q.answer) b.classList.add("right"); else if (v === given) b.classList.add("wrong"); });
    if (q.kind === "keys" && inputKb) {
      const want = q.chord.pcs, picked = inputKb.selected.slice();
      const base = 48 + q.chord.root.pc, shape = T.chordPitches(q.chord, 3, 0).map(p => p.midi + (p.midi < 48 ? 12 : 0)).map(m => (m > 84 ? m - 12 : m));
      inputKb.setSelected([]);
      inputKb.mark(shape.map((m, i) => ({ midi: m, cls: "good", label: T.name(q.chord.notes[i]) })).concat(picked.filter(m => want.indexOf(T.mod(m, 12)) < 0).map(m => ({ midi: m, cls: "bad", label: "×" }))));
      App.playChord(shape);
      $("#qCheck").disabled = true;
    }
    if (q.reveal) q.reveal($("#qPrompt"), ok);
    $("#qVerdict").innerHTML = `<b class="${ok ? "ok" : "no"}">${ok ? pick(["Yes.", "Right.", "Correct.", "Got it."]) : "Not quite."}</b> ${esc(q.explain)}`;
    $("#qScore").innerHTML = `<span>Session <b>${session.ok}/${session.n}</b></span><span class="fire">Streak <b>${st.run}</b></span><span>Best <b>${st.best}</b></span>`;
    $("#qNext").hidden = false;
    if (ok && q.kind !== "keys" && !q.reveal) nextTimer = setTimeout(next, 1500);
  }

  function openDrill(id) {
    cur = drillById(id) || DRILLS[0]; session = { n: 0, ok: 0 }; lastItem = "";
    $("#trainHome").hidden = true; $("#trainRun").hidden = false;
    $("#qName").textContent = cur.name;
    $("#qOpts").innerHTML = cur.options.map(o => `<div class="seg" data-opt="${o.id}">${o.choices.map(c => `<button data-val="${c[0]}" class="${opt(cur.id, o.id, o.def) === c[0] ? "on" : ""}">${esc(c[1])}</button>`).join("")}</div>`).join("");
    W.Midi.onNote = (note, on) => {
      if (!on || answered || !q) return;
      // on a real keyboard the octave has to be right too, not just the letter
      if (q.kind === "letters") { const L = ["C", "", "D", "", "E", "F", "", "G", "", "A", "", "B"][T.mod(note, 12)]; grade(note === q.midi ? q.answer : (L === q.answer ? "wrong octave" : (L || "?"))); }
      else if (q.kind === "keys") { const held = W.Midi.heldNotes().map(m => T.mod(m, 12)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b); if (held.length >= q.chord.pcs.length) { inputKb.setSelected(W.Midi.heldNotes()); grade(held.join(",")); } }
    };
    next();
  }
  function closeDrill() {
    clearTimeout(nextTimer); W.Midi.onNote = null; cur = null; q = null;
    if (inputKb) { inputKb.destroy(); inputKb = null; }
    $("#trainRun").hidden = true; $("#trainHome").hidden = false; paintHome();
  }

  function paintHome() {
    $("#drillGrid").innerHTML = DRILLS.map(d => {
      const s = state.stats[d.id], acc = App.accuracy(d.id), weak = App.weakItems(d.id, 1)[0];
      return `<button class="tile" data-drill="${d.id}"><b>${esc(d.name)}</b><span>${esc(d.blurb)}</span>
        <div class="acc">${s ? `${acc}% over ${s.n} · best streak ${s.best}` : "Not tried yet"}</div>${s ? `<div class="meter"><i style="width:${acc}%"></i></div>` : ""}</button>`;
    }).join("");
  }

  W.views.train = {
    mount(el) {
      el.innerHTML = `
        <div id="trainHome">
          <div class="hero"><h1>Train</h1><p>Five focused minutes beats an hour of drifting. Each drill quietly brings back the things you miss.</p></div>
          <div class="drills" id="drillGrid"></div>
        </div>
        <div id="trainRun" hidden>
          <div class="quiz-head"><button class="btn ghost small" id="qBack">‹ All drills</button><div class="score" id="qScore"></div></div>
          <div class="card">
            <div class="row between"><h2 class="title" id="qName"></h2><div class="row gap-s" id="qOpts"></div></div>
            <div class="prompt mt"><div class="ask" id="qAsk"></div><div class="mt-s" id="qPrompt"></div></div>
            <div id="qAnswer"></div>
            <div class="verdict" id="qVerdict"></div>
            <div class="row" style="justify-content:center"><button class="btn" id="qNext" hidden>Next ›</button></div>
          </div>
        </div>`;
      el.addEventListener("click", e => {
        let b;
        if ((b = e.target.closest("[data-drill]"))) { A.init(); App.go("train", { d: b.getAttribute("data-drill") }); }
        else if (e.target.closest("#qBack")) App.go("train");
        else if (e.target.closest("#qNext")) next();
        else if ((b = e.target.closest(".choice")) && !b.disabled) grade(b.getAttribute("data-v"));
        else if (e.target.closest("#qHear")) q.hear();
        else if (e.target.closest("#qArp")) q.hearArp();
        else if (e.target.closest("#qCheck")) { const pcs = inputKb.selected.map(m => T.mod(m, 12)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b); if (pcs.length) grade(pcs.join(",")); else App.toast("Tap some keys first"); }
        else if (e.target.closest("#qClearKeys")) { if (!answered) inputKb.setSelected([]); }
        else if ((b = e.target.closest("[data-val]"))) { const o = b.parentNode.getAttribute("data-opt"); (state.train[cur.id] = state.train[cur.id] || {})[o] = b.getAttribute("data-val"); App.save(); $$("button", b.parentNode).forEach(x => x.classList.toggle("on", x === b)); next(); }
      });
      document.addEventListener("keydown", e => {
        if (App.current !== "train" || !q || e.metaKey || e.ctrlKey) return;
        if (e.key === "Enter" && answered) { e.preventDefault(); next(); }
        else if (q.kind === "letters" && !answered && /^[a-g]$/i.test(e.key)) grade(e.key.toUpperCase());
        else if (q.kind === "choice" && !answered && /^[1-9]$/.test(e.key)) { const b = $$("#qAnswer .choice")[+e.key - 1]; if (b) grade(b.getAttribute("data-v")); }
        else if (e.key === " " && q.hear && !answered) { e.preventDefault(); q.hear(); }
      });
    },
    show(params) { if (params.d && drillById(params.d)) openDrill(params.d); else { if (cur) closeDrill(); else paintHome(); } },
    hide() { clearTimeout(nextTimer); W.Midi.onNote = null; }
  };
})();
