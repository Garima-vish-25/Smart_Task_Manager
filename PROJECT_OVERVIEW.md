# Smart Task Manager - Complete Project Overview

## 📋 Project Summary

**Smart Task Manager** is a comprehensive, real-time system monitoring and process management application with educational scheduling simulation capabilities. It provides a modern web-based interface for monitoring system resources, managing processes, and learning about operating system concepts.

---

## 🏗️ Architecture

### **Technology Stack**

#### Backend
- **FastAPI** - Modern, high-performance Python web framework
- **psutil** - Cross-platform system and process utilities library
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server for production deployment
- **scikit-learn** - Machine learning for health scoring and anomaly detection
- **pandas/numpy** - Data processing and analysis

#### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Fast build tool and development server
- **Axios** - HTTP client with interceptors for API communication
- **CSS3** - Modern styling with flexbox, grid, and custom properties

### **Project Structure**
```
smart_task_manager(OS)/
├── backend/
│   ├── main.py                 # Main FastAPI application
│   ├── ml_model.py             # Health score prediction model
│   ├── dynamic_threshold_model.py  # Adaptive threshold calculation
│   ├── health_optimizer.py     # System optimization suggestions
│   ├── config_store.py         # Configuration persistence
│   ├── alerts.py               # Alert management
│   ├── monitor.py              # System monitoring utilities
│   ├── ml/
│   │   └── anomaly_detector.py # Process anomaly detection
│   ├── config.json            # Persistent configuration
│   └── requirements.txt       # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main application component
    │   ├── api.js             # API client configuration
    │   ├── main.jsx           # Application entry point
    │   ├── styles.css         # Global styles
    │   ├── components/
    │   │   ├── Dashboard.jsx         # System monitoring dashboard
    │   │   ├── HealthDashboard.jsx   # Health metrics and predictions
    │   │   ├── Processes.jsx         # Process list and management
    │   │   ├── ProcessTree.jsx       # Hierarchical process tree
    │   │   ├── Simulator.jsx         # Scheduling algorithm simulator
    │   │   ├── AnomalyDetector.jsx   # Anomaly detection display
    │   │   ├── HealthOptimizer.jsx   # Optimization suggestions
    │   │   ├── Chart.jsx             # Data visualization component
    │   │   ├── Modal.jsx             # Reusable modal component
    │   │   ├── ConfirmModal.jsx      # Confirmation dialogs
    │   │   ├── Toast.jsx             # Toast notifications
    │   │   └── ErrorBoundary.jsx    # Error handling component
    │   └── contexts/
    │       └── AppContext.jsx        # Global state management
    └── package.json            # Node.js dependencies
```

---

## 🎯 Core Features

### 1. **System Monitoring Dashboard**
- **Real-time Metrics**
  - CPU usage percentage with live updates
  - Memory (RAM) usage percentage
  - Disk usage monitoring
  - Network I/O statistics
  - Process count tracking

- **Historical Data Visualization**
  - Mini-charts showing trends over time
  - Last 20 data points displayed
  - Color-coded status indicators

- **Configurable Thresholds**
  - CPU thresholds (high: 75%, optimal: 30%, consistent: 65%)
  - RAM thresholds (high: 85%, healthy: 50%, consistent: 75%)
  - Disk thresholds (critical: 90%, warning: 75%)
  - Process count threshold (250 processes)
  - Prediction thresholds for proactive alerts

- **Alert System**
  - Real-time threshold-based alerts
  - Desktop notifications (browser-based)
  - Visual indicators in the UI
  - Alert history tracking

### 2. **Health Dashboard**
- **Health Score Calculation**
  - ML-based health score (0-100)
  - Considers CPU, RAM, and disk usage
  - Updates in real-time

- **Resource Predictions**
  - 3-step ahead predictions (3, 6, 9 seconds)
  - Trend analysis (CPU and RAM trends)
  - Risk assessment (low/medium/high)
  - Risk reasons and recommendations

