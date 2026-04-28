import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, CheckCircle, ShieldAlert, LayoutDashboard, AlertTriangle, Users, Search, Target, Moon, Sun } from 'lucide-react';
import VenueSafeLogo from '../components/VenueSafeLogo';
import { useTheme } from '../hooks/useTheme';

export default function MusterStation() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [selectedZone, setSelectedZone] = useState('LOBBY ZONE A');
  const [guestName, setGuestName] = useState('');
  const [isInjured, setIsInjured] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Map zone to its QR code based on db seeding
  const zoneToQR = {
    'LOBBY ZONE A': 'qr_zone_a',
    'GRAND BALLROOM ZONE B': 'qr_zone_b',
    'RESTAURANT ZONE C': 'qr_zone_c',
    'POOL DECK ZONE D': 'qr_zone_d',
    'CONFERENCE CTR ZONE E': 'qr_zone_e',
    'SPA & WELLNESS ZONE F': 'qr_zone_f',
    'PARKING / EXIT ZONE G': 'qr_zone_g'
  };

  const handleScan = (e) => {
    e.preventDefault();
    if (!guestName) return;

    fetch('/api/muster/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_name: guestName,
        qr_code: zoneToQR[selectedZone],
        is_injured: isInjured
      })
    })
    .then(res => res.json())
    .then(() => {
      setScanned(true);
      setTimeout(() => {
        setScanned(false);
        setGuestName('');
        setIsInjured(false);
      }, 3000); // Reset for next scan
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#fff' }}>
      <nav className="nav-tabs" style={{ justifyContent: 'flex-start', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem' }}>
        <VenueSafeLogo width={260} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <button className="nav-tab" onClick={() => navigate('/')}><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-tab" onClick={() => navigate('/')}><AlertTriangle size={16} /> Report Incident</button>
          <button className="nav-tab" onClick={() => navigate('/responder')}><Users size={16} /> Responders</button>
          <button className="nav-tab" onClick={() => navigate('/guest')}><Search size={16} /> Guest Portal</button>
          <button className="nav-tab active" onClick={() => navigate('/muster')}><Target size={16} /> Muster Station</button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Zone:</span>
          <select 
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid var(--border-subtle)', padding: '0.35rem', borderRadius: '4px', fontSize: '0.85rem' }}
          >
            {Object.keys(zoneToQR).map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        {scanned ? (
          <div style={{ textAlign: 'center', animation: 'pulseThreat 1s ease-out' }}>
            <CheckCircle size={100} color="var(--accent-green)" style={{ margin: '0 auto', filter: 'drop-shadow(0 0 20px var(--accent-green))' }} />
            <h2 style={{ fontSize: '2.5rem', marginTop: '2rem', color: 'var(--accent-green)' }}>GUEST ACCOUNTED FOR</h2>
            <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{guestName}</p>
          </div>
        ) : (
          <form onSubmit={handleScan} style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-panel)', padding: '3rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Scan size={64} style={{ color: 'var(--accent-cyan)', margin: '0 auto', opacity: 0.8 }} />
              <h2 style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)' }}>SCAN QR CODE</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Demo: Enter name to simulate physical scan</p>
            </div>

            <input 
              type="text" 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest Name (e.g., John Doe)"
              required
              style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}
            />

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: isInjured ? 'rgba(255,0,60,0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', border: `1px solid ${isInjured ? 'var(--accent-red)' : 'var(--border-subtle)'}`, cursor: 'pointer' }}>
                <input type="checkbox" checked={isInjured} onChange={(e) => setIsInjured(e.target.checked)} style={{ display: 'none' }} />
                <ShieldAlert size={18} color={isInjured ? 'var(--accent-red)' : 'var(--text-muted)'} />
                <span style={{ color: isInjured ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 'bold' }}>Needs Medical</span>
              </label>
            </div>

            <button 
              type="submit"
              style={{ width: '100%', padding: '1.5rem', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '4px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', boxShadow: 'var(--glow-cyan)' }}
            >
              SIMULATE SCAN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
