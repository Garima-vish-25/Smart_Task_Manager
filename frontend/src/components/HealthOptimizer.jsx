import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../contexts/AppContext';
import ConfirmModal from './ConfirmModal';

const HealthOptimizer = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [teachingMode, setTeachingMode] = useState(false);
    const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });
    const { addToast } = useToast();

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            const res = await api.get('/smart-recommendations');
            setRecommendations(res.data.recommendations || []);
        } catch (error) {
            console.error("Failed to fetch smart recommendations:", error);
            addToast('Failed to load recommendations', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
        const interval = setInterval(fetchRecommendations, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const recordAction = async (actionType, processName, pid) => {
        if (teachingMode) {
            try {
                await api.post('/record-user-action', {
                    action: actionType,
                    process_name: processName,
                    pid: pid
                });
                addToast('Action recorded for learning 🤖', 'success');
            } catch (e) {
                console.error('Failed to record action:', e);
            }
        }
    };

    const handleApplyRecommendation = async (rec) => {
        const processNames = rec.processes.map(p => p.name).join(', ');
        const actionText = rec.action === 'kill' ? 'kill' : 
                          rec.action === 'close_apps' ? 'close' : 
                          'apply action to';
        
        setConfirmState({
            open: true,
            message: `${rec.reason}\n\nImpact: ${rec.impact}\n\nApply this recommendation?`,
            onConfirm: async () => {
                setConfirmState({ open: false, message: '', onConfirm: null });
                
                try {
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const proc of rec.processes) {
                        try {
                            if (rec.action === 'kill' || rec.action === 'close_apps') {
                                await api.post(`/process/${proc.pid}/action`, { action: 'kill' });
                                recordAction('kill', proc.name, proc.pid);
                                successCount++;
                            }
                        } catch (e) {
                            failCount++;
                            console.error(`Failed to ${rec.action} process ${proc.pid}:`, e);
                        }
                    }
                    
                    if (successCount > 0) {
                        addToast(`Successfully applied to ${successCount} process${successCount > 1 ? 'es' : ''}`, 'success');
                    }
                    if (failCount > 0) {
                        addToast(`Failed to apply to ${failCount} process${failCount > 1 ? 'es' : ''}`, 'error');
                    }
                    
                    fetchRecommendations(); // Refresh recommendations
        } catch (error) {
                    addToast('Failed to apply recommendation', 'error');
                }
            }
        });
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return '#28a745'; // Green - High confidence
        if (confidence >= 60) return '#ffc107'; // Yellow - Medium confidence
        return '#fd7e14'; // Orange - Lower confidence
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            'high': { bg: '#dc3545', text: 'HIGH' },
            'medium': { bg: '#ffc107', text: 'MED' },
            'low': { bg: '#6c757d', text: 'LOW' }
        };
        const style = colors[priority] || colors.medium;
        return (
            <span style={{
                backgroundColor: style.bg,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.7em',
                fontWeight: 'bold',
                marginLeft: '8px'
            }}>
                {style.text}
            </span>
        );
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'resource_hog': return '💾';
            case 'user_pattern': return '🕐';
            case 'future_issue': return '🔮';
            default: return '💡';
        }
    };

    return (
        <div className="health-optimizer-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🤖 Smart Process Recommendations
                    {recommendations.length > 0 && (
                        <span style={{ 
                            backgroundColor: '#007bff', 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            fontSize: '0.7em'
                        }}>
                            {recommendations.length} Suggestion{recommendations.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9em' }}>
                        <input 
                            type="checkbox" 
                            checked={teachingMode}
                            onChange={(e) => {
                                setTeachingMode(e.target.checked);
                                if (e.target.checked) {
                                    addToast('Teaching mode enabled - your actions will be learned! 🎓', 'info');
                                }
                            }}
                        />
                        <span>🎓 Teach Me</span>
                    </label>
                    <button 
                        onClick={fetchRecommendations}
                        disabled={loading}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.85em',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {loading && recommendations.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Analyzing system and learning patterns...</p>
            ) : recommendations.length === 0 ? (
                <div style={{ 
                    padding: '20px', 
                    textAlign: 'center', 
                    backgroundColor: '#d4edda',
                    borderRadius: '8px',
                    color: '#155724'
                }}>
                    <strong>✅ System is optimized!</strong>
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.9em' }}>
                        No immediate recommendations. The system is running efficiently.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {recommendations.map((rec, i) => (
                        <div 
                            key={i}
                            style={{
                                border: '2px solid',
                                borderColor: rec.priority === 'high' ? '#dc3545' : rec.priority === 'medium' ? '#ffc107' : '#6c757d',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: rec.priority === 'high' ? 'rgba(220, 53, 69, 0.05)' : 
                                             rec.priority === 'medium' ? 'rgba(255, 193, 7, 0.05)' : 
                                             'rgba(108, 117, 125, 0.05)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1.5em' }}>{getTypeIcon(rec.type)}</span>
                                        <strong style={{ fontSize: '1.1em' }}>
                                            {rec.type === 'resource_hog' && 'Resource Optimization'}
                                            {rec.type === 'user_pattern' && 'Learned Pattern'}
                                            {rec.type === 'future_issue' && 'Predictive Alert'}
                                        </strong>
                                        {getPriorityBadge(rec.priority)}
                                    </div>
                                    <div style={{ marginLeft: '35px', marginBottom: '10px' }}>
                                        <p style={{ margin: '5px 0', fontSize: '0.95em', color: '#333' }}>
                                            <strong>💡 {rec.reason}</strong>
                                        </p>
                                        <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#28a745', fontWeight: 'bold' }}>
                                            ✨ Impact: {rec.impact}
                                        </p>
                                        {rec.processes && rec.processes.length > 0 && (
                                            <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#666' }}>
                                                <strong>Processes:</strong>
                                                <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                                                    {rec.processes.map((proc, idx) => (
                                                        <li key={idx}>
                                                            {proc.name} (PID: {proc.pid})
                                                            {proc.memory_percent && (
                                                                <span style={{ marginLeft: '8px', color: '#dc3545' }}>
                                                                    - {proc.memory_percent.toFixed(1)}% RAM
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px',
                                        padding: '4px 10px',
                                        backgroundColor: getConfidenceColor(rec.confidence),
                                        color: 'white',
                                        borderRadius: '12px',
                                        fontSize: '0.85em',
                                        fontWeight: 'bold'
                                    }}>
                                        <span>🎯</span>
                                        <span>{rec.confidence}%</span>
                                        <span style={{ fontSize: '0.75em', opacity: 0.9 }}>confidence</span>
                                    </div>
                                    <button
                                        onClick={() => handleApplyRecommendation(rec)}
                                        style={{
                                            padding: '8px 16px',
                                            fontSize: '0.9em',
                                            backgroundColor: rec.priority === 'high' ? '#dc3545' : '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ✅ Apply
                                    </button>
                                </div>
                            </div>
                </div>
            ))}
                </div>
            )}

            {teachingMode && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '5px',
                    fontSize: '0.85em'
                }}>
                    <strong>🎓 Teaching Mode Active:</strong> Your actions (kill, ignore) will be recorded to learn your patterns and improve future recommendations.
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmState.open}
                title="Apply Smart Recommendation"
                message={confirmState.message}
                confirmText="Apply"
                cancelText="Cancel"
                onConfirm={confirmState.onConfirm || (() => setConfirmState({ open: false, message: '', onConfirm: null }))}
                onCancel={() => setConfirmState({ open: false, message: '', onConfirm: null })}
            />
        </div>
    );
};

export default HealthOptimizer;
