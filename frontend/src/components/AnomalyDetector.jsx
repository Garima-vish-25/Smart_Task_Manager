import React, { useEffect, useState } from "react";
import { getAnomalies } from "../api";
import api from "../api";
import { useToast } from "../contexts/AppContext";
import ConfirmModal from "./ConfirmModal";

const AnomalyDetector = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [ignoredPids, setIgnoredPids] = useState(new Set());
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });
  const { addToast } = useToast();

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const res = await getAnomalies();
        setAnomalies(res.data.anomalies || []);
      } catch (err) {
        console.error('Failed to fetch anomalies:', err);
      }
    };

    fetchAnomalies();
    const id = setInterval(fetchAnomalies, 10000); // Fetch every 10 seconds
    return () => clearInterval(id);
  }, []);

  const handleKill = (pid, name) => {
    setConfirmState({
      open: true,
      message: `Kill suspicious process ${name} (PID: ${pid})?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await api.post(`/process/${pid}/action`, { action: 'kill' });
          addToast(`Process ${name} terminated`, 'success');
          setAnomalies(prev => prev.filter(a => a.pid !== pid));
        } catch (e) {
          addToast(`Failed to kill process: ${e.userMessage || e.message}`, 'error');
        }
      }
    });
  };

  const handleIgnore = (pid) => {
    setIgnoredPids(prev => new Set([...prev, pid]));
    addToast('Process ignored. It will not appear in anomalies until restart.', 'info');
  };

  const getSecurityColor = (score) => {
    if (score >= 70) return '#28a745'; // Green
    if (score >= 50) return '#ffc107'; // Yellow
    if (score >= 30) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const filteredAnomalies = anomalies.filter(a => !ignoredPids.has(a.pid));

  return (
    <div className="anomaly-detector-card">
      <h3 className="text-xl font-semibold mb-2">
        🚨 Behavioral Anomaly Detection
        {filteredAnomalies.length > 0 && (
          <span style={{ 
            marginLeft: '10px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '0.8em'
          }}>
            {filteredAnomalies.length} Alert{filteredAnomalies.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      
      {filteredAnomalies.length === 0 ? (
        <p style={{ color: '#28a745', fontWeight: 'bold' }}>✅ No anomalies detected - System is healthy!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="procTable" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Process</th>
                <th>Security Score</th>
                <th>Anomaly Reason</th>
                <th>CPU%</th>
                <th>Memory%</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnomalies.map((proc, i) => (
                <tr 
                  key={i} 
                  className="anomaly-row"
                  style={{ 
                    backgroundColor: proc.security_score < 30 ? 'rgba(220, 53, 69, 0.1)' : 
                                   proc.security_score < 50 ? 'rgba(255, 193, 7, 0.1)' : 
                                   'rgba(40, 167, 69, 0.05)'
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getSecurityColor(proc.security_score),
                        boxShadow: '0 0 4px ' + getSecurityColor(proc.security_score)
                      }} />
                      <strong>{proc.name}</strong>
                      {proc.is_new_process && (
                        <span style={{ 
                          fontSize: '0.75em', 
                          backgroundColor: '#dc3545', 
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px'
                        }}>
                          NEW
                        </span>
                      )}
                      <span style={{ fontSize: '0.85em', color: '#666' }}>(PID: {proc.pid})</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontWeight: 'bold',
                      color: getSecurityColor(proc.security_score)
                    }}>
                      {proc.security_score}
                      <span style={{ fontSize: '0.8em', color: '#666' }}>/100</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ 
                      fontSize: '0.9em', 
                      color: '#dc3545',
                      maxWidth: '300px',
                      wordWrap: 'break-word'
                    }}>
                      ⚠️ {proc.anomaly_reason || 'Unusual behavior detected'}
                      {proc.baseline_cpu > 0 && (
                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                          Normal: {proc.baseline_cpu.toFixed(1)}% CPU
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: proc.cpu_percent > 80 ? '#dc3545' : '#666'
                    }}>
                      {proc.cpu_percent?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: proc.memory_percent > 50 ? '#dc3545' : '#666'
                    }}>
                      {proc.memory_percent?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          // Investigate - could open process details
                          addToast(`Investigating ${proc.name} (PID: ${proc.pid})`, 'info');
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.8em',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        🔍 Investigate
                      </button>
                      <button
                        onClick={() => handleKill(proc.pid, proc.name)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.8em',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ Kill
                      </button>
                      <button
                        onClick={() => handleIgnore(proc.pid)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.8em',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Ignore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.open}
        title="Confirm Kill Process"
        message={confirmState.message}
        confirmText="Kill"
        cancelText="Cancel"
        onConfirm={confirmState.onConfirm || (() => setConfirmState({ open: false, message: '', onConfirm: null }))}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: null })}
      />
    </div>
  );
};

export default AnomalyDetector;
