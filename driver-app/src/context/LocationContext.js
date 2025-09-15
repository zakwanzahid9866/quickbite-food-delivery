import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';

import { 
  setCurrentLocation, 
  setLocationPermission, 
  setTrackingStatus,
  setLocationError 
} from '../store/slices/locationSlice';
import { useSocket } from './SocketContext';

const LOCATION_TASK_NAME = 'LOCATION_TRACKING';
const LOCATION_UPDATE_INTERVAL = parseInt(process.env.EXPO_PUBLIC_LOCATION_UPDATE_INTERVAL) || 5000;

const LocationContext = createContext({});

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      // Store location for when app comes to foreground
      console.log('Background location update:', location.coords);
    }
  }
});

export function LocationProvider({ children }) {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentOrder } = useSelector(state => state.driver);
  const { isOnline } = useSelector(state => state.driver);
  const [locationSubscription, setLocationSubscription] = useState(null);

  useEffect(() => {
    requestLocationPermissions();
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    // Start tracking when driver goes online and has an active order
    if (isOnline && currentOrder) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnline, currentOrder]);

  const requestLocationPermissions = async () => {
    try {
      // Request foreground location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use driver features.',
          [{ text: 'OK' }]
        );
        dispatch(setLocationPermission(false));
        return;
      }

      // Request background location permission for delivery tracking
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus.status !== 'granted') {
        Alert.alert(
          'Background Location',
          'Background location is needed for delivery tracking. You can enable it in settings.',
          [{ text: 'OK' }]
        );
      }

      dispatch(setLocationPermission(true));
      
      // Get initial location
      getCurrentLocation();
      
    } catch (error) {
      console.error('Location permission error:', error);
      dispatch(setLocationError(error.message));
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
      };
      
      dispatch(setCurrentLocation(locationData));
      
      // Send to server if driver is online
      if (isOnline && socket) {
        socket.emit('driver_location_update', {
          orderId: currentOrder?.id,
          ...locationData
        });
      }
      
    } catch (error) {
      console.error('Get current location error:', error);
      dispatch(setLocationError(error.message));
    }
  };

  const startLocationTracking = async () => {
    try {
      // Check if already tracking
      if (locationSubscription) {
        return;
      }

      // Stop any existing background tasks
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isTaskRegistered) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      }

      // Start foreground location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
          };
          
          dispatch(setCurrentLocation(locationData));
          
          // Send to server
          if (socket && currentOrder) {
            socket.emit('driver_location_update', {
              orderId: currentOrder.id,
              ...locationData
            });
          }
        }
      );

      setLocationSubscription(subscription);
      dispatch(setTrackingStatus(true));

      // Also start background location tracking
      if (currentOrder) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL * 2, // Less frequent in background
          distanceInterval: 20, // Less sensitive in background
          foregroundService: {
            notificationTitle: 'Delivery in Progress',
            notificationBody: 'Your location is being tracked for delivery.',
          },
        });
      }

      console.log('Location tracking started');
      
    } catch (error) {
      console.error('Start location tracking error:', error);
      dispatch(setLocationError(error.message));
    }
  };

  const stopLocationTracking = async () => {
    try {
      // Stop foreground tracking
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }

      // Stop background tracking
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      dispatch(setTrackingStatus(false));
      console.log('Location tracking stopped');
      
    } catch (error) {
      console.error('Stop location tracking error:', error);
    }
  };

  const value = {
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermissions,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}