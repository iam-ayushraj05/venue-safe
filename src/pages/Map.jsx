import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const ZONES = [
  { id: 'Main Lobby', x: 20, y: 30, width: 30, height: 40 },
  { id: 'North Wing', x: 60, y: 10, width: 30, height: 35 },
  { id: 'South Wing', x: 60, y: 55, width: 30, height: 35 },
  { id: 'Pool Area', x: 10, y: 75, width: 40, height: 20 },
  { id: 'Conference Hall A', x: 20, y: 5, width: 30, height: 20 },
];

export default function VenueMap() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.filter(i => i.status !== 'resolved')))
      .catch(err => console.error('Error fetching incidents:', err));

    const handleIncidentUpdate = (updatedIncident) => {
      setIncidents(prev => {
        if (updatedIncident.status === 'resolved') {
          return prev.filter(i => i.id !== updatedIncident.id);
        }
        const exists = prev.find(i => i.id === updatedIncident.id);
        if (exists) {
          return prev.map(i => i.id === updatedIncident.id ? updatedIncident : i);
        }
        return [...prev, updatedIncident];
      });
    };

    socket.on('incident_update', handleIncidentUpdate);

    return () => {
      socket.off('incident_update', handleIncidentUpdate);
    };
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'var(--status-critical)';
      case 'high': return 'var(--status-high)';
      case 'medium': return 'var(--status-medium)';
      case 'low': return 'var(--status-low)';
      default: return 'var(--status-info)';
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Venue Floor Plan</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live incident tracking</p>
      </div>

      <div className="map-container">
        {ZONES.map(zone => {
          const zoneIncidents = incidents.filter(i => i.zone === zone.id);
          const hasIncident = zoneIncidents.length > 0;
          const worstIncident = zoneIncidents.sort((a, b) => {
            const levels = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Info': 0 };
            return (levels[b.severity] || 0) - (levels[a.severity] || 0);
          })[0];

          return (
            <div
              key={zone.id}
              className={`map-zone ${hasIncident ? 'active' : ''}`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                borderColor: hasIncident ? getSeverityColor(worstIncident.severity) : '',
                boxShadow: hasIncident ? `0 0 20px ${getSeverityColor(worstIncident.severity)}40` : ''
              }}
              onClick={() => {
                if (hasIncident) {
                  navigate(`/incident/${worstIncident.id}`);
                }
              }}
            >
              {zone.id}
              {hasIncident && (
                <div 
                  className="map-marker"
                  style={{ 
                    left: '50%', 
                    top: '50%',
                    background: getSeverityColor(worstIncident.severity),
                    boxShadow: `0 0 15px ${getSeverityColor(worstIncident.severity)}`
                  }} 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
