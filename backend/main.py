from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ml_model import HealthScoreModel
from ml.anomaly_detector import ProcessAnomalyDetector
from dynamic_threshold_model import DynamicThresholdModel
from config_store import load_config, save_config
from health_optimizer import HealthOptimizer
import psutil

app = FastAPI(title="Smart Task Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

class Thresholds:
    def __init__(self):
        # CPU Thresholds
        self.cpu_high = 75  # Reduced from 80 - alerts earlier for better responsiveness
        self.cpu_optimal = 30  # Increased from 20 - more realistic for modern systems
        self.cpu_consistent_high = 65  # Reduced from 70 - catch sustained high usage earlier
        
        # RAM Thresholds
        self.ram_high = 85  # Keep at 85 - reasonable for most systems
        self.ram_healthy = 50  # Increased from 40 - more realistic baseline
        self.ram_consistent_high = 75  # Reduced from 80 - earlier detection of memory pressure
        
        # Disk Thresholds
        self.disk_critical = 90  # Keep at 90 - standard critical threshold
        self.disk_warning = 75  # Reduced from 80 - earlier warning for better planning
        
        # Process Count
        self.proc_high = 250  # Increased from 200 - modern Windows systems often have 200+ processes
        
        # Prediction Thresholds (for future resource usage)
        self.pred_cpu_high = 85  # Reduced from 90 - more conservative predictions
        self.pred_cpu_medium = 75  # Reduced from 80 - earlier warnings
        self.pred_ram_high = 90  # Reduced from 95 - earlier critical alerts
        self.pred_ram_medium = 80  # Reduced from 85 - better proactive management

THRESHOLDS = Thresholds()
_APP_CONFIG = load_config()
HISTORY = []
health_model = HealthScoreModel()
anomaly_detector = ProcessAnomalyDetector()
dynamic_threshold_model = DynamicThresholdModel()
health_optimizer = HealthOptimizer()

class ThresholdModel(BaseModel):
    cpu_high: int | None = None
    cpu_optimal: int | None = None
    ram_high: int | None = None
    ram_healthy: int | None = None
    disk_critical: int | None = None
    disk_warning: int | None = None
    proc_high: int | None = None
    cpu_consistent_high: int | None = None
    ram_consistent_high: int | None = None
    pred_cpu_high: int | None = None
    pred_cpu_medium: int | None = None
    pred_ram_high: int | None = None
    pred_ram_medium: int | None = None

class SimJob(BaseModel):
    pid: int | None = None
    burst: int
    priority: int = 0
    arrival: int = 0

class SimRequest(BaseModel):
    algorithm: str
    quantum: int | None = None
    jobs: list[SimJob]


def get_system_insights(cpu, ram, disk_usage, process_count):
    insights = []
    if cpu > THRESHOLDS.cpu_high:
        insights.append("High CPU usage detected. Consider closing unnecessary applications.")
    elif cpu < THRESHOLDS.cpu_optimal:
        insights.append("CPU usage is optimal.")
    if ram > THRESHOLDS.ram_high:
        insights.append("High memory usage. System may become slow.")
    elif ram < THRESHOLDS.ram_healthy:
        insights.append("Memory usage is healthy.")
    if disk_usage > THRESHOLDS.disk_critical:
        insights.append("Disk space critically low. Free up space immediately.")
    elif disk_usage > THRESHOLDS.disk_warning:
        insights.append("Consider freeing up disk space soon.")
    if process_count > THRESHOLDS.proc_high:
        insights.append("Many processes running. Check for unnecessary background apps.")
    if len(HISTORY) > 5:
        recent_cpu = [h['cpu'] for h in HISTORY[-5:]]
        recent_ram = [h['ram'] for h in HISTORY[-5:]]
        if all(cpu > THRESHOLDS.cpu_consistent_high for cpu in recent_cpu):
            insights.append("CPU usage consistently high. Consider system optimization.")
        if all(ram > THRESHOLDS.ram_consistent_high for ram in recent_ram):
            insights.append("Memory pressure detected. Restart may help.")
    return insights

@app.get('/stats')
def get_stats():
    cpu = psutil.cpu_percent(interval=0.2)
    ram = psutil.virtual_memory().percent
    disk_usage = psutil.disk_usage('/').percent if hasattr(psutil, 'disk_usage') else 0
    network_io = 0
    try:
        net_io = psutil.net_io_counters()
        network_io = net_io.bytes_sent + net_io.bytes_recv
    except:
        pass
    process_count = len(list(psutil.process_iter()))
    health_model.train(HISTORY)
    health_score = health_model.predict(cpu, ram, disk_usage)
    insights = get_system_insights(cpu, ram, disk_usage, process_count)
    import time
    HISTORY.append({
        'timestamp': time.time(),
        'cpu': cpu,
        'ram': ram,
        'disk': disk_usage,
        'health_score': health_score
    })
    if len(HISTORY) > 100:
        HISTORY.pop(0)
    alerts = []
    if cpu > THRESHOLDS.cpu_high:
        alerts.append(f'High CPU: {cpu}%')
    if ram > THRESHOLDS.ram_high:
        alerts.append(f'High RAM: {ram}%')
    return {
        'cpu': cpu, 
        'ram': ram,
        'disk': disk_usage,
        'health_score': health_score,
        'insights': insights,
        'process_count': process_count,
        'alerts': alerts, 
        'thresholds': THRESHOLDS.__dict__,
        'history': HISTORY[-20:]
    }

@app.get('/thresholds')
def get_thresholds():
    return {'thresholds': THRESHOLDS.__dict__}

@app.post('/thresholds')
def set_thresholds(t: ThresholdModel):
    for key, value in t.dict(exclude_unset=True).items():
        if hasattr(THRESHOLDS, key):
            setattr(THRESHOLDS, key, int(value))
    # Persist thresholds to config
    try:
        save_config({'thresholds': THRESHOLDS.__dict__})
    except Exception:
        pass
    return {'status': 'ok', 'thresholds': THRESHOLDS.__dict__}

@app.get('/processes')
def list_processes(limit: int = 100):
    procs = []
    for p in psutil.process_iter(['pid','name','status','cpu_percent','memory_percent','username']):
        try:
            info = p.info
            # Improve CPU accuracy similar to /process-tree
            try:
                cpu_val = info.get('cpu_percent', 0) or 0
                if cpu_val in (None, 0):
                    info['cpu_percent'] = p.cpu_percent(interval=0.0) or 0.0
            except Exception:
                info['cpu_percent'] = info.get('cpu_percent', 0) or 0.0
            procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    procs = sorted(procs, key=lambda x: x.get('cpu_percent',0), reverse=True)[:limit]
    return {'processes': procs, 'count': len(procs)}

@app.get('/process-tree')
def get_process_tree():
    """
    Returns real-time process tree data from the system.
    All values are retrieved directly from psutil - no fake or mock data.
    """
    process_tree = {}
    process_info = {}
    try:
        import os
        current_user = None
        try:
            current_user = os.getlogin()
        except (OSError, AttributeError):
            try:
                current_user = os.environ.get('USERNAME') or os.environ.get('USER')
            except:
                pass
        
        # Get real process data from the system - all values are live/real-time
        for proc in psutil.process_iter(['pid', 'name', 'ppid', 'status', 'cpu_percent', 'memory_percent', 'username']):
            try:
                info = proc.info
                # Improve CPU accuracy: if missing or zero, query a current snapshot
                try:
                    cpu_val = info.get('cpu_percent', 0) or 0
                    if cpu_val in (None, 0):
                        info['cpu_percent'] = proc.cpu_percent(interval=0.0) or 0.0
                except Exception:
                    info['cpu_percent'] = info.get('cpu_percent', 0) or 0.0
                pid = info['pid']
                ppid = info['ppid']
                
                # Check if process belongs to current user
                process_username = info.get('username')
                is_user_process = (process_username and current_user and 
                                 process_username.lower() == current_user.lower())
                
                # Get thread count
                num_threads = 0
                try:
                    num_threads = proc.num_threads()
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass
                
                process_info[pid] = {
                    'pid': pid,
                    'name': info['name'],
                    'ppid': ppid,
                    'status': info['status'],
                    'cpu_percent': info.get('cpu_percent', 0),
                    'memory_percent': info.get('memory_percent', 0),
                    'username': process_username,
                    'is_user_process': is_user_process,
                    'num_threads': num_threads,
                    'children': []
                }
                if ppid in process_tree:
                    process_tree[ppid]['children'].append(pid)
                else:
                    process_tree[ppid] = {'children': [pid]}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        return {'error': str(e)}
    root_processes = []
    for pid, info in process_info.items():
        if info['ppid'] == 0 or info['ppid'] not in process_info:
            root_processes.append(pid)
    return {
        'process_tree': process_tree,
        'process_info': process_info,
        'root_processes': root_processes,
        'total_processes': len(process_info)
    }

@app.get('/predictions')
def get_resource_predictions():
    if len(HISTORY) < 10:
        return {'error': 'Not enough historical data for predictions'}
    import statistics
    recent_data = HISTORY[-10:]
    cpu_values = [d['cpu'] for d in recent_data]
    ram_values = [d['ram'] for d in recent_data]
    def calculate_trend(values):
        n = len(values)
        x = list(range(n))
        y = values
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        if denominator == 0:
            return 0
        slope = numerator / denominator
        return slope
    cpu_trend = calculate_trend(cpu_values)
    ram_trend = calculate_trend(ram_values)
    current_cpu = cpu_values[-1]
    current_ram = ram_values[-1]
    predictions = []
    for i in range(1, 4):
        predicted_cpu = max(0, min(100, current_cpu + (cpu_trend * i)))
        predicted_ram = max(0, min(100, current_ram + (ram_trend * i)))
        predictions.append({
            'time_ahead_seconds': i * 3,
            'predicted_cpu': round(predicted_cpu, 1),
            'predicted_ram': round(predicted_ram, 1)
        })
    risk_level = 'low'
    risk_reasons = []
    if any(p['predicted_cpu'] > THRESHOLDS.pred_cpu_high for p in predictions):
        risk_level = 'high'
        risk_reasons.append(f'CPU usage predicted to exceed {THRESHOLDS.pred_cpu_high}%')
    elif any(p['predicted_cpu'] > THRESHOLDS.pred_cpu_medium for p in predictions):
        risk_level = 'medium'
        risk_reasons.append(f'CPU usage predicted to exceed {THRESHOLDS.pred_cpu_medium}%')
    if any(p['predicted_ram'] > THRESHOLDS.pred_ram_high for p in predictions):
        risk_level = 'high'
        risk_reasons.append(f'Memory usage predicted to exceed {THRESHOLDS.pred_ram_high}%')
    elif any(p['predicted_ram'] > THRESHOLDS.pred_ram_medium for p in predictions):
        if risk_level == 'low':
            risk_level = 'medium'
        risk_reasons.append(f'Memory usage predicted to exceed {THRESHOLDS.pred_ram_medium}%')
    return {
        'predictions': predictions,
        'trends': {
            'cpu_trend': round(cpu_trend, 3),
            'ram_trend': round(ram_trend, 3)
        },
        'risk_assessment': {
            'level': risk_level,
            'reasons': risk_reasons
        },
        'data_points_analyzed': len(recent_data)
    }

@app.post('/process/{pid}/action')
def process_action(pid: int, action: str = Body(..., embed=True)):
    try:
        p = psutil.Process(pid)
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail='Process not found')
    try:
        if action == 'kill':
            p.terminate()
            return {'status': 'terminated'}
        elif action == 'kill_force':
            p.kill()
            return {'status': 'killed'}
        elif action == 'suspend':
            p.suspend()
            return {'status': 'suspended'}
        elif action == 'resume':
            p.resume()
            return {'status': 'resumed'}
        else:
            raise HTTPException(status_code=400, detail='Unknown action')
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail='Access denied performing action on process')

