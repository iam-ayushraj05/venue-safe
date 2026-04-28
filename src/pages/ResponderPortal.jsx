import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Crosshair, Users, Activity, Radio, LayoutDashboard, Search, Target, Moon, Sun } from 'lucide-react';
import { socket } from '../socket';
import VenueSafeLogo from '../components/VenueSafeLogo';
import { useTheme } from '../hooks/useTheme';

// Re-using same zones
const ZONES = [
  { id: 'LOBBY ZONE A', x: 15, y: 30, width: 20, height: 25 },
  { id: 'GRAND BALLROOM ZONE B', x: 40, y: 30, width: 20, height: 25 },
  { id: 'RESTAURANT ZONE C', x: 65, y: 30, width: 15, height: 25 },
  { id: 'POOL DECK ZONE D', x: 85, y: 30, width: 10, height: 25 },
  { id: 'CONFERENCE CTR ZONE E', x: 15, y: 60, width: 25, height: 25 },
  { id: 'SPA & WELLNESS ZONE F', x: 45, y: 60, width: 20, height: 25 },
  { id: 'PARKING / EXIT ZONE G', x: 70, y: 60, width: 25, height: 25 }
];

export default function ResponderPortal() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [incidents, setIncidents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [musterPoints, setMusterPoints] = useState([]);
  const [safetyTime, setSafetyTime] = useState(300);
  const [safetyAlert, setSafetyAlert] = useState(false);
  const [responderStatus, setResponderStatus] = useState({});
  const [currentZone, setCurrentZone] = useState('');

  useEffect(() => {
    if (!currentZone) return;
    const timer = setInterval(() => {
      setSafetyTime(prev => {
        if (prev === 1) {
          setSafetyAlert(true);
          fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `RESPONDER SAFETY ALERT`,
              description: `Automated safety check-in missed by responder in ${currentZone}. Status unknown. Immediate support required.`,
              zone: currentZone.replace(' ZONE', ''),
            })
          });
          return 0;
        }
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentZone]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAction = (guestId, action) => {
    setResponderStatus(prev => ({ ...prev, [guestId]: action }));
  };

  useEffect(() => {
    // Fetch initial data
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.filter(i => i.status !== 'resolved')));

    fetch('/api/guests')
      .then(res => res.json())
      .then(data => setGuests(data));

    fetch('/api/muster')
      .then(res => res.json())
      .then(data => setMusterPoints(data));

    // Socket listeners
    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => {
        if (updatedIncident.status === 'resolved') {
          return prev.filter(i => i.id !== updatedIncident.id);
        }
        const exists = prev.find(i => i.id === updatedIncident.id);
        if (exists) return prev.map(i => i.id === updatedIncident.id ? updatedIncident : i);
        return [...prev, updatedIncident];
      });
    };

    const handleGuestUpdate = (updatedGuest) => {
      setGuests(prev => {
        const exists = prev.find(g => g.id === updatedGuest.id);
        if (exists) return prev.map(g => g.id === updatedGuest.id ? updatedGuest : g);
        return [updatedGuest, ...prev];
      });
    };

    socket.on('incident_update', handleIncidentUpdate);
    socket.on('guest_update', handleGuestUpdate);
    socket.on('muster_update', () => {
      fetch('/api/muster').then(r => r.json()).then(setMusterPoints);
    });

    return () => {
      socket.off('incident_update', handleIncidentUpdate);
      socket.off('guest_update', handleGuestUpdate);
      socket.off('muster_update');
    };
  }, []);

  const trappedGuests = guests.filter(g => g.status === 'trapped');
  const safeGuests = guests.filter(g => g.status === 'safe');

  return (
    <div className="command-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-tabs" style={{ justifyContent: 'flex-start', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem', marginBottom: '0' }}>
        <VenueSafeLogo width={260} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <button className="nav-tab" onClick={() => navigate('/')}><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-tab" onClick={() => navigate('/')}><AlertTriangle size={16} /> Report Incident</button>
          <button className="nav-tab active" onClick={() => navigate('/responder')}><Users size={16} /> Responders</button>
          <button className="nav-tab" onClick={() => navigate('/guest')}><Search size={16} /> Guest Portal</button>
          <button className="nav-tab" onClick={() => navigate('/muster')}><Target size={16} /> Muster Station</button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <header className="top-header" style={{ marginBottom: '0' }}>
        <div className="system-status" style={{ width: '100%', justifyContent: 'flex-end', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: safetyAlert ? 'rgba(255,0,60,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${safetyAlert ? 'var(--accent-red)' : 'rgba(255,255,255,0.1)'}`, padding: '0.5rem 1rem', borderRadius: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <select 
                value={currentZone} 
                onChange={(e) => {
                  setCurrentZone(e.target.value);
                  setSafetyTime(300);
                  setSafetyAlert(false);
                }}
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
              >
                <option value="">-- SELECT LOCATION --</option>
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.id}</option>)}
              </select>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>Safety Check-in</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: safetyAlert ? 'var(--accent-red)' : (!currentZone ? 'var(--text-muted)' : '#fff'), fontWeight: 'bold', animation: safetyAlert ? 'pulseThreat 1s infinite' : 'none' }}>
                {currentZone ? formatTime(safetyTime) : '--:--'}
              </div>
            </div>
            <button 
              disabled={!currentZone}
              onClick={() => { setSafetyTime(300); setSafetyAlert(false); }}
              style={{ background: currentZone ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', color: currentZone ? '#000' : 'var(--text-muted)', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', cursor: currentZone ? 'pointer' : 'not-allowed', textShadow: 'none' }}>
              CHECK IN
            </button>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-red)', textShadow: 'var(--glow-red)', fontWeight: 'bold', lineHeight: 1 }}>{trappedGuests.length}</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Trapped</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-green)', textShadow: 'var(--glow-green)', fontWeight: 'bold', lineHeight: 1 }}>{safeGuests.length}</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Safe</div>
            </div>
          </div>
        </div>
      </header>

      <div className="responder-grid">
        {/* Tactical Map */}
        <div className="panel map-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div className="panel-title">TACTICAL SENSOR MAP</div>
            <div className="panel-action" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
              <Radio size={14} className="spin" style={{ animationDuration: '3s' }} /> BROADCASTING
            </div>
          </div>
          <div className="blueprint-map" style={{ flex: 1, height: 'auto' }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Threats</h3>
              {incidents.map(inc => (
                <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-red)', textShadow: '0 0 5px rgba(255,0,60,0.5)' }}>
                  <AlertTriangle size={14} />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{inc.zone.split(' ')[0]}: {(inc.category || 'ANALYZING').toUpperCase()}</span>
                </div>
              ))}
              {incidents.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active threats detected</div>}
            </div>

            {ZONES.map(zone => {
              const zoneTrapped = trappedGuests.filter(g => g.zone === zone.id);
              const zoneSafe = safeGuests.filter(g => g.zone === zone.id);
              const zoneIncidents = incidents.filter(i => i.zone === zone.id || i.zone === 'ALL ZONES');
              
              return (
                <div
                  key={zone.id}
                  className={`map-zone ${zoneIncidents.length > 0 ? 'active-threat' : ''}`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                >
                  <span className="zone-name">{zone.id.split(' ')[0]}</span>
                  
                  {zoneTrapped.length > 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(255, 0, 60, 0.2)', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--accent-red)', boxShadow: 'var(--glow-red)', textShadow: '0 0 5px #fff' }}>
                        {zoneTrapped.length}
                      </div>
                    </div>
                  )}

                  {zoneSafe.length > 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '70%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(0, 255, 102, 0.1)', color: 'var(--accent-green)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--accent-green)', boxShadow: 'var(--glow-green)' }}>
                        {zoneSafe.length}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Muster Recon Panel */}
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ color: 'var(--accent-yellow)' }}>MUSTER RECON</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ZONES.map(zone => {
              const pt = musterPoints.find(p => p.zone === zone.id);
              const safeAppGuests = safeGuests.filter(g => g.zone === zone.id).length;
              const accounted = (pt?.current_count || 0) + safeAppGuests;
              
              // Fake expected counts for demo realism
              const expected = zone.id.includes('BALLROOM') ? 300 : zone.id.includes('LOBBY') ? 150 : 50;
              const missing = expected - accounted;
              const isMissing = missing > 0;

              return (
                <div key={zone.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${isMissing ? 'var(--accent-yellow)' : 'var(--accent-green)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{zone.id.split(' ')[0]}</strong>
                    <span style={{ fontSize: '0.8rem', color: isMissing ? 'var(--accent-yellow)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                      {accounted} / {expected}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px', width: '100%' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: isMissing ? 'var(--accent-yellow)' : 'var(--accent-green)', width: `${Math.min(100, (accounted / expected) * 100)}%` }} />
                  </div>
                  {isMissing && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)' }}>
                      {missing} Unaccounted
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Triage Communications Feed */}
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ color: 'var(--accent-red)' }}><Users size={16} style={{ color: 'var(--accent-red)' }}/> PRIORITY TRIAGE</div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
            {trappedGuests.map(g => (
              <div key={g.id} style={{ borderLeft: '4px solid var(--accent-red)', background: 'rgba(255, 0, 60, 0.05)', padding: '1.25rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '1.1rem', textShadow: '0 0 5px rgba(255,255,255,0.3)' }}>{g.name.toUpperCase()}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', background: 'rgba(0,240,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--accent-cyan)' }}>{g.zone.split(' ')[0]}</span>
                </div>
                
                {g.is_injured ? (
                  <div style={{ marginBottom: '0.75rem', background: 'rgba(255, 0, 60, 0.2)', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--accent-red)', display: 'inline-block' }}>
                    <Crosshair size={12} style={{ display: 'inline', marginRight: '4px' }}/> MEDICAL ATTENTION REQUIRED
                  </div>
                ) : null}
                {g.translated_message ? (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>Translated Transcript</span>
                      {g.detected_language && <span style={{ color: 'var(--accent-cyan)', background: 'rgba(0, 240, 255, 0.1)', padding: '0 4px', borderRadius: '2px' }}>{g.detected_language}</span>}
                      {g.detected_category && <span style={{ color: 'var(--accent-red)', background: 'rgba(255, 0, 60, 0.1)', padding: '0 4px', borderRadius: '2px' }}>{g.detected_category.toUpperCase()}</span>}
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.5, background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>"{g.translated_message}"</p>
                    {g.original_message !== g.translated_message && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>Original: "{g.original_message}"</p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
                    <AlertTriangle size={14} /> TRAPPED. NO MESSAGE.
                  </div>
                )}
                <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>PRIORITY: {g.priority_level.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {responderStatus[g.id] === 'arrived' ? (
                       <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                         <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>ON SCENE</span>
                         <button onClick={() => {
                           fetch(`/api/guests/${g.id}/safe`, { method: 'PATCH' });
                         }} style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>MARK SAFE</button>
                       </div>
                    ) : responderStatus[g.id] === 'en_route' ? (
                       <button onClick={() => handleAction(g.id, 'arrived')} style={{ background: 'rgba(0, 255, 102, 0.2)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>MARK ARRIVED</button>
                    ) : (
                       <button onClick={() => handleAction(g.id, 'en_route')} style={{ background: 'rgba(0, 240, 255, 0.2)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>SET ETA 2 MIN</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {trappedGuests.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <div>No trapped guests reported.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
