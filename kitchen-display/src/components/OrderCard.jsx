import { format, differenceInMinutes } from 'date-fns'

function OrderCard({ order, onStatusUpdate, getTimerColor }) {
  const elapsed = differenceInMinutes(new Date(), new Date(order.created_at))
  const timerClass = getTimerColor(order.created_at, order.estimated_prep_time)

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed': return 'border-blue-500'
      case 'preparing': return 'border-orange-500'  
      case 'ready': return 'border-green-500'
      default: return 'border-gray-300'
    }
  }

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'placed': return 'preparing'
      case 'preparing': return 'ready'
      default: return null
    }
  }

  const getNextStatusLabel = (currentStatus) => {
    switch (currentStatus) {
      case 'placed': return 'Start Preparing'
      case 'preparing': return 'Mark Ready'
      default: return null
    }
  }

  const getNextStatusButtonClass = (currentStatus) => {
    switch (currentStatus) {
      case 'placed': return 'status-button warning'
      case 'preparing': return 'status-button success'
      default: return 'status-button primary'
    }
  }

  const handleStatusUpdate = () => {
    const nextStatus = getNextStatus(order.status)
    if (nextStatus) {
      onStatusUpdate(order.id, nextStatus)
    }
  }

  return (
    <div className={`order-card ${order.status} ${getStatusColor(order.status)} ${
      order.status === 'placed' ? 'new-order-animation' : ''
    }`}>
      {/* Order Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-lg font-bold text-gray-800">
            #{order.id.slice(-8)}
          </div>
          <div className="text-sm text-gray-600">
            {format(new Date(order.created_at), 'HH:mm')}
          </div>
        </div>
        <div className={`text-right ${timerClass}`}>
          <div className={`text-lg font-bold ${elapsed > (order.estimated_prep_time || 15) + 5 ? 'timer-blinking' : ''}`}>
            {elapsed}m
          </div>
          <div className="text-xs">elapsed</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-3 p-2 bg-gray-50 rounded">
        <div className="text-sm font-medium text-gray-700">
          {order.customer_name}
        </div>
        {order.phone && (
          <div className="text-xs text-gray-500">
            {order.phone}
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="space-y-2 mb-4">
        {order.line_items?.map((item, index) => (
          <div key={index} className="text-sm">
            <div className="flex justify-between">
              <span className="font-medium">
                {item.quantity}x {item.menu_item_name}
              </span>
            </div>
            {item.selected_modifiers && item.selected_modifiers.length > 0 && (
              <div className="text-xs text-gray-600 ml-4">
                + {item.selected_modifiers.map(mod => mod.name).join(', ')}
              </div>
            )}
            {item.special_instructions && (
              <div className="text-xs text-blue-600 ml-4 italic">
                Note: {item.special_instructions}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
          <div className="text-xs font-medium text-yellow-800">
            Special Instructions:
          </div>
          <div className="text-sm text-yellow-700">
            {order.special_instructions}
          </div>
        </div>
      )}

      {/* Preparation Time Warning */}
      {elapsed > (order.estimated_prep_time || 15) && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-4">
          <div className="text-xs font-medium text-red-800">
            ⚠️ Over prep time by {elapsed - (order.estimated_prep_time || 15)} minutes
          </div>
        </div>
      )}

      {/* Status Actions */}
      <div className="space-y-2">
        {order.status === 'placed' && (
          <button
            onClick={handleStatusUpdate}
            className={getNextStatusButtonClass(order.status)}
          >
            {getNextStatusLabel(order.status)}
          </button>
        )}
        
        {order.status === 'preparing' && (
          <button
            onClick={handleStatusUpdate}
            className={getNextStatusButtonClass(order.status)}
          >
            {getNextStatusLabel(order.status)}
          </button>
        )}
        
        {order.status === 'ready' && (
          <div className="bg-green-100 text-green-800 text-center py-2 px-4 rounded font-medium">
            ✅ Ready for Pickup
          </div>
        )}

        {/* Cancel Order Button (for placed orders only) */}
        {order.status === 'placed' && (
          <button
            onClick={() => onStatusUpdate(order.id, 'cancelled', 'Cancelled from kitchen')}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-4 rounded text-sm transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Order Type Badge */}
      <div className="absolute top-2 right-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          order.order_type === 'delivery' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {order.order_type === 'delivery' ? '🚚 Delivery' : '🏃 Pickup'}
        </span>
      </div>
    </div>
  )
}

export default OrderCard