@app.get('/process/{pid}/can-modify')
def can_modify_process(pid: int):
    """Check if the current process has permission to modify the target process."""
    import os
    try:
        p = psutil.Process(pid)
        process_username = None
        current_username = None
        
        # Get process owner and current user
        try:
            process_username = p.username()
        except (psutil.AccessDenied, AttributeError):
            pass
        
        try:
            current_username = os.getlogin()
        except (OSError, AttributeError):
            try:
                current_username = os.environ.get('USERNAME') or os.environ.get('USER')
            except:
                pass
        
        # Try to read the current nice value as a permission check
        try:
            current_nice = p.nice()
            is_user_process = (process_username and current_username and 
                            process_username.lower() == current_username.lower())
            
            return {
                'can_modify': True,
                'current_nice': current_nice,
                'pid': pid,
                'name': p.name(),
                'username': process_username,
                'is_user_process': is_user_process
            }
        except psutil.AccessDenied:
            is_user_process = (process_username and current_username and 
                            process_username.lower() == current_username.lower())
            
            if is_user_process:
                reason = 'Access denied. This may be a protected system process.'
            else:
                reason = f'Access denied. Process owned by "{process_username}". You may need Administrator privileges to modify processes owned by other users.'
            
            return {
                'can_modify': False,
                'reason': reason,
                'pid': pid,
                'name': p.name(),
                'username': process_username,
                'is_user_process': is_user_process
            }
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail='Process not found')
    except Exception as e:
        return {
            'can_modify': False,
            'reason': f'Unable to check permissions: {str(e)}',
            'pid': pid
        }

