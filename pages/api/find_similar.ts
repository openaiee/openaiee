import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { 
  findSimilarMelodies, 
  SolfegeNote, 
  SongEntry, // Assuming SongEntry is also exported from music_utils or defined here
  MatchResult 
} from '../../utils/music_utils';

interface FindSimilarRequestBody {
  sourceSongId: string;
  selectedSegment: SolfegeNote[];
}

// Basic validation for a SolfegeNote object
function isValidSolfegeNote(note: any): note is SolfegeNote {
  return (
    typeof note === 'object' &&
    note !== null &&
    typeof note.syllable === 'string' &&
    typeof note.octave === 'number' &&
    typeof note.startTime === 'number' &&
    typeof note.duration === 'number' &&
    typeof note.pitch === 'number'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchResult[] | { message: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { sourceSongId, selectedSegment } = req.body as FindSimilarRequestBody;

    // Validate input
    if (typeof sourceSongId !== 'string' || sourceSongId.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing sourceSongId.' });
    }

    if (!Array.isArray(selectedSegment) || selectedSegment.length === 0) {
      return res.status(400).json({ message: 'selectedSegment must be a non-empty array.' });
    }

    for (const note of selectedSegment) {
      if (!isValidSolfegeNote(note)) {
        return res.status(400).json({ message: 'Invalid SolfegeNote structure in selectedSegment.' });
      }
    }

    // Load All Songs
    const dbPath = path.join(process.cwd(), 'data', 'songs_database.json');
    if (!fs.existsSync(dbPath)) {
      // This might be considered a server error if the DB is expected to always exist
      console.error('Songs database not found at:', dbPath);
      return res.status(500).json({ message: 'Songs database not found.' });
    }

    let allSongs: SongEntry[];
    try {
      const fileData = fs.readFileSync(dbPath, 'utf-8');
      allSongs = JSON.parse(fileData) as SongEntry[];
    } catch (parseError) {
      console.error('Error parsing songs_database.json:', parseError);
      return res.status(500).json({ message: 'Error parsing songs database.' });
    }
    
    // Call findSimilarMelodies
    const matches = findSimilarMelodies(selectedSegment, allSongs, sourceSongId);

    // Return Results
    return res.status(200).json(matches);

  } catch (error) {
    console.error('Unexpected error in /api/find_similar:', error);
    // Check if it's an error from JSON parsing of the request body itself
    if (error instanceof SyntaxError && (error as any).type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON in request body.'});
    }
    return res.status(500).json({ message: 'Internal Server Error.' });
  }
}
