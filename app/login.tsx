import React from 'react';
import { Text, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function Login() {
  const { signIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="ac-unit" size={80} color="#ffffff" style={styles.icon} />
          <Text style={styles.title}>Chill</Text>
          <Text style={styles.subtitle}>Sustain meaningful connections</Text>
          
          <Pressable 
            style={styles.loginButton}
            onPress={signIn}
          >
            <MaterialIcons name="login" size={24} color="#7dacf9" style={styles.buttonIcon} />
            <Text style={styles.loginText}>Log In with Phone</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7dacf9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  icon: {
    marginBottom: 8,
    color: '#ffffff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 48,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
  },
  loginText: {
    color: '#7dacf9',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
    color: '#7dacf9',
  }
});
