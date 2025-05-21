import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSolfege, Note, SolfegeNote } from '../../utils/music_utils';

// Define SongEntry interface locally, ensuring it matches the structure in songs_database.json
interface SongEntry {
  id: string;
  originalFilename: string;
  filePath: string;
  key?: string;
  melody: Note[];
  title?: string; // title is present in SongEntry from upload_song.ts
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { songId } = req.query;

  if (!songId || typeof songId !== 'string') {
    return res.status(400).json({ message: 'Song ID is required.' });
  }

  const dbPath = path.join(process.cwd(), 'data', 'songs_database.json');

  try {
    if (!fs.existsSync(dbPath)) {
      // This case should ideally not happen if songs are uploaded, but good for robustness
      return res.status(404).json({ message: 'Songs database not found.' });
    }

    const fileData = fs.readFileSync(dbPath, 'utf-8');
    const songs: SongEntry[] = JSON.parse(fileData);

    const song = songs.find(s => s.id === songId);

    if (!song) {
      return res.status(404).json({ message: `Song with ID '${songId}' not found.` });
    }

    if (!song.key || song.key.trim() === "") {
      return res.status(400).json({ message: 'Song does not have a key specified, cannot generate solfege.' });
    }

    if (!song.melody || song.melody.length === 0) {
      return res.status(400).json({ message: 'Song does not have melody data.' });
    }

    const solfegeMelody: SolfegeNote[] = getSolfege(song.melody, song.key);

    res.status(200).json(solfegeMelody);

  } catch (error) {
    console.error(`Error processing solfege request for songId '${songId}':`, error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ message: 'Error parsing songs database: Malformed JSON.' });
    }
    // Check if the error is from getSolfege (e.g. invalid key format)
    if (error instanceof Error && error.message.startsWith('Invalid note name')) {
        return res.status(400).json({ message: `Error processing key signature '${(song as SongEntry)?.key}': ${error.message}`});
    }
    return res.status(500).json({ message: 'Internal Server Error: Could not retrieve solfege data.' });
  }
}
