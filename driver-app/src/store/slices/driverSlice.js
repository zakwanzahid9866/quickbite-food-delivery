import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { driverAPI } from '../../services/api';

// Async thunks
export const fetchAvailableOrders = createAsyncThunk(
  'driver/fetchAvailableOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await driverAPI.getAvailableOrders();
      return response.orders;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch available orders');
    }
  }
);

export const acceptOrder = createAsyncThunk(
  'driver/acceptOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await driverAPI.acceptOrder(orderId);
      return response.order;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to accept order');
    }
  }
);

export const fetchCurrentOrder = createAsyncThunk(
  'driver/fetchCurrentOrder',
  async (_, { rejectWithValue }) => {
    try {
      const response = await driverAPI.getCurrentOrder();
      return response.order;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch current order');
    }
  }
);

export const updateDriverStatus = createAsyncThunk(
  'driver/updateDriverStatus',
  async (isOnline, { rejectWithValue }) => {
    try {
      const response = await driverAPI.updateStatus(isOnline);
      return response.is_online;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update status');
    }
  }
);

export const completeDelivery = createAsyncThunk(
  'driver/completeDelivery',
  async ({ orderId, notes, photoUri }, { rejectWithValue }) => {
    try {
      await driverAPI.completeDelivery(orderId, { notes, photo_url: photoUri });
      return orderId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to complete delivery');
    }
  }
);

export const fetchEarnings = createAsyncThunk(
  'driver/fetchEarnings',
  async (period = 'today', { rejectWithValue }) => {
    try {
      const response = await driverAPI.getEarnings(period);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch earnings');
    }
  }
);

const initialState = {
  availableOrders: [],
  currentOrder: null,
  earnings: {
    period_earnings: {
      deliveries: 0,
      total_cents: 0,
      average_per_delivery_cents: 0
    },
    overall_stats: {
      total_deliveries: 0,
      total_earnings_cents: 0,
      rating: 5.0
    }
  },
  isOnline: false,
  isLoading: false,
  isAcceptingOrder: false,
  isUpdatingStatus: false,
  isCompletingDelivery: false,
  isLoadingEarnings: false,
  error: null,
};

const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder.status = status;
      }
    },
    removeAvailableOrder: (state, action) => {
      const orderId = action.payload;
      state.availableOrders = state.availableOrders.filter(order => order.id !== orderId);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available Orders
      .addCase(fetchAvailableOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableOrders = action.payload;
        state.error = null;
      })
      .addCase(fetchAvailableOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Accept Order
      .addCase(acceptOrder.pending, (state) => {
        state.isAcceptingOrder = true;
        state.error = null;
      })
      .addCase(acceptOrder.fulfilled, (state, action) => {
        state.isAcceptingOrder = false;
        state.currentOrder = action.payload;
        
        // Remove accepted order from available orders
        state.availableOrders = state.availableOrders.filter(
          order => order.id !== action.payload.id
        );
        
        state.error = null;
      })
      .addCase(acceptOrder.rejected, (state, action) => {
        state.isAcceptingOrder = false;
        state.error = action.payload;
      })
      
      // Fetch Current Order
      .addCase(fetchCurrentOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchCurrentOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Driver Status
      .addCase(updateDriverStatus.pending, (state) => {
        state.isUpdatingStatus = true;
        state.error = null;
      })
      .addCase(updateDriverStatus.fulfilled, (state, action) => {
        state.isUpdatingStatus = false;
        state.isOnline = action.payload;
        state.error = null;
      })
      .addCase(updateDriverStatus.rejected, (state, action) => {
        state.isUpdatingStatus = false;
        state.error = action.payload;
      })
      
      // Complete Delivery
      .addCase(completeDelivery.pending, (state) => {
        state.isCompletingDelivery = true;
        state.error = null;
      })
      .addCase(completeDelivery.fulfilled, (state, action) => {
        state.isCompletingDelivery = false;
        state.currentOrder = null;
        
        // Update stats optimistically
        state.earnings.period_earnings.deliveries += 1;
        state.earnings.overall_stats.total_deliveries += 1;
        
        state.error = null;
      })
      .addCase(completeDelivery.rejected, (state, action) => {
        state.isCompletingDelivery = false;
        state.error = action.payload;
      })
      
      // Fetch Earnings
      .addCase(fetchEarnings.pending, (state) => {
        state.isLoadingEarnings = true;
        state.error = null;
      })
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.isLoadingEarnings = false;
        state.earnings = action.payload;
        state.error = null;
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.isLoadingEarnings = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setOnlineStatus,
  clearCurrentOrder,
  updateOrderStatus,
  removeAvailableOrder,
} = driverSlice.actions;

export default driverSlice.reducer;