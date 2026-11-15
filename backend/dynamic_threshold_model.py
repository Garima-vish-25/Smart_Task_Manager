import statistics

class DynamicThresholdModel:
    def __init__(self, history_size=100, sensitivity=1.5):
        self.history_size = history_size
        self.sensitivity = sensitivity

    def update_thresholds(self, history):
        if len(history) < 20: # Not enough data
            return {}

        recent_history = history[-self.history_size:]
        cpu_data = [h['cpu'] for h in recent_history]
        ram_data = [h['ram'] for h in recent_history]

        dynamic_thresholds = {}

        if cpu_data:
            cpu_mean = statistics.mean(cpu_data)
            cpu_stdev = statistics.stdev(cpu_data) if len(cpu_data) > 1 else 0
            dynamic_thresholds['cpu_high'] = min(95, round(cpu_mean + self.sensitivity * cpu_stdev))

        if ram_data:
            ram_mean = statistics.mean(ram_data)
            ram_stdev = statistics.stdev(ram_data) if len(ram_data) > 1 else 0
            dynamic_thresholds['ram_high'] = min(95, round(ram_mean + self.sensitivity * ram_stdev))

        return dynamic_thresholds