- **System Insights**
  - Automated insights based on current state
  - Suggestions for optimization
  - Performance recommendations

- **Dynamic Thresholds**
  - Adaptive thresholds based on system history
  - Statistical analysis of usage patterns
  - Automatic adjustment for system-specific behavior

### 3. **Process Management (List View)**
- **Process Listing**
  - Complete process information (PID, name, status, CPU%, memory%)
  - Real-time updates every 4 seconds
  - Sortable columns (click headers to sort)
  - Search functionality (by name or PID)
  - Status filtering (running, sleeping, stopped, zombie)

- **Process Control Actions**
  - **Kill** - Terminate process gracefully
  - **Suspend** - Pause process execution
  - **Resume** - Resume suspended process
  - **Change Priority** - Adjust process nice value
  - Confirmation dialogs for destructive actions

- **Process Information**
  - Process owner (username)
  - User vs system process identification
  - Real-time CPU and memory usage
  - Process status indicators

### 4. **Process Tree Visualization**
- **Hierarchical Display**
  - Parent-child process relationships
  - Expandable/collapsible tree nodes
  - Visual tree connectors
  - Root process identification

- **Advanced Features**
  - **Thread Information**
    - Thread count per process
    - Detailed thread listing (Thread ID, user time, system time)
    - Expandable thread details section
    - Real-time thread data from psutil

  - **Permission Management**
    - Pre-check process modification permissions
    - Visual indicators for modifiable processes
    - "Your Process" badges for user-owned processes
    - Filter to show only modifiable processes
    - Detailed permission error messages with solutions

  - **Process Details Modal**
    - Complete process information
    - Process type classification (system, browser, development, application)
    - Color-coded process types
    - Owner information
    - Children count
    - Thread count
    - All process control actions

- **Tree Controls**
  - Expand All / Collapse All
  - Refresh data
  - Filter by modifiable processes
  - Auto-refresh every 10 seconds

### 5. **Anomaly Detection**
- **ML-Based Detection**
  - Identifies unusual process behavior
  - CPU and memory anomaly detection
  - Statistical analysis of process patterns
  - Real-time anomaly alerts

### 6. **Health Optimizer**
- **Optimization Suggestions**
  - Process-specific recommendations
  - Resource optimization tips
  - System performance improvements
  - Actionable insights

### 7. **Scheduler Simulation (Educational)**
- **Supported Algorithms**
  - **FCFS (First Come First Served)** - Non-preemptive
  - **Round Robin** - Preemptive with configurable quantum
  - **Priority Scheduling** - Non-preemptive priority-based
  - **SJF (Shortest Job First)** - Non-preemptive shortest job first

- **Simulation Features**
  - Interactive job configuration
  - Burst time, priority, and arrival time inputs
  - Gantt chart visualization
  - Execution timeline with performance metrics
  - CSV export functionality
  - Pre-configured example jobs

---

## 🔌 API Endpoints

### **System Monitoring**
- `GET /stats` - Get real-time system statistics, health score, insights, and alerts
- `GET /thresholds` - Get current threshold values
- `POST /thresholds` - Update threshold values
- `GET /dynamic-thresholds` - Get dynamically calculated thresholds
- `GET /predictions` - Get resource usage predictions
- `GET /optimize-health` - Get optimization suggestions

### **Process Management**
- `GET /processes?limit=N` - List processes (default limit: 100)
- `GET /process-tree` - Get hierarchical process tree with relationships
- `GET /process/{pid}/can-modify` - Check if process can be modified
- `GET /process/{pid}/threads` - Get detailed thread information
- `POST /process/{pid}/action` - Control process (kill, suspend, resume)
- `POST /process/{pid}/nice` - Change process priority (nice value)

### **Anomaly Detection**
- `GET /anomalies` - Get detected process anomalies

### **Scheduling Simulation**
- `POST /simulate` - Run scheduling algorithm simulation

