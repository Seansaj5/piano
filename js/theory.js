/* Woodshed theory engine. Pure functions, no DOM, so it also loads in Node for tests.
   A note is {l, a, pc}: l = letter index 0..6 (C..B), a = accidental -2..2, pc = pitch class 0..11.
   A pitch adds o (octave) and midi. Spelling is done by letter arithmetic so chords and scales come out
   with the right names (D♭ major is D♭ F A♭, never C♯ F G♯). */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var T = W.T = {};

  var LETTERS = "CDEFGAB";
  var LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];
  function mod(n, m) { return ((n % m) + m) % m; }
  T.mod = mod;

  /* ---------- notes ---------- */
  function note(l, a) { return { l: l, a: a, pc: mod(LETTER_PC[l] + a, 12) }; }
  T.note = note;

  T.parseNote = function (s) {
    var m = /^\s*([A-Ga-g])\s*(♯♯|##|x|𝄪|♯|#|♭♭|bb|𝄫|♭|b)?\s*$/.exec(String(s));
    if (!m) return null;
    return note(LETTERS.indexOf(m[1].toUpperCase()), accValue(m[2]));
  };
  function accValue(t) {
    if (!t) return 0;
    if (t === "#" || t === "♯") return 1;
    if (t === "b" || t === "♭") return -1;
    if (t === "##" || t === "x" || t === "♯♯" || t === "𝄪") return 2;
    return -2;
  }
  var ACC_PRETTY = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  var ACC_ASCII = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" };
  T.name = function (n, ascii) { return LETTERS[n.l] + (ascii ? ACC_ASCII : ACC_PRETTY)[n.a]; };
  T.accText = function (a) { return ACC_PRETTY[a]; };

  // The everyday spelling for each pitch class, flat-leaning or sharp-leaning.
  var PC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  var PC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var PC_COMMON = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  T.pcNote = function (pc, pref) {
    var tbl = pref === "sharp" ? PC_SHARP : pref === "flat" ? PC_FLAT : PC_COMMON;
    return T.parseNote(tbl[mod(pc, 12)]);
  };
  T.enharmonic = function (n) {
    if (n.a === 0) return n;
    var other = T.pcNote(n.pc, n.a > 0 ? "flat" : "sharp");
    return other;
  };
  // Replace awkward spellings (E♯, C♭, doubles) with the plain one. Used after transposing.
  T.simplify = function (n, pref) {
    if (Math.abs(n.a) >= 2 || (n.a === 1 && (n.l === 2 || n.l === 6)) || (n.a === -1 && (n.l === 0 || n.l === 3))) return T.pcNote(n.pc, pref);
    return n;
  };

  /* ---------- intervals by scale degree ---------- */
  // "b3", "#11", "bb7", "13" -> {steps: letter steps, semis: semitones}
  function degree(d) {
    var m = /^(bb|b|##|#)?(\d+)$/.exec(d);
    var num = parseInt(m[2], 10) - 1;
    var off = { "bb": -2, "b": -1, "#": 1, "##": 2 }[m[1]] || 0;
    return { steps: num, semis: MAJOR[num % 7] + 12 * Math.floor(num / 7) + off, num: num + 1 };
  }
  T.degree = degree;
  T.up = function (n, d) {
    var g = typeof d === "string" ? degree(d) : d;
    var l = mod(n.l + g.steps, 7);
    var a = mod(n.pc + g.semis - LETTER_PC[l] + 6, 12) - 6;
    return note(l, a);
  };
  T.degreeText = function (d) { return d.replace(/bb/g, "𝄫").replace(/b/g, "♭").replace(/##/g, "𝄪").replace(/#/g, "♯"); };

  /* ---------- pitches (notes with an octave) ---------- */
  T.pitch = function (n, o) { return { l: n.l, a: n.a, pc: n.pc, o: o, midi: 12 * (o + 1) + LETTER_PC[n.l] + n.a }; };
  // Spell a midi number using a given note name: the octave follows the letter (C♭4 is midi 59).
  T.spellMidi = function (midi, n) {
    var nat = midi - n.a;
    return { l: n.l, a: n.a, pc: n.pc, o: Math.floor(nat / 12) - 1, midi: midi };
  };
  // Spell a midi number from a list of allowed names (a chord or scale), else from the default table.
  T.spellIn = function (midi, names, pref) {
    var pc = mod(midi, 12);
    for (var i = 0; i < (names || []).length; i++) if (names[i].pc === pc) return T.spellMidi(midi, names[i]);
    return T.spellMidi(midi, T.pcNote(pc, pref));
  };
  T.pitchName = function (p) { return T.name(p) + p.o; };
  T.midiName = function (midi, pref) { var p = T.spellIn(midi, null, pref); return T.name(p) + p.o; };
  // Diatonic position: C0 = 0, D0 = 1 ... used by the staff.
  T.staffIndex = function (p) { return p.o * 7 + p.l; };

  /* ---------- chord qualities (the explorer's list; the parser below is separate and more liberal) ---------- */
  T.QUALITIES = [
    { id: "maj", sym: "", group: "Triads", alias: ["", "M", "maj"], feel: "Bright, settled, home." },
    { id: "m", sym: "m", group: "Triads", alias: ["m", "-", "min"], feel: "Darker, sadder, still stable." },
    { id: "dim", sym: "dim", group: "Triads", alias: ["dim", "°"], feel: "Tense and unstable. Wants to move." },
    { id: "aug", sym: "aug", group: "Triads", alias: ["aug", "+"], feel: "Dreamy, unresolved, floating upward." },
    { id: "sus4", sym: "sus4", group: "Triads", alias: ["sus4", "sus"], feel: "Open and waiting. The 4th wants to fall to the 3rd." },
    { id: "sus2", sym: "sus2", group: "Triads", alias: ["sus2"], feel: "Open and airy, no major or minor colour." },
    { id: "5", sym: "5", group: "Triads", alias: ["5"], feel: "Power chord: root and 5th only." },
    { id: "6", sym: "6", group: "Sixths & adds", alias: ["6", "M6"], feel: "Sweet, vintage, a relaxed ending chord." },
    { id: "m6", sym: "m6", group: "Sixths & adds", alias: ["m6", "-6"], feel: "Minor with a bittersweet edge. Film-noir." },
    { id: "69", sym: "6/9", group: "Sixths & adds", alias: ["6/9", "69"], feel: "Lush and open, a classic jazz ending." },
    { id: "add9", sym: "add9", group: "Sixths & adds", alias: ["add9", "add2", "2"], feel: "A major triad with sparkle. Pop ballads." },
    { id: "madd9", sym: "m(add9)", group: "Sixths & adds", alias: ["m(add9)", "madd9"], feel: "Minor with an aching 9th on top." },
    { id: "7", sym: "7", group: "Sevenths", alias: ["7"], feel: "Dominant 7th. Restless, pulls to the chord a 4th up." },
    { id: "maj7", sym: "maj7", group: "Sevenths", alias: ["maj7", "Δ7", "Δ", "M7", "ma7"], feel: "Warm and jazzy, a gentle glow." },
    { id: "m7", sym: "m7", group: "Sevenths", alias: ["m7", "-7", "min7", "mi7"], feel: "Mellow minor. The ii chord in every ii–V–I." },
    { id: "m7b5", sym: "m7b5", group: "Sevenths", alias: ["m7♭5", "ø", "ø7"], feel: "Half-diminished. The ii chord in minor keys." },
    { id: "dim7", sym: "dim7", group: "Sevenths", alias: ["dim7", "°7"], feel: "Stacked minor 3rds. Pure suspense." },
    { id: "mmaj7", sym: "m(maj7)", group: "Sevenths", alias: ["m(maj7)", "mΔ7", "-Δ7", "mM7"], feel: "Minor with a sharp edge. Spy-movie chord." },
    { id: "7sus4", sym: "7sus4", group: "Sevenths", alias: ["7sus4", "7sus"], feel: "A dominant that floats instead of pushing." },
    { id: "7#5", sym: "7#5", group: "Sevenths", alias: ["7♯5", "+7", "aug7"], feel: "Dominant with a raised 5th, leaning hard forward." },
    { id: "9", sym: "9", group: "Extended", alias: ["9"], feel: "Dominant 7th with a richer top. Funk and blues." },
    { id: "maj9", sym: "maj9", group: "Extended", alias: ["maj9", "Δ9", "M9"], feel: "Major 7th, even more lush." },
    { id: "m9", sym: "m9", group: "Extended", alias: ["m9", "-9", "min9"], feel: "Smooth, soulful minor." },
    { id: "11", sym: "11", group: "Extended", alias: ["11"], feel: "Suspended, gospel-flavoured dominant. The 3rd is left out." },
    { id: "m11", sym: "m11", group: "Extended", alias: ["m11", "-11"], feel: "Wide, modern minor sound." },
    { id: "13", sym: "13", group: "Extended", alias: ["13"], feel: "Dominant with a bright 13th on top. Big-band shine." },
    { id: "maj13", sym: "maj13", group: "Extended", alias: ["maj13", "Δ13"], feel: "The fullest major sound." },
    { id: "7b9", sym: "7b9", group: "Altered", alias: ["7♭9", "7(♭9)"], feel: "Dark dominant. Common on V in minor keys." },
    { id: "7#9", sym: "7#9", group: "Altered", alias: ["7♯9", "7(♯9)"], feel: "The gritty blues-rock 'Hendrix chord'." },
    { id: "7#11", sym: "7#11", group: "Altered", alias: ["7♯11", "7(♯11)"], feel: "Lydian-dominant: bright and a bit strange." },
    { id: "7b13", sym: "7b13", group: "Altered", alias: ["7♭13", "7(♭13)"], feel: "Dominant with a minor-key shadow." },
    { id: "7alt", sym: "7alt", group: "Altered", alias: ["7alt", "alt"], feel: "Altered dominant: maximum tension before resolving." },
    { id: "maj7#11", sym: "maj7#11", group: "Altered", alias: ["maj7♯11", "Δ7♯11"], feel: "Lydian major. Floating, cinematic." }
  ];
  T.quality = function (id) { for (var i = 0; i < T.QUALITIES.length; i++) if (T.QUALITIES[i].id === id) return T.QUALITIES[i]; return null; };

  /* ---------- chord symbol parser ---------- */
  var DEG_ORDER = function (a, b) { var x = degree(a), y = degree(b); return x.num - y.num || x.semis - y.semis; };

  T.parseChord = function (input) {
    var src = String(input == null ? "" : input).trim();
    if (!src) return null;
    var s = src.replace(/♯/g, "#").replace(/♭/g, "b").replace(/𝄪/g, "##").replace(/𝄫/g, "bb").replace(/[–—−]/g, "-").replace(/\s+/g, "");
    var m = /^([A-Ga-g])(##|#|bb|b)?/.exec(s);
    if (!m) return null;
    var rootNote = note(LETTERS.indexOf(m[1].toUpperCase()), accValue(m[2]));
    var q = s.slice(m[0].length), bass = null;

    var slash = q.lastIndexOf("/");
    if (slash >= 0) {
      var bn = /^([A-Ga-g])(##|#|bb|b)?$/.exec(q.slice(slash + 1));
      if (bn) { bass = note(LETTERS.indexOf(bn[1].toUpperCase()), accValue(bn[2])); q = q.slice(0, slash); }
    }
    q = q.replace(/[()\[\],]/g, "");

    var c = { third: "maj", fifth: "5", majFlag: false, delta: false, ext: 0, six: false, alts: [], adds: [], omits: [], power: false, hdim: false, alt: false };
    var mm;
    function eat(re) { mm = re.exec(q); if (mm) { q = q.slice(mm[0].length); return true; } return false; }

    // quality prefix
    if (eat(/^(ø7?|hdim7?|halfdim7?)/i)) { c.third = "min"; c.fifth = "b5"; c.ext = 7; c.hdim = true; }
    else if (eat(/^(dim|°|o(?=7|$))/i)) { c.third = "dim"; c.fifth = "b5"; }
    else if (eat(/^(aug|\+)/i)) { c.fifth = "#5"; c.aug = true; }
    else if (eat(/^(major|maj|ma(?=\d|$)|M(?![a-z])|Δ|\^)/)) { c.majFlag = true; c.delta = /Δ|\^/.test(mm[0]); }
    else if (eat(/^(minor|min|mi(?=\d|$)|m(?!aj)|-)/)) { c.third = "min"; }
    // minor-major: m(maj7), mM7, -Δ7
    if (c.third === "min" && !c.hdim && eat(/^(major|maj|ma(?=\d)|M(?=\d)|Δ|\^)/)) { c.majFlag = true; c.delta = /Δ|\^/.test(mm[0]); }

    var guard = 0;
    while (q && guard++ < 12) {
      if (eat(/^(13|11|9|7)/)) { c.ext = Math.max(c.ext, parseInt(mm[1], 10)); }
      else if (eat(/^(6\/9|69)/)) { c.six = true; if (c.adds.indexOf("9") < 0) c.adds.push("9"); }
      else if (eat(/^6/)) { c.six = true; }
      else if (eat(/^sus(2|4)?/i)) { c.third = mm[1] === "2" ? "sus2" : "sus4"; }
      else if (eat(/^add(b|#)?(2|4|6|9|11|13)/i)) {
        var ad = { "2": "9", "4": "11", "6": "6", "9": "9", "11": "11", "13": "13" }[mm[2]];
        if (ad === "6") c.six = true; else c.adds.push((mm[1] || "") + ad);
      }
      else if (eat(/^(omit|no)(3|5)/i)) { c.omits.push(mm[2]); }
      else if (eat(/^alt/i)) { c.alt = true; c.ext = Math.max(c.ext, 7); }
      else if (eat(/^(maj|M|Δ|\^)(?=7|9|11|13)/)) { c.majFlag = true; }
      else if (eat(/^(b|#|\+|-)(5|9|11|13)/)) {
        var sign = (mm[1] === "+" || mm[1] === "#") ? "#" : "b";
        if (mm[2] === "5") c.fifth = sign + "5"; else c.alts.push(sign + mm[2]);
      }
      else if (eat(/^5/) && c.third === "maj" && !c.majFlag && !c.ext && !c.six) { c.power = true; }
      else if (eat(/^2/)) { c.adds.push("9"); }
      else if (eat(/^4/)) { c.third = "sus4"; }
      else return null;
    }
    if (c.majFlag && !c.ext && c.delta) c.ext = 7;
    if (c.third === "min" && c.fifth === "b5" && c.ext === 7 && !c.majFlag) c.hdim = true;   // "m7b5" spelled out
    if (c.alt) { c.fifth = "#5"; if (c.alts.indexOf("#9") < 0) c.alts.push("#9"); }

    // build the interval list
    var iv = ["1"];
    var has = function (d) { return c.alts.indexOf(d) >= 0; };
    var dom11 = c.ext === 11 && c.third === "maj" && !c.majFlag;
    if (c.power) { /* no third */ }
    else if (c.third === "maj") { if (!dom11) iv.push("3"); }
    else if (c.third === "min" || c.third === "dim") iv.push("b3");
    else if (c.third === "sus2") iv.push("2");
    else if (c.third === "sus4") iv.push("4");
    iv.push(c.fifth);
    if (c.six) iv.push("6");
    if (c.ext >= 7) iv.push(c.third === "dim" ? "bb7" : c.majFlag ? "7" : "b7");
    if (c.ext >= 9 && !has("b9") && !has("#9")) iv.push("9");
    if (c.ext === 11 && !has("#11")) iv.push("11");
    if (c.ext === 13 && !has("b13")) iv.push("13");
    c.alts.forEach(function (a) { if (iv.indexOf(a) < 0) iv.push(a); });
    c.adds.forEach(function (a) { if (iv.indexOf(a) < 0) iv.push(a); });
    c.omits.forEach(function (o) { iv = iv.filter(function (d) { return degree(d).num !== parseInt(o, 10); }); });
    iv.sort(DEG_ORDER);

    var notes = iv.map(function (d) { return T.up(rootNote, d); });
    var ch = { src: src, root: rootNote, bass: bass, c: c, iv: iv, notes: notes, pcs: notes.map(function (n) { return n.pc; }) };
    ch.family = family(ch);
    ch.symbol = symbolOf(ch, false);
    ch.ascii = symbolOf(ch, true);
    ch.spoken = spokenOf(ch);
    return ch;
  };

  // Broad harmonic role, used for key detection and roman numerals.
  function family(ch) {
    var c = ch.c, has7 = c.ext >= 7;
    if (c.power) return "power";
    if (c.third === "dim") return "dim";
    if (c.hdim || (c.third === "min" && c.fifth === "b5")) return "hdim";
    if (c.third === "min") return "min";
    if (has7 && !c.majFlag) return "dom";
    if (c.aug && !has7) return "aug";
    return "maj";
  }

  function symbolOf(ch, ascii) {
    var c = ch.c, r = T.name(ch.root, ascii), t = "";
    var acc = function (x) { return ascii ? x : T.degreeText(x); };
    if (c.power) t = "5";
    else {
      var ext = c.ext ? String(c.ext) : "";
      if (c.third === "dim") t = "dim" + ext;
      else if (c.hdim) t = "m7" + acc("b5");
      else if (c.third === "min" && c.majFlag) t = "m(maj" + (ext || "7") + ")";
      else {
        if (c.third === "min") t = "m";
        if (c.aug && !c.ext && !c.six) t += "aug";
        if (c.six) t += (c.adds.indexOf("9") >= 0 ? "6/9" : "6");
        else if (c.ext) t += (c.majFlag ? "maj" : "") + ext;
      }
      if (c.third === "sus2" || c.third === "sus4") t += c.third;
      if (c.alt) t += "alt";
      else {
        if (!c.hdim && c.third !== "dim" && c.fifth !== "5" && !(c.aug && !c.ext && !c.six)) t += acc(c.fifth);
        c.alts.forEach(function (a) { t += acc(a); });
      }
      var adds = c.adds.filter(function (a) { return !(c.six && a === "9"); });
      if (adds.length) { var at = adds.map(function (a) { return "add" + acc(a); }).join(""); t += (t === "m" ? "(" + at + ")" : at); }
      c.omits.forEach(function (o) { t += "(no" + o + ")"; });
    }
    return r + t + (ch.bass ? "/" + T.name(ch.bass, ascii) : "");
  }

  function spokenOf(ch) {
    var c = ch.c, r = T.name(ch.root), w;
    var ord = { 7: "seventh", 9: "ninth", 11: "eleventh", 13: "thirteenth" };
    if (c.power) w = "power chord";
    else if (c.third === "dim") w = c.ext >= 7 ? "diminished seventh" : "diminished";
    else if (c.hdim) w = "half-diminished seventh";
    else if (c.third === "min" && c.majFlag) w = "minor-major " + ord[c.ext || 7];
    else {
      var minor = c.third === "min";
      if (c.ext) w = (c.majFlag ? "major " : minor ? "minor " : c.aug ? "augmented " : "dominant ") + ord[c.ext];
      else if (c.six) w = (minor ? "minor " : "major ") + (c.adds.indexOf("9") >= 0 ? "six-nine" : "sixth");
      else w = c.aug ? "augmented" : minor ? "minor" : "major";
      if (c.third === "sus4") w = (c.ext ? w + ", " : "") + "suspended fourth";
      if (c.third === "sus2") w = (c.ext ? w + ", " : "") + "suspended second";
    }
    var words = { "b5": "flat five", "#5": "sharp five", "b9": "flat nine", "#9": "sharp nine", "#11": "sharp eleven", "b13": "flat thirteen", "9": "nine", "11": "eleven", "13": "thirteen", "b9add": "flat nine" };
    if (c.alt) w += ", altered";
    else {
      var extra = [];
      if (c.fifth !== "5" && c.third !== "dim" && !c.hdim && !(c.aug)) extra.push(words[c.fifth]);
      c.alts.forEach(function (a) { extra.push(words[a] || a); });
      if (extra.length) w += ", " + extra.join(", ");
    }
    var adds = c.adds.filter(function (a) { return !(c.six && a === "9"); });
    if (adds.length) w += ", add " + adds.map(function (a) { return words[a] || a; }).join(" and ");
    if (ch.bass) w += " over " + T.name(ch.bass);
    return r + " " + w;
  }

  // Plain-English breakdown of a symbol, piece by piece, using the chord's real note names.
  T.explain = function (ch) {
    var c = ch.c, out = [], nm = function (d) { return T.name(T.up(ch.root, d)); };
    var r = T.name(ch.root);
    out.push({ t: r, d: "The root. Everything else is measured up from " + r + "." });
    if (c.power) out.push({ t: "5", d: "Power chord: only the root and 5th (" + nm("5") + "). With no 3rd it is neither major nor minor." });
    else if (c.third === "dim") {
      out.push({ t: "dim or °", d: "Diminished: minor 3rd (" + nm("b3") + ") and flatted 5th (" + nm("b5") + ")." });
      if (c.ext >= 7) out.push({ t: "7", d: "On a diminished chord the 7th is lowered twice (" + nm("bb7") + ", which sounds like " + T.name(T.pcNote(T.up(ch.root, "bb7").pc)) + "). Every note sits a minor 3rd from the next." });
    }
    else if (c.hdim) out.push({ t: "m7♭5 or ø", d: "Half-diminished: a minor 7th chord with the 5th lowered to " + nm("b5") + ". It is the ii chord of a minor key." });
    else {
      if (c.third === "min") out.push({ t: "m (also − or min)", d: "Minor: the 3rd is lowered a half step to " + nm("b3") + "." });
      else if (c.third === "maj" && !c.ext && !c.six && !c.aug && !c.adds.length) out.push({ t: "(nothing)", d: "No quality written means a plain major triad: " + nm("1") + ", " + nm("3") + ", " + nm("5") + "." });
      if (c.aug) out.push({ t: "aug or +", d: "Augmented: the 5th is raised a half step to " + nm("#5") + "." });
      if (c.six) out.push({ t: "6", d: "Add the 6th (" + nm("6") + ") on top of the triad. There is no 7th." });
      if (c.six && c.adds.indexOf("9") >= 0) out.push({ t: "/9", d: "…and the 9th (" + nm("9") + ") too." });
      if (c.ext) {
        if (c.majFlag) out.push({ t: "maj7 (also Δ or M7)", d: "Add the natural 7th (" + nm("7") + "), a half step under the root. 'maj' describes the 7th, not the triad." });
        else out.push({ t: "7", d: "Add the flatted 7th (" + nm("b7") + "), a whole step under the root." + (c.third === "maj" ? " A major triad with a flat 7 is a dominant 7th, the chord that pulls toward " + T.name(T.simplify(T.up(ch.root, "4"))) + "." : "") });
        if (c.ext >= 9 && ch.iv.indexOf("9") >= 0) out.push({ t: "9", d: "A 9 means the 7th chord plus the 9th (" + nm("9") + "), which is the 2nd an octave higher." });
        if (c.ext === 11) out.push({ t: "11", d: "…plus the 11th (" + nm("11") + "), the 4th an octave up." + (c.third === "maj" && !c.majFlag ? " The 3rd is left out because it clashes with the 11th." : "") });
        if (c.ext === 13) out.push({ t: "13", d: "…plus the 13th (" + nm("13") + "), the 6th an octave up. The 11th is left out." });
      }
      if (c.third === "sus4") out.push({ t: "sus4 (or sus)", d: "Suspended: the 3rd is replaced by the 4th (" + nm("4") + "). It often resolves back down to " + nm("3") + "." });
      if (c.third === "sus2") out.push({ t: "sus2", d: "Suspended: the 3rd is replaced by the 2nd (" + nm("2") + ")." });
    }
    if (c.alt) out.push({ t: "alt", d: "Altered dominant: raise or lower the 5th and 9th. A common grip is " + nm("3") + ", " + nm("#5") + ", " + nm("b7") + ", " + nm("#9") + "." });
    else {
      if (c.fifth !== "5" && c.third !== "dim" && !c.hdim && !c.aug) out.push({ t: T.degreeText(c.fifth), d: "The 5th is " + (c.fifth === "b5" ? "lowered" : "raised") + " a half step to " + nm(c.fifth) + "." });
      c.alts.forEach(function (a) {
        var base = a.replace(/[b#]/g, "");
        out.push({ t: T.degreeText(a), d: "Add the " + base + "th " + (a[0] === "b" ? "lowered" : "raised") + " a half step (" + nm(a) + ")." });
      });
    }
    c.adds.filter(function (a) { return !(c.six && a === "9"); }).forEach(function (a) {
      out.push({ t: "add" + T.degreeText(a), d: "Add the " + a.replace(/[b#]/g, "") + "th (" + nm(a) + ") to the chord without adding a 7th." });
    });
    c.omits.forEach(function (o) { out.push({ t: "no" + o, d: "Leave out the " + (o === "3" ? "3rd" : "5th") + "." }); });
    if (ch.bass) {
      var idx = ch.pcs.indexOf(ch.bass.pc), b = T.name(ch.bass);
      if (idx > 0) out.push({ t: "/" + b, d: "Slash chord: play " + b + " as the lowest note. " + b + " is the " + ordinal(degree(ch.iv[idx]).num) + " of the chord, so this is an inversion." });
      else if (idx === 0) out.push({ t: "/" + b, d: "The bass is the root, the normal position." });
      else out.push({ t: "/" + b, d: "Slash chord: play " + b + " in the bass with the left hand. " + b + " is not in the chord, so it adds its own colour underneath." });
    }
    return out;
  };
  function ordinal(n) { return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"); }
  T.ordinal = ordinal;

  T.chordFrom = function (rootNote, qualityId) {
    var q = T.quality(qualityId);
    return T.parseChord(T.name(rootNote, true) + (q ? q.sym : qualityId));
  };

  // Strip a chord down for beginners. level "triad" or "seventh".
  T.simplifyChord = function (ch, level) {
    var c = ch.c, r = T.name(ch.root, true), t;
    if (c.power) t = "5";
    else if (c.third === "sus4" || c.third === "sus2") t = (level === "seventh" && c.ext ? "7" : "") + c.third;
    else if (c.third === "dim") t = level === "seventh" && c.ext ? "dim7" : "dim";
    else if (c.hdim || (c.third === "min" && c.fifth === "b5")) t = level === "seventh" ? "m7b5" : "dim";
    else if (c.third === "min") t = level === "seventh" && c.ext ? (c.majFlag ? "m(maj7)" : "m7") : "m";
    else if (c.aug && !c.ext) t = "aug";
    else t = level === "seventh" && c.ext ? (c.majFlag ? "maj7" : "7") : "";
    return T.parseChord(r + t + (ch.bass ? "/" + T.name(ch.bass, true) : ""));
  };

  /* ---------- chord recognition from played notes ---------- */
  var SIGS = null;
  function buildSigs() {
    SIGS = {};
    var C = T.parseNote("C");
    T.QUALITIES.forEach(function (q, order) {
      var ch = T.chordFrom(C, q.id), full = ch.pcs.slice();
      var put = function (pcs, partial) {
        var key = uniq(pcs).sort(function (a, b) { return a - b; }).join(",");
        if (!SIGS[key]) SIGS[key] = { id: q.id, order: order + (partial ? 100 : 0) };
      };
      put(full, false);
      if (full.length >= 4 && ch.iv.indexOf("5") >= 0) put(full.filter(function (p) { return p !== 7; }), true);
    });
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  // midis: the notes being held. Returns candidate chords, best first.
  T.identify = function (midis, pref) {
    if (!SIGS) buildSigs();
    var sorted = midis.slice().sort(function (a, b) { return a - b; });
    var pcs = uniq(sorted.map(function (m) { return mod(m, 12); }));
    if (pcs.length < 2) return [];
    var bassPc = mod(sorted[0], 12), out = [];
    pcs.forEach(function (r) {
      var key = pcs.map(function (p) { return mod(p - r, 12); }).sort(function (a, b) { return a - b; }).join(",");
      var hit = SIGS[key];
      if (!hit) return;
      var rn = T.pcNote(r, pref), ch = T.chordFrom(rn, hit.id);
      var inv = r !== bassPc;
      if (inv) ch = T.parseChord(ch.ascii + "/" + T.name(T.spellIn(bassPc, ch.notes, pref), true));
      out.push({ chord: ch, score: hit.order + (inv ? 40 : 0) });
    });
    out.sort(function (a, b) { return a.score - b.score; });
    return out.map(function (o) { return o.chord; });
  };

  /* ---------- scales ---------- */
  T.SCALES = [
    { id: "major", name: "Major", group: "Essential", iv: "1 2 3 4 5 6 7", note: "The reference scale. Every key signature is one of these." },
    { id: "minor", name: "Natural minor", group: "Essential", iv: "1 2 b3 4 5 b6 b7", note: "Same notes as the relative major, starting on its 6th." },
    { id: "harmonic", name: "Harmonic minor", group: "Essential", iv: "1 2 b3 4 5 b6 7", note: "Natural minor with a raised 7th, which gives minor keys their major V chord." },
    { id: "melodic", name: "Melodic minor", group: "Essential", iv: "1 2 b3 4 5 6 7", note: "Raised 6th and 7th going up. Classical players use natural minor coming down." },
    { id: "majpent", name: "Major pentatonic", group: "Pentatonic & blues", iv: "1 2 3 5 6", note: "Five notes, no half steps. Nothing in it can sound wrong over a major chord." },
    { id: "minpent", name: "Minor pentatonic", group: "Pentatonic & blues", iv: "1 b3 4 5 b7", note: "The backbone of blues and rock soloing." },
    { id: "blues", name: "Blues", group: "Pentatonic & blues", iv: "1 b3 4 b5 5 b7", note: "Minor pentatonic plus the flat 5 'blue note'." },
    { id: "dorian", name: "Dorian", group: "Modes", iv: "1 2 b3 4 5 6 b7", note: "Minor with a bright 6th. Fits m7 chords (the ii chord)." },
    { id: "phrygian", name: "Phrygian", group: "Modes", iv: "1 b2 b3 4 5 b6 b7", note: "Minor with a flat 2. Spanish colour." },
    { id: "lydian", name: "Lydian", group: "Modes", iv: "1 2 3 #4 5 6 7", note: "Major with a raised 4th. Fits maj7♯11." },
    { id: "mixolydian", name: "Mixolydian", group: "Modes", iv: "1 2 3 4 5 6 b7", note: "Major with a flat 7. Fits dominant 7th chords." },
    { id: "locrian", name: "Locrian", group: "Modes", iv: "1 b2 b3 4 b5 b6 b7", note: "Fits half-diminished chords." },
    { id: "whole", name: "Whole tone", group: "Symmetric", iv: "1 2 3 #4 #5 b7", note: "All whole steps. Fits augmented and 7♯5 chords." },
    { id: "dimwh", name: "Diminished (whole-half)", group: "Symmetric", iv: "1 2 b3 4 b5 b6 6 7", note: "Fits diminished 7th chords." }
  ];
  T.scaleDef = function (id) { for (var i = 0; i < T.SCALES.length; i++) if (T.SCALES[i].id === id) return T.SCALES[i]; return T.SCALES[0]; };
  T.scale = function (tonic, id) {
    var def = T.scaleDef(id), iv = def.iv.split(" ");
    return { def: def, tonic: tonic, iv: iv, notes: iv.map(function (d) { return T.up(tonic, d); }) };
  };
  // Ascending pitches for one octave (plus the top tonic) starting at the given octave.
  T.scalePitches = function (sc, octave) {
    var base = T.pitch(sc.tonic, octave), out = [];
    sc.iv.concat(["8"]).forEach(function (d) {
      var g = degree(d === "8" ? "1" : d), semis = d === "8" ? 12 : g.semis;
      var n = d === "8" ? sc.tonic : T.up(sc.tonic, d);
      out.push(T.spellMidi(base.midi + semis, n));
    });
    return out;
  };

  // Standard one-octave fingerings, RH ascending / LH ascending, keyed by tonic pitch class.
  // Major and minor (natural, harmonic and melodic share a fingering in the usual method books).
  var FINGER = {
    major: {
      0: ["12312345", "54321321"], 7: ["12312345", "54321321"], 2: ["12312345", "54321321"], 9: ["12312345", "54321321"],
      4: ["12312345", "54321321"], 11: ["12312345", "43214321"], 6: ["23412312", "43213214"], 1: ["23123412", "32143213"],
      8: ["34123123", "32143213"], 3: ["31234123", "32143213"], 10: ["41231234", "32143213"], 5: ["12341234", "54321321"]
    },
    minor: {
      9: ["12312345", "54321321"], 4: ["12312345", "54321321"], 11: ["12312345", "43214321"], 6: ["34123123", "43213214"],
      1: ["34123123", "32143213"], 8: ["34123123", "32143213"], 3: ["31234123", "21432132"], 10: ["21231234", "21321432"],
      5: ["12341234", "54321321"], 0: ["12312345", "54321321"], 7: ["12312345", "54321321"], 2: ["12312345", "54321321"]
    }
  };
  T.fingering = function (tonic, scaleId) {
    var kind = scaleId === "major" ? "major" : (scaleId === "minor" || scaleId === "harmonic" || scaleId === "melodic") ? "minor" : null;
    if (!kind) return null;
    var f = FINGER[kind][tonic.pc];
    return f ? { rh: f[0].split("").map(Number), lh: f[1].split("").map(Number) } : null;
  };

  /* ---------- keys ---------- */
  var FIFTHS_OF_LETTER = [0, 2, 4, -1, 1, 3, 5]; // C D E F G A B on the line of fifths
  T.SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
  T.FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
  // sig: number of sharps (positive) or flats (negative)
  T.key = function (tonic, mode) {
    var sig = FIFTHS_OF_LETTER[tonic.l] + 7 * tonic.a - (mode === "minor" ? 3 : 0);
    return { tonic: tonic, mode: mode === "minor" ? "minor" : "major", sig: sig, valid: Math.abs(sig) <= 7 };
  };
  T.parseKey = function (s) {
    var m = /^\s*([A-Ga-g](?:##|#|bb|b|♯|♭)?)\s*(major|maj|minor|min|m|M)?\s*$/.exec(String(s || ""));
    if (!m) return null;
    var n = T.parseNote(m[1]); if (!n) return null;
    var minor = m[2] && (m[2] === "m" || /^min/i.test(m[2]));
    var k = T.key(n, minor ? "minor" : "major");
    if (!k.valid) k = T.key(T.enharmonic(n), k.mode);
    return k.valid ? k : null;
  };
  T.keyName = function (k, ascii) { return T.name(k.tonic, ascii) + (k.mode === "minor" ? " minor" : " major"); };
  T.keyShort = function (k) { return T.name(k.tonic) + (k.mode === "minor" ? "m" : ""); };
  T.keyFromSig = function (sig, mode) {
    // walk the line of fifths from C (or A for minor)
    var idx = sig + (mode === "minor" ? 3 : 0);           // fifths above C
    var l = [0, 4, 1, 5, 2, 6, 3][mod(idx, 7)];           // letter reached after idx fifths
    var a = Math.floor((idx + 1) / 7);                      // F=-1 .. B=5 are naturals
    return T.key(note(l, a), mode);
  };
  T.relative = function (k) { return T.keyFromSig(k.sig, k.mode === "minor" ? "major" : "minor"); };
  T.parallel = function (k) { var p = T.key(k.tonic, k.mode === "minor" ? "major" : "minor"); return p.valid ? p : T.key(T.enharmonic(k.tonic), p.mode); };
  T.sigNotes = function (sig) {
    var list = sig >= 0 ? T.SHARP_ORDER.slice(0, sig) : T.FLAT_ORDER.slice(0, -sig);
    return list.map(function (L) { return note(LETTERS.indexOf(L), sig >= 0 ? 1 : -1); });
  };
  T.sigText = function (sig) {
    if (!sig) return "No sharps or flats";
    var n = Math.abs(sig);
    return n + (sig > 0 ? " sharp" : " flat") + (n > 1 ? "s" : "");
  };
  T.keyScale = function (k) { return T.scale(k.tonic, k.mode === "minor" ? "minor" : "major"); };

  // The 12 spots on the circle, clockwise from C. Three spots have two names.
  T.CIRCLE = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1].map(function (sig) {
    var o = { sig: sig, major: T.keyFromSig(sig, "major"), minor: T.keyFromSig(sig, "minor") };
    var twin = sig === 5 ? -7 : sig === 6 ? -6 : sig === -5 ? 7 : null;
    if (twin != null) o.twin = { sig: twin, major: T.keyFromSig(twin, "major"), minor: T.keyFromSig(twin, "minor") };
    return o;
  });

  var NUM_MAJOR = [["I", "maj", "maj7"], ["ii", "m", "m7"], ["iii", "m", "m7"], ["IV", "maj", "maj7"], ["V", "maj", "7"], ["vi", "m", "m7"], ["vii°", "dim", "m7b5"]];
  var NUM_MINOR = [["i", "m", "m7"], ["ii°", "dim", "m7b5"], ["III", "maj", "maj7"], ["iv", "m", "m7"], ["V", "maj", "7"], ["VI", "maj", "maj7"], ["VII", "maj", "7"]];
  // Chords built on each degree. Minor keys use the major V from harmonic minor, as real music does.
  T.diatonicChords = function (k, sevenths) {
    var sc = T.keyScale(k), tbl = k.mode === "minor" ? NUM_MINOR : NUM_MAJOR;
    return sc.notes.map(function (n, i) {
      var ch = T.chordFrom(n, tbl[i][sevenths ? 2 : 1]);
      var num = tbl[i][0];
      if (sevenths) num = num.replace("°", "ø") + (tbl[i][2] === "maj7" ? "maj7" : "7");
      return { numeral: num, chord: ch, degree: i + 1 };
    });
  };

  // Common progressions as scale degrees, resolved against a key.
  T.PROGRESSIONS = [
    { id: "145", name: "I – IV – V – I", major: [1, 4, 5, 1], minor: [1, 4, 5, 1], about: "The three primary chords. Thousands of folk, country and rock songs." },
    { id: "pop", name: "I – V – vi – IV", major: [1, 5, 6, 4], minor: [1, 6, 3, 7], about: "The four-chord pop song.", minorName: "i – VI – III – VII" },
    { id: "50s", name: "I – vi – IV – V", major: [1, 6, 4, 5], minor: [1, 6, 4, 5], about: "The 'doo-wop' changes.", minorName: "i – VI – iv – V" },
    { id: "251", name: "ii – V – I", major: [2, 5, 1], minor: [2, 5, 1], sevenths: true, about: "The engine of jazz. Learn it in every key.", minorName: "iiø – V7 – i" },
    { id: "1625", name: "I – vi – ii – V", major: [1, 6, 2, 5], minor: [1, 6, 2, 5], sevenths: true, about: "The turnaround: a loop that leads back to the top.", minorName: "i – VI – iiø – V7" },
    { id: "canon", name: "I – V – vi – iii – IV – I – IV – V", major: [1, 5, 6, 3, 4, 1, 4, 5], about: "The Pachelbel Canon pattern." },
    { id: "andalusian", name: "i – VII – VI – V", minor: [1, 7, 6, 5], about: "The Andalusian cadence: a descending minor line." }
  ];
  T.progression = function (k, prog) {
    var degs = prog[k.mode] || null;
    if (!degs) return null;
    var dia = T.diatonicChords(k, !!prog.sevenths);
    return degs.map(function (d) { return dia[d - 1]; });
  };
  T.bluesIn = function (k) {
    var r = k.tonic, I = T.name(r, true) + "7", IV = T.name(T.simplify(T.up(r, "4")), true) + "7", V = T.name(T.simplify(T.up(r, "5")), true) + "7";
    return [I, IV, I, I, IV, IV, I, I, V, IV, I, V];
  };

  /* ---------- roman numerals and key detection ---------- */
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  var MAJ_DEG = { 0: [0, ""], 1: [1, "♭"], 2: [1, ""], 3: [2, "♭"], 4: [2, ""], 5: [3, ""], 6: [3, "♯"], 7: [4, ""], 8: [5, "♭"], 9: [5, ""], 10: [6, "♭"], 11: [6, ""] };
  var MIN_DEG = { 0: [0, ""], 1: [1, "♭"], 2: [1, ""], 3: [2, ""], 4: [2, "♯"], 5: [3, ""], 6: [3, "♯"], 7: [4, ""], 8: [5, ""], 9: [5, "♯"], 10: [6, ""], 11: [6, "♯"] };
  T.numeral = function (ch, k) {
    var d = (k.mode === "minor" ? MIN_DEG : MAJ_DEG)[mod(ch.root.pc - k.tonic.pc, 12)];
    var f = ch.family, r = ROMAN[d[0]];
    if (f === "min" || f === "dim" || f === "hdim") r = r.toLowerCase();
    var tail = "";
    var c = ch.c;
    if (f === "dim") tail = "°" + (c.ext >= 7 ? "7" : "");
    else if (f === "hdim") tail = "ø7";
    else if (f === "aug") tail = "+";
    else if (c.ext) tail = (c.majFlag ? "maj" : "") + c.ext;
    else if (c.six) tail = "6";
    if (c.third === "sus4" || c.third === "sus2") tail += "sus";
    return d[1] + r + tail;
  };

  var FAM_MAJOR = [["maj"], ["min"], ["min"], ["maj"], ["maj", "dom"], ["min"], ["hdim", "dim"]];
  var FAM_MINOR = [["min"], ["hdim", "dim"], ["maj"], ["min"], ["dom", "maj", "min"], ["maj"], ["maj", "dom"]];
  T.detectKey = function (chords) {
    var list = chords.filter(Boolean);
    if (!list.length) return null;
    var seen = {}, unique = [];
    list.forEach(function (ch) { var id = ch.root.pc + ":" + ch.family; if (!seen[id]) { seen[id] = 1; unique.push(ch); } });
    var best = null;
    for (var sig = -6; sig <= 6; sig++) ["major", "minor"].forEach(function (mode) {
      var k = T.keyFromSig(sig, mode), sc = T.keyScale(k), pcs = sc.notes.map(function (n) { return n.pc; });
      var fam = mode === "minor" ? FAM_MINOR : FAM_MAJOR, score = 0;
      unique.forEach(function (ch) {
        var deg = pcs.indexOf(ch.root.pc);
        if (deg < 0) { score -= 1; return; }
        // chord tones (up to the 7th) that fall outside the scale count against the key
        var outside = ch.pcs.slice(0, 4).filter(function (pc) { return pcs.indexOf(pc) < 0; }).length;
        if (fam[deg].indexOf(ch.family) >= 0) score += (deg === 4 && ch.family === "dom") ? 3.5 : 2;
        else if (ch.family === "dom" && (deg === 0 || deg === 3) && mode === "major") score += 1.5;   // blues I7 / IV7
        else score += 1 - outside;
        if (ch.family === "power") score += 0.5;
      });
      var first = list[0], last = list[list.length - 1], tonicFam = mode === "minor" ? "min" : "maj";
      var isTonic = function (ch) { return ch.root.pc === k.tonic.pc && (ch.family === tonicFam || ch.family === "power" || (mode === "major" && ch.family === "dom")); };
      if (isTonic(first)) score += 3;
      if (isTonic(last)) score += 3;
      for (var i = 0; i + 1 < list.length; i++) {
        if (list[i].family === "dom" && mod(list[i].root.pc - k.tonic.pc, 12) === 7 && isTonic(list[i + 1])) { score += 2; break; }
      }
      if (!best || score > best.score || (score === best.score && mode === "major" && best.key.mode === "minor")) best = { key: k, score: score };
    });
    return best.key;
  };

  // ii–V–I and ii–V spotting, in any local key.
  T.findCadences = function (chords) {
    var out = [];
    for (var i = 0; i + 1 < chords.length; i++) {
      var a = chords[i], b = chords[i + 1], c = chords[i + 2];
      if (!a || !b) continue;
      if ((a.family === "min" || a.family === "hdim") && b.family === "dom" && mod(b.root.pc - a.root.pc, 12) === 5) {
        var full = c && mod(c.root.pc - b.root.pc, 12) === 5 && (c.family === "maj" || c.family === "min");
        var target = full ? c.root : T.simplify(T.up(b.root, "4"));
        var minor = full ? c.family === "min" : a.family === "hdim";
        out.push({ from: i, to: full ? i + 2 : i + 1, full: !!full, label: (minor ? "iiø–V" + (full ? "–i" : "") : "ii–V" + (full ? "–I" : "")) + " in " + T.name(target) + (minor ? " minor" : "") });
        if (full) i++;
      }
    }
    return out;
  };

  /* ---------- transposition ---------- */
  T.transposeNote = function (n, semis, pref) {
    return T.pcNote(n.pc + semis, pref || (n.a < 0 ? "flat" : n.a > 0 ? "sharp" : undefined));
  };
  T.transposeChord = function (ch, semis, pref) {
    var q = ch.ascii.slice(T.name(ch.root, true).length);
    if (ch.bass) q = q.slice(0, q.lastIndexOf("/"));
    var r = T.pcNote(ch.root.pc + semis, pref);
    return T.parseChord(T.name(r, true) + q + (ch.bass ? "/" + T.name(T.pcNote(ch.bass.pc + semis, pref), true) : ""));
  };
  // Flat keys read better with flat names, sharp keys with sharps.
  T.prefFor = function (k) { return k && k.sig < 0 ? "flat" : k && k.sig > 0 ? "sharp" : undefined; };

  /* ---------- voicings ---------- */
  function byDegree(ch, want) {
    for (var i = 0; i < ch.iv.length; i++) if (degree(ch.iv[i]).num === want) return ch.notes[i].pc;
    return null;
  }
  // Pick at most `max` pitch classes, dropping the least important tones first.
  function essential(ch, max, dropRoot) {
    var items = ch.iv.map(function (d, i) { return { d: d, pc: ch.notes[i].pc, num: degree(d).num }; });
    if (dropRoot && items.length > 3) items = items.filter(function (x) { return x.num !== 1; });
    var dropOrder = [5, 1, 11, 9, 13];
    for (var k = 0; items.length > max && k < dropOrder.length; k++) {
      var n = dropOrder[k];
      if (n === 5) { var f = items.filter(function (x) { return x.num === 5; })[0]; if (f && f.d !== "5") continue; }
      items = items.filter(function (x) { return x.num !== n; });
    }
    return uniq(items.slice(0, Math.max(max, 1)).map(function (x) { return x.pc; }));
  }
  // Every close-position stacking of the pitch classes that fits in [lo, hi].
  function placements(pcs, lo, hi) {
    var out = [];
    for (var r = 0; r < pcs.length; r++) {
      var order = pcs.slice(r).concat(pcs.slice(0, r));
      for (var base = lo - 12; base <= hi; base++) {
        if (mod(base, 12) !== order[0]) continue;
        var notes = [base], ok = true;
        for (var i = 1; i < order.length; i++) { var nx = notes[i - 1] + mod(order[i] - notes[i - 1], 12); if (nx === notes[i - 1]) nx += 12; notes.push(nx); }
        if (notes[0] < lo || notes[notes.length - 1] > hi) ok = false;
        if (ok) out.push(notes);
      }
    }
    return out;
  }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function nearest(cands, prev, center) {
    var best = null, bestCost = 1e9;
    cands.forEach(function (c) {
      var cost;
      if (prev && prev.length === c.length) cost = c.reduce(function (s, x, i) { return s + Math.abs(x - prev[i]); }, 0);
      else if (prev && prev.length) cost = Math.abs(mean(c) - mean(prev)) * c.length;
      else cost = Math.abs(mean(c) - center) * c.length;
      cost += Math.abs(mean(c) - center) * 0.15;               // drift back toward the middle over a long chart
      if (cost < bestCost) { bestCost = cost; best = c; }
    });
    return best;
  }
  function place(pcs, lo, hi, prev, center) {
    pcs = uniq(pcs).sort(function (a, b) { return a - b; });
    var c = placements(pcs, lo, hi);
    if (!c.length) c = placements(pcs, lo - 5, hi + 7);
    return nearest(c, prev, center) || [];
  }
  function bassNote(pc, lo) { var m = lo + mod(pc - lo, 12); return m; }

  T.VOICINGS = [
    { id: "comp", name: "Root + chord", blurb: "Left hand plays the root, right hand plays the chord, moving as little as possible between changes. Best for singing along or accompanying." },
    { id: "lh", name: "Left-hand chord", blurb: "The whole chord in the left hand around middle C, leaving your right hand free for the melody. This is the standard way to play from a lead sheet." },
    { id: "shell", name: "Shells", blurb: "Left hand plays root and 7th (or root and 5th for plain triads); right hand fills in the 3rd and the colour notes. Lean and jazzy." },
    { id: "rootless", name: "Rootless", blurb: "Jazz left hand: 3rd, 5th, 7th and 9th with no root. The bass player, or your ear, supplies the root." },
    { id: "root", name: "Bass notes only", blurb: "Just the root in the left hand. Start here: get the roots under your fingers in time, then add the rest." }
  ];
  // prev = the previous result of T.voice, for smooth voice leading.
  T.voice = function (ch, style, prev) {
    var bassPc = (ch.bass || ch.root).pc, lh = [], rh = [];
    var p = prev || {};
    var has7 = ch.iv.some(function (d) { var n = degree(d).num; return n === 7 || n === 6; });
    if (style === "root") lh = [bassNote(bassPc, 40)];
    else if (style === "lh") lh = place(essential(ch, 4, false), 47, 65, p.lh, 56);
    else if (style === "rootless" && has7 && ch.notes.length >= 4) {
      var pcs;
      if (ch.family === "hdim" || ch.family === "dim") pcs = ch.pcs.slice(0, 4);
      else {
        var third = byDegree(ch, 3) != null ? byDegree(ch, 3) : byDegree(ch, 4) != null ? byDegree(ch, 4) : byDegree(ch, 2);
        var sev = byDegree(ch, 7) != null ? byDegree(ch, 7) : byDegree(ch, 6);
        var nine = byDegree(ch, 9) != null ? byDegree(ch, 9) : mod(ch.root.pc + 2, 12);
        var top = ch.family === "dom" ? (byDegree(ch, 13) != null ? byDegree(ch, 13) : (ch.c.fifth !== "5" ? byDegree(ch, 5) : mod(ch.root.pc + 9, 12))) : byDegree(ch, 5);
        if (top == null) top = mod(ch.root.pc + 7, 12);
        pcs = [third, top, sev, nine];
      }
      lh = place(pcs, 48, 68, p.lh, 58);
    }
    else if (style === "shell") {
      var b = bassNote(bassPc, 38), sevPc = byDegree(ch, 7) != null ? byDegree(ch, 7) : byDegree(ch, 6);
      var upper = sevPc != null ? sevPc : byDegree(ch, 5);
      lh = [b]; if (upper != null) lh.push(b + mod(upper - b, 12));
      var rest = ch.iv.map(function (d, i) { return { n: degree(d).num, pc: ch.notes[i].pc }; })
        .filter(function (x) { return sevPc != null ? (x.n !== 1 && x.n !== 7 && !(x.n === 6 && sevPc === x.pc)) : true; })
        .map(function (x) { return x.pc; });
      if (rest.length < 2) rest = ch.pcs.slice();
      if (rest.length > 3) rest = essential({ iv: ch.iv, notes: ch.notes }, 4, true).filter(function (pc) { return pc !== sevPc; }).slice(0, 3);
      rh = place(rest, 57, 81, p.rh, 67);
    }
    else { // comp, and the fallback for rootless on plain triads
      if (style === "rootless") lh = place(essential(ch, 4, false), 47, 65, p.lh, 56);
      else { lh = [bassNote(bassPc, 40)]; rh = place(essential(ch, 4, ch.notes.length > 4), 55, 79, p.rh, 65); }
    }
    return { lh: lh, rh: rh };
  };

  // Close-position chord from the root at an octave, with inversions, as spelled pitches.
  T.chordPitches = function (ch, octave, inversion) {
    var base = T.pitch(ch.root, octave);
    var ps = ch.iv.map(function (d, i) { return T.spellMidi(base.midi + degree(d).semis, ch.notes[i]); });
    // fold extensions into one octave so inversions make sense
    var inv = mod(inversion || 0, ps.length);
    for (var i = 0; i < inv; i++) { var p = ps.shift(); var top = ps[ps.length - 1].midi, m = p.midi; while (m <= top) m += 12; ps.push(T.spellMidi(m, p)); }
    return ps;
  };
  T.INVERSION_NAMES = ["Root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion", "5th inversion"];
  // Textbook fingerings for close-position chords.
  T.chordFingering = function (size, inversion, hand) {
    if (size === 3) return hand === "lh" ? [[5, 3, 1], [5, 3, 1], [5, 2, 1]][inversion] : [[1, 3, 5], [1, 2, 5], [1, 3, 5]][inversion];
    if (size === 4) return hand === "lh" ? [5, 3, 2, 1] : [1, 2, 3, 5];
    return null;
  };

  // Which keys contain this chord naturally.
  T.homesOf = function (ch) {
    var out = [];
    var sevenths = ch.notes.length >= 4;
    T.CIRCLE.forEach(function (spot) {
      [spot.major, spot.minor].forEach(function (k) {
        T.diatonicChords(k, sevenths).forEach(function (dc) {
          if (dc.chord.root.pc === ch.root.pc && dc.chord.pcs.slice().sort().join() === ch.pcs.slice().sort().join()) out.push({ key: k, numeral: dc.numeral });
        });
      });
    });
    return out;
  };

  // "Bb4" -> pitch
  T.parsePitch = function (s) {
    var m = /^([A-Ga-g](?:##|#|bb|b)?)(-?\d)$/.exec(String(s).trim());
    var n = m && T.parseNote(m[1]);
    return n ? T.pitch(n, parseInt(m[2], 10)) : null;
  };
  // Move a spelled pitch from one key to another, keeping its scale-degree spelling (E in C becomes A in F).
  T.transposePitch = function (p, fromTonic, toTonic, semis) {
    var steps = mod(p.l - fromTonic.l, 7), l = mod(toTonic.l + steps, 7), midi = p.midi + semis;
    var a = mod(midi - LETTER_PC[l] + 6, 12) - 6;
    return T.spellMidi(midi, note(l, a));
  };

  T.INTERVAL_NAMES = ["Unison", "Minor 2nd", "Major 2nd", "Minor 3rd", "Major 3rd", "Perfect 4th", "Tritone", "Perfect 5th", "Minor 6th", "Major 6th", "Minor 7th", "Major 7th", "Octave"];
})(typeof self !== "undefined" ? self : globalThis);
