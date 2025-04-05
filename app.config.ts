import { ExpoConfig } from 'expo/config';

// Get environment variables with type safety
const getEnvVar = (name: string, defaultValue: string): string => 
  ((process.env as Record<string, string | undefined>)[name] ?? defaultValue);

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  return {
    ...config,
    ios: {
      ...config.ios,
      googleServicesFile: getEnvVar('GOOGLE_SERVICES_PLIST', './GoogleService-Info.plist'),
    },
    android: {
      ...config.android,
      googleServicesFile: getEnvVar('GOOGLE_SERVICES_JSON', './google-services.json'),
    }
  };
}; 