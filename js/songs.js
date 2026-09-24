/* Built-in lead sheets. Tunes are public domain; the progressions are common property.
   Melody bars: notes are "E4" (one beat) or "E4:1.5" (beats), "r:1" is a rest. Chords: "C" or "C G@2" (G lands on beat 2, counting from 0). */
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
      id: "birthday", title: "Happy Birthday", by: "Traditional", key: "F", time: [3, 4], tempo: 100,
      about: "Three-four time with a pickup. One flat in the key signature, and a IV chord (B♭) at the high point.",
      bars: [
        { n: "C4:.75 C4:.25", c: "", beats: 1 },
        { n: "D4 C4 F4", c: "F" }, { n: "E4:2 C4:.75 C4:.25", c: "C7" }, { n: "D4 C4 G4", c: "C7" }, { n: "F4:2 C4:.75 C4:.25", c: "F" },
        { n: "C5 A4 F4", c: "F" }, { n: "E4 D4 Bb4:.75 Bb4:.25", c: "Bb" }, { n: "A4 F4 G4", c: "F C7@2" }, { n: "F4:3", c: "F" }
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
      id: "jingle", title: "Jingle Bells (chorus)", by: "James Lord Pierpont", key: "C", time: [4, 4], tempo: 112,
      about: "I, IV and V7, plus a D7 that leans into the G7. Mind the dotted rhythm on \u201call the way\u201d and \u201cfun it\u201d.",
      bars: [
        { n: "E4 E4 E4:2", c: "C" }, { n: "E4 E4 E4:2", c: "C" }, { n: "E4 G4 C4:1.5 D4:.5", c: "C" }, { n: "E4:4", c: "C" },
        { n: "F4 F4 F4:1.5 F4:.5", c: "F" }, { n: "F4 E4 E4 E4:.5 E4:.5", c: "C" }, { n: "E4 D4 D4 E4", c: "D7" }, { n: "D4:2 G4:2", c: "G7" },
        { n: "E4 E4 E4:2", c: "C" }, { n: "E4 E4 E4:2", c: "C" }, { n: "E4 G4 C4:1.5 D4:.5", c: "C" }, { n: "E4:4", c: "C" },
        { n: "F4 F4 F4:1.5 F4:.5", c: "F" }, { n: "F4 E4 E4 E4:.5 E4:.5", c: "C" }, { n: "G4 G4 F4 D4", c: "G7" }, { n: "C4:4", c: "C" }
      ]
    },
    {
      id: "minuet", title: "Minuet in G", by: "Petzold, from Bach's notebook", key: "G", time: [3, 4], tempo: 104,
      about: "Every piano student's first minuet. Three-four time, running eighth notes, and one sharp: every F is F\u266f.",
      bars: [
        { n: "D5 G4:.5 A4:.5 B4:.5 C5:.5", c: "G" }, { n: "D5 G4 G4", c: "G" }, { n: "E5 C5:.5 D5:.5 E5:.5 F#5:.5", c: "C" }, { n: "G5 G4 G4", c: "G" },
        { n: "C5 D5:.5 C5:.5 B4:.5 A4:.5", c: "C" }, { n: "B4 C5:.5 B4:.5 A4:.5 G4:.5", c: "G" }, { n: "F#4 G4:.5 A4:.5 B4:.5 G4:.5", c: "D" }, { n: "A4:3", c: "D" },
        { n: "D5 G4:.5 A4:.5 B4:.5 C5:.5", c: "G" }, { n: "D5 G4 G4", c: "G" }, { n: "E5 C5:.5 D5:.5 E5:.5 F#5:.5", c: "C" }, { n: "G5 G4 G4", c: "G" },
        { n: "C5 D5:.5 C5:.5 B4:.5 A4:.5", c: "C" }, { n: "B4 C5:.5 B4:.5 A4:.5 G4:.5", c: "G" }, { n: "A4 B4:.5 A4:.5 G4:.5 F#4:.5", c: "D7" }, { n: "G4:3", c: "G" }
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
    { id: "canon", title: "Canon progression", time: [4, 4], tempo: 80, text: "| D | A | Bm | F#m |\n| G | D | G | A |", about: "Two sharps. The Pachelbel pattern that half of pop borrows." }
  ];
})(typeof self !== "undefined" ? self : globalThis);
