// utils/music_utils.ts

export interface Note {
  pitch: number; // MIDI note number
  startTime: number; // in seconds
  duration: number; // in seconds
}

export interface SolfegeNote {
  syllable: string;
  octave: number;
  startTime: number;
  duration: number;
  pitch: number; // Keep original pitch for playback
}

// Helper map for note names to MIDI base values (0-11)
const noteNameToMidiBaseMap: { [name: string]: number } = {
  'c': 0, 'b#': 0, // C
  'c#': 1, 'db': 1, // C# / Db
  'd': 2,          // D
  'd#': 3, 'eb': 3, // D# / Eb
  'e': 4, 'fb': 4, // E / Fb
  'f': 5, 'e#': 5, // F / E#
  'f#': 6, 'gb': 6, // F# / Gb
  'g': 7,          // G
  'g#': 8, 'ab': 8, // G# / Ab
  'a': 9,          // A
  'a#': 10, 'bb': 10, // A# / Bb
  'b': 11, 'cb': 11  // B / Cb
};

// Solfege syllables (chromatic)
const majorChromaticSyllables = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "So", "Si", "La", "Li", "Ti"];
const minorChromaticSyllables = ["La", "Li", "Ti", "Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "So", "Si"]; // Tonic is La

const MIDI_C4 = 60;

/**
 * Converts a note name (e.g., "C", "F#", "Db") to its base MIDI note value (0-11).
 * Octave information in the note name is ignored.
 * @param noteName The note name string.
 * @returns The MIDI base value (0-11).
 * @throws Error if the note name is invalid.
 */
export function noteNameToMidiBase(noteName: string): number {
  const normalizedName = noteName.toLowerCase().replace(/[0-9]/g, ''); // Remove octave numbers and normalize case
  const midiBase = noteNameToMidiBaseMap[normalizedName];
  if (midiBase === undefined) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  return midiBase;
}

/**
 * Parses a key signature string (e.g., "Cmaj", "Amin") to determine its tonic MIDI note and if it's major.
 * Assumes C4 (MIDI 60) as the reference for octave calculation if no octave is specified in the key.
 * For key signatures like "Cmaj", "F#min", the octave of the tonic is assumed to be 4.
 * @param keySignature The key signature string.
 * @returns An object with tonicMidiNote and isMajor properties.
 */
function parseKeySignature(keySignature: string): { tonicMidiValue: number; isMajor: boolean; tonicOctave: number } {
  // Original keySignature for checking case if needed.
  const originalNotePartForCaseCheck = keySignature.replace(/maj|min|m|[0-9#b]/gi, '');

  const keyLower = keySignature.toLowerCase();
  let isMajorExplicit = keyLower.includes('maj');
  let isMinorExplicit = keyLower.includes('min') || keyLower.endsWith('m');

  let noteNamePart = keyLower;
  if (isMajorExplicit) {
    noteNamePart = noteNamePart.replace('maj', '');
  }
  if (isMinorExplicit) {
    // handles "min" and trailing "m"
    noteNamePart = noteNamePart.replace(/min$|m$/, '');
  }
  
  let octave = 4; // Default octave
  const octaveMatch = noteNamePart.match(/([0-9])$/);
  if (octaveMatch) {
    octave = parseInt(octaveMatch[1], 10);
    noteNamePart = noteNamePart.replace(/[0-9]$/, '');
  }

  const tonicMidiValue = noteNameToMidiBase(noteNamePart);
  let finalIsMajor: boolean;

  if (isMajorExplicit) {
    finalIsMajor = true;
  } else if (isMinorExplicit) {
    finalIsMajor = false;
  } else {
    // Infer from case if no explicit "maj" or "min"
    // Check if the first letter of the note part in the original string was uppercase
    if (originalNotePartForCaseCheck.length > 0 && originalNotePartForCaseCheck[0] === originalNotePartForCaseCheck[0].toUpperCase()) {
      finalIsMajor = true; // e.g., "C" implies C major
    } else {
      finalIsMajor = false; // e.g., "a" implies A minor
    }
  }

  return { tonicMidiValue, isMajor: finalIsMajor, tonicOctave: octave };
}


export function getSolfege(melody: Note[], keySignature: string): SolfegeNote[] {
  if (!keySignature || keySignature.trim() === "") {
    // If key signature is not provided, we cannot determine solfege.
    // Return empty array or throw error, or try to guess key (advanced).
    // For now, returning notes without solfege syllables, or empty.
    console.warn("Key signature is missing. Cannot calculate Solfege.");
    return melody.map(note => ({ // Return notes with empty syllable and default octave if needed
        syllable: 'N/A',
        octave: Math.floor(note.pitch / 12) -1,
        startTime: note.startTime,
        duration: note.duration,
        pitch: note.pitch,
    }));
  }

  const { tonicMidiValue, isMajor, tonicOctave } = parseKeySignature(keySignature);
  
  // tonicReferenceMidi is not strictly needed for the current logic but could be useful for other calculations.
  // const tonicReferenceMidi = tonicMidiValue + (tonicOctave * 12);

  const solfegeMelody: SolfegeNote[] = [];
  const syllables = isMajor ? majorChromaticSyllables : minorChromaticSyllables;

  for (const note of melody) {
    // Interval from the tonic's base class (0-11). Example: C=0, D=2, etc.
    // (note.pitch % 12) gives the note's own base class.
    // ( (note.pitch % 12) - tonicMidiValue + 12) % 12 would also work.
    const interval = (note.pitch - tonicMidiValue + 1200) % 12; // Add large multiple of 12 to ensure positive before modulo
    const syllable = syllables[interval];
    
    const noteOctave = Math.floor(note.pitch / 12) - 1; // MIDI octave (C4 is 60, so C is octave 4)

    solfegeMelody.push({
      syllable,
      octave: noteOctave,
      startTime: note.startTime,
      duration: note.duration,
      pitch: note.pitch,
    });
  }

  return solfegeMelody;
}

// --- Melody Similarity ---

// Ensure SongEntry matches the structure used in your application
export interface SongEntry {
  id: string;
  originalFilename?: string;
  title?: string;
  filePath: string; // Assuming this is part of your structure
  key?: string;
  melody: Note[];
}

export interface MatchResult {
  songId: string;
  songName: string;
  startIndexInTarget: number;
  matchedSegment: SolfegeNote[];
}

/**
 * Compares two arrays of strings for equality.
 * @param arr1 First array.
 * @param arr2 Second array.
 * @returns True if arrays are equal, false otherwise.
 */
function areSyllableArraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export function findSimilarMelodies(
  querySegment: SolfegeNote[],
  allSongs: SongEntry[],
  sourceSongId: string
): MatchResult[] {
  const querySyllables = querySegment.map(note => note.syllable);

  if (querySyllables.length === 0) {
    return [];
  }

  const results: MatchResult[] = [];

  for (const song of allSongs) {
    if (song.id === sourceSongId) {
      continue; // Skip self-comparison
    }

    if (!song.key || !song.melody || song.melody.length === 0) {
      continue; // Skip songs without key or melody
    }

    // Generate solfege for the current target song
    // Handle potential errors from getSolfege if a key is invalid, though
    // music_utils.ts currently returns "N/A" syllables for empty/bad keys.
    // A more robust approach might involve try-catch here if getSolfege could throw.
    const targetSongSolfege = getSolfege(song.melody, song.key);
    
    // If getSolfege returns notes with "N/A" due to bad key, those won't match valid query syllables.
    // Or, if targetSongSolfege is shorter than querySegment after processing.
    if (targetSongSolfege.length < querySyllables.length) {
        continue;
    }

    const targetSyllables = targetSongSolfege.map(note => note.syllable);

    // Subsequence Search
    for (let i = 0; i <= targetSyllables.length - querySyllables.length; i++) {
      const targetSlice = targetSyllables.slice(i, i + querySyllables.length);
      
      if (areSyllableArraysEqual(querySyllables, targetSlice)) {
        // Match found
        const matchResult: MatchResult = {
          songId: song.id,
          songName: song.title || song.originalFilename || "Unknown Song",
          startIndexInTarget: i,
          matchedSegment: targetSongSolfege.slice(i, i + querySyllables.length),
        };
        results.push(matchResult);
        // If only the first match per song is needed, we could break here.
        // The current implementation finds all occurrences in a target song.
      }
    }
  }

  return results;
}
