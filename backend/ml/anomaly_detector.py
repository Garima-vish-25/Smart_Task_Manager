import psutil
import pandas as pd
from sklearn.ensemble import IsolationForest
import time
from collections import defaultdict

class ProcessAnomalyDetector:
    def __init__(self):
        self.model = None
        self.process_baselines = defaultdict(lambda: {
            'cpu_history': [],
            'memory_history': [],
            'first_seen': None,
            'last_seen': None,
            'seen_count': 0
        })
        # Track known processes (for new process detection)
        self.known_processes = set()
        # Track sustained high CPU (cryptominer detection)
        self.sustained_high_cpu = defaultdict(lambda: {'start_time': None, 'duration': 0})

    def collect_data(self):
        """
        Collect process data from the system in real-time.
        No external dataset required - uses live system data.
        """
        data = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'num_threads']):
            try:
                info = proc.info
                io = info.get('io_counters')
                
                # Handle missing CPU data
                cpu_percent = info.get('cpu_percent', 0) or 0
                if cpu_percent == 0:
                    try:
                        cpu_percent = proc.cpu_percent(interval=0.0) or 0.0
                    except:
                        cpu_percent = 0.0
                
                data.append({
                    'pid': info['pid'],
                    'name': info['name'],
                    'cpu_percent': cpu_percent,
                    'memory_percent': info.get('memory_percent', 0) or 0,
                    'read_bytes': io.read_bytes if io else 0,
                    'write_bytes': io.write_bytes if io else 0,
                    'num_threads': info.get('num_threads', 0) or 0
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError, KeyError):
                continue
        return pd.DataFrame(data)

    def train(self):
        df = self.collect_data()
        if df.empty or len(df) < 2:
            # Not enough data to train
            return
        features = ['cpu_percent', 'memory_percent', 'read_bytes', 'write_bytes', 'num_threads']
        X = df[features].fillna(0)
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.model.fit(X)

    def _update_baselines(self, df):
        """Update baseline patterns for each process"""
        current_time = time.time()
        current_pids = set()
        
        for _, row in df.iterrows():
            pid = row['pid']
            name = row['name']
            process_key = f"{name}_{pid}"
            current_pids.add(process_key)
            
            baseline = self.process_baselines[process_key]
            
            # Track first/last seen
            if baseline['first_seen'] is None:
                baseline['first_seen'] = current_time
                # New process detected
                if process_key not in self.known_processes:
                    baseline['is_new'] = True
            else:
                baseline['is_new'] = False
            
            baseline['last_seen'] = current_time
            baseline['seen_count'] += 1
            
            # Update CPU and memory history (keep last 20 readings)
            baseline['cpu_history'].append(row['cpu_percent'])
            baseline['memory_history'].append(row['memory_percent'])
            if len(baseline['cpu_history']) > 20:
                baseline['cpu_history'].pop(0)
            if len(baseline['memory_history']) > 20:
                baseline['memory_history'].pop(0)
            
            # Track sustained high CPU (cryptominer pattern)
            if row['cpu_percent'] > 80:  # High CPU threshold
                if self.sustained_high_cpu[process_key]['start_time'] is None:
                    self.sustained_high_cpu[process_key]['start_time'] = current_time
                else:
                    self.sustained_high_cpu[process_key]['duration'] = (
                        current_time - self.sustained_high_cpu[process_key]['start_time']
                    )
            else:
                # Reset if CPU drops
                self.sustained_high_cpu[process_key] = {'start_time': None, 'duration': 0}
        
        # Update known processes
        self.known_processes.update(current_pids)
        
        # Clean up old processes (not seen in last 5 minutes)
        to_remove = []
        for key, baseline in self.process_baselines.items():
            if baseline['last_seen'] and (current_time - baseline['last_seen']) > 300:
                to_remove.append(key)
        for key in to_remove:
            del self.process_baselines[key]
            if key in self.sustained_high_cpu:
                del self.sustained_high_cpu[key]

    def _calculate_security_score(self, row, baseline):
        """Calculate security score (0-100) for a process"""
        score = 100  # Start with perfect score
        
        # Penalty for new processes
        if baseline.get('is_new', False):
            score -= 20
        
        # Penalty for resource spikes
        if len(baseline['cpu_history']) >= 5:
            avg_cpu = sum(baseline['cpu_history'][:-1]) / len(baseline['cpu_history'][:-1])
            if avg_cpu > 0 and row['cpu_percent'] > avg_cpu * 10:
                score -= 30  # 10x spike detected
            elif avg_cpu > 0 and row['cpu_percent'] > avg_cpu * 5:
                score -= 15  # 5x spike
        
        if len(baseline['memory_history']) >= 5:
            avg_memory = sum(baseline['memory_history'][:-1]) / len(baseline['memory_history'][:-1])
            if avg_memory > 0 and row['memory_percent'] > avg_memory * 10:
                score -= 25  # 10x memory spike
        
        # Penalty for sustained high CPU (cryptominer pattern)
        process_key = f"{row['name']}_{row['pid']}"
        if process_key in self.sustained_high_cpu:
            duration = self.sustained_high_cpu[process_key]['duration']
            if duration > 60:  # Sustained for more than 1 minute
                score -= 40
            elif duration > 30:  # Sustained for more than 30 seconds
                score -= 20
        
        # Penalty for very high absolute values
        if row['cpu_percent'] > 90:
            score -= 15
        if row['memory_percent'] > 50:
            score -= 10
        
        return max(0, min(100, score))

    def _get_anomaly_reason(self, row, baseline):
        """Generate human-readable reason for anomaly"""
        reasons = []
        process_key = f"{row['name']}_{row['pid']}"
        
        # Check for new process
        if baseline.get('is_new', False):
            reasons.append("New process detected")
        
        # Check for resource spikes
        if len(baseline['cpu_history']) >= 5:
            avg_cpu = sum(baseline['cpu_history'][:-1]) / len(baseline['cpu_history'][:-1])
            if avg_cpu > 0:
                multiplier = row['cpu_percent'] / avg_cpu if avg_cpu > 0 else 0
                if multiplier >= 10:
                    reasons.append(f"CPU usage {multiplier:.1f}x normal ({row['cpu_percent']:.1f}% vs {avg_cpu:.1f}%)")
                elif multiplier >= 5:
                    reasons.append(f"CPU usage {multiplier:.1f}x normal")
        
        if len(baseline['memory_history']) >= 5:
            avg_memory = sum(baseline['memory_history'][:-1]) / len(baseline['memory_history'][:-1])
            if avg_memory > 0:
                multiplier = row['memory_percent'] / avg_memory if avg_memory > 0 else 0
                if multiplier >= 10:
                    reasons.append(f"Memory usage {multiplier:.1f}x normal")
        
        # Check for cryptominer pattern
        if process_key in self.sustained_high_cpu:
            duration = self.sustained_high_cpu[process_key]['duration']
            if duration > 60:
                reasons.append(f"Sustained high CPU for {int(duration)}s (possible cryptominer)")
            elif duration > 30:
                reasons.append(f"Sustained high CPU for {int(duration)}s")
        
        # High absolute values
        if row['cpu_percent'] > 90:
            reasons.append(f"Extremely high CPU ({row['cpu_percent']:.1f}%)")
        if row['memory_percent'] > 50:
            reasons.append(f"Very high memory ({row['memory_percent']:.1f}%)")
        
        return "; ".join(reasons) if reasons else "Unusual behavior pattern detected"

    def detect(self):
        """Detect anomalies with behavioral analysis"""
        if not self.model:
            self.train()
        if not self.model:
            return []
        
        df = self.collect_data()
        if df.empty:
            return []
        
        # Update baselines
        self._update_baselines(df)
        
        # ML-based detection
        features = ['cpu_percent', 'memory_percent', 'read_bytes', 'write_bytes', 'num_threads']
        X = df[features].fillna(0)
        df['anomaly'] = self.model.predict(X)
        
        # Get ML-detected anomalies
        ml_anomalies = df[df['anomaly'] == -1].copy()
        
        # Add behavioral analysis
        results = []
        for _, row in ml_anomalies.iterrows():
            process_key = f"{row['name']}_{row['pid']}"
            baseline = self.process_baselines.get(process_key, {})
            
            # Calculate security score
            security_score = self._calculate_security_score(row, baseline)
            
            # Get anomaly reason
            reason = self._get_anomaly_reason(row, baseline)
            
            # Add to results
            result = row.to_dict()
            result['security_score'] = security_score
            result['anomaly_reason'] = reason
            result['is_new_process'] = baseline.get('is_new', False)
            result['baseline_cpu'] = (
                sum(baseline.get('cpu_history', [])[:-1]) / len(baseline.get('cpu_history', [])[:-1])
                if len(baseline.get('cpu_history', [])) > 1 else 0
            )
            results.append(result)
        
        # Also check for behavioral anomalies even if ML doesn't flag them
        for _, row in df.iterrows():
            process_key = f"{row['name']}_{row['pid']}"
            baseline = self.process_baselines.get(process_key, {})
            
            # Check for severe behavioral issues
            severe_issue = False
            
            # 10x resource spike
            if len(baseline.get('cpu_history', [])) >= 5:
                avg_cpu = sum(baseline['cpu_history'][:-1]) / len(baseline['cpu_history'][:-1])
                if avg_cpu > 0 and row['cpu_percent'] > avg_cpu * 10:
                    severe_issue = True
            
            # Sustained high CPU
            if process_key in self.sustained_high_cpu:
                if self.sustained_high_cpu[process_key]['duration'] > 60:
                    severe_issue = True
            
            # If severe issue and not already in results
            if severe_issue:
                existing = any(r['pid'] == row['pid'] for r in results)
                if not existing:
                    security_score = self._calculate_security_score(row, baseline)
                    reason = self._get_anomaly_reason(row, baseline)
                    result = row.to_dict()
                    result['security_score'] = security_score
                    result['anomaly_reason'] = reason
                    result['is_new_process'] = baseline.get('is_new', False)
                    results.append(result)
        
        return results
