/* Built-in lead sheets, plus W.Songs: the songs you add yourself (written by Clef or typed in), the text form used to
   edit them, and the checks that keep a bar adding up.
   Melody bars: notes are "E4" (one beat) or "E4:1.5" (beats), "r:1" is a rest. Beats are always quarter notes, so an
   eighth is .5 whatever the time signature. Chords: "C" or "C G@2" (G lands on beat 2, counting from 0).
   Left hand (optional, `l`): same syntax, and "C3+E3+G3:2" is three notes struck together. */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};

  W.SONGS = [
    {
      id: "ode", title: "Ode to Joy", by: "Beethoven", key: "C", time: [4, 4], tempo: 100,
      about: "Almost all stepwise, and only I, V and a quick vi–II7–V. A good first lead sheet.",
      bars: [
        { n: "E4 E4 F4 G4", c: "C" }, { n: "G4 F4 E4 D4", c: "G7" }, { n: "C4 C4 D4 E4", c: "C" }, { n: "E4:1.5 D4:.5 D4:2", c: "C G@2" },
        { n: "E4 E4 F4 G4", c: "C" }, { n: "G4 F4 E4 D4", c: "G7" }, { n: "C4 C4 D4 E4", c: "C" }, { n: "D4:1.5 C4:.5 C4:2", c: "G7 C@2" },
        { n: "D4 D4 E4 C4", c: "G C@2" }, { n: "D4 E4:.5 F4:.5 E4 C4", c: "G C@2" }, { n: "D4 E4:.5 F4:.5 E4 D4", c: "G" }, { n: "C4 D4 G3:2", c: "Am D7@1 G@2" },
        { n: "E4 E4 F4 G4", c: "C" }, { n: "G4 F4 E4 D4", c: "G7" }, { n: "C4 C4 D4 E4", c: "C" }, { n: "D4:1.5 C4:.5 C4:2", c: "G7 C@2" }
      ]
    },
    {
      id: "twinkle", title: "Twinkle, Twinkle", by: "Traditional", key: "C", time: [4, 4], tempo: 96,
      about: "The three primary chords, I, IV and V7, changing every two beats. Try it in F and G too.",
      bars: [
        { n: "C4 C4 G4 G4", c: "C" }, { n: "A4 A4 G4:2", c: "F C@2" }, { n: "F4 F4 E4 E4", c: "F C@2" }, { n: "D4 D4 C4:2", c: "G7 C@2" },
        { n: "G4 G4 F4 F4", c: "C F@2" }, { n: "E4 E4 D4:2", c: "C G@2" }, { n: "G4 G4 F4 F4", c: "C F@2" }, { n: "E4 E4 D4:2", c: "C G@2" },
        { n: "C4 C4 G4 G4", c: "C" }, { n: "A4 A4 G4:2", c: "F C@2" }, { n: "F4 F4 E4 E4", c: "F C@2" }, { n: "D4 D4 C4:2", c: "G7 C@2" }
      ]
    },
    {
      id: "mary", title: "Mary Had a Little Lamb", by: "Traditional", key: "C", time: [4, 4], tempo: 100,
      about: "Three notes do most of the work, over just I and V. The gentlest start for putting both hands together.",
      bars: [
        { n: "E4 D4 C4 D4", c: "C" }, { n: "E4 E4 E4:2", c: "C" }, { n: "D4 D4 D4:2", c: "G" }, { n: "E4 G4 G4:2", c: "C" },
        { n: "E4 D4 C4 D4", c: "C" }, { n: "E4 E4 E4 E4", c: "C" }, { n: "D4 D4 E4 D4", c: "G7" }, { n: "C4:4", c: "C" }
      ]
    },
    {
      id: "frere", title: "Frère Jacques", by: "Traditional", key: "C", time: [4, 4], tempo: 104,
      about: "A round: one chord nearly the whole way. Once it's easy, start it again four bars in with the other hand.",
      bars: [
        { n: "C4 D4 E4 C4", c: "C" }, { n: "C4 D4 E4 C4", c: "C" }, { n: "E4 F4 G4:2", c: "C" }, { n: "E4 F4 G4:2", c: "C" },
        { n: "G4:.5 A4:.5 G4:.5 F4:.5 E4 C4", c: "C" }, { n: "G4:.5 A4:.5 G4:.5 F4:.5 E4 C4", c: "C" }, { n: "C4 G3 C4:2", c: "C G7@1 C@2" }, { n: "C4 G3 C4:2", c: "C G7@1 C@2" }
      ]
    },
    {
      id: "london", title: "London Bridge", by: "Traditional", key: "C", time: [4, 4], tempo: 100,
      about: "A dotted rhythm on the first beat of the phrase, and a V7 that answers the I.",
      bars: [
        { n: "G4:1.5 A4:.5 G4 F4", c: "C" }, { n: "E4 F4 G4:2", c: "C" }, { n: "D4 E4 F4:2", c: "G7" }, { n: "E4 F4 G4:2", c: "C" },
        { n: "G4:1.5 A4:.5 G4 F4", c: "C" }, { n: "E4 F4 G4:2", c: "C" }, { n: "D4:2 G4:2", c: "G7" }, { n: "E4 C4:3", c: "C" }
      ]
    },
    {
      id: "yankee", title: "Yankee Doodle", by: "Traditional", key: "C", time: [4, 4], tempo: 112,
      about: "Verse and chorus. The chorus dips under middle C, so the right hand has to cross into bass-clef territory.",
      bars: [
        { n: "C4 C4 D4 E4", c: "C" }, { n: "C4 E4 D4 G3", c: "G7" }, { n: "C4 C4 D4 E4", c: "C" }, { n: "C4:2 B3:2", c: "G7" },
        { n: "C4 C4 D4 E4", c: "C" }, { n: "F4 E4 D4 C4", c: "F" }, { n: "B3 G3 A3 B3", c: "G7" }, { n: "C4:2 C4:2", c: "C" },
        { n: "A3:1.5 B3:.5 A3 G3", c: "F" }, { n: "A3 B3 C4:2", c: "C" }, { n: "G3:1.5 A3:.5 G3 F3", c: "G7" }, { n: "E3:2 G3:2", c: "C" },
        { n: "A3:1.5 B3:.5 A3 G3", c: "F" }, { n: "A3 B3 C4 A3", c: "C" }, { n: "G3 C4 B3 D4", c: "G7" }, { n: "C4:2 C4:2", c: "C" }
      ]
    },
    {
      id: "oldmac", title: "Old MacDonald", by: "Traditional", key: "G", time: [4, 4], tempo: 108,
      about: "One sharp. I, IV and V7 in G, the guitar-friendly key that pop loves.",
      bars: [
        { n: "G4 G4 G4 D4", c: "G" }, { n: "E4 E4 D4:2", c: "C G@2" }, { n: "B4 B4 A4 A4", c: "G D7@2" }, { n: "G4:3 D4", c: "G" },
        { n: "G4 G4 G4 D4", c: "G" }, { n: "E4 E4 D4:2", c: "C G@2" }, { n: "B4 B4 A4 A4", c: "G D7@2" }, { n: "G4:4", c: "G" }
      ]
    },
    {
      id: "birthday", title: "Happy Birthday", by: "Traditional", key: "F", time: [3, 4], tempo: 100,
      about: "Three-four time with a pickup. One flat in the key signature, and a IV chord (B♭) at the high point.",
      bars: [
        { n: "C4:.75 C4:.25", c: "", beats: 1 },
        { n: "D4 C4 F4", c: "F" }, { n: "E4:2 C4:.75 C4:.25", c: "C7" }, { n: "D4 C4 G4", c: "C7" }, { n: "F4:2 C4:.75 C4:.25", c: "F" },
        { n: "C5 A4 F4", c: "F" }, { n: "E4 D4 Bb4:.75 Bb4:.25", c: "Bb" }, { n: "A4 F4 G4", c: "F C7@2" }, { n: "F4:3", c: "F" }
      ]
    },
    {
      id: "auld", title: "Auld Lang Syne", by: "Traditional (Scotland)", key: "F", time: [4, 4], tempo: 84,
      about: "Dotted rhythms and wide leaps. Verse, then the chorus that everybody sings at midnight.",
      bars: [
        { n: "C4", c: "", beats: 1 },
        { n: "F4:1.5 E4:.5 F4 A4", c: "F" }, { n: "G4:1.5 F4:.5 G4 A4", c: "C7" }, { n: "F4:1.5 F4:.5 A4 C5", c: "F" }, { n: "D5:3 D5", c: "Bb" },
        { n: "C5:1.5 A4:.5 A4 F4", c: "F" }, { n: "G4:1.5 F4:.5 G4 A4", c: "C7" }, { n: "F4:1.5 D4:.5 D4 C4", c: "Dm C7@2" }, { n: "F4:3 D5", c: "F" },
        { n: "C5:1.5 A4:.5 A4 F4", c: "F" }, { n: "G4:1.5 F4:.5 G4 D5", c: "C7" }, { n: "C5:1.5 A4:.5 A4 C5", c: "F" }, { n: "D5:3 D5", c: "Bb" },
        { n: "C5:1.5 A4:.5 A4 F4", c: "F" }, { n: "G4:1.5 F4:.5 G4 A4", c: "C7" }, { n: "F4:1.5 D4:.5 D4 C4", c: "Dm C7@2" }, { n: "F4:3 r:1", c: "F" }
      ]
    },
    {
      id: "silent", title: "Silent Night", by: "Franz Gruber", key: "C", time: [3, 4], tempo: 80,
      about: "Slow three-four. Dotted quarter–eighth–quarter is the rhythm of the whole carol; I, IV and V7 carry it.",
      bars: [
        { n: "G4:1.5 A4:.5 G4", c: "C" }, { n: "E4:3", c: "C" }, { n: "G4:1.5 A4:.5 G4", c: "C" }, { n: "E4:3", c: "C" },
        { n: "D5:2 D5", c: "G7" }, { n: "B4:3", c: "G7" }, { n: "C5:2 C5", c: "C" }, { n: "G4:3", c: "C" },
        { n: "A4:2 A4", c: "F" }, { n: "C5:1.5 B4:.5 A4", c: "F" }, { n: "G4:1.5 A4:.5 G4", c: "C" }, { n: "E4:3", c: "C" },
        { n: "A4:2 A4", c: "F" }, { n: "C5:1.5 B4:.5 A4", c: "F" }, { n: "G4:1.5 A4:.5 G4", c: "C" }, { n: "E4:3", c: "C" },
        { n: "D5:2 D5", c: "G7" }, { n: "F5:1.5 D5:.5 B4", c: "G7" }, { n: "C5:3", c: "C" }, { n: "E5:3", c: "C" },
        { n: "C5:1.5 G4:.5 E4", c: "C" }, { n: "G4:1.5 F4:.5 D4", c: "G7" }, { n: "C4:3", c: "C" }
      ]
    },
    {
      id: "jingle", title: "Jingle Bells (chorus)", by: "James Lord Pierpont", key: "C", time: [4, 4], tempo: 112,
      about: "I, IV and V7, plus a D7 that leans into the G7. Mind the dotted rhythm on “all the way” and “fun it”.",
      bars: [
        { n: "E4 E4 E4:2", c: "C" }, { n: "E4 E4 E4:2", c: "C" }, { n: "E4 G4 C4:1.5 D4:.5", c: "C" }, { n: "E4:4", c: "C" },
        { n: "F4 F4 F4:1.5 F4:.5", c: "F" }, { n: "F4 E4 E4 E4:.5 E4:.5", c: "C" }, { n: "E4 D4 D4 E4", c: "D7" }, { n: "D4:2 G4:2", c: "G7" },
        { n: "E4 E4 E4:2", c: "C" }, { n: "E4 E4 E4:2", c: "C" }, { n: "E4 G4 C4:1.5 D4:.5", c: "C" }, { n: "E4:4", c: "C" },
        { n: "F4 F4 F4:1.5 F4:.5", c: "F" }, { n: "F4 E4 E4 E4:.5 E4:.5", c: "C" }, { n: "G4 G4 F4 D4", c: "G7" }, { n: "C4:4", c: "C" }
      ]
    },
    {
      id: "minuet", title: "Minuet in G", by: "Petzold, from Bach's notebook", key: "G", time: [3, 4], tempo: 104,
      about: "Every piano student's first minuet. Three-four time, running eighth notes, and one sharp: every F is F♯.",
      bars: [
        { n: "D5 G4:.5 A4:.5 B4:.5 C5:.5", c: "G" }, { n: "D5 G4 G4", c: "G" }, { n: "E5 C5:.5 D5:.5 E5:.5 F#5:.5", c: "C" }, { n: "G5 G4 G4", c: "G" },
        { n: "C5 D5:.5 C5:.5 B4:.5 A4:.5", c: "C" }, { n: "B4 C5:.5 B4:.5 A4:.5 G4:.5", c: "G" }, { n: "F#4 G4:.5 A4:.5 B4:.5 G4:.5", c: "D" }, { n: "A4:3", c: "D" },
        { n: "D5 G4:.5 A4:.5 B4:.5 C5:.5", c: "G" }, { n: "D5 G4 G4", c: "G" }, { n: "E5 C5:.5 D5:.5 E5:.5 F#5:.5", c: "C" }, { n: "G5 G4 G4", c: "G" },
        { n: "C5 D5:.5 C5:.5 B4:.5 A4:.5", c: "C" }, { n: "B4 C5:.5 B4:.5 A4:.5 G4:.5", c: "G" }, { n: "A4 B4:.5 A4:.5 G4:.5 F#4:.5", c: "D7" }, { n: "G4:3", c: "G" }
      ]
    },
    {
      id: "elise", title: "Für Elise (opening)", by: "Beethoven", key: "Am", time: [3, 4], tempo: 76,
      about: "The famous E–D♯ trill, written here in three-four with eighth notes standing in for Beethoven's sixteenths. A minor, with E7 as its V chord.",
      bars: [
        { n: "E5:.5 D#5:.5", c: "", beats: 1 },
        { n: "E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5", c: "" }, { n: "A4 r:.5 C4:.5 E4:.5 A4:.5", c: "Am" }, { n: "B4 r:.5 E4:.5 G#4:.5 B4:.5", c: "E7" }, { n: "C5 r:.5 E4:.5 E5:.5 D#5:.5", c: "Am" },
        { n: "E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5", c: "" }, { n: "A4 r:.5 C4:.5 E4:.5 A4:.5", c: "Am" }, { n: "B4 r:.5 E4:.5 C5:.5 B4:.5", c: "E7" }, { n: "A4:2 r:1", c: "Am" }
      ]
    }
  ];

  W.CHARTS = [
    { id: "pop", title: "Four-chord pop loop", time: [4, 4], tempo: 96, text: "| G | D | Em | C |", about: "I–V–vi–IV. Loop it until the changes are automatic, then try another voicing." },
    { id: "blues", title: "12-bar blues in F", time: [4, 4], tempo: 104, text: "| F7 | Bb7 | F7 | F7 |\n| Bb7 | Bb7 | F7 | F7 |\n| C7 | Bb7 | F7 | C7 |", about: "Every chord is a dominant 7th. Shell voicings sound great here." },
    { id: "251", title: "ii–V–I workout", time: [4, 4], tempo: 92, text: "| Dm7 | G7 | Cmaj7 | % |\n| Cm7 | F7 | Bbmaj7 | % |\n| Bbm7 | Eb7 | Abmaj7 | % |\n| Abm7 | Db7 | Gbmaj7 | % |", about: "The same three chords stepping down through four keys. Rootless voicings barely move." },
    { id: "turnaround", title: "Jazz turnaround", time: [4, 4], tempo: 88, text: "| Cmaj7 A7 | Dm7 G7 | Em7 A7 | Dm7 G7 |", about: "Two chords per bar. I–VI7–ii–V, the loop behind countless standards." },
    { id: "minor", title: "Minor ii–V–i", time: [4, 4], tempo: 84, text: "| Dm7b5 | G7b9 | Cm7 | % |\n| Fm7 | Bb7 | Ebmaj7 | Abmaj7 |\n| Dm7b5 | G7b9 | Cm6 | % |", about: "Half-diminished and flat-nine chords, the two symbols that scare people on minor tunes." },
    { id: "slash", title: "Slash-chord ballad", time: [4, 4], tempo: 76, text: "| C | G/B | Am | Am/G |\n| F | C/E | Dm7 | Gsus4 G |", about: "The note after the slash goes in the left hand. Watch the bass walk down the scale." },
    { id: "canon", title: "Canon progression", time: [4, 4], tempo: 80, text: "| D | A | Bm | F#m |\n| G | D | G | A |", about: "Two sharps. The Pachelbel pattern that half of pop borrows." },
    { id: "sus", title: "Sus and power chords", time: [4, 4], tempo: 92, text: "| C5 | Csus4 C | F5 | Fsus2 F |\n| G5 | Gsus4 G | Am7 | G7sus4 G7 |", about: "The symbols pop and rock charts use: 5 for a power chord, sus4 (also written C4) and sus2 (C2). Feel each sus fall back to the plain chord." }
  ];

  /* ---------- your own songs ---------- */
  var T = W.T;
  var PITCH = /^([A-Ga-g](?:#|b|x|bb)?)(-?\d)$/;
  function mine() { return (W.App && W.App.state && W.App.state.songs) || []; }
  function beatsPerBar(time) { return time[0] * 4 / (time[1] || 4); }
  function parseTime(s) { var m = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(String(s || "")); if (!m || +m[2] !== 4 && +m[2] !== 8 && +m[2] !== 2) return null; return [+m[1], +m[2]]; }
  function near(x, y) { return Math.abs(x - y) < 1e-6; }

  // Check one bar's worth of note text. Returns {text, sum, bad: [tokens]} with the text cleaned up.
  function checkNotes(str, beats, fix) {
    var toks = String(str || "").trim().split(/\s+/).filter(Boolean), out = [], sum = 0, bad = [];
    toks.forEach(function (tok) {
      var m = tok.split(":"), d = m[1] != null ? parseFloat(m[1]) : 1;
      if (!(d > 0) || d > 16) { bad.push(tok); return; }
      var names = m[0].split("+"), ok = names.every(function (n) { return n === "r" || (PITCH.test(n) && T.parsePitch(n)); });
      if (!ok) { bad.push(tok); return; }
      if (fix && sum + d > beats + 1e-6) { d = beats - sum; if (d < 0.125) return; }
      out.push(names.map(function (n) { return n === "r" ? "r" : n.charAt(0).toUpperCase() + n.slice(1); }).join("+") + (d === 1 ? "" : ":" + (+d.toFixed(3)).toString().replace(/^0\./, ".")));
      sum += d;
    });
    if (fix && beats - sum >= 0.125 && out.length) { out.push("r:" + (+(beats - sum).toFixed(3)).toString().replace(/^0\./, ".")); sum = beats; }
    return { text: out.join(" "), sum: sum, bad: bad };
  }
  function checkChords(str, beats) {
    var toks = String(str || "").trim().split(/\s+/).filter(Boolean), out = [], bad = [];
    toks.forEach(function (tok) {
      var m = tok.split("@"), at = m[1] != null ? parseFloat(m[1]) : (out.length ? NaN : 0);
      if (/^n\.?c\.?$/i.test(m[0])) { out.push("N.C." + (at ? "@" + at : "")); return; }
      var ch = T.parseChord(m[0].replace(/♯/g, "#").replace(/♭/g, "b"));
      if (!ch) { bad.push(tok); return; }
      if (!(at >= 0) || at >= beats) at = out.length ? Math.min(beats - 1, out.length) : 0;
      out.push(ch.ascii + (at ? "@" + at : ""));
    });
    return { text: out.join(" "), bad: bad };
  }

  W.Songs = {
    mine: mine,
    all: function () { return W.SONGS.concat(mine()); },
    byId: function (id) { return W.Songs.all().filter(function (s) { return s.id === id; })[0] || null; },
    beatsPerBar: function (song) { return beatsPerBar(song.time || [4, 4]); },
    parseTime: parseTime,
    save: function (song) {
      var list = mine(), id = song.id || "s" + Date.now().toString(36);
      var rec = Object.assign({}, song, { id: id, mine: true });
      var i = list.findIndex(function (s) { return s.id === id; });
      if (i >= 0) list[i] = rec; else list.unshift(rec);
      if (W.App) W.App.saveNow();
      return rec;
    },
    remove: function (id) { var list = mine(), i = list.findIndex(function (s) { return s.id === id; }); if (i >= 0) list.splice(i, 1); if (W.App) W.App.saveNow(); },
    // Turn anything song-shaped (Clef's JSON, a pasted file) into a playable song, mending bars that don't add up.
    // Returns {song, problems: [strings]}; song is null when there is nothing usable.
    normalize: function (d) {
      var problems = [];
      if (!d || !Array.isArray(d.bars) || !d.bars.length) return { song: null, problems: ["No bars."] };
      var time = Array.isArray(d.time) ? d.time : parseTime(d.time || d.time_signature) || [4, 4];
      if ([2, 3, 4, 5, 6, 9, 12].indexOf(time[0]) < 0) time = [4, 4];
      var beats = beatsPerBar(time), bars = [], hasLh = false;
      d.bars.forEach(function (b, i) {
        b = b || {};
        var want = b.beats != null && +b.beats > 0 && +b.beats < beats ? +b.beats : (i === 0 && b.pickup ? +b.pickup : beats);
        var n = checkNotes(b.n != null ? b.n : b.melody, want, true), c = checkChords(b.c != null ? b.c : b.chords, want);
        var l = checkNotes(b.l != null ? b.l : (b.left_hand || b.lh), want, true);
        if (n.bad.length) problems.push("Bar " + (i + 1) + ": couldn't read " + n.bad.join(", ") + " (dropped).");
        if (c.bad.length) problems.push("Bar " + (i + 1) + ": unknown chord " + c.bad.join(", ") + " (dropped).");
        if (l.bad.length) problems.push("Bar " + (i + 1) + ", left hand: couldn't read " + l.bad.join(", ") + ".");
        if (!n.text) n.text = "r:" + want;
        var bar = { n: n.text, c: c.text };
        if (want !== beats) bar.beats = want;
        if (l.text && !/^r(:[\d.]+)?$/.test(l.text)) { bar.l = l.text; hasLh = true; }
        if (b.lyric || b.lyrics) bar.w = String(b.lyric || b.lyrics).slice(0, 60);
        bars.push(bar);
      });
      var key = String(d.key || "").replace(/\s*major$/i, "").replace(/\s*minor$/i, "m").replace(/♯/g, "#").replace(/♭/g, "b").trim();
      if (key && !T.parseKey(key)) { problems.push("Key '" + d.key + "' not understood; detected from the chords instead."); key = ""; }
      var tempo = Math.round(+d.tempo || +d.tempo_bpm || 0) || 96;
      var song = { title: String(d.title || "Untitled").slice(0, 80), by: String(d.artist || d.by || "").slice(0, 80), key: key, time: time, tempo: Math.max(40, Math.min(220, tempo)), bars: bars,
        about: String(d.part || d.about || "").slice(0, 200), notes: String(d.notes || d.how_to_play || "").slice(0, 1200), lh: hasLh };
      return { song: song, problems: problems };
    },
    // The plain-text form used in the editor: header lines, then one bar per line: notes | chords | left hand
    toText: function (song) {
      var head = ["title: " + song.title, "by: " + (song.by || ""), "key: " + (song.key || ""), "time: " + song.time[0] + "/" + song.time[1], "tempo: " + song.tempo, ""];
      return head.concat(song.bars.map(function (b) { return b.n + " | " + (b.c || "") + (b.l ? " | " + b.l : ""); })).join("\n");
    },
    fromText: function (text) {
      var d = { bars: [] };
      String(text || "").split(/\n/).forEach(function (line) {
        var m = /^\s*(title|by|key|time|tempo)\s*:\s*(.*)$/i.exec(line);
        if (m) { d[m[1].toLowerCase()] = m[2].trim(); return; }
        if (!line.trim()) return;
        var parts = line.split("|");
        d.bars.push({ n: parts[0].trim(), c: (parts[1] || "").trim(), l: (parts[2] || "").trim() });
      });
      if (d.by) d.artist = d.by;
      return W.Songs.normalize(d);
    }
  };
})(typeof self !== "undefined" ? self : globalThis);
