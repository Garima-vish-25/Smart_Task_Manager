import React, { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider, useTheme } from './contexts/AppContext'
import Dashboard from './components/Dashboard'
import Processes from './components/Processes'
import Simulator from './components/Simulator'
import HealthDashboard from './components/HealthDashboard'
import ProcessTree from './components/ProcessTree'

function AppContent() {
  const [page, setPage] = useState('dashboard')
  const { theme, toggleTheme } = useTheme()
  
  return (
    <ErrorBoundary>
      <div className='app'>
        <nav className='nav'>
          <div className="nav-brand">
            <h1>Smart Task Manager</h1>
          </div>
          <div className="nav-buttons">
            <button 
              onClick={()=>setPage('dashboard')}
              className={page === 'dashboard' ? 'active' : ''}
            >
              Dashboard
            </button>
            <button 
              onClick={()=>setPage('health')}
              className={page === 'health' ? 'active' : ''}
            >
              Health
            </button>
            <button 
              onClick={()=>setPage('processes')}
              className={page === 'processes' ? 'active' : ''}
            >
              Processes
            </button>
            <button 
              onClick={()=>setPage('tree')}
              className={page === 'tree' ? 'active' : ''}
            >
              Tree
            </button>
            <button 
              onClick={()=>setPage('sim')}
              className={page === 'sim' ? 'active' : ''}
            >
              Scheduler Sim
            </button>
            <button 
              onClick={toggleTheme}
              className="theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀' : '☽'}
            </button>
          </div>
        </nav>
        <main className='main'>
          {page==='dashboard' && <Dashboard/>}
          {page==='health' && <HealthDashboard/>}
          {page==='processes' && <Processes/>}
          {page==='tree' && <ProcessTree/>}
          {page==='sim' && <Simulator/>}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
