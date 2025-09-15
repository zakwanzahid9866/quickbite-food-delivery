import { useState, useEffect } from 'react'
import KitchenDisplay from './components/KitchenDisplay'
import ConnectionStatus from './components/ConnectionStatus'
import LoginForm from './components/LoginForm'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState(null)

  useEffect(() => {
    // Check for saved auth token
    const savedToken = localStorage.getItem('kitchen_token')
    if (savedToken) {
      setAuthToken(savedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (token) => {
    localStorage.setItem('kitchen_token', token)
    setAuthToken(token)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('kitchen_token')
    setAuthToken(null)
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ConnectionStatus />
      <KitchenDisplay authToken={authToken} onLogout={handleLogout} />
    </div>
  )
}

export default App