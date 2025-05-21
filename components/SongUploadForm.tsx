import React, { useState } from 'react';

const SongUploadForm: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [songKey, setSongKey] = useState<string>(''); // Added state for song key
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setMessage(null); // Clear previous messages
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setMessage('Please select a MIDI file to upload.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('midiFile', selectedFile);
    formData.append('key', songKey); // Append song key to FormData

    try {
      const response = await fetch('/api/upload_song', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.status === 201) {
        setMessage(`Song uploaded successfully! ID: ${result.id} (${result.originalFilename})`);
        setSelectedFile(null); // Clear the file input
        // Reset file input visually
        const fileInput = document.getElementById('midiFileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
      } else {
        setMessage(`Error: ${result.message || 'Upload failed.'} ${result.error ? `(${result.error})` : ''}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`An unexpected error occurred: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload MIDI Song</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="midiFileInput">MIDI File:</label>
          <input
            id="midiFileInput"
            type="file"
            accept=".mid,audio/midi"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
        <div>
          <label htmlFor="songKeyInput">Song Key (e.g., Cmaj, Amin):</label>
          <input
            id="songKeyInput"
            type="text"
            placeholder="Enter song key"
            value={songKey}
            onChange={(e) => setSongKey(e.target.value)}
            disabled={isUploading}
          />
        </div>
        <button type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default SongUploadForm;