@app.get('/process/{pid}/threads')
def get_process_threads(pid: int):
    """Get detailed thread information for a process."""
    try:
        p = psutil.Process(pid)
        threads = []
        try:
            thread_list = p.threads()
            for thread in thread_list:
                threads.append({
                    'id': thread.id,
                    'user_time': thread.user_time,
                    'system_time': thread.system_time,
                    'total_time': thread.user_time + thread.system_time
                })
        except (psutil.AccessDenied, psutil.NoSuchProcess) as e:
            return {
                'threads': [],
                'count': 0,
                'error': f'Cannot access thread information: {str(e)}'
            }
        
        return {
            'threads': threads,
            'count': len(threads),
            'pid': pid,
            'name': p.name()
        }
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail='Process not found')
    except Exception as e:
        return {
            'threads': [],
            'count': 0,
            'error': f'Error retrieving threads: {str(e)}'
        }

@app.post('/process/{pid}/nice')
def change_nice(pid: int, body: dict = Body(...)):
    nice = body.get('nice')
    try:
        p = psutil.Process(pid)
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail='Process not found')
    try:
        p.nice(int(nice))
        return {'status': 'ok', 'pid': pid, 'nice': nice}
    except psutil.AccessDenied:
        import platform
        system = platform.system()
        if system == 'Windows':
            detail = 'Access denied. This operation requires Administrator privileges. Please run the backend server as Administrator, or try modifying processes owned by your user account only.'
        else:
            detail = 'Access denied. You may need elevated permissions (sudo) to change priority of this process.'
        raise HTTPException(status_code=403, detail=detail)

