import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldAlert, Navigation } from 'lucide-react';
import { socket } from '../socket';

export default function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/incidents/${id}`)
      .then(res => res.json())
      .then(data => {
        setIncident(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching incident:', err);
        setLoading(false);
      });

    const handleIncidentUpdate = (updatedIncident) => {
      if (updatedIncident.id === parseInt(id)) {
        setIncident(updatedIncident);
      }
    };

    socket.on('incident_update', handleIncidentUpdate);

    return () => {
      socket.off('incident_update', handleIncidentUpdate);
    };
  }, [id]);

  const resolveIncident = () => {
    fetch(`/api/incidents/${id}/resolve`, {
      method: 'PATCH'
    });
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div className="loading-spinner"></div>
    </div>;
  }

  if (!incident) {
    return <div>Incident not found.</div>;
  }

  const isResolved = incident.status === 'resolved';

  return (
    <div>
      <button className="btn" style={{ marginBottom: '2rem', padding: 0 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span className={`badge ${incident.severity?.toLowerCase() || 'info'}`}>
                {incident.severity || 'Pending'}
              </span>
              <h1 style={{ fontSize: '2rem', margin: 0 }}>{incident.title}</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Zone: <strong style={{ color: 'var(--text-primary)' }}>{incident.zone}</strong> | 
              Category: <strong style={{ color: 'var(--text-primary)' }}>{incident.category || 'Pending'}</strong> | 
              Reported: {new Date(incident.created_at).toLocaleString()}
            </p>
          </div>
          {!isResolved && (
            <button className="btn btn-success" onClick={resolveIncident}>
              <CheckCircle2 size={18} /> Mark as Resolved
            </button>
          )}
          {isResolved && (
            <div className="badge info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              Resolved
            </div>
          )}
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Description</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{incident.description}</p>
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <ShieldAlert className="brand-icon" /> AI Action Plan
        </h2>
        
        {incident.status === 'pending_analysis' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
            <div className="loading-spinner"></div>
            <span style={{ color: 'var(--text-secondary)' }}>Gemini AI is analyzing the incident and generating an action plan...</span>
          </div>
        ) : incident.ai_action_plan && incident.ai_action_plan.length > 0 ? (
          <ol className="action-plan-list">
            {incident.ai_action_plan.map((step, index) => (
              <li key={index} className="action-plan-item">
                <div className="action-plan-header">
                  <Navigation size={16} /> <strong>Step {index + 1}</strong>
                </div>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No action plan available.</p>
        )}
      </div>
    </div>
  );
}
