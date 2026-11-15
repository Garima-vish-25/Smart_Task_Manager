import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { ToastContainer } from '../components/Toast'

// Theme Context
const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('smart-task-manager-theme')
    return saved || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('smart-task-manager-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Toast Context
const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, { ...action.payload, id: Date.now() + Math.random() }]
    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.payload)
    case 'CLEAR_ALL':
      return []
    default:
      return state
  }
}

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const addToast = (message, type = 'info', duration = 3000) => {
    dispatch({
      type: 'ADD_TOAST',
      payload: { message, type, duration }
    })
  }

  const removeToast = (id) => {
    dispatch({
      type: 'REMOVE_TOAST',
      payload: id
    })
  }

  const clearAllToasts = () => {
    dispatch({ type: 'CLEAR_ALL' })
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// Combined App Context
export const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
