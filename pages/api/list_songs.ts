import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface SongEntry {
  id: string;
  originalFilename: string;
  filePath: string;
  title?: string;
  melody: Note[]; // Assuming Note interface is defined elsewhere or not strictly needed for this endpoint
  key?: string;
}

interface Note { // Basic Note interface, details might not be needed for this endpoint
  pitch: number;
  startTime: number;
  duration: number;
}


interface ListedSong {
  id: string;
  name: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const dbPath = path.join(process.cwd(), 'data', 'songs_database.json');

  try {
    if (!fs.existsSync(dbPath)) {
      // If the database file doesn't exist, return an empty list.
      return res.status(200).json([]);
    }

    const fileData = fs.readFileSync(dbPath, 'utf-8');
    const songs: SongEntry[] = JSON.parse(fileData);

    const listedSongs: ListedSong[] = songs.map(song => ({
      id: song.id,
      name: song.title || song.originalFilename, // Use title if available, otherwise originalFilename
    }));

    res.status(200).json(listedSongs);

  } catch (error) {
    console.error('Error reading or parsing songs database:', error);
    // Check for specific error types if needed, e.g., JSON parsing error
    if (error instanceof SyntaxError) {
      return res.status(500).json({ message: 'Error parsing songs database: Malformed JSON.' });
    }
    return res.status(500).json({ message: 'Internal Server Error: Could not retrieve song list.' });
  }
}
