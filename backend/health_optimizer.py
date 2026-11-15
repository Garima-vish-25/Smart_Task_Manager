import psutil
import time
from datetime import datetime
from collections import defaultdict
from config_store import load_config, save_config

# List of common critical process names to avoid suggesting termination
CRITICAL_PROCESSES = [
    'svchost.exe', 'wininit.exe', 'csrss.exe', 'winlogon.exe', 'lsass.exe',
    'services.exe', 'explorer.exe', 'system', 'registry', 'smss.exe',
    'kernel', 'init', 'systemd', 'kthreadd'
]

class HealthOptimizer:
    def __init__(self):
        # Load user patterns from config
        self.user_patterns = load_config().get('user_patterns', {})
        self.user_actions_history = load_config().get('user_actions_history', [])
    
    def _save_user_pattern(self, pattern_data):
        """Save user pattern to config"""
        config = load_config()
        if 'user_patterns' not in config:
            config['user_patterns'] = {}
        config['user_patterns'].update(pattern_data)
        save_config(config)
    
    def _record_user_action(self, action_type, process_name, pid, timestamp=None):
        """Record user action for pattern learning"""
        if timestamp is None:
            timestamp = time.time()
        
        config = load_config()
        if 'user_actions_history' not in config:
            config['user_actions_history'] = []
        
        config['user_actions_history'].append({
            'action': action_type,
            'process_name': process_name,
            'pid': pid,
            'timestamp': timestamp,
            'hour': datetime.fromtimestamp(timestamp).hour
        })
        
        # Keep only last 1000 actions
        if len(config['user_actions_history']) > 1000:
            config['user_actions_history'] = config['user_actions_history'][-1000:]
        
        save_config(config)
        self.user_actions_history = config['user_actions_history']
    
    def _learn_user_patterns(self):
        """Learn patterns from user action history"""
        if not self.user_actions_history:
            return {}
        
        patterns = defaultdict(lambda: {'kill_times': [], 'close_count': 0})
        
        for action in self.user_actions_history:
            proc_name = action['process_name'].lower()
            if action['action'] == 'kill':
                patterns[proc_name]['kill_times'].append(action['hour'])
                patterns[proc_name]['close_count'] += 1
        
        # Calculate most common kill times per process
        learned_patterns = {}
        for proc_name, data in patterns.items():
            if data['close_count'] >= 3:  # Need at least 3 occurrences
                # Find most common hour
                hour_counts = defaultdict(int)
                for hour in data['kill_times']:
                    hour_counts[hour] += 1
                if hour_counts:
                    most_common_hour = max(hour_counts.items(), key=lambda x: x[1])[0]
                    confidence = hour_counts[most_common_hour] / data['close_count']
                    if confidence >= 0.6:  # 60% confidence threshold
                        learned_patterns[proc_name] = {
                            'usual_close_hour': most_common_hour,
                            'confidence': confidence,
                            'occurrences': data['close_count']
                        }
        
        return learned_patterns
    
    def _check_user_pattern(self, process_name, current_hour):
        """Check if process matches user's usual closing pattern"""
        patterns = self._learn_user_patterns()
        proc_name_lower = process_name.lower()
        
        if proc_name_lower in patterns:
            pattern = patterns[proc_name_lower]
            if pattern['usual_close_hour'] == current_hour:
                return {
                    'matches': True,
                    'confidence': pattern['confidence'],
                    'hour': pattern['usual_close_hour'],
                    'occurrences': pattern['occurrences']
                }
        return {'matches': False}
    
    def _predict_future_issues(self, current_ram, ram_trend, processes):
        """Predict if RAM will hit critical levels soon"""
        # Simple linear prediction based on trend
        if len(ram_trend) < 5:
            return None
        
        # Calculate trend (last 5 points)
        recent = ram_trend[-5:]
        if len(recent) < 2:
            return None
        
        # Simple linear trend
        time_points = list(range(len(recent)))
        ram_values = recent
        
        # Calculate slope
        n = len(time_points)
        sum_x = sum(time_points)
        sum_y = sum(ram_values)
        sum_xy = sum(x * y for x, y in zip(time_points, ram_values))
        sum_x2 = sum(x * x for x in time_points)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            return None
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        
        # Predict 15 minutes ahead (assuming 3-second intervals, that's 300 data points)
        # But we'll predict for next 5 readings (15 seconds)
        predicted_ram = current_ram + (slope * 5)
        
        if predicted_ram > 90:
            # Find least important processes to suggest closing
            sorted_procs = sorted(
                [p for p in processes if p.get('memory_percent', 0) > 5],
                key=lambda p: p.get('memory_percent', 0),
                reverse=True
            )
            
            # Get top 3 non-critical processes
            suggested_procs = []
            total_memory_mb = 0
            for proc in sorted_procs:
                proc_name = proc.get('name', '').lower()
                if not any(crit in proc_name for crit in CRITICAL_PROCESSES):
                    suggested_procs.append(proc)
                    # Calculate actual memory in MB
                    mem_percent = proc.get('memory_percent', 0)
                    try:
                        total_memory_gb = psutil.virtual_memory().total / (1024 ** 3)
                        total_memory_mb += (mem_percent / 100) * total_memory_gb * 1024
                    except:
                        # Fallback estimate (assume 16GB system)
                        total_memory_mb += (mem_percent / 100) * 16384
                    if len(suggested_procs) >= 3:
                        break
            
            return {
                'will_hit_critical': True,
                'predicted_ram': predicted_ram,
                'time_estimate': '15 minutes',
                'suggested_processes': suggested_procs,
                'estimated_free_mb': int(total_memory_mb)
            }
        
        return None
    
    def _calculate_confidence(self, suggestion_type, data):
        """Calculate confidence score (0-100) for a suggestion"""
        confidence = 50  # Base confidence
        
        if suggestion_type == 'resource_hog':
            # Higher confidence for higher resource usage
            if data.get('memory_percent', 0) > 20:
                confidence += 30
            elif data.get('memory_percent', 0) > 10:
                confidence += 20
            
            if data.get('cpu_percent', 0) > 50:
                confidence += 20
            elif data.get('cpu_percent', 0) > 25:
                confidence += 10
            
            # Lower confidence if process is responding
            if not data.get('not_responding', False):
                confidence -= 10
        
        elif suggestion_type == 'user_pattern':
            # Confidence based on pattern strength
            pattern_confidence = data.get('pattern_confidence', 0)
            confidence = int(pattern_confidence * 100)
            # Boost if many occurrences
            if data.get('occurrences', 0) > 10:
                confidence = min(100, confidence + 10)
        
        elif suggestion_type == 'future_issue':
            # Higher confidence for steeper trends
            predicted_ram = data.get('predicted_ram', 0)
            if predicted_ram > 95:
                confidence = 90
            elif predicted_ram > 90:
                confidence = 75
            else:
                confidence = 60
        
        return min(100, max(0, confidence))
    
    def get_smart_recommendations(self, processes, history=None, ram_trend=None):
        """
        Get smart AI-powered recommendations with confidence scores.
        
        Args:
            processes: List of current processes
            history: System history (optional)
            ram_trend: Recent RAM usage trend (optional)
        
        Returns:
            List of recommendation dictionaries
        """
        recommendations = []
        current_hour = datetime.now().hour
        current_ram = psutil.virtual_memory().percent if hasattr(psutil, 'virtual_memory') else 0
        
        # 1. Find resource hogs
        for proc in processes:
            proc_name = proc.get('name', '').lower()
            if any(crit in proc_name for crit in CRITICAL_PROCESSES):
                continue
            
            memory_percent = proc.get('memory_percent', 0)
            cpu_percent = proc.get('cpu_percent', 0)
            
            # Check if process is not responding (high CPU but no activity)
            not_responding = cpu_percent > 30 and memory_percent > 10
            
            if memory_percent > 10 or (cpu_percent > 25 and not_responding):
                # Calculate actual memory in MB
                try:
                    total_memory_gb = psutil.virtual_memory().total / (1024 ** 3)
                    mem_mb = int((memory_percent / 100) * total_memory_gb * 1024)
                except:
                    # Fallback estimate (assume 16GB system)
                    mem_mb = int((memory_percent / 100) * 16384)
                
                confidence = self._calculate_confidence('resource_hog', {
                    'memory_percent': memory_percent,
                    'cpu_percent': cpu_percent,
                    'not_responding': not_responding
                })
                
                recommendations.append({
                    'type': 'resource_hog',
                    'action': 'kill',
                    'processes': [{
                        'pid': proc['pid'],
                        'name': proc['name'],
                        'memory_percent': memory_percent,
                        'cpu_percent': cpu_percent
                    }],
                    'reason': f'Using {memory_percent:.1f}% RAM' + (f' and {cpu_percent:.1f}% CPU' if cpu_percent > 25 else '') + (' (not responding)' if not_responding else ''),
                    'impact': f'Free ~{mem_mb}MB RAM',
                    'confidence': confidence,
                    'priority': 'high' if memory_percent > 20 else 'medium'
                })
        
        # 2. Learn user patterns
        for proc in processes[:20]:  # Check top 20 processes
            proc_name = proc.get('name', '')
            pattern_check = self._check_user_pattern(proc_name, current_hour)
            
            if pattern_check['matches']:
                confidence = self._calculate_confidence('user_pattern', {
                    'pattern_confidence': pattern_check['confidence'],
                    'occurrences': pattern_check['occurrences']
                })
                
                recommendations.append({
                    'type': 'user_pattern',
                    'action': 'schedule_kill',
                    'processes': [{
                        'pid': proc['pid'],
                        'name': proc_name
                    }],
                    'reason': f"You usually close {proc_name} at {pattern_check['hour']}:00 ({pattern_check['occurrences']} times)",
                    'impact': 'Automate this action',
                    'confidence': confidence,
                    'priority': 'medium',
                    'pattern_hour': pattern_check['hour'],
                    'pattern_occurrences': pattern_check['occurrences']
                })
        
        # 3. Predict future issues
        if ram_trend and len(ram_trend) >= 5:
            prediction = self._predict_future_issues(current_ram, ram_trend, processes)
            if prediction:
                confidence = self._calculate_confidence('future_issue', {
                    'predicted_ram': prediction['predicted_ram']
                })
                
                recommended_processes = [{
                    'pid': p['pid'],
                    'name': p['name'],
                    'memory_percent': p.get('memory_percent', 0)
                } for p in prediction['suggested_processes']]
                
                recommendations.append({
                    'type': 'future_issue',
                    'action': 'close_apps',
                    'processes': recommended_processes,
                    'reason': f"RAM will hit {prediction['predicted_ram']:.1f}% in {prediction['time_estimate']}",
                    'impact': f"Prevent slowdown - free ~{prediction['estimated_free_mb']}MB",
                    'confidence': confidence,
                    'priority': 'high' if prediction['predicted_ram'] > 95 else 'medium',
                    'predicted_ram': prediction['predicted_ram']
                })
        
        # Sort by priority and confidence
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        recommendations.sort(key=lambda x: (priority_order.get(x.get('priority', 'low'), 1), x.get('confidence', 0)), reverse=True)
        
        # Limit to top 5 recommendations
        return recommendations[:5]
    
    def record_user_action(self, action_type, process_name, pid):
        """Record user action for learning (called from API)"""
        self._record_user_action(action_type, process_name, pid)
    
    def get_optimization_suggestions(self, processes):
        """Legacy method - kept for backward compatibility"""
        suggestions = []
        sorted_procs = sorted(
            processes, 
            key=lambda p: p.get('cpu_percent', 0) + p.get('memory_percent', 0), 
            reverse=True
        )

        for proc in sorted_procs[:10]:
            proc_name = proc.get('name', '').lower()
            if not any(crit_proc in proc_name for crit_proc in CRITICAL_PROCESSES):
                if proc.get('cpu_percent', 0) > 25:
                    suggestions.append({
                        'pid': proc['pid'],
                        'name': proc['name'],
                        'action': 'kill',
                        'reason': f"High CPU usage ({proc['cpu_percent']}%)"
                    })
                elif proc.get('memory_percent', 0) > 10:
                    suggestions.append({
                        'pid': proc['pid'],
                        'name': proc['name'],
                        'action': 'kill',
                        'reason': f"High Memory usage ({round(proc['memory_percent'], 2)}%)"
                    })
            
            if len(suggestions) >= 3:
                break

        if not suggestions:
            suggestions.append({
                'pid': None,
                'name': 'System Healthy',
                'action': 'None',
                'reason': 'No immediate optimization opportunities found.'
            })

        return suggestions
