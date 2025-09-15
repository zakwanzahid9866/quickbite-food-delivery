import React from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StripeProvider } from '@stripe/stripe-react-native';

import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { SocketProvider } from './src/context/SocketContext';
import { toastConfig } from './src/config/toastConfig';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function App() {
  return (
    <Provider store={store}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AuthProvider>
          <LocationProvider>
            <SocketProvider>
              <NavigationContainer>
                <StatusBar style="auto" />
                <AppNavigator />
                <Toast config={toastConfig} />
              </NavigationContainer>
            </SocketProvider>
          </LocationProvider>
        </AuthProvider>
      </StripeProvider>
    </Provider>
  );
}