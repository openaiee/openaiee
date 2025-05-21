import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { SolfegeNote, MatchResult, SongEntry } from '../utils/music_utils'; // Adjust path as necessary

// Local interface definition
interface ListedSong {
  id: string;
  name: string;
}

const SolfegePlayer: React.FC = () => {
  const [songs, setSongs] = useState<ListedSong[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [solfegeNotes, setSolfegeNotes] = useState<SolfegeNote[] | null>(null);
  const [isLoadingSongs, setIsLoadingSongs] = useState<boolean>(false);
  const [isLoadingSolfege, setIsLoadingSolfege] = useState<boolean>(false);
  const [currentPlayingNoteIndex, setCurrentPlayingNoteIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for selection
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // State for similarity search
  const [similarityResults, setSimilarityResults] = useState<MatchResult[] | null>(null);
  const [isLoadingSimilarity, setIsLoadingSimilarity] = useState<boolean>(false);
  const [similarityError, setSimilarityError] = useState<string | null>(null);
  const [currentPlayingMatchIndex, setCurrentPlayingMatchIndex] = useState<number | null>(null); // For highlighting playing match syllable
  const [activePlayingMatchSegment, setActivePlayingMatchSegment] = useState<SolfegeNote[] | null>(null); // To know which match segment is active

  const synthRef = useRef<Tone.Synth | null>(null);

  // Initialize synth
  useEffect(() => {
    synthRef.current = new Tone.Synth().toDestination();
    // Cleanup synth on component unmount
    return () => {
      synthRef.current?.dispose();
      Tone.Transport.cancel(); // Also cancel any transport events
    };
  }, []);

  // Fetch song list
  useEffect(() => {
    const fetchSongs = async () => {
      setIsLoadingSongs(true);
      setError(null);
      try {
        const response = await fetch('/api/list_songs');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch songs: ${response.status}`);
        }
        const data: ListedSong[] = await response.json();
        setSongs(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setIsLoadingSongs(false);
      }
    };
    fetchSongs();
  }, []);

  // Fetch solfege data when selectedSongId changes
  useEffect(() => {
    if (!selectedSongId) {
      setSolfegeNotes(null);
      setCurrentPlayingNoteIndex(null);
      return;
    }

    const fetchSolfege = async () => {
      setIsLoadingSolfege(true);
      setError(null);
      setSolfegeNotes(null); // Clear previous notes
      setCurrentPlayingNoteIndex(null); // Clear highlight

      try {
        const response = await fetch(`/api/get_solfege?songId=${selectedSongId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch solfege data: ${response.status}`);
        }
        const data: SolfegeNote[] = await response.json();
        setSolfegeNotes(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setIsLoadingSolfege(false);
      }
    };

    fetchSolfege();
  }, [selectedSongId]);

  const handlePlay = () => {
    if (!solfegeNotes || solfegeNotes.length === 0 || !synthRef.current) {
      setError("No solfege notes loaded or synth not ready.");
      return;
    }
    if (Tone.Transport.state === 'started') {
        // console.log("Transport already started, consider stopping first or this is a no-op");
        return;
    }

    Tone.Transport.cancel(0); 
    setCurrentPlayingNoteIndex(null);
    setActivePlayingMatchSegment(null); // Ensure no match segment is considered active
    setCurrentPlayingMatchIndex(null);


    let notesToPlay = solfegeNotes;
    let timeOffset = 0;
    let playFullSong = true;

    if (selectionStart !== null && selectionEnd !== null && selectionStart <= selectionEnd) {
      notesToPlay = solfegeNotes.slice(selectionStart, selectionEnd + 1);
      playFullSong = false;
      if (notesToPlay.length > 0) {
        timeOffset = notesToPlay[0].startTime; 
      }
    } else if (selectionStart !== null && selectionEnd === null) { 
      notesToPlay = [solfegeNotes[selectionStart]];
      playFullSong = false;
      if (notesToPlay.length > 0) {
        timeOffset = notesToPlay[0].startTime;
      }
    } else { // Includes selectionStart === null && selectionEnd === null
        notesToPlay = solfegeNotes; // Play all
        timeOffset = 0;
        playFullSong = true;
    }


    if (!notesToPlay || notesToPlay.length === 0) {
      setError("No notes to play in the current selection or song.");
      return;
    }
    
    let lastNoteEndTime = 0;

    notesToPlay.forEach((note) => {
      const originalIndex = playFullSong ? solfegeNotes.indexOf(note) : selectionStart + notesToPlay.indexOf(note);

      Tone.Transport.scheduleOnce((time) => {
        if (synthRef.current) {
          synthRef.current.triggerAttackRelease(note.pitch, note.duration, time);
        }
        setCurrentPlayingNoteIndex(originalIndex); 
      }, note.startTime - timeOffset); 

      const currentNoteEndTimeInSegment = (note.startTime - timeOffset) + note.duration;
      if (currentNoteEndTimeInSegment > lastNoteEndTime) {
        lastNoteEndTime = currentNoteEndTimeInSegment;
      }
    });
    
    Tone.Transport.scheduleOnce(() => {
      setCurrentPlayingNoteIndex(null);
    }, lastNoteEndTime + 0.1); 

    Tone.Transport.start();
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    synthRef.current?.releaseAll(); 
    setCurrentPlayingNoteIndex(null);
    setCurrentPlayingMatchIndex(null);
    setActivePlayingMatchSegment(null);
  };

  const handleNoteClick = (index: number) => {
    if (selectionStart === null) {
      setSelectionStart(index);
      setSelectionEnd(null); // Ensure end is null when start is first set
    } else if (selectionEnd === null) {
      if (index < selectionStart) {
        setSelectionEnd(selectionStart);
        setSelectionStart(index);
      } else {
        setSelectionEnd(index);
      }
    } else {
      // Both are set, reset selection to the new click
      setSelectionStart(index);
      setSelectionEnd(null);
    }
  };

  const handleClearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Determine if a note is selected
  const isNoteSelected = (index: number): boolean => {
    if (selectionStart === null) return false;
    if (selectionEnd === null) return index === selectionStart; // Only start is selected
    return index >= selectionStart && index <= selectionEnd;
  };

  const handleFindSimilar = async () => {
    if (selectionStart === null || selectionEnd === null || !selectedSongId || !solfegeNotes) {
      setSimilarityError("Please select a valid segment in a loaded song first.");
      return;
    }

    setIsLoadingSimilarity(true);
    setSimilarityError(null);
    setSimilarityResults(null);

    const segmentToSearch = solfegeNotes.slice(selectionStart, selectionEnd + 1);

    try {
      const response = await fetch('/api/find_similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceSongId: selectedSongId,
          selectedSegment: segmentToSearch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to find similar segments: ${response.status}`);
      }

      const results: MatchResult[] = await response.json();
      setSimilarityResults(results);
      if (results.length === 0) {
        setSimilarityError("No similar segments found."); // More of a status than an error
      }

    } catch (err) {
      console.error("Similarity search error:", err);
      setSimilarityError(`Failed to find similar segments: ${(err as Error).message}`);
    } finally {
      setIsLoadingSimilarity(false);
    }
  };
  
  const handlePlayMatch = (segment: SolfegeNote[]) => {
    if (!segment || segment.length === 0 || !synthRef.current) {
      setSimilarityError("Cannot play empty or invalid segment.");
      return;
    }
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop(); // Stop any current playback before starting new
      Tone.Transport.cancel(0);
    }

    setActivePlayingMatchSegment(segment);
    setCurrentPlayingNoteIndex(null); // Clear main song highlight
    setCurrentPlayingMatchIndex(null); // Clear previous match highlight

    const firstNoteTime = segment[0].startTime;
    const normalizedSegment = segment.map(note => ({ ...note, startTime: note.startTime - firstNoteTime }));
    
    let lastNoteEndTime = 0;

    normalizedSegment.forEach((normalizedNote, index) => {
      Tone.Transport.scheduleOnce((time) => {
        if (synthRef.current) {
          synthRef.current.triggerAttackRelease(normalizedNote.pitch, normalizedNote.duration, time);
        }
        setCurrentPlayingMatchIndex(index);
      }, normalizedNote.startTime);

      const currentNoteEndTime = normalizedNote.startTime + normalizedNote.duration;
      if (currentNoteEndTime > lastNoteEndTime) {
        lastNoteEndTime = currentNoteEndTime;
      }
    });

    Tone.Transport.scheduleOnce(() => {
      setCurrentPlayingMatchIndex(null);
      setActivePlayingMatchSegment(null);
    }, lastNoteEndTime + 0.1);

    Tone.Transport.start();
  };


  return (
    <div>
      <h3>Solfege Player</h3>
      {/* Song Selection Dropdown */}
      {isLoadingSongs && <p>Loading songs...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoadingSongs && !error && (
        <select
          value={selectedSongId || ''}
          onChange={(e) => {
            setSelectedSongId(e.target.value || null);
            setSimilarityResults(null); // Clear similarity results when song changes
            setSimilarityError(null);
            setSelectionStart(null); // Clear selection
            setSelectionEnd(null);
            handleStop(); // Stop any playback
          }}
          disabled={isLoadingSolfege || Tone.Transport.state === 'started'}
        >
          <option value="">Select a song</option>
          {songs.map(song => (
            <option key={song.id} value={song.id}>{song.name}</option>
          ))}
        </select>
      )}

      {/* Solfege Display for selected song */}
      {isLoadingSolfege && <p>Loading solfege...</p>}
      {solfegeNotes && solfegeNotes.length > 0 && (
        <div style={{ marginTop: '10px', marginBottom: '10px', padding: '10px', border: '1px solid #ddd' }}>
          <h4>Solfege Syllables for: {songs.find(s => s.id === selectedSongId)?.name || 'Selected Song'}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '1.2em', padding: '10px', userSelect: 'none' }}>
            {solfegeNotes.map((note, index) => {
              let backgroundColor = 'transparent';
              if (index === currentPlayingNoteIndex && activePlayingMatchSegment === null) {
                backgroundColor = 'yellow'; // Main song playback highlight
              } else if (isNoteSelected(index)) {
                backgroundColor = 'lightblue'; // Selection highlight
              }
              return (
                <span
                  key={index}
                  onClick={() => handleNoteClick(index)}
                  style={{
                    padding: '5px', margin: '2px', border: '1px solid #ccc',
                    backgroundColor: backgroundColor, borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  {note.syllable}{note.octave}
                </span>
              );
            })}
          </div>
          {/* Selection Info and Controls */}
          <div>
            {selectionStart !== null && (
              <p>
                Selected: Note {selectionStart + 1}
                {selectionEnd !== null && ` to Note ${selectionEnd + 1}`}
              </p>
            )}
            <button onClick={handleClearSelection} disabled={selectionStart === null}>Clear Selection</button>
            <button 
                onClick={handleFindSimilar} 
                disabled={selectionStart === null || selectionEnd === null || isLoadingSimilarity}
                style={{marginLeft: '10px'}}
            >
                {isLoadingSimilarity ? "Searching..." : "Find Similar Segments"}
            </button>
          </div>
          {/* Main Playback Controls */}
          <button onClick={handlePlay} disabled={Tone.Transport.state === 'started' || isLoadingSolfege} style={{marginTop: '5px'}}>
            Play {selectionStart !== null ? "Selected Segment" : "Song"}
          </button>
          <button onClick={handleStop} disabled={Tone.Transport.state !== 'started'} style={{marginLeft: '5px'}}>Stop</button>
        </div>
      )}
      {solfegeNotes && solfegeNotes.length === 0 && !isLoadingSolfege && <p>No solfege data found for this song.</p>}

      {/* Similarity Search Results */}
      {isLoadingSimilarity && <p>Searching for similar segments...</p>}
      {similarityError && <p style={{ color: 'orange' }}>{similarityError}</p>}
      {similarityResults && !isLoadingSimilarity && (
        <div style={{marginTop: '20px'}}>
          <h4>Similarity Results:</h4>
          {similarityResults.length === 0 && !similarityError && <p>No similar segments found.</p>} {/* Handled by similarityError now */}
          {similarityResults.map((match, matchIdx) => (
            <div key={matchIdx} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
              <p><strong>Song:</strong> {match.songName} (ID: {match.songId})</p>
              <p><strong>Matched Segment (starting at its note {match.startIndexInTarget + 1}):</strong></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '1em' }}>
                {match.matchedSegment.map((note, noteIdx) => {
                  let backgroundColor = 'transparent';
                  if (activePlayingMatchSegment === match.matchedSegment && noteIdx === currentPlayingMatchIndex) {
                    backgroundColor = 'lightgreen'; // Matched segment playback highlight
                  }
                   return (
                    <span 
                        key={noteIdx} 
                        style={{ padding: '3px', margin: '1px', border: '1px solid #ddd', backgroundColor: backgroundColor, borderRadius: '3px' }}
                    >
                        {note.syllable}{note.octave}
                    </span>
                   );
                })}
              </div>
              <button onClick={() => handlePlayMatch(match.matchedSegment)} style={{marginTop: '5px'}} disabled={Tone.Transport.state === 'started' && activePlayingMatchSegment !== match.matchedSegment}>
                Play this match
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolfegePlayer;
