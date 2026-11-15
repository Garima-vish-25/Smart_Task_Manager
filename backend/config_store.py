import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

DEFAULT_CONFIG = {
    "thresholds": {},
    "dynamic_thresholds": {}
}

def load_config():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return { **DEFAULT_CONFIG, **data }
    except Exception:
        pass
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    try:
        data = load_config()
        data.update(config)
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception:
        return False
