import { useState } from 'react';
import { Shield, CheckCircle, AlertOctagon, Smartphone } from 'lucide-react';

export default function GuestView() {
  const [status, setStatus] = useState(null); // 'safe' or 'trapped'
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch('http://localhost:3000/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        zone: formData.get('zone'),
        status: status,
        message: formData.get('message')
      })
    }).then(() => setSubmitted(true));
  };

  if (submitted) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-base)' }}>
        <div style={{ 
          background: status === 'safe' ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 0, 60, 0.1)', 
          padding: '2rem', 
          borderRadius: '50%', 
          marginBottom: '2rem',
          boxShadow: status === 'safe' ? 'var(--glow-green)' : 'var(--glow-red)',
          border: `2px solid ${status === 'safe' ? 'var(--accent-green)' : 'var(--accent-red)'}`
        }}>
          {status === 'safe' ? <CheckCircle size={64} color="var(--accent-green)" /> : <AlertOctagon size={64} color="var(--accent-red)" />}
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff', textShadow: status === 'safe' ? 'var(--glow-green)' : 'var(--glow-red)' }}>
          {status === 'safe' ? 'STATUS RECORDED' : 'HELP IS ON THE WAY'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px', lineHeight: 1.6 }}>
          {status === 'safe' 
            ? 'Thank you for checking in. Please remain in a safe area and wait for further instructions via this portal.' 
            : 'Emergency responders have been notified of your exact location and situation. Please stay as safe as possible.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <header style={{ textAlign: 'center', marginBottom: '2.5rem', paddingTop: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '50%', width: '80px', height: '80px', marginBottom: '1rem', boxShadow: 'var(--glow-cyan)' }}>
          <Smartphone size={40} color="var(--accent-cyan)" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', letterSpacing: '2px', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.3)', margin: 0 }}>GUEST PORTAL</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)', letterSpacing: '1px', marginTop: '0.5rem' }}>EMERGENCY MUSTER SYSTEM</p>
      </header>

      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
          <input type="text" name="name" className="triage-input" required placeholder="Enter your name" style={{ marginBottom: 0, minHeight: 'auto', padding: '1rem' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Location</label>
          <select name="zone" className="triage-input" required style={{ marginBottom: 0, minHeight: 'auto', padding: '1rem', WebkitAppearance: 'none' }}>
            <option value="" disabled selected>Select your current zone...</option>
            <option value="LOBBY ZONE A">Lobby Zone A</option>
            <option value="GRAND BALLROOM ZONE B">Grand Ballroom Zone B</option>
            <option value="RESTAURANT ZONE C">Restaurant Zone C</option>
            <option value="POOL DECK ZONE D">Pool Deck Zone D</option>
            <option value="CONFERENCE CTR ZONE E">Conference Center Zone E</option>
            <option value="SPA & WELLNESS ZONE F">Spa & Wellness Zone F</option>
            <option value="PARKING / EXIT ZONE G">Parking / Exit Zone G</option>
          </select>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Emergency Message</label>
          <textarea name="message" className="triage-input" rows="3" placeholder="Describe your situation. Auto-translation is active." style={{ marginBottom: 0 }}></textarea>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: 'auto', paddingBottom: '2rem' }}>
          <button 
            type="submit" 
            onClick={() => setStatus('safe')}
            style={{ 
              background: 'rgba(0, 255, 102, 0.1)', 
              color: 'var(--accent-green)', 
              border: '1px solid var(--accent-green)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 0 15px rgba(0, 255, 102, 0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            <CheckCircle size={24} /> I AM SAFE
          </button>
          
          <button 
            type="submit" 
            onClick={() => setStatus('trapped')}
            style={{ 
              background: 'rgba(255, 0, 60, 0.1)', 
              color: '#fff', 
              border: '1px solid var(--accent-red)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: 'var(--glow-red)',
              textShadow: '0 0 5px #fff',
              transition: 'all 0.3s ease',
              animation: 'pulseThreat 2s infinite'
            }}
          >
            <AlertOctagon size={24} /> TRAPPED / NEED HELP
          </button>
        </div>
      </form>
    </div>
  );
}
