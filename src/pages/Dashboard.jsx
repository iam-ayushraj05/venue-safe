import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, Map, LayoutDashboard, Crosshair, Target, Navigation, Users, Zap, Search, ShieldAlert, HeartPulse, Flame, Wifi } from 'lucide-react';
import { socket } from '../socket';

const ZONES = [
  { id: 'LOBBY ZONE A', x: 15, y: 30, width: 20, height: 25 },
  { id: 'GRAND BALLROOM ZONE B', x: 40, y: 30, width: 20, height: 25 },
  { id: 'RESTAURANT ZONE C', x: 65, y: 30, width: 15, height: 25 },
  { id: 'POOL DECK ZONE D', x: 85, y: 30, width: 10, height: 25 },
  { id: 'CONFERENCE CTR ZONE E', x: 15, y: 60, width: 25, height: 25 },
  { id: 'SPA & WELLNESS ZONE F', x: 45, y: 60, width: 20, height: 25 },
  { id: 'PARKING / EXIT ZONE G', x: 70, y: 60, width: 25, height: 25 }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const triageRef = useRef(null);
  
  const [incidents, setIncidents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [latency, setLatency] = useState(42);
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [triageCategory, setTriageCategory] = useState(null);
  const [triageText, setTriageText] = useState('');
  const [isTriaging, setIsTriaging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
      if (Math.random() > 0.7) {
        setLatency(prev => Math.max(12, Math.min(85, prev + Math.floor(Math.random() * 15) - 7)));
      }
    }, 1000);

    fetch('http://localhost:3000/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.filter(i => i.status !== 'resolved')));

    fetch('http://localhost:3000/api/guests')
      .then(res => res.json())
      .then(data => setGuests(data));

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => {
        if (updatedIncident.status === 'resolved') {
          if (selectedIncident?.id === updatedIncident.id) setSelectedIncident(null);
          return prev.filter(i => i.id !== updatedIncident.id);
        }
        const exists = prev.find(i => i.id === updatedIncident.id);
        if (exists) {
          if (selectedIncident?.id === updatedIncident.id) setSelectedIncident(updatedIncident);
          return prev.map(i => i.id === updatedIncident.id ? updatedIncident : i);
        }
        return [updatedIncident, ...prev];
      });
      setIsTriaging(false);
      setTriageText('');
      setTriageCategory(null);
    };

    const handleGuestUpdate = (updatedGuest) => {
      setGuests(prev => {
        const exists = prev.find(g => g.id === updatedGuest.id);
        if (exists) return prev.map(g => g.id === updatedGuest.id ? updatedGuest : g);
        return [updatedGuest, ...prev];
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('incident_update', handleIncidentUpdate);
    socket.on('guest_update', handleGuestUpdate);

    return () => {
      clearInterval(timer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('incident_update', handleIncidentUpdate);
      socket.off('guest_update', handleGuestUpdate);
    };
  }, [selectedIncident]);

  const triggerTriage = () => {
    if (!triageText || !triageCategory) return;
    setIsTriaging(true);
    fetch('http://localhost:3000/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${triageCategory} Alert`,
        description: triageText,
        zone: ZONES[Math.floor(Math.random() * ZONES.length)].id.replace(' ZONE', '')
      })
    });
  };

  const triggerLockdown = () => {
    fetch('http://localhost:3000/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `FACILITY LOCKDOWN`,
        description: `SYSTEM OVERRIDE: Full facility lockdown initiated. Security protocol Alpha engaged. All exits sealed.`,
        zone: `ALL ZONES`
      })
    });
  };

  const activeCount = incidents.length;
  const unaccounted = Math.max(0, 850 - guests.filter(g => g.status === 'safe').length);
  const respondersReady = 6;

  return (
    <div className="command-center">
      {/* Top Header */}
      <header className="top-header">
        <div className="brand-section">
          <div className="brand-icon-box">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="brand-title">VENUESAFE</h1>
            <div className="brand-subtitle">COMMAND SYSTEM v2.0</div>
          </div>
        </div>
        <div className="system-status">
          <button className="btn-lockdown" onClick={triggerLockdown}>
            <ShieldAlert size={16} /> INITIATE LOCKDOWN
          </button>
          <div className="status-indicator" style={{ color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            <div className="status-dot" style={{ background: isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }}></div>
            {isConnected ? 'ALL SYSTEMS LIVE' : 'CONNECTION LOST'}
          </div>
          <div className="time-display">{time}</div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button className="nav-tab active"><LayoutDashboard size={16} /> Dashboard</button>
        <button className="nav-tab" onClick={() => triageRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <AlertTriangle size={16} /> Report Incident
        </button>
        <button className="nav-tab" onClick={() => window.open('/responder', '_blank')}>
          <Users size={16} /> Responders
        </button>
        <button className="nav-tab" onClick={() => window.open('/guest', '_blank')}>
          <Search size={16} /> Guest Portal
        </button>
      </nav>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card red">
          <div className="metric-title">Active Incidents</div>
          <div className="metric-value">{activeCount}</div>
          <div className="metric-subtitle">Live events</div>
        </div>
        <div className="metric-card yellow">
          <div className="metric-title">Guests Unaccounted</div>
          <div className="metric-value">{unaccounted}</div>
          <div className="metric-subtitle">Pending muster</div>
        </div>
        <div className="metric-card green">
          <div className="metric-title">Responders Ready</div>
          <div className="metric-value">{respondersReady}</div>
          <div className="metric-subtitle">On-site available</div>
        </div>
        <div className="metric-card cyan">
          <div className="metric-title">System Latency</div>
          <div className="metric-value">{latency}ms</div>
          <div className="metric-subtitle">Sub-200ms target</div>
        </div>
        <div className="metric-card green" style={{ gridColumn: 'span 1' }}>
          <div className="metric-title">Network Status</div>
          <div className="metric-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: 'var(--accent-green)', textShadow: 'var(--glow-green)' }}>
            <Wifi size={24} style={{ display: 'inline', marginRight: '0.5rem' }}/> ONLINE
          </div>
          <div className="metric-subtitle">LTE + WiFi active</div>
        </div>
      </div>

      {/* Blueprint Map */}
      <div className="panel map-panel">
        <div className="panel-header">
          <div className="panel-title">LIVE VENUE MAP</div>
          <div className="panel-action">GRAND HYATT FLOOR 1</div>
        </div>
        <div className="blueprint-map">
          {ZONES.map(zone => {
            const hasIncident = incidents.some(i => i.zone.toUpperCase().includes(zone.id.split(' ')[0]) || i.zone === 'ALL ZONES');
            return (
              <div 
                key={zone.id} 
                className={`map-zone ${hasIncident ? 'active-threat' : ''}`}
                style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
              >
                <div className="zone-name">{zone.id.split(' ')[0]}</div>
                <div className="zone-id">{zone.id.split(' ').slice(1).join(' ')}</div>
                
                {hasIncident && (
                  <div className="map-marker" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                )}
              </div>
            );
          })}
          <div style={{ position: 'absolute', bottom: '1rem', left: '0', right: '0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            MAIN CORRIDOR - EVACUATION ROUTE
          </div>
        </div>
      </div>

      {/* Live Incident Feed */}
      <div className="panel feed-panel">
        <div className="panel-header">
          <div className="panel-title">LIVE INCIDENT FEED</div>
          <div className="panel-action">{incidents.length} ACTIVE</div>
        </div>
        
        {incidents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <div>No active incidents.</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Use Quick Triage to simulate event.</div>
          </div>
        ) : (
          <div className="incident-list">
            {incidents.map(inc => (
              <div 
                key={inc.id} 
                className={`incident-row ${selectedIncident?.id === inc.id ? 'selected' : ''}`}
                onClick={() => setSelectedIncident(inc)}
              >
                <div className={`incident-badge badge-${inc.severity?.toLowerCase() || 'medium'}`}>
                  {inc.severity || 'ANALYZING'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{inc.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{inc.zone} • {inc.category}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(inc.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Quick Triage */}
      <div className="panel triage-panel" ref={triageRef}>
        <div className="panel-header">
          <div className="panel-title">AI QUICK TRIAGE</div>
        </div>
        <div className="triage-categories">
          <button className={`category-btn ${triageCategory === 'Fire' ? 'active' : ''}`} onClick={() => setTriageCategory('Fire')}>
            <Flame size={16} /> Fire
          </button>
          <button className={`category-btn ${triageCategory === 'Medical' ? 'active' : ''}`} onClick={() => setTriageCategory('Medical')}>
            <HeartPulse size={16} /> Medical
          </button>
          <button className={`category-btn ${triageCategory === 'Security' ? 'active' : ''}`} onClick={() => setTriageCategory('Security')}>
            <ShieldAlert size={16} /> Security
          </button>
          <button className={`category-btn ${triageCategory === 'Crowd' ? 'active' : ''}`} onClick={() => setTriageCategory('Crowd')}>
            <Users size={16} /> Crowd
          </button>
        </div>
        <textarea 
          className="triage-input" 
          placeholder="Describe the incident... e.g. 'Guest collapsed in ballroom, unresponsive, crowd gathering'"
          value={triageText}
          onChange={(e) => setTriageText(e.target.value)}
        ></textarea>
        <button className={`btn-trigger ${isTriaging ? 'active' : ''}`} onClick={triggerTriage}>
          <Zap size={16} /> {isTriaging ? 'ANALYZING THREAT...' : 'TRIGGER AI TRIAGE'}
        </button>
      </div>

      {/* Incident Detail */}
      <div className="panel detail-panel" style={{ marginBottom: '4rem' }}>
        <div className="panel-header">
          <div className="panel-title">INCIDENT DETAIL</div>
        </div>
        
        {!selectedIncident ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Target size={32} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--accent-cyan)' }} />
            <div>Select an incident from the feed to view AI response plan.</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{selectedIncident.title}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedIncident.description}</div>
              </div>
              <button 
                onClick={() => {
                  fetch(`http://localhost:3000/api/incidents/${selectedIncident.id}/resolve`, { method: 'PATCH' });
                }}
                style={{ padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', boxShadow: 'var(--glow-green)' }}
              >
                Resolve Incident
              </button>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textShadow: 'var(--glow-cyan)' }}>
              <Navigation size={16} /> AI TACTICAL RESPONSE PLAN
            </h3>
            
            {selectedIncident.status === 'pending_analysis' ? (
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} className="spin" /> Generating tactical plan via Gemini AI...
              </div>
            ) : selectedIncident.ai_action_plan && selectedIncident.ai_action_plan.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedIncident.ai_action_plan.map((step, idx) => (
                  <div key={idx} style={{ background: 'rgba(0, 240, 255, 0.05)', borderLeft: '3px solid var(--accent-cyan)', padding: '1rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '0.25rem', fontWeight: 'bold' }}>STEP 0{idx + 1}</div>
                    <div style={{ color: '#fff' }}>{step}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No actionable intelligence available.</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
