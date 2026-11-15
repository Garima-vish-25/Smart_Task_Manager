Smart Task Manager - Backend (Full MVP)
--------------------------------------
Endpoints:
  GET /stats
  POST /thresholds
  GET /processes?limit=100
  POST /process/{pid}/action with body {"action": "kill"|"suspend"|..."}
  POST /process/{pid}/nice with JSON body { "nice": <int> } - changes priority
  POST /simulate with JSON body:
    { "algorithm": "fcfs" | "rr", "quantum": <int?>, "jobs": [{"pid":null,"burst":5,"priority":0,"arrival":0}, ...] }

Notes:
  - Process control actions may require elevated permissions depending on OS and target process.
  - Simulation runs in-memory and returns a timeline for Gantt-like visualization.
