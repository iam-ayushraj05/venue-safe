import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, Map, LayoutDashboard, Crosshair, Target, Navigation, Users, Zap, Search, ShieldAlert, HeartPulse, Flame, Wifi, Radio, Smartphone, Clock, Moon, Sun } from 'lucide-react';
import { socket } from '../socket';
import VenueSafeLogo from '../components/VenueSafeLogo';
import { useTheme } from '../hooks/useTheme';

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
  const { theme, toggleTheme } = useTheme();
  
  const [incidents, setIncidents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [latency, setLatency] = useState(42);
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [triageCategory, setTriageCategory] = useState(null);
  const [triageText, setTriageText] = useState('');
  const [isTriaging, setIsTriaging] = useState(false);
  
  const [patternSuggestion, setPatternSuggestion] = useState(null);
  const [musterPoints, setMusterPoints] = useState([]);
  const [isDrillMode, setIsDrillMode] = useState(false);
  const [severityAlert, setSeverityAlert] = useState(null);
  const [selectedMapZone, setSelectedMapZone] = useState(null);
  const [evacTimer, setEvacTimer] = useState(15 * 60);

  const getRelativeTime = (dateString) => {
    const diffInSeconds = (new Date() - new Date(dateString)) / 1000;
    if (diffInSeconds < 60) return `${Math.round(diffInSeconds)} sec ago`;
    const diffInMinutes = diffInSeconds / 60;
    if (diffInMinutes < 60) return `${Math.round(diffInMinutes)} min ago`;
    return `${Math.round(diffInMinutes / 60)} hrs ago`;
  };

  const getNetworkStatus = () => {
    if (!isConnected) return { status: 'OFFLINE', color: 'var(--accent-red)', icon: <ShieldAlert size={24} />, sub: 'Connection lost' };
    if (latency > 70) return { status: 'SATELLITE FALLBACK', color: 'var(--accent-yellow)', icon: <Radio size={24} />, sub: 'Degraded performance' };
    if (latency > 50) return { status: 'LTE BACKUP', color: 'var(--accent-yellow)', icon: <Smartphone size={24} />, sub: 'Reduced bandwidth' };
    return { status: 'ONLINE', color: 'var(--accent-green)', icon: <Wifi size={24} />, sub: 'LTE + WiFi active' };
  };

  // 1. Clock and Timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
      if (Math.random() > 0.7) {
        setLatency(prev => Math.max(12, Math.min(85, prev + Math.floor(Math.random() * 15) - 7)));
      }
      setEvacTimer(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Initial Data Fetch
  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.filter(i => i.status !== 'resolved')));

    fetch('/api/guests')
      .then(res => res.json())
      .then(data => setGuests(data));

    fetch('/api/muster')
      .then(res => res.json())
      .then(data => setMusterPoints(data));
  }, []);

  // 3. Socket Listeners
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => {
        if (updatedIncident.status === 'resolved') {
          return prev.filter(i => i.id !== updatedIncident.id);
        }
        const exists = prev.find(i => i.id === updatedIncident.id);
        if (exists) {
          return prev.map(i => i.id === updatedIncident.id ? updatedIncident : i);
        }
        return [updatedIncident, ...prev];
      });

      // State updates outside of setIncidents functional updater
      if (updatedIncident.status === 'resolved' && selectedIncident?.id === updatedIncident.id) {
        setSelectedIncident(null);
      } else if (selectedIncident?.id === updatedIncident.id) {
        setSelectedIncident(updatedIncident);
      }

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
    socket.on('pattern_detected', data => setPatternSuggestion(data.suggestion));
    socket.on('muster_update', () => {
      fetch('/api/muster').then(r => r.json()).then(setMusterPoints);
    });
    socket.on('severity_alert', data => setSeverityAlert(data));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('incident_update', handleIncidentUpdate);
      socket.off('guest_update', handleGuestUpdate);
      socket.off('pattern_detected');
      socket.off('muster_update');
      socket.off('severity_alert');
    };
  }, [selectedIncident]);

  const triggerTriage = () => {
    if (!triageText || !triageCategory) return;
    setIsTriaging(true);
    fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${triageCategory} Alert`,
        description: triageText,
        zone: ZONES[Math.floor(Math.random() * ZONES.length)].id.replace(' ZONE', '')
      })
    });
    
    // Auto-scroll to top so the user can see the new incident in the feed/map
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerLockdown = () => {
    fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `FACILITY LOCKDOWN`,
        description: `SYSTEM OVERRIDE: Full facility lockdown initiated. Security protocol Alpha engaged. All exits sealed.`,
        zone: `ALL ZONES`
      })
    });
  };

  const simulateTimeSkip = () => {
    ZONES.forEach(zone => {
      const pt = musterPoints.find(p => p.zone === zone.id);
      const safeAppGuests = guests.filter(g => g.zone === zone.id && g.status === 'safe').length;
      const accounted = (pt?.current_count || 0) + safeAppGuests;
      const expected = zone.id.includes('BALLROOM') ? 300 : zone.id.includes('LOBBY') ? 150 : 50;
      const missing = expected - accounted;
      if (missing > 0) {
        fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `SEARCH & RESCUE DISPATCHED`,
            description: `Auto-escalation after 10 minutes: ${missing} guests unaccounted for in ${zone.id}. Immediate search sweep required.`,
            zone: zone.id.replace(' ZONE', '')
          })
        });
      }
    });
  };

  const formatEvacTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeCount = incidents.length;
  const timeSinceLast = incidents.length > 0 ? getRelativeTime(incidents[0].created_at) : 'No recent events';
  const unaccounted = Math.max(0, 850 - guests.filter(g => g.status === 'safe').length);
  const accountedCount = musterPoints.reduce((acc, pt) => acc + pt.current_count, 0);
  const totalExpected = 850;
  const respondersReady = 6;
  const netStat = getNetworkStatus();

  return (
    <div className={`command-center ${isDrillMode ? 'drill-mode-active' : ''}`}>
      {isDrillMode && (
        <div style={{ background: 'var(--accent-yellow)', color: '#000', textAlign: 'center', padding: '0.5rem', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.85rem', zIndex: 1000, position: 'relative' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
          DRILL MODE ACTIVE - SIMULATION IN PROGRESS
          <AlertTriangle size={16} style={{ display: 'inline', marginLeft: '8px', verticalAlign: 'text-bottom' }} />
        </div>
      )}
      {/* Navigation Bar with Logo */}
      <nav className="nav-tabs" style={{ justifyContent: 'flex-start', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem' }}>
        <VenueSafeLogo width={260} />
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <button className="nav-tab active" onClick={() => navigate('/')}><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-tab" onClick={() => triageRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <AlertTriangle size={16} /> Report Incident
          </button>
          <button className="nav-tab" onClick={() => navigate('/responder')}>
            <Users size={16} /> Responders
          </button>
          <button className="nav-tab" onClick={() => navigate('/guest')}>
            <Search size={16} /> Guest Portal
          </button>
          <button className="nav-tab" onClick={() => navigate('/muster')}>
            <Target size={16} /> Muster Station
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Top Header */}
      <header className="top-header">
        <div className="system-status" style={{ width: '100%', justifyContent: 'flex-end' }}>
          {incidents.length > 0 && (
            <div style={{ marginRight: '1.5rem', textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Est. Evacuation</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', animation: 'pulseThreat 1s infinite' }}>{formatEvacTimer(evacTimer)}</div>
            </div>
          )}
          <div style={{ marginRight: '1.5rem', textAlign: 'right' }}>
             <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Last Incident</div>
             <div style={{ fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>{timeSinceLast}</div>
          </div>
          <button className="btn-drill" onClick={simulateTimeSkip} style={{ marginRight: '1rem', background: 'rgba(255, 0, 60, 0.2)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
            <Activity size={14} style={{ display: 'inline', marginRight: '4px' }}/> TIME SKIP: 10 MINS
          </button>
          <button className={`btn-drill ${isDrillMode ? 'active' : ''}`} onClick={() => setIsDrillMode(!isDrillMode)} style={{ marginRight: '1rem', background: isDrillMode ? 'var(--accent-yellow)' : 'transparent', color: isDrillMode ? '#000' : 'var(--text-secondary)', border: '1px solid var(--accent-yellow)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }}/> DRILL MODE
          </button>
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

      {patternSuggestion && (
        <div style={{ background: 'rgba(147, 51, 234, 0.2)', border: '1px solid #9333ea', borderRadius: '8px', padding: '12px 16px', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#d8b4fe', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> AI PREDICTION
          </span>
          <span style={{ color: '#fff', fontSize: '0.95rem' }}>{patternSuggestion}</span>
        </div>
      )}
      
      {severityAlert && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <span style={{ color: '#fca5a5', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} /> {severityAlert.message}
          </span>
          <button onClick={() => setSeverityAlert(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card red">
          <div className="metric-title">Active Incidents</div>
          <div className="metric-value">{activeCount}</div>
          <div className="metric-subtitle">Live events</div>
        </div>
        <div className="metric-card yellow">
          <div className="metric-title">Accounted For</div>
          <div className="metric-value">{accountedCount} / {totalExpected}</div>
          <div className="metric-subtitle">
            <div style={{ background: 'rgba(255,255,255,0.2)', height: '4px', borderRadius: '2px', marginTop: '6px' }}>
              <div style={{ background: 'var(--accent-yellow)', height: '100%', borderRadius: '2px', width: `${Math.min(100, (accountedCount / totalExpected) * 100)}%` }}></div>
            </div>
          </div>
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
          <div className="metric-value" style={{ fontSize: '1.2rem', marginTop: '0.5rem', color: netStat.color, textShadow: `0 0 10px ${netStat.color}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {netStat.icon} {netStat.status}
          </div>
          <div className="metric-subtitle">{netStat.sub}</div>
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
            const pt = musterPoints.find(p => p.zone === zone.id);
            const safeAppGuests = guests.filter(g => g.zone === zone.id && g.status === 'safe').length;
            const zoneTrapped = guests.filter(g => g.zone === zone.id && g.status === 'trapped').length;
            const accounted = (pt?.current_count || 0) + safeAppGuests;
            const expected = zone.id.includes('BALLROOM') ? 300 : zone.id.includes('LOBBY') ? 150 : 50;
            const missing = expected - accounted;
            const hasWarning = missing > 0 || zoneTrapped > 0;
            const crowdDensity = (pt?.current_count || 0) + safeAppGuests;
            // Fake baseline density for demo purposes, adding real crowd density on top
            const baseDensity = zone.id.includes('BALLROOM') ? 0.6 : zone.id.includes('LOBBY') ? 0.4 : 0.1;
            const heatmapIntensity = Math.min(1, baseDensity + (crowdDensity / 15));
            return (
              <div 
                key={zone.id} 
                className={`map-zone ${hasIncident ? 'active-threat' : ''} ${selectedMapZone?.id === zone.id ? 'selected-zone' : ''}`}
                style={{ 
                  left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%`, 
                  cursor: 'pointer', pointerEvents: 'auto', 
                  borderColor: hasIncident ? 'var(--accent-red)' : hasWarning ? 'var(--accent-yellow)' : 'rgba(0, 255, 102, 0.3)',
                  backgroundColor: hasIncident ? 'rgba(255, 0, 60, 0.1)' : hasWarning ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0, 255, 102, 0.05)',
                  outline: selectedMapZone?.id === zone.id ? '2px solid var(--accent-cyan)' : 'none', outlineOffset: '2px' 
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMapZone(zone);
                }}
              >
                {heatmapIntensity > 0 && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `rgba(234, 179, 8, ${heatmapIntensity * 0.4})`, borderRadius: 'inherit', pointerEvents: 'none' }}></div>
                )}
                <div className="zone-name">{zone.id.split(' ')[0]}</div>
                <div className="zone-id">{zone.id.split(' ').slice(1).join(' ')}</div>
                
                {hasIncident && (
                  <div className="map-marker" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                )}
              </div>
            );
          })}
          
          {selectedMapZone && (
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', border: '1px solid var(--accent-cyan)', padding: '1rem', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(10px)', zIndex: 20, width: '240px', boxShadow: 'var(--glow-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ color: 'var(--accent-cyan)', margin: 0, fontSize: '0.9rem', lineHeight: 1.2 }}>{selectedMapZone.id}</h3>
                <button onClick={() => setSelectedMapZone(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Zone Drill-down</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Safe Guests:</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{guests.filter(g => g.zone === selectedMapZone.id && g.status === 'safe').length + (musterPoints.find(p => p.zone === selectedMapZone.id)?.current_count || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trapped Guests:</span>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{guests.filter(g => g.zone === selectedMapZone.id && g.status === 'trapped').length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Incidents:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{incidents.filter(i => i.zone === selectedMapZone.id).length}</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>IoT Sensor Overlays</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: `SMOKE DETECTOR ALARM`, description: `Automated sensor trigger. Smoke detected in ${selectedMapZone.id}.`, zone: selectedMapZone.id.replace(' ZONE', ''), is_sensor: true })
                      });
                    }}
                    style={{ background: 'rgba(255,0,60,0.15)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Flame size={12} /> Smoke
                  </button>
                  <button 
                    onClick={() => {
                      fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: `GLASS BREAK SENSOR`, description: `Audio sensor detected glass breaking in ${selectedMapZone.id}.`, zone: selectedMapZone.id.replace(' ZONE', ''), is_sensor: true })
                      });
                    }}
                    style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent-yellow)', border: '1px solid var(--accent-yellow)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldAlert size={12} /> Glass
                  </button>
                  <button 
                    onClick={() => {
                      fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: `CROWD LEVEL WARNING`, description: `Microphone arrays detect anomalous crowd volume in ${selectedMapZone.id}.`, zone: selectedMapZone.id.replace(' ZONE', ''), is_sensor: true })
                      });
                    }}
                    style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#d8b4fe', border: '1px solid #9333ea', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={12} /> Mic
                  </button>
                </div>
              </div>
            </div>
          )}
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
                style={{ position: 'relative', paddingRight: '5rem' }}
              >
                <div className={`incident-badge badge-${inc.severity?.toLowerCase() || 'medium'}`}>
                  {inc.severity || 'ANALYZING'}
                  {inc.confidence_score && inc.confidence_score >= 75 && inc.category === 'Fire' && (
                     <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', padding: '2px 4px', borderRadius: '4px', fontSize: '0.6rem', boxShadow: '0 0 5px #ef4444' }}>911 DISPATCHED</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{inc.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{inc.zone} • {inc.category}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  <span style={{ color: 'var(--accent-cyan)' }}>{getRelativeTime(inc.created_at)}</span> • {new Date(inc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fetch(`/api/incidents/${inc.id}/resolve`, { method: 'PATCH' });
                  }}
                  style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.3)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.15)'}
                >
                  RESOLVE
                </button>
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

      {/* Offline SMS Simulator */}
      <div className="panel triage-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header">
          <div className="panel-title" style={{ color: 'var(--accent-yellow)' }}>OFFLINE SMS FALLBACK</div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Simulate a guest replying to emergency broadcast via SMS when WiFi fails.</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="text" id="smsPhone" placeholder="Phone (e.g. 555-0199)" className="triage-input" style={{ flex: 1, minHeight: 'auto', marginBottom: 0, padding: '0.75rem' }} />
        </div>
        <textarea 
          id="smsMessage"
          className="triage-input" 
          placeholder="SMS Body (e.g. 'HELP trapped in kitchen by ballroom')"
          style={{ minHeight: '80px' }}
        ></textarea>
        <button className="btn-trigger" onClick={() => {
          const phone = document.getElementById('smsPhone').value || '+15550100';
          const msg = document.getElementById('smsMessage').value;
          if (!msg) return;
          fetch('/api/sms-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ From: phone, Body: msg })
          }).then(() => {
            document.getElementById('smsMessage').value = '';
          });
        }} style={{ background: 'var(--accent-yellow)', color: '#000', boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)', border: 'none' }}>
          <Zap size={16} /> SIMULATE INBOUND SMS
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
                <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem', textShadow: '0 0 10px rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {selectedIncident.title}
                  {selectedIncident.confidence_score > 0 && (
                    <span style={{ fontSize: '0.85rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '4px 8px', borderRadius: '4px', textShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={14} /> {selectedIncident.confidence_score}% AI Confidence
                    </span>
                  )}
                </h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedIncident.description}</div>
              </div>
              <button 
                onClick={() => {
                  fetch(`/api/incidents/${selectedIncident.id}/resolve`, { method: 'PATCH' });
                }}
                style={{ padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', boxShadow: 'var(--glow-green)' }}
              >
                Resolve Incident
              </button>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textShadow: 'var(--glow-cyan)' }}>
              <Navigation size={16} /> AI TACTICAL RESPONSE PLAN
            </h3>
            
            {selectedIncident.evacuation_route && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', color: '#fff' }}>
                <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>PERSONALIZED EVACUATION ROUTES:</strong>
                {(() => {
                  try {
                    const routes = JSON.parse(selectedIncident.evacuation_route);
                    return Object.entries(routes).map(([z, r]) => (
                      <div key={z} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{z}:</span> {r}
                      </div>
                    ));
                  } catch (e) {
                    return selectedIncident.evacuation_route;
                  }
                })()}
              </div>
            )}
            
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

            {selectedIncident.responder_allocations && selectedIncident.responder_allocations !== '[]' && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-yellow)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textShadow: 'var(--glow-yellow)' }}>
                  <Users size={16} /> TACTICAL RESPONDER DEPLOYMENT
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(() => {
                    try {
                      const allocs = JSON.parse(selectedIncident.responder_allocations);
                      return allocs.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--accent-yellow)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block' }}>{a.zone}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.reason}</span>
                          </div>
                          <div style={{ background: 'var(--accent-yellow)', color: '#000', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {a.count} Assigned
                          </div>
                        </div>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to Top */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#000', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: 'var(--glow-cyan)', zIndex: 1000 }}
      >
        <Navigation size={24} style={{ transform: 'rotate(0deg)' }} />
      </button>
    </div>
  );
}
