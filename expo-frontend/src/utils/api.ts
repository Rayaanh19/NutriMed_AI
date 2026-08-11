import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getBackendUrl(): string {
  // Check if we are running in web browser
  if (Platform.OS === 'web') {
    // Vite proxies /api to port 5000, but in Expo web, we connect to window.location or port 5000
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:5000`;
  }

  // Native: resolve packager host address (development machine IP)
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000`;
  }

  // Native Fallback (Android emulator uses 10.0.2.2 to access host localhost)
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}
