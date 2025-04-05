import React from 'react';
import { Text, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

export default function SignUp() {
  const { signUp, isLoading } = useAuth();

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
          <MaterialIcons name="person-add" size={80} color="#ffffff" style={styles.icon} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Chill to connect with friends</Text>
          
          <Pressable 
            style={styles.signupButton}
            onPress={signUp}
          >
            <MaterialIcons name="person-add" size={24} color="#7dacf9" style={styles.buttonIcon} />
            <Text style={styles.signupText}>Sign Up with Phone</Text>
          </Pressable>

          <Pressable 
            style={styles.loginLink}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
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
  signupButton: {
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
  signupText: {
    color: '#7dacf9',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
    color: '#7dacf9',
  },
  loginLink: {
    marginTop: 16,
  },
  loginLinkText: {
    color: '#ffffff',
    fontSize: 16,
    textDecorationLine: 'underline',
  }
}); 