import React, { useEffect, useState } from 'react'
import api from '../api'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'
import { useToast } from '../contexts/AppContext'

// Component to display thread details
function ThreadDetails({ pid }) {
  const [threads, setThreads] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchThreads = async () => {
    if (expanded && threads !== null) return // Already loaded
    setLoading(true)
    try {
      const res = await api.get(`/process/${pid}/threads`)
      setThreads(res.data)
    } catch (e) {
      console.error('Failed to fetch threads:', e)
      setThreads({ threads: [], count: 0, error: 'Failed to load thread information' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) {
      fetchThreads()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, pid])

  return (
    <div style={{ marginTop: '15px', borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          marginBottom: expanded ? '10px' : '0'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <strong>Thread Information</strong>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>
      
      {expanded && (
        <div>
          {loading ? (
            <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
              Loading thread information...
            </div>
          ) : threads?.error ? (
            <div style={{ padding: '10px', color: 'var(--error)', fontSize: '0.9em' }}>
              {threads.error}
            </div>
          ) : threads?.threads && threads.threads.length > 0 ? (
            <div>
              <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
                Total Threads: <strong>{threads.count}</strong>
              </div>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Thread ID</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>User Time (s)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>System Time (s)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Total Time (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threads.threads.map((thread, idx) => (
                      <tr 
                        key={thread.id} 
                        style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa'
                        }}
                      >
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{thread.id}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          {thread.user_time.toFixed(4)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          {thread.system_time.toFixed(4)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                          {thread.total_time.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px', color: '#666', fontSize: '0.9em' }}>
              No thread information available
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProcessTree() {
  const [treeData, setTreeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const { addToast } = useToast()
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null })
  const [processPermissions, setProcessPermissions] = useState({}) // Track which processes can be modified
  const [showOnlyModifiable, setShowOnlyModifiable] = useState(false) // Filter for modifiable processes

  useEffect(() => {
    fetchTreeData()
    const id = setInterval(fetchTreeData, 10000) // Update every 10 seconds
    return () => clearInterval(id)
  }, [])

  // Check permissions for all processes when tree data changes or filter is enabled
  useEffect(() => {
    if (treeData && showOnlyModifiable) {
      const checkAllPermissions = async () => {
        const pids = Object.keys(treeData.process_info)
        const permissionChecks = pids.slice(0, 50).map(async (pid) => { // Limit to 50 to avoid overwhelming
          try {
            const checkRes = await api.get(`/process/${pid}/can-modify`)
            return { pid: parseInt(pid), data: checkRes.data }
          } catch (e) {
            return { pid: parseInt(pid), data: { can_modify: false } }
          }
        })
        
        const results = await Promise.all(permissionChecks)
        const newPermissions = {}
        results.forEach(({ pid, data }) => {
          newPermissions[pid] = data
        })
        setProcessPermissions(prev => ({ ...prev, ...newPermissions }))
      }
      checkAllPermissions()
    }
  }, [treeData, showOnlyModifiable])

  const fetchTreeData = async () => {
    try {
      const res = await api.get('/process-tree')
      setTreeData(res.data)
    } catch (e) {
      addToast('Failed to fetch process tree: ' + (e.userMessage || e.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (pid, action) => {
    try {
      await api.post(`/process/${pid}/action`, { action })
      addToast(`Action '${action}' sent to PID ${pid}`, 'success')
      fetchTreeData()
    } catch (e) {
      addToast(`Failed to ${action} PID ${pid}: ` + (e.userMessage || e.message), 'error')
    }
  }

  const requestConfirm = (pid, action, message) => {
    setConfirmState({
      open: true,
      message,
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null })
        await performAction(pid, action)
      }
    })
  }

  const changeNice = async (pid) => {
    // First check if we can modify this process
    try {
      const checkRes = await api.get(`/process/${pid}/can-modify`)
      if (!checkRes.data.can_modify) {
        const reason = checkRes.data.reason || 'Access denied'
        addToast(
          `Cannot change priority for PID ${pid}: ${reason}. ` +
          'On Windows, you may need to run the backend server as Administrator.',
          'error'
        )
        return
      }
    } catch (e) {
      // If check fails, still try the operation but warn the user
      console.warn('Permission check failed:', e)
    }

    const input = window.prompt('Enter new nice (priority) value, e.g. 10:', '10')
    if (input === null) return
    const nice = parseInt(input, 10)
    if (Number.isNaN(nice)) {
      addToast('Invalid nice value', 'error')
      return
    }
    try {
      await api.post(`/process/${pid}/nice`, { nice })
      addToast(`Priority (nice) updated for PID ${pid}`, 'success')
      fetchTreeData()
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.userMessage || e.message || 'Unknown error'
      let userFriendlyMsg = `Failed to change priority for PID ${pid}: ${errorMsg}`
      
      if (errorMsg.includes('Access denied') || errorMsg.includes('Administrator')) {
        userFriendlyMsg += '\n\nTip: On Windows, run the backend server as Administrator to modify system processes.'
      }
      
      addToast(userFriendlyMsg, 'error')
    }
  }

  const toggleNode = (pid) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(pid)) {
      newExpanded.delete(pid)
    } else {
      newExpanded.add(pid)
    }
    setExpandedNodes(newExpanded)
  }

  const renderProcessNode = (pid, level = 0, isLast = false) => {
    if (!treeData?.process_info[pid]) return null
    
    const process = treeData.process_info[pid]
    
    // Filter: if showOnlyModifiable is true, check if process can be modified
    if (showOnlyModifiable) {
      const perm = processPermissions[pid]
      if (!perm || !perm.can_modify) {
        // Still show if it has modifiable children
        const hasModifiableChildren = treeData.process_tree[pid]?.children?.some(childPid => {
          const childPerm = processPermissions[childPid]
          return childPerm && childPerm.can_modify
        })
        if (!hasModifiableChildren) {
          return null
        }
      }
    }
    
    const hasChildren = treeData.process_tree[pid]?.children?.length > 0
    const isExpanded = expandedNodes.has(pid)
    
    return (
      <div key={pid} className="tree-node" style={{ marginLeft: level * 20 }}>
        <div className="tree-node-content">
          <div className="tree-connector">
            {level > 0 && (
              <div className={`tree-line ${isLast ? 'tree-line-last' : ''}`} />
            )}
            <div className="tree-node-indicator" />
          </div>
          
          <div 
            className="tree-node-info"
            onClick={async () => {
              setSelectedProcess(process)
              // Check permissions when selecting a process
              try {
                const checkRes = await api.get(`/process/${process.pid}/can-modify`)
                setProcessPermissions(prev => ({
                  ...prev,
                  [process.pid]: checkRes.data
                }))
              } catch (e) {
                // Silently fail permission check
                console.warn('Failed to check permissions:', e)
              }
            }}
          >
            <div className="tree-node-header">
              <span className="process-name">{process.name}</span>
              <span className="process-pid">PID: {process.pid}</span>
            </div>
            
            <div className="process-stats">
              <span className={`status-badge status-${process.status}`}>
                {process.status}
              </span>
              {process.is_user_process && (
                <span style={{ 
                  fontSize: '0.75em', 
                  color: 'var(--success)', 
                  backgroundColor: 'rgba(40, 167, 69, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  Your Process
                </span>
              )}
              <span className="cpu-usage">CPU: {Math.round(process.cpu_percent || 0)}%</span>
              <span className="mem-usage">MEM: {Math.round(process.memory_percent || 0)}%</span>
              {process.num_threads !== undefined && (
                <span style={{ 
                  fontSize: '0.8em', 
                  color: '#666',
                  marginLeft: '8px'
                }}>
                  Threads: {process.num_threads}
                </span>
              )}
            </div>
            
            {hasChildren && (
              <button 
                className="expand-button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(pid)
                }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {treeData.process_tree[pid].children.map((childPid, index) => 
              renderProcessNode(childPid, level + 1, index === treeData.process_tree[pid].children.length - 1)
            )}
          </div>
        )}
      </div>
    )
  }

  const getProcessType = (process) => {
    if (process.pid === 0 || process.ppid === 0) return 'system'
    if (process.name.includes('system') || process.name.includes('kernel')) return 'system'
    if (process.name.includes('chrome') || process.name.includes('firefox')) return 'browser'
    if (process.name.includes('python') || process.name.includes('node')) return 'development'
    return 'application'
  }

  const getTypeColor = (type) => {
    switch(type) {
      case 'system': return 'var(--error)'
      case 'browser': return 'var(--accent-primary)'
      case 'development': return 'var(--success)'
      case 'application': return 'var(--warning)'
      default: return 'var(--text-secondary)'
    }
  }

  if (loading) {
    return <div className="loading">Loading process tree...</div>
  }

  if (!treeData) {
    return <div className="error">Failed to load process tree data</div>
  }

  return (
    <div>
      <h2>Process Tree Visualization</h2>
      
      <div className="tree-controls">
        <div className="tree-stats">
          <span>Total Processes: {treeData.total_processes}</span>
          <span>Root Processes: {treeData.root_processes.length}</span>
          {showOnlyModifiable && (
            <span style={{ color: 'var(--success)' }}>
              Showing modifiable processes only
            </span>
          )}
        </div>
        <div className="tree-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showOnlyModifiable}
              onChange={(e) => setShowOnlyModifiable(e.target.checked)}
            />
            <span>Show only modifiable processes</span>
          </label>
          <button onClick={() => setExpandedNodes(new Set())}>Collapse All</button>
          <button onClick={() => {
            const allPids = Object.keys(treeData.process_tree)
            setExpandedNodes(new Set(allPids))
          }}>Expand All</button>
          <button onClick={fetchTreeData}>Refresh</button>
        </div>
      </div>

      <div className="process-tree-container">
        {treeData.root_processes.map((rootPid, index) => 
          renderProcessNode(rootPid, 0, index === treeData.root_processes.length - 1)
        )}
      </div>

      <Modal 
        isOpen={selectedProcess !== null}
        onClose={() => setSelectedProcess(null)}
        title="Process Details"
        size="medium"
      >
        {selectedProcess && (
          <div className="process-details">
            <div className="process-header">
              <h3>{selectedProcess.name}</h3>
              <div className="process-type" style={{ color: getTypeColor(getProcessType(selectedProcess)) }}>
                {getProcessType(selectedProcess).toUpperCase()}
              </div>
            </div>
            
            <div className="process-info-grid">
              <div className="info-item">
                <label>Process ID:</label>
                <span>{selectedProcess.pid}</span>
              </div>
              <div className="info-item">
                <label>Parent PID:</label>
                <span>{selectedProcess.ppid}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge status-${selectedProcess.status}`}>
                  {selectedProcess.status}
                </span>
              </div>
              <div className="info-item">
                <label>CPU Usage:</label>
                <span>{Math.round(selectedProcess.cpu_percent || 0)}%</span>
              </div>
              <div className="info-item">
                <label>Memory Usage:</label>
                <span>{Math.round(selectedProcess.memory_percent || 0)}%</span>
              </div>
              <div className="info-item">
                <label>Children:</label>
                <span>{treeData.process_tree[selectedProcess.pid]?.children?.length || 0}</span>
              </div>
              <div className="info-item">
                <label>Threads:</label>
                <span>{selectedProcess.num_threads || 0}</span>
              </div>
              {selectedProcess.username && (
                <div className="info-item">
                  <label>Owner:</label>
                  <span>
                    {selectedProcess.username}
                    {selectedProcess.is_user_process && (
                      <span style={{ 
                        marginLeft: '8px', 
                        color: 'var(--success)', 
                        fontSize: '0.85em' 
                      }}>
                        (Your Process)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            
            <ThreadDetails pid={selectedProcess.pid} />
            
            {processPermissions[selectedProcess.pid] && !processPermissions[selectedProcess.pid].can_modify && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '15px', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffc107', 
                borderRadius: '4px',
                fontSize: '0.9em',
                lineHeight: '1.5'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>⚠️ Permission Notice:</strong> {processPermissions[selectedProcess.pid].reason || 'Cannot modify this process'}
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '3px', fontSize: '0.85em' }}>
                  <strong>How to fix:</strong>
                  <ol style={{ margin: '5px 0 0 20px', padding: 0 }}>
                    <li>Close the current backend server (if running)</li>
                    <li>Open PowerShell or Command Prompt as Administrator:
                      <ul style={{ margin: '3px 0 0 20px', listStyleType: 'disc' }}>
                        <li>Right-click on PowerShell/CMD</li>
                        <li>Select "Run as Administrator"</li>
                      </ul>
                    </li>
                    <li>Navigate to the backend directory: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>cd backend</code></li>
                    <li>Start the server: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>python main.py</code> or <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>uvicorn main:app --reload</code></li>
                  </ol>
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#6c757d' }}>
                    Note: You can only modify processes owned by your user account without Administrator privileges.
                  </div>
                </div>
              </div>
            )}
            
            <div className="process-actions">
              <button onClick={() => requestConfirm(selectedProcess.pid, 'kill', `Terminate process ${selectedProcess.pid}?`)} className="actions danger">Kill</button>
              <button onClick={() => requestConfirm(selectedProcess.pid, 'suspend', `Suspend process ${selectedProcess.pid}?`)} className="actions">Suspend</button>
              <button onClick={() => performAction(selectedProcess.pid, 'resume')} className="actions">Resume</button>
              <button 
                onClick={() => changeNice(selectedProcess.pid)} 
                className="actions"
                disabled={processPermissions[selectedProcess.pid] && !processPermissions[selectedProcess.pid].can_modify}
                title={processPermissions[selectedProcess.pid] && !processPermissions[selectedProcess.pid].can_modify ? 'Cannot modify this process - insufficient permissions' : ''}
              >
                Change Priority
              </button>
              <button 
                onClick={() => {
                  setSelectedProcess(null)
                  addToast('Process tree view updated', 'info')
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={confirmState.open}
        title="Confirm Action"
        message={confirmState.message}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmState.onConfirm || (() => setConfirmState({ open: false, message: '', onConfirm: null }))}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: null })}
      />
    </div>
  )
}
