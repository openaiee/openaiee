import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { Midi } from '@tonejs/midi'; // Changed import
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the Note interface
interface Note {
  pitch: number;
  startTime: number;
  duration: number;
}

// Define the SongEntry interface
interface SongEntry {
  id: string;
  originalFilename: string;
  filePath: string;
  title?: string;
  melody: Note[];
  key?: string; // Added key property
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Create temp_uploads directory if it doesn't exist
  const tempUploadsDir = path.join(process.cwd(), 'data', 'temp_uploads');
  if (!fs.existsSync(tempUploadsDir)) {
    fs.mkdirSync(tempUploadsDir, { recursive: true });
  }

  const form = formidable({
    uploadDir: tempUploadsDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  try {
    await new Promise<void>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          res.status(500).json({ message: 'Error parsing form data.', error: err.message });
          return reject(err);
        }

        const songKeyField = fields.key;
        const songKey = Array.isArray(songKeyField) ? songKeyField[0] : songKeyField;

        const file = files.midiFile?.[0];

        if (!file) {
          res.status(400).json({ message: 'No MIDI file uploaded.' });
          return reject(new Error('No MIDI file uploaded.'));
        }

        // Validate file type (basic check using original filename)
        const originalFilename = file.originalFilename;
        if (!originalFilename || !originalFilename.toLowerCase().endsWith('.mid') || file.mimetype !== 'audio/midi') {
          // Clean up the uploaded file
          if (file.filepath) {
            fs.unlinkSync(file.filepath);
          }
          res.status(400).json({ message: 'Invalid file type. Please upload a .mid file.' });
          return reject(new Error('Invalid file type.'));
        }

        try {
          // 6. Read and Parse MIDI
          const midiFileBuffer = fs.readFileSync(file.filepath);
          const midi = new Midi(midiFileBuffer); // Use @tonejs/midi

          // 7. Extract Melody (Simplified)
          let melody: Note[] = [];
          if (midi && midi.tracks && midi.tracks.length > 0) {
            for (const track of midi.tracks) {
              if (track.notes && track.notes.length > 0) {
                melody = track.notes.map(note => ({
                  pitch: note.midi, // MIDI note number
                  startTime: note.time, // Time in seconds
                  duration: note.duration, // Duration in seconds
                }));
                if (melody.length > 0) {
                  break; // Use the first track with notes
                }
              }
            }
          }
          
          if (melody.length === 0) {
            // Clean up the uploaded file
            fs.unlinkSync(file.filepath);
            res.status(400).json({ message: 'No notes found in the MIDI file or could not parse melody.' });
            return reject(new Error('No notes found in MIDI.'));
          }

          // 8. Generate Song ID and Save File
          const songId = uuidv4();
          const permanentDirectory = path.join(process.cwd(), 'data', 'midi_files');
          if (!fs.existsSync(permanentDirectory)) {
            fs.mkdirSync(permanentDirectory, { recursive: true });
          }
          const permanentFilePath = path.join(permanentDirectory, `${songId}.mid`);
          fs.renameSync(file.filepath, permanentFilePath);

          // 9. Update songs_database.json
          const dbPath = path.join(process.cwd(), 'data', 'songs_database.json');
          let songs: SongEntry[] = [];
          if (fs.existsSync(dbPath)) {
            const dbData = fs.readFileSync(dbPath, 'utf-8');
            songs = JSON.parse(dbData);
          }

          const newSongEntry: SongEntry = {
            id: songId,
            originalFilename: originalFilename || 'Unknown.mid',
            filePath: `data/midi_files/${songId}.mid`, // Relative path
            melody: melody,
            key: songKey || undefined, // Add the key here
            // title: fields.title?.[0] || undefined // Example if a title field was part of the form
          };

          songs.push(newSongEntry);
          fs.writeFileSync(dbPath, JSON.stringify(songs, null, 2));

          // 11. Success Response
          res.status(201).json(newSongEntry);
          resolve();

        } catch (processingError) {
          console.error('Error processing MIDI file:', processingError);
          // Clean up the uploaded file if it still exists (it might have been moved or deleted)
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
          res.status(500).json({ message: 'Error processing MIDI file.', error: (processingError as Error).message });
          return reject(processingError);
        }
      });
    });
  } catch (error) {
    // Error handling for promise rejection or other issues during form.parse
    // (e.g. if formidable itself throws before or during parsing)
    if (!res.headersSent) {
      res.status(500).json({ message: 'An unexpected error occurred during file upload.', error: (error as Error).message });
    }
  }
}