def simulate_fcfs(jobs):
    timeline = []
    time_cursor = 0
    for j in sorted(jobs, key=lambda x: x['arrival']):
        start = max(time_cursor, j['arrival'])
        end = start + j['burst']
        timeline.append({'pid': j.get('pid'), 'start': start, 'end': end, 'burst': j['burst']})
        time_cursor = end
    return timeline

def simulate_round_robin(jobs, quantum=2):
    from collections import deque
    q = [dict(j) for j in sorted(jobs, key=lambda x: x['arrival'])]
    time_cursor = 0
    timeline = []
    ready = deque()
    while q or ready:
        while q and q[0]['arrival'] <= time_cursor:
            ready.append(q.pop(0))
        if not ready:
            time_cursor = q[0]['arrival']
            continue
        job = ready.popleft()
        run = min(job['burst'], quantum)
        start = time_cursor
        time_cursor += run
        job['burst'] -= run
        timeline.append({'pid': job.get('pid'), 'start': start, 'end': time_cursor, 'run': run})
        while q and q[0]['arrival'] <= time_cursor:
            ready.append(q.pop(0))
        if job['burst'] > 0:
            ready.append(job)
    return timeline

def simulate_priority(jobs):
    timeline = []
    time_cursor = 0
    remaining_jobs = [dict(j) for j in jobs]
    while remaining_jobs:
        ready_jobs = [j for j in remaining_jobs if j['arrival'] <= time_cursor]
        if not ready_jobs:
            time_cursor = min(j['arrival'] for j in remaining_jobs)
            continue
        selected_job = max(ready_jobs, key=lambda x: x['priority'])
        start = time_cursor
        end = start + selected_job['burst']
        timeline.append({
            'pid': selected_job.get('pid'), 
            'start': start, 
            'end': end, 
            'burst': selected_job['burst']
        })
        time_cursor = end
        remaining_jobs.remove(selected_job)
    return timeline

