import React from 'react';
import SongUploadForm from '../components/SongUploadForm';
import SolfegePlayer from '../components/SolfegePlayer';

const HomePage: React.FC = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>MIDI Solfege Platform</h1>
      </header>
      <main>
        <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h2>Upload New Song</h2>
          <SongUploadForm />
        </section>
        
        <hr style={{ margin: '40px 0' }} />

        <section style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h2>Play Songs with Solfege</h2>
          <SolfegePlayer />
        </section>
      </main>
      <footer style={{ textAlign: 'center', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        <p>Explore and learn with MIDI and Solfege!</p>
      </footer>
    </div>
  );
};

export default HomePage;
