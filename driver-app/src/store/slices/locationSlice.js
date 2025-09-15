import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentLocation: null,
  isTracking: false,
  isLocationPermissionGranted: false,
  locationAccuracy: null,
  speed: null,
  heading: null,
  lastUpdateTime: null,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (state, action) => {
      const { latitude, longitude, accuracy, speed, heading } = action.payload;
      state.currentLocation = { latitude, longitude };
      state.locationAccuracy = accuracy;
      state.speed = speed;
      state.heading = heading;
      state.lastUpdateTime = Date.now();
    },
    
    setLocationPermission: (state, action) => {
      state.isLocationPermissionGranted = action.payload;
    },
    
    setTrackingStatus: (state, action) => {
      state.isTracking = action.payload;
    },
    
    setLocationError: (state, action) => {
      state.error = action.payload;
    },
    
    clearLocationError: (state) => {
      state.error = null;
    },
    
    resetLocation: (state) => {
      state.currentLocation = null;
      state.isTracking = false;
      state.locationAccuracy = null;
      state.speed = null;
      state.heading = null;
      state.lastUpdateTime = null;
      state.error = null;
    },
  },
});

export const {
  setCurrentLocation,
  setLocationPermission,
  setTrackingStatus,
  setLocationError,
  clearLocationError,
  resetLocation,
} = locationSlice.actions;

export default locationSlice.reducer;