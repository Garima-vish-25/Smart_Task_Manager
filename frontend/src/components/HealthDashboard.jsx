import React, { useEffect, useState } from 'react'
import api from '../api'
import Chart from './Chart'
import { useToast } from '../contexts/AppContext';
import HealthOptimizer from './HealthOptimizer';

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState({
    health_score: 0,
    insights: [],
    process_count: 0,
    predictions: null,
    trends: null
  })
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const [statsRes, predictionsRes] = await Promise.all([
          api.get('/stats'),
          api.get('/predictions').catch(() => ({ data: { error: 'No data' } }))
        ])
        
        if (mounted) {
          setHealthData({
            health_score: statsRes.data.health_score || 0,
            insights: statsRes.data.insights || [],
            process_count: statsRes.data.process_count || 0,
            predictions: predictionsRes.data.error ? null : predictionsRes.data,
            trends: predictionsRes.data.error ? null : predictionsRes.data.trends
          })
        }
      } catch (e) {
        if (mounted) {
          addToast('Failed to fetch health data: ' + (e.userMessage || e.message), 'error')
        }
      }
      setLoading(false)
    }
    
    fetchData()
    const id = setInterval(fetchData, 5000) // Update every 5 seconds
    return () => { mounted = false; clearInterval(id) }
  }, [addToast])

  const getHealthColor = (score) => {
    if (score >= 80) return 'var(--success)'
    if (score >= 60) return 'var(--warning)'
    return 'var(--error)'
  }

  const getHealthStatus = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 40) return 'Poor'
    return 'Critical'
  }

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'var(--success)'
      case 'medium': return 'var(--warning)'
      case 'high': return 'var(--error)'
      default: return 'var(--text-secondary)'
    }
  }

  if (loading) {
    return <div className="loading">Loading health data...</div>
  }

  return (
    <div>
      <h2>System Health Dashboard</h2>
      
      {/* Health Score Card */}
      <div className="health-score-card" style={{ borderLeftColor: getHealthColor(healthData.health_score) }}>
        <div className="health-score-main">
          <h3>System Health Score</h3>
          <div className="health-score-value" style={{ color: getHealthColor(healthData.health_score) }}>
            {healthData.health_score}
          </div>
          <div className="health-status">{getHealthStatus(healthData.health_score)}</div>
        </div>
        <div className="health-score-details">
          <div>Active Processes: {healthData.process_count}</div>
          <div>Last Updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* System Insights */}
      {healthData.insights.length > 0 && (
        <div className="insights-section">
          <h3>System Insights</h3>
          <div className="insights-grid">
            {healthData.insights.map((insight, index) => (
              <div key={index} className="insight-card">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Predictions */}
      {healthData.predictions && (
        <div className="predictions-section">
          <h3>Resource Predictions</h3>
          <div className="predictions-container">
            <div className="predictions-chart">
              <h4>Next 9 Seconds Forecast</h4>
              <div className="prediction-bars">
                {healthData.predictions.predictions.map((pred, index) => (
                  <div key={index} className="prediction-bar">
                    <div className="prediction-time">+{pred.time_ahead_seconds}s</div>
                    <div className="prediction-values">
                      <div className="prediction-cpu">
                        CPU: {pred.predicted_cpu}%
                        <div 
                          className="prediction-indicator"
                          style={{ 
                            width: `${pred.predicted_cpu}%`,
                            backgroundColor: pred.predicted_cpu > 80 ? 'var(--error)' : 'var(--accent-primary)'
                          }}
                        />
                      </div>
                      <div className="prediction-ram">
                        RAM: {pred.predicted_ram}%
                        <div 
                          className="prediction-indicator"
                          style={{ 
                            width: `${pred.predicted_ram}%`,
                            backgroundColor: pred.predicted_ram > 85 ? 'var(--error)' : 'var(--accent-secondary)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="risk-assessment">
              <h4>Risk Assessment</h4>
              <div 
                className="risk-level"
                style={{ color: getRiskColor(healthData.predictions.risk_assessment.level) }}
              >
                {healthData.predictions.risk_assessment.level.toUpperCase()}
              </div>
              {healthData.predictions.risk_assessment.reasons.length > 0 && (
                <div className="risk-reasons">
                  {healthData.predictions.risk_assessment.reasons.map((reason, index) => (
                    <div key={index} className="risk-reason">• {reason}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      {healthData.trends && (
        <div className="trends-section">
          <h3>Trend Analysis</h3>
          <div className="trends-grid">
            <div className="trend-item">
              <span className="trend-label">CPU Trend:</span>
              <span className={`trend-value ${healthData.trends.cpu_trend > 0 ? 'trend-up' : 'trend-down'}`}>
                {healthData.trends.cpu_trend > 0 ? 'Rising' : 'Falling'} {Math.abs(healthData.trends.cpu_trend).toFixed(2)}/sec
              </span>
            </div>
            <div className="trend-item">
              <span className="trend-label">RAM Trend:</span>
              <span className={`trend-value ${healthData.trends.ram_trend > 0 ? 'trend-up' : 'trend-down'}`}>
                {healthData.trends.ram_trend > 0 ? 'Rising' : 'Falling'} {Math.abs(healthData.trends.ram_trend).toFixed(2)}/sec
              </span>
            </div>
          </div>
        </div>
      )}
      <HealthOptimizer />
    </div>
  )
}
