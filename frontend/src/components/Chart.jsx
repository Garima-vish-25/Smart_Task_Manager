import React from 'react'

const Chart = ({ data, width = 300, height = 150, color = '#3b82f6', title = 'Chart' }) => {
  if (!data || data.length < 2) {
    return (
      <div className="chart-container" style={{ width, height }}>
        <h4>{title}</h4>
        <div className="chart-placeholder">
          <span>Not enough data</span>
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.cpu, d.ram)))
  const minValue = Math.min(...data.map(d => Math.min(d.cpu, d.ram)))
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2 - 30

  // Generate SVG path for the line chart
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth
    const y = padding + 30 + chartHeight - ((d.cpu || d.ram) / maxValue) * chartHeight
    return `${x},${y}`
  }).join(' ')

  // Generate area fill path
  const areaPoints = `${padding},${padding + 30 + chartHeight} ${points} ${padding + chartWidth},${padding + 30 + chartHeight}`

  return (
    <div className="chart-container" style={{ width, height }}>
      <h4>{title}</h4>
      <div className="chart-wrapper">
        <svg width={width} height={height} className="chart-svg">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill={color}
            fillOpacity="0.1"
          />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            className="chart-line"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * chartWidth
            const y = padding + 30 + chartHeight - ((d.cpu || d.ram) / maxValue) * chartHeight
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                className="data-point"
              />
            )
          })}
          
          {/* Y-axis labels */}
          <text x="5" y={padding + 30 + 5} fill="#6b7280" fontSize="10">{minValue.toFixed(0)}%</text>
          <text x="5" y={padding + 30 + 15} fill="#6b7280" fontSize="10">{maxValue.toFixed(0)}%</text>
        </svg>
        
        {/* Chart info */}
        <div className="chart-info">
          <span>Latest: {Math.round(data[data.length - 1]?.cpu || data[data.length - 1]?.ram || 0)}%</span>
          <span>Avg: {Math.round(data.reduce((sum, d) => sum + (d.cpu || d.ram), 0) / data.length)}%</span>
        </div>
      </div>
    </div>
  )
}

export default Chart
