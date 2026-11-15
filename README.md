# Smart Task Manager

A comprehensive real-time system monitoring, process management, machine learning–powered insights, and educational scheduling simulation platform.

---

## 🚀 Features

### 🖥️ System Monitoring
- Real-time CPU, RAM, Disk usage monitoring
- Historical trend charts with time-series visualization
- Dynamic threshold-based alerts (auto-adaptive)
- Desktop notifications & in-app alerts
- Health Score (0–100) for overall system stability
- Predictive monitoring (3s/6s/9s ahead resource prediction)

### ⚙️ Process Management
- Full process listing + detailed process tree
- Thread-level insights
- Suspend, resume, terminate, force kill
- Permission validation
- Priority (nice value) management
- Resource-hog detection
- Search & filtering by PID, name, status

### 📘 Scheduler Simulation
- FCFS  
- Round Robin  
- Priority Scheduling  
- SJF  
- Gantt chart visualization  
- Performance metrics: WT, TAT, Response Time  
- Pre-configured educational examples  

### 🎨 User Experience
- Responsive React interface  
- Dark/light theme support  
- Error boundaries  
- Smooth auto-refresh and real-time UI updates  

---

## 🧠 Machine Learning Implementation

The Smart Task Manager integrates **multiple ML models** that operate entirely on **real-time system data** (no external dataset required). These models enhance monitoring, detect anomalies, and provide predictive intelligence.

---

### 🔢 **1. System Health Score Model**
A formula-based model that calculates an overall system “Health Score” based on:

- CPU Usage %
- RAM Usage %
- Disk I/O %
- Process Count
- Recent anomaly flags  
- Prediction confidence scores  

**Formula Structure**  
Weights derived from empirical analysis: 

    Health Score = 100 - (0.4*CPU + 0.3*RAM + 0.2*Disk + 0.1*Process_Factor)

This avoids circular dependency issues and ensures consistent results.

---

### 🧩 **2. Anomaly Detection Model (Isolation Forest)**
A lightweight anomaly detector built using **scikit-learn’s IsolationForest**.

**Inputs (features):**
- CPU usage %
- Memory usage %
- Disk Read/Write bytes
- Thread count
- Process lifetime
- Nice value

**Output:**  
- `1` → normal  
- `-1` → anomaly detected  

**Use Cases:**  
- Detecting CPU spikes  
- Catching cryptominer-like behavior  
- Flagging unusually high memory leaks  
- Identifying zombie process accumulation  

---

### 📈 **3. Predictive Resource Model (Short-Term Forecasting)**
A real-time forecasting engine predicts:

- CPU usage after 3 seconds  
- CPU usage after 6 seconds  
- CPU usage after 9 seconds  
- Same for RAM usage  

Uses:
- Rolling window smoothing  
- Linear trend estimation  
- Feature normalization  

Useful for:
- **Predicting upcoming overloads**
- **Proactive alerts**

---

### 📊 **4. Dynamic Threshold Model**
This model adjusts alert thresholds automatically based on system behavior.

**Example:**  
If a system normally fluctuates around 70% CPU, the threshold might auto-adjust from 80% to ~85%.

Uses:
- Mean  
- Standard deviation  
- Historical deviation scores  

This helps reduce false alerts.

---

### 🧠 **5. Behavioral Learning Engine ("Teach Me" Mode)**
This component learns user response patterns:

#### Learns:
- Which processes users frequently terminate  
- Which high-CPU processes users ignore  
- Which apps are often suspended/resumed  
- Typical working hours behavior  

#### Predicts:
- Likelihood user will terminate a resource-hog  
- Future probability of system slowdown  
- Personalized recommendations  

This model uses:
- Frequency analysis  
- Confidence scoring  
- Lightweight clustering behavior  

---

### 🤖 **6. Smart Recommendation Engine**
Combines ML model outputs to provide actionable suggestions:

Examples:
- “Chrome.exe is consuming 42% CPU. Users typically terminate it at this point.”  
- “System predicted to reach 87% RAM in 6 seconds — consider closing idle apps.”  
- “Process Notepad.exe often becomes unresponsive — suspend recommended.”  

Each recommendation includes:
- Reason  
- Confidence score (0–1)  
- Action buttons (kill/suspend/ignore)  

---

## 🛠️ Technology Stack

### Backend
- FastAPI  
- psutil  
- scikit-learn  
- numpy, pandas  
- Uvicorn  

### Frontend
- React 18  
- Vite  
- Axios  
- CSS3 with responsive layout  

---

## 📋 Prerequisites
- Python 3.8+  
- Node.js 16+  
- Admin/sudo privileges for system-level process control  

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows: 
.\.venv\Scripts\activate
# macOS/Linux: 
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```