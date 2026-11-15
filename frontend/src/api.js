import axios from 'axios'

const instance = axios.create({ 
  baseURL: 'http://localhost:8000', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Response Error:', error)
    
    // Handle different error types
    if (error.code === 'ECONNREFUSED') {
      error.userMessage = 'Cannot connect to server. Please ensure the backend is running on port 8000.'
    } else if (error.response?.status === 404) {
      error.userMessage = 'Resource not found.'
    } else if (error.response?.status === 403) {
      error.userMessage = 'Access denied. You may need elevated permissions.'
    } else if (error.response?.status >= 500) {
      error.userMessage = 'Server error. Please try again later.'
    } else if (error.message === 'Network Error') {
      error.userMessage = 'Network error. Please check your connection.'
    } else {
      error.userMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred.'
    }
    
    return Promise.reject(error)
  }
)

export const getAnomalies = () => instance.get('/anomalies');
export const getOptimizationSuggestions = () => instance.get('/optimize-health');

export default instance;