---

## 🎨 User Interface Features

### **Navigation**
- Multi-page navigation (Dashboard, Health, Processes, Tree, Scheduler Sim)
- Theme toggle (Dark/Light mode)
- Active page indicators
- Responsive design

### **Components**
- **Modals** - Reusable modal dialogs
- **Confirm Modals** - Action confirmation dialogs
- **Toast Notifications** - Non-intrusive notifications
- **Error Boundaries** - Graceful error handling
- **Loading States** - User feedback during operations
- **Charts** - Data visualization components

### **User Experience**
- Real-time updates without page refresh
- Smooth transitions and animations
- Intuitive controls and interactions
- Comprehensive error messages
- Helpful tooltips and guidance

---

## 🔐 Security & Permissions

### **Permission Handling**
- **User Process Identification**
  - Automatically identifies processes owned by current user
  - Visual indicators for user-owned processes
  - Permission pre-checks before actions

- **Administrator Requirements**
  - System process modification requires Administrator privileges
  - Clear error messages with step-by-step instructions
  - Guidance on running backend as Administrator

- **Access Control**
  - Process ownership checking
  - Permission validation before actions
  - Graceful handling of access denied errors

### **Security Considerations**
- All data is real-time (no fake/mock data)
- Process control actions require appropriate privileges
- Confirmation dialogs for destructive actions
- Error handling prevents system crashes

---

## 📊 Data Flow

### **Real-time Monitoring**
1. Frontend requests data from backend every 3-10 seconds
2. Backend queries system using psutil
3. Data is processed and analyzed
4. ML models calculate health scores and predictions
5. Results are returned to frontend
6. UI updates with new data

### **Process Management**
1. User selects process action
2. Frontend checks permissions (if applicable)
3. Confirmation dialog (for destructive actions)
4. API request sent to backend
5. Backend validates permissions
6. Action executed via psutil
7. Success/error response returned
8. UI updated with result

---

## 🧠 Machine Learning Features

### **Health Score Model**
- Trained on historical system data
- Predicts system health (0-100 score)
- Considers CPU, RAM, and disk usage
- Updates dynamically as data accumulates

### **Anomaly Detector**
- Identifies unusual process behavior
- Statistical analysis of process patterns
- Real-time anomaly detection
- Process-specific anomaly flags

### **Dynamic Threshold Model**
- Adapts thresholds based on system history
- Statistical analysis (mean + standard deviation)
- System-specific threshold adjustment
- Prevents false positives for normal usage patterns

---

## 📈 Threshold Configuration

### **Current Threshold Values**

#### CPU Thresholds
- `cpu_high`: 75% - Alert when CPU exceeds this
- `cpu_optimal`: 30% - Considered optimal below this
- `cpu_consistent_high`: 65% - Alert for sustained high usage

#### RAM Thresholds
- `ram_high`: 85% - Alert when RAM exceeds this
- `ram_healthy`: 50% - Considered healthy below this
- `ram_consistent_high`: 75% - Alert for sustained high usage

#### Disk Thresholds
- `disk_critical`: 90% - Critical alert level
- `disk_warning`: 75% - Warning level

#### Process Thresholds
- `proc_high`: 250 - Alert when process count exceeds this

#### Prediction Thresholds
- `pred_cpu_high`: 85% - Critical prediction alert
- `pred_cpu_medium`: 75% - Medium prediction warning
- `pred_ram_high`: 90% - Critical RAM prediction
- `pred_ram_medium`: 80% - Medium RAM prediction

---

## 🚀 Performance Characteristics

### **Update Intervals**
- Dashboard: 3 seconds
- Process List: 4 seconds
- Process Tree: 10 seconds
- Health Dashboard: 5 seconds

### **Data Retention**
- History: Last 100 data points (~5 minutes at 3-second intervals)
- Process data: Real-time queries (no caching)
- Thread data: Loaded on-demand

