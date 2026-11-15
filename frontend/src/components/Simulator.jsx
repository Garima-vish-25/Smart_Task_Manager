import React, { useState } from 'react'
import api from '../api'
import { useToast } from '../contexts/AppContext'

export default function Simulator(){
  const [jobs, setJobs] = useState([{pid:1,burst:5,priority:1,arrival:0},{pid:2,burst:3,priority:2,arrival:1},{pid:3,burst:4,priority:1,arrival:2}])
  const [alg, setAlg] = useState('fcfs')
  const [quantum, setQuantum] = useState(2)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const updateJob = (idx, key, val)=>{
    const copy = JSON.parse(JSON.stringify(jobs))
    copy[idx][key] = Number(val)
    setJobs(copy)
  }
  const addJob = ()=> setJobs(j=>[...j, {pid:null,burst:1,priority:0,arrival:0}])
  const removeJob = (i)=> setJobs(j=>j.filter((_,k)=>k!==i))

  const run = async ()=>{
    if (jobs.length === 0) {
      addToast('Please add at least one job to simulate', 'warning')
      return
    }
    // Validation: RR requires positive quantum
    if (alg === 'rr') {
      const q = Number(quantum)
      if (!Number.isFinite(q) || q <= 0) {
        addToast('For Round Robin, quantum must be a positive number', 'error')
        return
      }
    }
    // Validation: bursts must be > 0, arrival >= 0
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i]
      if (!Number.isFinite(Number(j.burst)) || Number(j.burst) <= 0) {
        addToast(`Job ${i+1}: Burst time must be > 0`, 'error')
        return
      }
      if (!Number.isFinite(Number(j.arrival)) || Number(j.arrival) < 0) {
        addToast(`Job ${i+1}: Arrival time must be >= 0`, 'error')
        return
      }
    }

    setLoading(true)
    try{
      const res = await api.post('/simulate', { algorithm: alg, quantum: Number(quantum), jobs })
      setTimeline(res.data.timeline)
      addToast(`${alg.toUpperCase()} simulation completed successfully`, 'success')
    }catch(e){ 
      addToast(`Simulation failed: ${e.userMessage || e.message}`, 'error')
      setTimeline(null)
    } finally {
      setLoading(false)
    }
  }

  const exportTimelineCsv = () => {
    try {
      if (!timeline || timeline.length === 0) {
        addToast('No timeline to export', 'warning')
        return
      }
      const header = ['process','start','end','duration','burst_or_run','algorithm']
      const rows = timeline.map((t, idx) => [
        `P${t.pid || (idx+1)}`,
        t.start,
        t.end,
        (t.end - t.start),
        (t.burst ?? t.run ?? ''),
        alg.toUpperCase()
      ])
      const csv = [header.join(','), ...rows.map(r=>r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `simulation_${alg}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      addToast('Failed to export CSV', 'error')
    }
  }

  const addDefaultJobs = () => {
    setJobs([
      {pid:1,burst:5,priority:1,arrival:0},
      {pid:2,burst:3,priority:2,arrival:1},
      {pid:3,burst:4,priority:1,arrival:2},
      {pid:4,burst:2,priority:3,arrival:3}
    ])
  }

  return (
    <div>
      <h2>Scheduler Simulation</h2>
      <div className='simForm'>
        <label>Algorithm:
          <select value={alg} onChange={e=>setAlg(e.target.value)}>
            <option value='fcfs'>FCFS (First Come First Served)</option>
            <option value='rr'>Round Robin</option>
            <option value='priority'>Priority Scheduling</option>
            <option value='sjf'>SJF (Shortest Job First)</option>
          </select>
        </label>
        {alg==='rr' && <label>Quantum: <input type='number' value={quantum} onChange={e=>setQuantum(e.target.value)}/></label>}
      </div>

      <div className='jobs'>
        <div className="job-controls">
          <button onClick={addJob}>Add Job</button>
          <button onClick={addDefaultJobs}>Load Example Jobs</button>
          <button onClick={run} disabled={loading}>
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
        
        {jobs.map((j,i)=>(
          <div className='job' key={i}>
            <label>PID: <input type='number' value={j.pid||''} onChange={e=>updateJob(i,'pid',e.target.value)} placeholder="Auto"/></label>
            <label>Burst Time: <input type='number' value={j.burst} onChange={e=>updateJob(i,'burst',e.target.value)} min="1"/></label>
            <label>Priority: <input type='number' value={j.priority} onChange={e=>updateJob(i,'priority',e.target.value)} min="0"/></label>
            <label>Arrival Time: <input type='number' value={j.arrival} onChange={e=>updateJob(i,'arrival',e.target.value)} min="0"/></label>
            <button onClick={()=>removeJob(i)}>Remove</button>
          </div>
        ))}
      </div>

      {timeline && (
        <div className='timeline'>
          <h4>Simulation Results - {alg.toUpperCase()}</h4>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 8 }}>
            <button onClick={exportTimelineCsv}>Export CSV</button>
          </div>
          <div className="gantt-chart">
            <div className="gantt-header">
              <div className="time-labels">
                {Array.from({length: Math.max(...timeline.map(t => t.end)) + 1}, (_, i) => 
                  <div key={i} className="time-label">{i}</div>
                )}
              </div>
            </div>
            <div className="gantt-bars">
              {timeline.map((t, i) => (
                <div key={i} className="gantt-bar" style={{
                  left: `${(t.start / Math.max(...timeline.map(t => t.end))) * 100}%`,
                  width: `${((t.end - t.start) / Math.max(...timeline.map(t => t.end))) * 100}%`
                }}>
                  <span>P{t.pid || i+1}</span>
                  <small>{t.burst || t.run}</small>
                </div>
              ))}
            </div>
          </div>
          
          <div className="timeline-details">
            <h5>Execution Timeline</h5>
            <table className="timeline-table">
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Burst Time</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((t, i) => (
                  <tr key={i}>
                    <td>P{t.pid || i+1}</td>
                    <td>{t.start}</td>
                    <td>{t.end}</td>
                    <td>{t.end - t.start}</td>
                    <td>{t.burst || t.run}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
