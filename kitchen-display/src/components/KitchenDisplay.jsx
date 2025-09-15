import { useState, useEffect, useRef } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import io from 'socket.io-client'
import OrderCard from './OrderCard'
import OrderStats from './OrderStats'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// Auto-login for demo purposes
const DEMO_KITCHEN_USER = {
  id: 'kitchen-001',
  name: 'Kitchen Staff',
  role: 'kitchen',
  token: 'demo-kitchen-token'
}

function KitchenDisplay({ authToken: propAuthToken, onLogout }) {
  // Use demo token if none provided
  const authToken = propAuthToken || DEMO_KITCHEN_USER.token
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    placed: 0,
    preparing: 0,
    ready: 0
  })
  
  const socketRef = useRef(null)
  const audioRef = useRef(null)

  // Initialize audio for new order alerts
  useEffect(() => {
    audioRef.current = new Audio('/sounds/new-order-bell.mp3')
    audioRef.current.volume = 0.7
  }, [])

  // Socket.IO connection and event handling
  useEffect(() => {
    if (!authToken) return

    // Initialize socket connection
    socketRef.current = io(BACKEND_URL, {
      auth: { 
        token: authToken,
        role: 'kitchen'
      },
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Kitchen Display connected to backend')
      setIsConnected(true)
      setConnectionError(null)
      
      // Request current active orders
      socket.emit('get_active_orders')
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Kitchen Display disconnected:', reason)
      setIsConnected(false)
      setConnectionError(`Disconnected: ${reason}`)
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setIsConnected(false)
      setConnectionError(error.message)
    })

    socket.on('connected', (data) => {
      console.log('Kitchen Display authenticated:', data)
    })

    // Order events
    socket.on('new_order', (order) => {
      console.log('🆕 New order received:', order)
      setOrders(prev => {
        const newOrders = [order, ...prev]
        playNewOrderSound()
        showNewOrderNotification(order)
        return newOrders
      })
    })

    socket.on('order_update', (updatedOrder) => {
      console.log('📝 Order updated:', updatedOrder)
      setOrders(prev => 
        prev.map(order => 
          order.id === updatedOrder.id 
            ? { ...order, ...updatedOrder } 
            : order
        )
      )
    })

    socket.on('order_cancelled', (data) => {
      console.log('❌ Order cancelled:', data)
      setOrders(prev => prev.filter(order => order.id !== data.orderId))
    })

    socket.on('active_orders', (data) => {
      console.log('📋 Active orders loaded:', data.orders.length)
      setOrders(data.orders || [])
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      setConnectionError(error.message)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [authToken])

  // Update stats when orders change
  useEffect(() => {
    const newStats = {
      total: orders.length,
      placed: orders.filter(o => o.status === 'placed').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length
    }
    setStats(newStats)
  }, [orders])

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('get_active_orders')
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const playNewOrderSound = () => {
    try {
      audioRef.current?.play()
    } catch (error) {
      console.warn('Could not play audio:', error)
    }
  }

  const showNewOrderNotification = (order) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Order Received!', {
        body: `Order #${order.id.slice(-8)} from ${order.customer_name}`,
        icon: '/kitchen-icon.png',
        tag: 'new-order'
      })
    }
  }

  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      if (!socketRef.current?.connected) {
        throw new Error('Not connected to server')
      }

      // Emit status update via Socket.IO
      socketRef.current.emit('update_order_status', {
        orderId,
        status: newStatus,
        notes
      })

      // Optimistically update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      )

    } catch (error) {
      console.error('Failed to update order status:', error)
      alert('Failed to update order status. Please try again.')
    }
  }

  const getTimerColor = (createdAt, prepTime = 15) => {
    const elapsed = differenceInMinutes(new Date(), new Date(createdAt))
    const expected = prepTime

    if (elapsed > expected + 10) return 'timer-danger'
    if (elapsed > expected) return 'timer-warning'
    return 'timer-normal'
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.status === filter
  })

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // Request notification permission on component mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="kitchen-header text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold">Kitchen Display System</h1>
              <p className="text-blue-100">
                {isConnected ? (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Connected - Real-time updates active
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></span>
                    {connectionError || 'Disconnected'}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-blue-100">Current Time</div>
                <div className="text-xl font-mono">
                  {format(new Date(), 'HH:mm:ss')}
                </div>
              </div>
              
              <button
                onClick={onLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <OrderStats stats={stats} />

      {/* Filter Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Orders', count: stats.total },
              { key: 'placed', label: 'New', count: stats.placed },
              { key: 'preparing', label: 'Preparing', count: stats.preparing },
              { key: 'ready', label: 'Ready', count: stats.ready }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  filter === key 
                    ? 'bg-white text-blue-500' 
                    : 'bg-gray-400 text-white'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={updateOrderStatus}
                getTimerColor={getTimerColor}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">
              {filter === 'all' 
                ? 'No orders at the moment' 
                : `No ${filter} orders`
              }
            </div>
            <div className="text-gray-400 text-sm mt-2">
              New orders will appear here automatically
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KitchenDisplay