### **Optimization**
- Lazy loading for thread details
- Efficient data structures
- Minimal API calls
- Smart permission checking

---

## 🎓 Educational Value

### **Operating System Concepts**
- Process management and control
- Process scheduling algorithms
- Memory management
- System resource monitoring
- Thread management
- Process hierarchies

### **System Programming**
- Cross-platform system APIs (psutil)
- Process control operations
- System resource monitoring
- Permission handling

### **Web Development**
- RESTful API design
- Real-time data updates
- Modern React patterns
- State management
- Error handling

### **Machine Learning**
- Health score prediction
- Anomaly detection
- Adaptive thresholds
- Statistical analysis

---

## 🔧 Configuration & Customization

### **Persistent Configuration**
- Threshold values saved to `config.json`
- Dynamic thresholds calculated and stored
- User preferences persisted

### **Customization Options**
- Adjustable threshold values
- Theme selection (dark/light)
- Notification preferences
- Update interval settings

---

## 📝 Recent Enhancements

### **Thread Information**
- Added thread count to process tree
- Detailed thread information (ID, user time, system time)
- Expandable thread details section

### **Permission Management**
- Pre-check permissions before actions
- Visual indicators for modifiable processes
- Filter for modifiable processes only
- Comprehensive permission error messages

### **Process Ownership**
- User process identification
- Owner information display
- Permission-based filtering

### **Threshold Optimization**
- Improved default threshold values
- More realistic baselines
- Better proactive alerting

---

## 🎯 Use Cases

1. **System Administrators**
   - Monitor system resources
   - Manage processes
   - Identify resource bottlenecks
   - Optimize system performance

2. **Developers**
   - Debug process issues
   - Monitor application performance
   - Understand system behavior
   - Learn OS concepts

3. **Students**
   - Learn process scheduling
   - Understand system monitoring
   - Practice OS concepts
   - Visualize algorithms

4. **Power Users**
   - System optimization
   - Process management
   - Resource monitoring
   - Performance tuning

---

## 🔮 Future Enhancements (Potential)

- Network monitoring and analysis
- Disk I/O monitoring
- Process dependency graphs
- Resource usage forecasting
- Automated optimization actions
- Process grouping and tagging
- Export/import configurations
- Multi-system monitoring
- Alert rules and automation
- Performance benchmarking

---

## 📚 Technical Details

### **Backend Architecture**
- RESTful API design
- Stateless requests
- Error handling with HTTP status codes
- CORS enabled for frontend access
- Automatic API documentation (FastAPI docs)

### **Frontend Architecture**
- Component-based React architecture
- Context API for global state
- Custom hooks for data fetching
- Error boundaries for resilience
- Responsive CSS design

### **Data Validation**
- Pydantic models for request validation
- Type checking and validation
- Error messages for invalid inputs

---

## 🎉 Project Highlights

✅ **Real-time System Monitoring** - Live data from your system  
✅ **Comprehensive Process Management** - Full control over processes  
✅ **Hierarchical Process Tree** - Visual process relationships  
✅ **Thread Information** - Detailed thread data  
✅ **ML-Powered Health Scoring** - Intelligent system analysis  
✅ **Anomaly Detection** - Identify unusual behavior  
✅ **Resource Predictions** - Proactive monitoring  
✅ **Educational Simulations** - Learn scheduling algorithms  
✅ **Permission Management** - Smart access control  
✅ **Modern UI/UX** - Beautiful, responsive interface  
✅ **Cross-platform** - Works on Windows, Linux, macOS  
✅ **Production Ready** - Error handling, validation, security  

---

## 📞 Getting Started

See the main `README.md` for detailed setup instructions.

**Quick Start:**
1. Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
2. Frontend: `cd frontend && npm install && npm run dev`
3. Access: http://localhost:5173

---

**Project Status**: ✅ **Production Ready**  
**Last Updated**: Current  
**Version**: Enhanced MVP with ML Features