def simulate_sjf(jobs):
    timeline = []
    time_cursor = 0
    remaining_jobs = [dict(j) for j in jobs]
    while remaining_jobs:
        ready_jobs = [j for j in remaining_jobs if j['arrival'] <= time_cursor]
        if not ready_jobs:
            time_cursor = min(j['arrival'] for j in remaining_jobs)
            continue
        selected_job = min(ready_jobs, key=lambda x: x['burst'])
        start = time_cursor
        end = start + selected_job['burst']
        timeline.append({
            'pid': selected_job.get('pid'), 
            'start': start, 
            'end': end, 
            'burst': selected_job['burst']
        })
        time_cursor = end
        remaining_jobs.remove(selected_job)
    return timeline

@app.post('/simulate')
def simulate(req: SimRequest):
    alg = req.algorithm.lower()
    jobs = [ {'pid': j.pid, 'burst': j.burst, 'priority': j.priority, 'arrival': j.arrival} for j in req.jobs ]
    if alg == 'fcfs':
        timeline = simulate_fcfs(jobs)
    elif alg in ('rr','roundrobin'):
        q = req.quantum or 2
        timeline = simulate_round_robin(jobs, quantum=q)
    elif alg == 'priority':
        timeline = simulate_priority(jobs)
    elif alg == 'sjf':
        timeline = simulate_sjf(jobs)
    else:
        raise HTTPException(status_code=400, detail='Unsupported algorithm')
    return {'algorithm': alg, 'timeline': timeline}

@app.get('/dynamic-thresholds')
def get_dynamic_thresholds():
    # If not enough data, return last saved dynamic thresholds or sensible defaults
    if len(HISTORY) < 20:
        defaults = {'cpu_high': 80, 'ram_high': 85}
        saved = load_config().get('dynamic_thresholds') or {}
        return { **defaults, **saved }
    thresholds = dynamic_threshold_model.update_thresholds(HISTORY)
    # Persist latest computed thresholds
    save_config({'dynamic_thresholds': thresholds})
    return thresholds


@app.get('/optimize-health')
def get_optimization_suggestions():
    """Legacy endpoint - kept for backward compatibility"""
    try:
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                procs.append(p.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        suggestions = health_optimizer.get_optimization_suggestions(procs)
        return {'suggestions': suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/smart-recommendations')
def get_smart_recommendations():
    """Get AI-powered smart recommendations with confidence scores"""
    try:
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                info = p.info
                # Improve CPU accuracy
                cpu_val = info.get('cpu_percent', 0) or 0
                if cpu_val == 0:
                    try:
                        info['cpu_percent'] = p.cpu_percent(interval=0.0) or 0.0
                    except:
                        info['cpu_percent'] = 0.0
                procs.append(info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Get RAM trend from history
        ram_trend = [h['ram'] for h in HISTORY[-20:]] if len(HISTORY) >= 5 else None
        
        recommendations = health_optimizer.get_smart_recommendations(procs, HISTORY, ram_trend)
        return {'recommendations': recommendations, 'count': len(recommendations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/record-user-action')
def record_user_action(body: dict = Body(...)):
    """Record user action for pattern learning"""
    try:
        action_type = body.get('action')  # 'kill', 'ignore', etc.
        process_name = body.get('process_name')
        pid = body.get('pid')
        
        if not all([action_type, process_name, pid]):
            raise HTTPException(status_code=400, detail='Missing required fields')
        
        health_optimizer.record_user_action(action_type, process_name, pid)
        return {'status': 'recorded', 'message': 'Action recorded for learning'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/anomalies')
def get_anomalies():
    """
    Detects and returns a list of anomalous processes.
    """
    try:
        anomalies = anomaly_detector.detect()
        return {'anomalies': anomalies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
