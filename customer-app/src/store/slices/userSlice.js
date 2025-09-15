import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userAPI.getProfile();
      return response.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update profile');
    }
  }
);

export const fetchUserAddresses = createAsyncThunk(
  'user/fetchUserAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userAPI.getAddresses();
      return response.addresses;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch addresses');
    }
  }
);

export const addUserAddress = createAsyncThunk(
  'user/addUserAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await userAPI.addAddress(addressData);
      return response.address;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add address');
    }
  }
);

export const updateUserAddress = createAsyncThunk(
  'user/updateUserAddress',
  async ({ addressId, addressData }, { rejectWithValue }) => {
    try {
      const response = await userAPI.updateAddress(addressId, addressData);
      return response.address;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update address');
    }
  }
);

export const deleteUserAddress = createAsyncThunk(
  'user/deleteUserAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      await userAPI.deleteAddress(addressId);
      return addressId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete address');
    }
  }
);

export const savePushToken = createAsyncThunk(
  'user/savePushToken',
  async (tokenData, { rejectWithValue }) => {
    try {
      await userAPI.savePushToken(tokenData);
      return tokenData;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to save push token');
    }
  }
);

const initialState = {
  profile: null,
  addresses: [],
  defaultAddress: null,
  pushToken: null,
  isLoading: false,
  isUpdatingProfile: false,
  isLoadingAddresses: false,
  isManagingAddresses: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setDefaultAddress: (state, action) => {
      const addressId = action.payload;
      state.defaultAddress = state.addresses.find(addr => addr.id === addressId);
      
      // Update is_default flag
      state.addresses = state.addresses.map(addr => ({
        ...addr,
        is_default: addr.id === addressId
      }));
    },
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update User Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isUpdatingProfile = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isUpdatingProfile = false;
        state.error = action.payload;
      })
      
      // Fetch User Addresses
      .addCase(fetchUserAddresses.pending, (state) => {
        state.isLoadingAddresses = true;
        state.error = null;
      })
      .addCase(fetchUserAddresses.fulfilled, (state, action) => {
        state.isLoadingAddresses = false;
        state.addresses = action.payload;
        state.defaultAddress = action.payload.find(addr => addr.is_default);
        state.error = null;
      })
      .addCase(fetchUserAddresses.rejected, (state, action) => {
        state.isLoadingAddresses = false;
        state.error = action.payload;
      })
      
      // Add User Address
      .addCase(addUserAddress.pending, (state) => {
        state.isManagingAddresses = true;
        state.error = null;
      })
      .addCase(addUserAddress.fulfilled, (state, action) => {
        state.isManagingAddresses = false;
        state.addresses.push(action.payload);
        
        if (action.payload.is_default) {
          state.defaultAddress = action.payload;
          // Unset other defaults
          state.addresses = state.addresses.map(addr => ({
            ...addr,
            is_default: addr.id === action.payload.id
          }));
        }
        
        state.error = null;
      })
      .addCase(addUserAddress.rejected, (state, action) => {
        state.isManagingAddresses = false;
        state.error = action.payload;
      })
      
      // Update User Address
      .addCase(updateUserAddress.pending, (state) => {
        state.isManagingAddresses = true;
        state.error = null;
      })
      .addCase(updateUserAddress.fulfilled, (state, action) => {
        state.isManagingAddresses = false;
        const updatedAddress = action.payload;
        const index = state.addresses.findIndex(addr => addr.id === updatedAddress.id);
        
        if (index >= 0) {
          state.addresses[index] = updatedAddress;
          
          if (updatedAddress.is_default) {
            state.defaultAddress = updatedAddress;
            // Unset other defaults
            state.addresses = state.addresses.map(addr => ({
              ...addr,
              is_default: addr.id === updatedAddress.id
            }));
          }
        }
        
        state.error = null;
      })
      .addCase(updateUserAddress.rejected, (state, action) => {
        state.isManagingAddresses = false;
        state.error = action.payload;
      })
      
      // Delete User Address
      .addCase(deleteUserAddress.pending, (state) => {
        state.isManagingAddresses = true;
        state.error = null;
      })
      .addCase(deleteUserAddress.fulfilled, (state, action) => {
        state.isManagingAddresses = false;
        const deletedAddressId = action.payload;
        state.addresses = state.addresses.filter(addr => addr.id !== deletedAddressId);
        
        if (state.defaultAddress && state.defaultAddress.id === deletedAddressId) {
          state.defaultAddress = state.addresses.find(addr => addr.is_default) || null;
        }
        
        state.error = null;
      })
      .addCase(deleteUserAddress.rejected, (state, action) => {
        state.isManagingAddresses = false;
        state.error = action.payload;
      })
      
      // Save Push Token
      .addCase(savePushToken.fulfilled, (state, action) => {
        state.pushToken = action.payload;
      });
  },
});

export const {
  clearError,
  setDefaultAddress,
  updateProfile,
} = userSlice.actions;

export default userSlice.reducer;