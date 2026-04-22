import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Crosshair, Users, Activity, Radio } from 'lucide-react';
import { socket } from '../socket';

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
  const [incidents, setIncidents] = useState([]);
  const [guests, setGuests] = useState([]);

  useEffect(() => {
    // Fetch initial data
    fetch('http://localhost:3000/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.filter(i => i.status !== 'resolved')));

    fetch('http://localhost:3000/api/guests')
      .then(res => res.json())
      .then(data => setGuests(data));

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

    return () => {
      socket.off('incident_update', handleIncidentUpdate);
      socket.off('guest_update', handleGuestUpdate);
    };
  }, []);

  const trappedGuests = guests.filter(g => g.status === 'trapped');
  const safeGuests = guests.filter(g => g.status === 'safe');

  return (
    <div className="command-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="top-header" style={{ marginBottom: '0' }}>
        <div className="brand-section">
          <div className="brand-icon-box" style={{ background: 'rgba(0, 240, 255, 0.15)', borderColor: 'rgba(0, 240, 255, 0.5)', color: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)' }}>
            <Crosshair size={28} />
          </div>
          <div>
            <h1 className="brand-title" style={{ color: 'var(--accent-cyan)', textShadow: 'var(--glow-cyan)' }}>911 RESPONDER VIEW</h1>
            <div className="brand-subtitle" style={{ color: '#fff', textShadow: 'none' }}>TACTICAL DISPATCH OVERRIDE</div>
          </div>
        </div>
        <div className="system-status">
          <div style={{ display: 'flex', gap: '2rem' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
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
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{inc.zone.split(' ')[0]}: {inc.category.toUpperCase()}</span>
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
                {g.translated_message ? (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Translated Transcript:</div>
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
                <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>PRIORITY: {g.priority_level.toUpperCase()}</span>
                  <span>{new Date(g.created_at).toLocaleTimeString()}</span>
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
