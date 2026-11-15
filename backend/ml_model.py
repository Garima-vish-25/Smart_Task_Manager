import numpy as np

class HealthScoreModel:
    """
    Health Score Model that calculates system health based on CPU, RAM, and disk usage.
    Uses a weighted formula approach - no training data required.
    Health score ranges from 0-100, where 100 is perfect health.
    """
    def __init__(self):
        # Weighted formula approach - no ML training needed
        # These weights can be adjusted based on importance
        self.cpu_weight = 0.4
        self.ram_weight = 0.4
        self.disk_weight = 0.2
        
    def train(self, history):
        """
        Optional: Could use history to adjust weights dynamically.
        Currently uses fixed formula-based approach.
        """
        # For now, we use a formula-based approach that doesn't require training
        # Future enhancement: could use history to learn optimal weights
        pass

    def predict(self, cpu, ram, disk):
        """
        Calculate health score based on CPU, RAM, and disk usage.
        
        Formula:
        - CPU health: 100 - cpu_usage (lower CPU = better)
        - RAM health: 100 - ram_usage (lower RAM = better)
        - Disk health: 100 - disk_usage (lower disk = better)
        - Weighted average of all three
        
        Args:
            cpu: CPU usage percentage (0-100)
            ram: RAM usage percentage (0-100)
            disk: Disk usage percentage (0-100)
            
        Returns:
            Health score (0-100), rounded to 1 decimal place
        """
        # Calculate individual health scores (inverted - lower usage = higher health)
        cpu_health = max(0, 100 - cpu)
        ram_health = max(0, 100 - ram)
        disk_health = max(0, 100 - disk)
        
        # Weighted average
        health_score = (
            cpu_health * self.cpu_weight +
            ram_health * self.ram_weight +
            disk_health * self.disk_weight
        )
        
        # Additional penalty for very high usage in any category
        if cpu > 90 or ram > 90 or disk > 90:
            health_score *= 0.7  # 30% penalty for critical usage
        
        return round(np.clip(health_score, 0, 100), 1)
