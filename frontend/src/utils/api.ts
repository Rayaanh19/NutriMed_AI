import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getBackendUrl(): string {
  // Check if we are running in web browser
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const { hostname, origin } = window.location;
      // In local web development, point to backend on port 5000
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:5000`;
      }
      // In production (Vercel / deployed domain), use current origin (same-domain API routing)
      return origin;
    }
    return '';
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
