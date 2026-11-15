import React, { useEffect, useState } from 'react'
import api from '../api'
import { useToast } from '../contexts/AppContext'
import ConfirmModal from './ConfirmModal'

export default function Processes(){
  const [procs, setProcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState('cpu_percent')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filteredProcs, setFilteredProcs] = useState([])
  const { addToast } = useToast()
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null })

  const fetch = async ()=>{
    try{
      const res = await api.get('/processes?limit='+limit)
      setProcs(res.data.processes)
    }catch(e){console.error(e)}
    setLoading(false)
  }

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(id)
  }, [searchTerm])

  // Filter and sort processes
  useEffect(() => {
    let filtered = [...procs]

    // Filter by search term
    if (debouncedSearch) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.pid?.toString().includes(debouncedSearch)
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus)
    }

    // Sort processes
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0
      const bVal = b[sortBy] || 0
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    setFilteredProcs(filtered)
  }, [procs, searchTerm, sortBy, sortOrder, filterStatus])

  useEffect(()=>{ fetch(); const id=setInterval(fetch,4000); return ()=>clearInterval(id) }, [limit])

  const doAction = async (pid, action)=>{
    try{
      await api.post(`/process/${pid}/action`, { action })
      addToast(`Process ${pid} ${action} successful`, 'success')
      fetch()
    }catch(e){ 
      addToast(`Action failed: ${e.userMessage || e.message}`, 'error')
    }
  }

  const requestConfirm = (pid, action, message)=>{
    setConfirmState({
      open: true,
      message,
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null })
        await doAction(pid, action)
      }
    })
  }

  const changeNice = async (pid)=>{
    const val = prompt('Enter nice value (e.g. 10 or -5):')
    if(val===null) return
    try{
      await api.post(`/process/${pid}/nice`, { nice: Number(val) })
      addToast(`Priority updated for process ${pid}`, 'success')
      fetch()
    }catch(e){ 
      addToast(`Failed to change priority: ${e.userMessage || e.message}`, 'error')
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'running': return '#10b981'
      case 'sleeping': return '#3b82f6'
      case 'stopped': return '#f59e0b'
      case 'zombie': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <div>
      <h2>Process Management</h2>
      
      <div className='controls'>
        <div className="control-group">
          <label>Limit: <input type='number' value={limit} onChange={e=>setLimit(e.target.value)} min="10" max="500"/></label>
          <label>Search: <input type='text' value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Process name or PID"/></label>
          <label>Status: 
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="sleeping">Sleeping</option>
              <option value="stopped">Stopped</option>
              <option value="zombie">Zombie</option>
            </select>
          </label>
        <ConfirmModal 
      isOpen={confirmState.open}
      title="Confirm Action"
      message={confirmState.message}
      confirmText="Confirm"
      cancelText="Cancel"
      onConfirm={confirmState.onConfirm || (()=>setConfirmState({ open:false, message:'', onConfirm:null }))}
      onCancel={()=>setConfirmState({ open:false, message:'', onConfirm:null })}
    />
    </div>
        
        <div className="process-stats">
          <span>Total: {procs.length}</span>
          <span>Filtered: {filteredProcs.length}</span>
          <span>Running: {procs.filter(p => p.status === 'running').length}</span>
          <button onClick={() => {
            try {
              const header = ['pid','name','cpu_percent','memory_percent','status','username']
              const rows = filteredProcs.map(p=>[
                p.pid, p.name, Math.round(p.cpu_percent||0), Math.round(p.memory_percent||0), p.status, p.username||''
              ])
              const csv = [header.join(','), ...rows.map(r=>r.join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `processes_${Date.now()}.csv`
              a.click()
              URL.revokeObjectURL(url)
            } catch(e){ addToast('Failed to export CSV', 'error') }
          }}>Export CSV</button>
        </div>
      </div>

      {loading? (
        <div className="loading">Loading processes...</div>
      ) : (
        <div className="table-container">
          <table className='procTable'>
            <thead>
              <tr>
                <th onClick={() => handleSort('pid')}>PID {getSortIcon('pid')}</th>
                <th onClick={() => handleSort('name')}>Name {getSortIcon('name')}</th>
                <th onClick={() => handleSort('cpu_percent')}>CPU% {getSortIcon('cpu_percent')}</th>
                <th onClick={() => handleSort('memory_percent')}>MEM% {getSortIcon('memory_percent')}</th>
                <th onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
                <th onClick={() => handleSort('username')}>User {getSortIcon('username')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcs.map(p=> (
                <tr key={p.pid}>
                  <td>{p.pid}</td>
                  <td className="process-name">{p.name}</td>
                  <td className={p.cpu_percent > 50 ? 'high-cpu' : ''}>{Math.round(p.cpu_percent||0)}%</td>
                  <td className={p.memory_percent > 50 ? 'high-mem' : ''}>{Math.round(p.memory_percent||0)}%</td>
                  <td>
                    <span className="status-badge" style={{backgroundColor: getStatusColor(p.status)}}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.username || '-'}</td>
                  <td className="actions">
                    <button onClick={()=>requestConfirm(p.pid,'suspend',`Suspend process ${p.pid}?`)} title="Suspend">Suspend</button>
                    <button onClick={()=>doAction(p.pid,'resume')} title="Resume">Resume</button>
                    <button onClick={()=>requestConfirm(p.pid,'kill',`Terminate process ${p.pid}?`)} title="Terminate" className="danger">Terminate</button>
                    <button onClick={()=>requestConfirm(p.pid,'kill_force',`Force kill process ${p.pid}? This may cause data loss.`)} title="Force Kill" className="danger">Force Kill</button>
                    <button onClick={()=>changeNice(p.pid)} title="Change Priority">Priority</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProcs.length === 0 && (
            <div className="no-results">
              No processes found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
