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
  let quietRun = false;      // a drill opened from the Study tab: nothing is played
  const NUMERALS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"], NUMERALS_MIN = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
  const DEG_NAMES = ["tonic", "supertonic", "mediant", "subdominant", "dominant", "submediant", "leading tone"];
  const VALUES = [[4, "Whole note", "4 beats"], [3, "Dotted half", "3 beats"], [2, "Half note", "2 beats"], [1.5, "Dotted quarter", "1½ beats"], [1, "Quarter note", "1 beat"], [0.5, "Eighth note", "½ beat"], [0.25, "Sixteenth", "¼ beat"]];
  const KEYS12 = ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab", "Db", "B", "F#"];

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
          reveal(box, ok) { box.innerHTML = `<div class="paper center" style="max-width:260px;margin:0 auto" id="qStaff"></div><div class="kb mini dense mt" id="qKb"></div>`; W.Staff.render($("#qStaff"), { clef: clef, width: 230, space: 13, items: [{ pitches: [p], cls: ok ? "good" : "bad", label: T.pitchName(p) }] }); const k = new W.Keyboard($("#qKb"), { from: 36, to: 84, fit: true, labels: "c", sound: true }); k.mark([{ midi: p.midi, cls: "good", label: LETTERS[p.l] }]); if (!quietRun) A.play([p.midi], { dur: 1 }); },
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
      id: "wint", name: "Written intervals", quiet: true, blurb: "Two notes on the staff. Name the interval by counting letters, then half steps.",
      options: [{ id: "how", choices: [["melodic", "Side by side"], ["harmonic", "Stacked"]], def: "melodic" }, { id: "clef", choices: [["treble", "Treble"], ["bass", "Bass"]], def: "treble" }],
      make() {
        const clef = opt("wint", "clef", "treble"), how = opt("wint", "how", "melodic");
        const base = clef === "treble" ? 60 : 41, whites = [];
        for (let m = base; m <= base + 19; m++) if ([0, 2, 4, 5, 7, 9, 11].indexOf(T.mod(m, 12)) >= 0) whites.push(m);
        const i = Math.floor(Math.random() * (whites.length - 1)), span = 1 + Math.floor(Math.random() * Math.min(7, whites.length - 1 - i));
        const a = T.spellIn(whites[i], null), b = T.spellIn(whites[i + span], null), semis = b.midi - a.midi, name = T.INTERVAL_NAMES[semis];
        const letters = span + 1, choices = App.shuffle([name].concat(App.shuffle(T.INTERVAL_NAMES.filter(n => n && n !== name)).slice(0, 3)));
        return { item: String(semis), kind: "choice", ask: "What interval is written here?", answer: name, choices: choices,
          render(box) { box.innerHTML = `<div class="paper center" style="max-width:280px;margin:0 auto" id="qStaff"></div>`; W.Staff.render($("#qStaff"), { clef: clef, width: 250, space: 12, items: how === "harmonic" ? [{ pitches: [a, b] }] : [{ pitches: [a] }, { pitches: [b] }] }); },
          explain: `${T.pitchName(a)} up to ${T.pitchName(b)} spans ${letters} letter names (a ${letters === 8 ? "octave" : T.ordinal(letters)}) and ${semis} half steps: ${name}. Count letters first for the number, half steps for the quality.` };
      }
    },
    {
      id: "numeral", name: "Roman numerals", quiet: true, blurb: "IV in E major? vi in F? Turn numerals into chords and back.",
      options: [{ id: "mode", choices: [["major", "Major keys"], ["minor", "Minor keys"], ["both", "Both"]], def: "major" }, { id: "dir", choices: [["chord", "Numeral → chord"], ["numeral", "Chord → numeral"]], def: "chord" }],
      make() {
        const modeOpt = opt("numeral", "mode", "major"), mode = modeOpt === "both" ? pick(["major", "minor"]) : modeOpt, dir = opt("numeral", "dir", "chord");
        const k = T.parseKey(pick(KEYS12) + (mode === "minor" ? "m" : "")), dia = T.diatonicChords(k), i = Math.floor(Math.random() * 7), d = dia[i];
        const wrong = App.shuffle(dia.filter((x, j) => j !== i)).slice(0, 3);
        if (dir === "chord") return { item: k.mode + ":" + d.numeral, kind: "choice", ask: `Which chord is ${d.numeral} in ${T.keyName(k)}?`, answer: d.chord.symbol, choices: App.shuffle([d].concat(wrong)).map(x => x.chord.symbol),
          render(box) { box.innerHTML = `<div class="big-sym">${esc(d.numeral)}</div><div class="spoken">in ${esc(T.keyName(k))}</div>`; },
          explain: `${T.keyName(k)}: ${dia.map(x => x.numeral + " = " + x.chord.symbol).join(", ")}. Upper-case numerals are major, lower-case minor, ° diminished.` };
        return { item: k.mode + ":" + d.numeral, kind: "choice", ask: `In ${T.keyName(k)}, ${d.chord.symbol} is which numeral?`, answer: d.numeral, choices: App.shuffle([d].concat(wrong)).map(x => x.numeral),
          render(box) { box.innerHTML = `<div class="big-sym">${esc(d.chord.symbol)}</div><div class="spoken">in ${esc(T.keyName(k))}</div>`; },
          explain: `${d.chord.symbol} is built on ${T.name(d.chord.root)}, the ${T.ordinal(i + 1)} note of ${T.keyName(k)}, so it's ${d.numeral}.` };
      }
    },
    {
      id: "degree", name: "Scale degrees", quiet: true, blurb: "The 6th note of A♭ major? The dominant of E minor? Know every key from the inside.",
      options: [{ id: "mode", choices: [["major", "Major"], ["minor", "Minor"], ["both", "Both"]], def: "major" }, { id: "names", choices: [["numbers", "By number"], ["names", "By name (tonic, dominant…)"]], def: "numbers" }],
      make() {
        const modeOpt = opt("degree", "mode", "major"), mode = modeOpt === "both" ? pick(["major", "minor"]) : modeOpt, byName = opt("degree", "names", "numbers") === "names";
        const k = T.parseKey(pick(KEYS12) + (mode === "minor" ? "m" : "")), notes = T.keyScale(k).notes, i = 1 + Math.floor(Math.random() * 6), n = notes[i];
        const wrong = App.shuffle(notes.filter((x, j) => j !== i)).slice(0, 3), what = byName ? "the " + DEG_NAMES[i] : "the " + T.ordinal(i + 1) + " degree";
        return { item: k.mode + ":" + (i + 1), kind: "choice", ask: `What is ${what} of ${T.keyName(k)}?`, answer: T.name(n), choices: App.shuffle([n].concat(wrong)).map(x => T.name(x)),
          render(box) { box.innerHTML = `<div class="big-sym" style="font-size:clamp(30px,7vw,48px)">${esc(T.keyName(k))}</div><div class="spoken">${esc(what)}</div>`; },
          explain: `${T.keyName(k)} runs ${notes.map(x => T.name(x)).join(" ")}. Degree ${i + 1} (${DEG_NAMES[i]}) is ${T.name(n)}.` };
      }
    },
    {
      id: "rhythm", name: "Rhythm values", quiet: true, blurb: "How many beats is that note? Which value finishes the bar? Reading rhythm without a sound.",
      options: [{ id: "mode", choices: [["value", "Name the value"], ["complete", "Complete the bar"]], def: "value" }],
      make() {
        if (opt("rhythm", "mode", "value") === "value") {
          const v = pick(VALUES), b4 = T.parsePitch("B4");
          return { item: "v" + v[0], kind: "choice", ask: "How many beats is this note worth (in 4/4)?", answer: v[2], choices: App.shuffle(VALUES.map(x => x[2])).slice(0, 7).filter((x, i, a) => a.indexOf(x) === i),
            many: true, render(box) { box.innerHTML = `<div class="paper center" style="max-width:300px;margin:0 auto" id="qStaff"></div>`; W.Staff.leadSheet($("#qStaff"), { sig: 0, time: [4, 4], bars: [{ notes: [{ p: b4, d: v[0] }].concat(v[0] < 4 ? [{ p: null, d: 4 - v[0] }] : []) }] }, { width: 280, space: 11, perLine: 1 }); },
            explain: `A ${v[1].toLowerCase()} lasts ${v[2]}. A dot adds half the value again; each flag halves it.` };
        }
        const beats = pick([3, 4]), b4 = T.parsePitch("B4"), pool = [2, 1.5, 1, 0.5, 0.5, 1, 1, 2];
        let notes = [], sum = 0;
        while (sum < beats - 0.5) { const d = pick(pool.filter(x => x <= beats - 0.5 - sum)); if (!d) break; notes.push(d); sum += d; }
        const missing = +(beats - sum).toFixed(2), miss = VALUES.filter(v => v[0] === missing)[0] || VALUES[4];
        const choices = App.shuffle([miss].concat(App.shuffle(VALUES.filter(v => v[0] !== missing)).slice(0, 3))).map(v => v[1]);
        return { item: "c" + missing, kind: "choice", ask: `This ${beats}/4 bar is missing its last note. Which value completes it?`, answer: miss[1], choices: choices,
          render(box) { box.innerHTML = `<div class="paper center" style="max-width:320px;margin:0 auto" id="qStaff"></div>`; W.Staff.leadSheet($("#qStaff"), { sig: 0, time: [beats, 4], bars: [{ notes: notes.map(d => ({ p: b4, d: d })).concat([{ p: b4, d: missing, cls: "hl" }]) }] }, { width: 300, space: 11, perLine: 1 }); },
          explain: `The written notes add up to ${sum} beat${sum === 1 ? "" : "s"}; a ${beats}/4 bar needs ${beats}, so the last note is worth ${missing}: a ${miss[1].toLowerCase()}.` };
      }
    },
    {
      id: "pos", name: "Trombone: which position?", quiet: true, blurb: "A note in bass clef. Where does the slide go? The seven positions, one note at a time.",
      options: [{ id: "range", choices: [["easy", "B♭2 to F4"], ["all", "Whole range"]], def: "easy" }],
      make() {
        const easy = opt("pos", "range", "easy") === "easy", lo = easy ? 46 : 34, hi = easy ? 65 : 72;
        let m, ps; do { m = lo + Math.floor(Math.random() * (hi - lo + 1)); ps = W.Tbn.positions(m); } while (!ps.length);
        const p = T.spellIn(m, null, "flat"), main = ps[0], ORD = W.Tbn.ORD, ok = ps.filter(x => x.partial !== 7).map(x => ORD[x.pos]);
        return { item: String(m), kind: "choice", ask: "Which slide position plays this note?", answer: ORD[main.pos], accept: ok, choices: [1, 2, 3, 4, 5, 6, 7].map(i => ORD[i]), many: true,
          render(box) { box.innerHTML = `<div class="paper center" style="max-width:260px;margin:0 auto" id="qStaff"></div>`; W.Staff.render($("#qStaff"), { clef: "bass", width: 230, space: 13, items: [{ pitches: [p] }] }); },
          explain: `${T.pitchName(p)} is ${ORD[main.pos]} position (${main.partial}${main.partial === 2 ? "nd" : main.partial === 3 ? "rd" : "th"} partial)${ps.length > 1 ? ", or " + ps.slice(1).map(x => ORD[x.pos] + (x.partial === 7 ? " (flat 7th partial)" : "")).join(", ") : ""}. Each position out is a half step lower.` };
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
    if (q.auto && q.hear && !quietRun) setTimeout(q.hear, 250);
  }

  function grade(given) {
    if (answered) return; answered = true;
    const ok = given === q.answer || (q.accept && q.accept.indexOf(given) >= 0), ms = performance.now() - t0;
    session.n++; if (ok) session.ok++;
    const st = App.record(cur.id, q.item, ok, ms);
    $$("#qAnswer .choice").forEach(b => { b.disabled = true; const v = b.getAttribute("data-v"); if (v === q.answer || (q.accept && q.accept.indexOf(v) >= 0)) b.classList.add("right"); else if (v === given) b.classList.add("wrong"); });
    if (q.kind === "keys" && inputKb) {
      const want = q.chord.pcs, picked = inputKb.selected.slice();
      const base = 48 + q.chord.root.pc, shape = T.chordPitches(q.chord, 3, 0).map(p => p.midi + (p.midi < 48 ? 12 : 0)).map(m => (m > 84 ? m - 12 : m));
      inputKb.setSelected([]);
      inputKb.mark(shape.map((m, i) => ({ midi: m, cls: "good", label: T.name(q.chord.notes[i]) })).concat(picked.filter(m => want.indexOf(T.mod(m, 12)) < 0).map(m => ({ midi: m, cls: "bad", label: "×" }))));
      if (!quietRun) App.playChord(shape);
      $("#qCheck").disabled = true;
    }
    if (q.reveal) q.reveal($("#qPrompt"), ok);
    $("#qVerdict").innerHTML = `<b class="${ok ? "ok" : "no"}">${ok ? pick(["Yes.", "Right.", "Correct.", "Got it."]) : "Not quite."}</b> ${esc(q.explain)}`;
    $("#qScore").innerHTML = `<span>Session <b>${session.ok}/${session.n}</b></span><span class="fire">Streak <b>${st.run}</b></span><span>Best <b>${st.best}</b></span>`;
    $("#qNext").hidden = false;
    if (ok && q.kind !== "keys" && !q.reveal) nextTimer = setTimeout(next, 1500);
  }

  function openDrill(id, params) {
    cur = drillById(id) || DRILLS[0]; session = { n: 0, ok: 0 }; lastItem = "";
    quietRun = params.quiet === "1" || !!cur.quiet;
    if (params.clef && cur.options.some(o => o.id === "clef")) (state.train[cur.id] = state.train[cur.id] || {}).clef = params.clef;
    $("#trainHome").hidden = true; $("#trainRun").hidden = false;
    $("#qName").innerHTML = esc(cur.name) + (quietRun ? ' <span class="quiet-badge" style="vertical-align:middle;margin-left:6px"><i></i>Quiet</span>' : "");
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
    const tile = d => {
      const s = state.stats[d.id], acc = App.accuracy(d.id);
      return `<button class="tile" data-drill="${d.id}"><b>${esc(d.name)}</b><span>${esc(d.blurb)}</span>
        <div class="acc">${s ? `${acc}% over ${s.n} · best streak ${s.best}` : "Not tried yet"}</div>${s ? `<div class="meter"><i style="width:${acc}%"></i></div>` : ""}</button>`;
    };
    $("#drillGrid").innerHTML = `<div class="group-label">With sound</div><div class="drills">${DRILLS.filter(d => !d.quiet).map(tile).join("")}</div>
      <div class="group-label" style="margin-top:22px">Quiet: nothing to hear, study anywhere</div><div class="drills">${DRILLS.filter(d => d.quiet).map(tile).join("")}</div>`;
  }

  W.views.train = {
    mount(el) {
      el.innerHTML = `
        <div id="trainHome">
          <div class="hero"><h1>Train</h1><p>Five focused minutes beats an hour of drifting. Each drill quietly brings back the things you miss. The second group needs no sound at all.</p></div>
          <div id="drillGrid"></div>
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
        if ((b = e.target.closest("[data-drill]"))) { if (!drillById(b.getAttribute("data-drill")).quiet) A.init(); App.go("train", { d: b.getAttribute("data-drill") }); }
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
    show(params) { if (params.d && drillById(params.d)) openDrill(params.d, params); else { if (cur) closeDrill(); else paintHome(); } },
    hide() { clearTimeout(nextTimer); W.Midi.onNote = null; }
  };
})();
