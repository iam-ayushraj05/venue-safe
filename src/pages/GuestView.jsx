import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, AlertOctagon, Smartphone, MapPin, Bell, LayoutDashboard, AlertTriangle, Users, Search, Target, Moon, Sun } from 'lucide-react';
import { socket } from '../socket';
import VenueSafeLogo from '../components/VenueSafeLogo';
import { useTheme } from '../hooks/useTheme';

export default function GuestView() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState(null); // 'safe' or 'trapped'
  const [submitted, setSubmitted] = useState(false);
  const [zone, setZone] = useState('');
  const [showInjuryPrompt, setShowInjuryPrompt] = useState(false);
  const [isInjured, setIsInjured] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeIncident, setActiveIncident] = useState(null);

  useEffect(() => {
    // Mock geolocation auto-detect
    const timer = setTimeout(() => {
      if (!zone) setZone('LOBBY ZONE A');
    }, 1500);

    socket.on('severity_alert', data => setToast(`EMERGENCY BROADCAST: ${data.message}`));
    socket.on('incident_update', data => {
      if (data.status === 'active' && data.category !== 'Other') {
        setActiveIncident(data);
      }
    });

    return () => {
      clearTimeout(timer);
      socket.off('severity_alert');
      socket.off('incident_update');
    };
  }, [zone]);

  const handleSubmit = (e, currentStatus, injuryStatus = false) => {
    if (e) e.preventDefault();
    const formName = document.querySelector('[name="name"]').value;
    const formMessage = document.querySelector('[name="message"]').value;
    
    fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        zone: zone,
        status: currentStatus,
        message: formMessage,
        is_injured: injuryStatus
      })
    }).then(() => {
      setIsInjured(injuryStatus);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="command-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="nav-tabs" style={{ justifyContent: 'flex-start', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem', marginBottom: '0' }}>
          <VenueSafeLogo width={260} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button className="nav-tab" onClick={() => navigate('/')}><LayoutDashboard size={16} /> Dashboard</button>
            <button className="nav-tab" onClick={() => navigate('/')}><AlertTriangle size={16} /> Report Incident</button>
            <button className="nav-tab" onClick={() => navigate('/responder')}><Users size={16} /> Responders</button>
            <button className="nav-tab active" onClick={() => navigate('/guest')}><Search size={16} /> Guest Portal</button>
            <button className="nav-tab" onClick={() => navigate('/muster')}><Target size={16} /> Muster Station</button>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </nav>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2rem' }}>
          {status === 'safe' 
            ? (isInjured ? 'Medical responders have been notified of your injury. Please remain calm.' : 'Thank you for checking in safe. Please follow evacuation protocols.')
            : 'Emergency responders have been notified of your exact location and situation. Please stay as safe as possible.'}
        </p>

        {activeIncident && activeIncident.evacuation_route && status === 'safe' && !isInjured && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', padding: '1rem', borderRadius: 'var(--radius-sm)', maxWidth: '400px', color: '#fff', textAlign: 'left' }}>
            <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>PERSONALIZED EVACUATION ROUTE:</strong>
            {(() => {
              try {
                const routes = JSON.parse(activeIncident.evacuation_route);
                return routes[zone] || routes['DEFAULT'] || 'Follow staff instructions and exit safely.';
              } catch (e) {
                return activeIncident.evacuation_route;
              }
            })()}
          </div>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="command-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <nav className="nav-tabs" style={{ justifyContent: 'flex-start', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem', marginBottom: '0', flexShrink: 0 }}>
        <VenueSafeLogo width={260} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <button className="nav-tab" onClick={() => navigate('/')}><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-tab" onClick={() => navigate('/')}><AlertTriangle size={16} /> Report Incident</button>
          <button className="nav-tab" onClick={() => navigate('/responder')}><Users size={16} /> Responders</button>
          <button className="nav-tab active" onClick={() => navigate('/guest')}><Search size={16} /> Guest Portal</button>
          <button className="nav-tab" onClick={() => navigate('/muster')}><Target size={16} /> Muster Station</button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: '2rem' }}>

      {toast && (
        <div style={{ background: 'var(--accent-red)', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 15px rgba(255, 0, 60, 0.5)', animation: 'slideInDown 0.5s ease-out', position: 'fixed', top: '1rem', left: '1rem', right: '1rem', zIndex: 100 }}>
          <Bell size={24} />
          <div style={{ fontWeight: 'bold' }}>{toast}</div>
          <button onClick={() => setToast(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem' }}>✕</button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e, status || 'trapped', false); }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
          <input type="text" name="name" className="triage-input" required placeholder="Enter your name" style={{ marginBottom: 0, minHeight: 'auto', padding: '1rem' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>Current Location</span>
            {zone === 'LOBBY ZONE A' && <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> Auto-detected</span>}
          </label>
          <select name="zone" value={zone} onChange={(e) => setZone(e.target.value)} className="triage-input" required style={{ marginBottom: 0, minHeight: 'auto', padding: '1rem', WebkitAppearance: 'none' }}>
            <option value="" disabled>Select your current zone...</option>
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
          {!showInjuryPrompt ? (
            <>
              <button 
                type="button" 
                onClick={() => { setStatus('safe'); setShowInjuryPrompt(true); }}
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
            </>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Are you injured?</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => handleSubmit(null, 'safe', true)}
                  style={{ flex: 1, padding: '1rem', background: 'rgba(255, 0, 60, 0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                  YES, NEED MEDICAL
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSubmit(null, 'safe', false)}
                  style={{ flex: 1, padding: '1rem', background: 'rgba(0, 255, 102, 0.2)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                  NO, UNHARMED
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}
