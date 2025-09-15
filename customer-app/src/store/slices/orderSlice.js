import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderAPI } from '../../services/api';

// Async thunks
export const createOrder = createAsyncThunk(
  'order/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await orderAPI.createOrder(orderData);
      return response.order;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create order');
    }
  }
);

export const fetchUserOrders = createAsyncThunk(
  'order/fetchUserOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getUserOrders(params);
      return response.orders;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'order/fetchOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrderDetails(orderId);
      return response.order;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch order details');
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'order/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      await orderAPI.cancelOrder(orderId);
      return orderId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to cancel order');
    }
  }
);

export const fetchOrderTracking = createAsyncThunk(
  'order/fetchOrderTracking',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrderTracking(orderId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tracking info');
    }
  }
);

const initialState = {
  orders: [],
  currentOrder: null,
  orderHistory: [],
  trackingData: null,
  driverLocation: null,
  estimatedDeliveryTime: null,
  isLoading: false,
  isCreatingOrder: false,
  isLoadingTracking: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.trackingData = null;
      state.driverLocation = null;
      state.estimatedDeliveryTime = null;
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status, timestamp } = action.payload;
      
      // Update current order if it matches
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder.status = status;
        state.currentOrder.updated_at = timestamp;
      }
      
      // Update in orders array
      const orderIndex = state.orders.findIndex(order => order.id === orderId);
      if (orderIndex >= 0) {
        state.orders[orderIndex].status = status;
        state.orders[orderIndex].updated_at = timestamp;
      }
      
      // Update in history
      const historyIndex = state.orderHistory.findIndex(order => order.id === orderId);
      if (historyIndex >= 0) {
        state.orderHistory[historyIndex].status = status;
        state.orderHistory[historyIndex].updated_at = timestamp;
      }
    },
    updateDriverLocation: (state, action) => {
      state.driverLocation = action.payload;
    },
    updateEstimatedDeliveryTime: (state, action) => {
      state.estimatedDeliveryTime = action.payload;
    },
    addNewOrder: (state, action) => {
      state.orders.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.isCreatingOrder = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isCreatingOrder = false;
        state.currentOrder = action.payload;
        state.orders.unshift(action.payload);
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isCreatingOrder = false;
        state.error = action.payload;
      })
      
      // Fetch User Orders
      .addCase(fetchUserOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
        state.orderHistory = action.payload;
        state.error = null;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Order Details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Cancel Order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const orderId = action.payload;
        
        // Update status to cancelled
        if (state.currentOrder && state.currentOrder.id === orderId) {
          state.currentOrder.status = 'cancelled';
        }
        
        const orderIndex = state.orders.findIndex(order => order.id === orderId);
        if (orderIndex >= 0) {
          state.orders[orderIndex].status = 'cancelled';
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch Order Tracking
      .addCase(fetchOrderTracking.pending, (state) => {
        state.isLoadingTracking = true;
        state.error = null;
      })
      .addCase(fetchOrderTracking.fulfilled, (state, action) => {
        state.isLoadingTracking = false;
        state.trackingData = action.payload;
        state.driverLocation = action.payload.driver_location;
        state.error = null;
      })
      .addCase(fetchOrderTracking.rejected, (state, action) => {
        state.isLoadingTracking = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentOrder,
  clearCurrentOrder,
  updateOrderStatus,
  updateDriverLocation,
  updateEstimatedDeliveryTime,
  addNewOrder,
} = orderSlice.actions;

export default orderSlice.reducer;