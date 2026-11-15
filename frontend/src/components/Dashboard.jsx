import React, { useEffect, useState } from 'react'
import api from '../api'
import Chart from './Chart';
import AnomalyDetector from './AnomalyDetector';
import HealthOptimizer from './HealthOptimizer';
import Modal from './Modal'
import { useToast } from '../contexts/AppContext'

export default function Dashboard(){
    const [stats, setStats] = useState({cpu:0,ram:0,alerts:[],thresholds:{cpu_high:80,ram_high:80},history:[]})
  const [showCharts, setShowCharts] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [lastAlerts, setLastAlerts] = useState([])
  const { addToast } = useToast()

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted')
      })
    }
  }, [])

  useEffect(()=>{
    let mounted=true
    const fetchStats = async ()=>{
      try{
        const statsRes = await api.get('/stats');
        const thresholdsRes = await api.get('/dynamic-thresholds');
        const newStats = { ...statsRes.data, thresholds: thresholdsRes.data };

        if(mounted) {
          // Check for new alerts and show notifications
          if (notificationsEnabled && newStats.alerts && newStats.alerts.length > 0) {
            const newAlerts = newStats.alerts.filter(alert => !lastAlerts.includes(alert));
            newAlerts.forEach(alert => {
              new Notification('Smart Task Manager Alert', {
                body: alert,
                icon: '/favicon.ico',
                tag: alert, // Prevent duplicate notifications
                requireInteraction: false
              });
            });
          }
          
          setStats(newStats);
          setLastAlerts(newStats.alerts || []);
        }
      }catch(e){console.error(e)}
    }
    fetchStats()
    const id = setInterval(fetchStats,3000)
    return ()=>{mounted=false;clearInterval(id)}
  },[notificationsEnabled, lastAlerts])


  const getStatusColor = (value, threshold) => {
    if (value > threshold) return 'var(--error)'
    if (value > threshold * 0.8) return 'var(--warning)'
    return 'var(--success)'
  }

  const renderMiniChart = (data, color) => {
    if (!data || data.length < 2) return null
    const max = Math.max(...data.map(d => Math.max(d.cpu, d.ram)))
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d.cpu || d.ram) / max) * 100
      return `${x},${y}`
    }).join(' ')
    
    return (
      <svg width="100" height="30" className="mini-chart">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    )
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>System Dashboard</h2>
        <div className="header-controls">
          <button 
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={notificationsEnabled ? 'notifications-enabled' : 'notifications-disabled'}
            title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? 'Notifications ON' : 'Notifications OFF'}
          </button>
          <button onClick={() => setShowCharts(true)} title="View detailed charts">
            Charts
          </button>
        </div>
      </div>


      <div className='cards'>
        <div className='card' style={{borderLeft: `4px solid ${getStatusColor(stats.cpu, stats.thresholds.cpu_high)}`}}>
          <h4>CPU Usage</h4>
          <div className='big'>{Math.round(stats.cpu)}%</div>
          <progress value={stats.cpu} max='100' className="progress-bar"/>
          <div className="threshold-line" style={{left: `${stats.thresholds.cpu_high}%`}}></div>
          {renderMiniChart(stats.history, 'var(--accent-primary)')}
          <small>Threshold: {stats.thresholds.cpu_high}%</small>
        </div>
        
        <div className='card' style={{borderLeft: `4px solid ${getStatusColor(stats.ram, stats.thresholds.ram_high)}`}}>
          <h4>Memory Usage</h4>
          <div className='big'>{Math.round(stats.ram)}%</div>
          <progress value={stats.ram} max='100' className="progress-bar"/>
          <div className="threshold-line" style={{left: `${stats.thresholds.ram_high}%`}}></div>
          {renderMiniChart(stats.history, 'var(--accent-secondary)')}
          <small>Threshold: {stats.thresholds.ram_high}%</small>
        </div>
      </div>

      <div className="anomaly-section">
        <AnomalyDetector />
      </div>

      <div style={{ marginTop: '20px' }}>
        <HealthOptimizer />
      </div>

      <div className='alerts'>
        <h4>System Status</h4>
        {stats.alerts && stats.alerts.length ? 
          stats.alerts.map((a,i)=><div key={i} className='alert'>Warning: {a}</div>) : 
          <div className='ok'>System operating normally</div>
        }
      </div>

      {stats.history && stats.history.length > 0 && (
        <div className="system-info">
          <h4>System Information</h4>
          <div className="info-grid">
            <div>Last Update: {new Date().toLocaleTimeString()}</div>
            <div>Data Points: {stats.history.length}</div>
            <div>CPU Trend: {stats.history.length > 1 ? 
              (stats.history[stats.history.length-1].cpu > stats.history[stats.history.length-2].cpu ? 'Rising' : 'Falling') 
              : 'N/A'}</div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={showCharts} 
        onClose={() => setShowCharts(false)}
        title="System Performance Charts"
        size="large"
      >
        <div className="charts-grid">
          <Chart 
            data={stats.history} 
            width={400} 
            height={200} 
            color="#3b82f6" 
            title="CPU Usage Trend"
          />
          <Chart 
            data={stats.history} 
            width={400} 
            height={200} 
            color="#8b5cf6" 
            title="Memory Usage Trend"
          />
        </div>
        <div className="chart-summary">
          <h4>Performance Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Current CPU:</span>
              <span className="summary-value">{Math.round(stats.cpu)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Current RAM:</span>
              <span className="summary-value">{Math.round(stats.ram)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Data Points:</span>
              <span className="summary-value">{stats.history.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Update Frequency:</span>
              <span className="summary-value">3 seconds</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
