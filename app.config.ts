import { ExpoConfig } from 'expo/config';

// Import base config
const config = require('./app.json');

// Get environment variables with type safety
const getEnvVar = (name: string, defaultValue: string): string => 
  ((process.env as Record<string, string | undefined>)[name] ?? defaultValue);

// Modify only the parts that need to be dynamic
config.expo.android.googleServicesFile = getEnvVar('GOOGLE_SERVICES_JSON', './google-services.json');
config.expo.ios.googleServicesFile = getEnvVar('GOOGLE_SERVICES_PLIST', './GoogleService-Info.plist');

export default config.expo as ExpoConfig; 