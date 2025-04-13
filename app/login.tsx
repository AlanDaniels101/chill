import React, { useState, useRef } from 'react';
import { Text, View, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import PhoneInput from 'react-native-phone-number-input';

const PhoneInputWrapper = React.forwardRef((props: any, ref) => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes('defaultProps')) {
      return;
    }
    originalConsoleError(...args);
  };

  return <PhoneInput {...props} ref={ref} />;
});

export default function Login() {
  const { verifyPhoneNumber, confirmVerificationCode, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const phoneInput = useRef<PhoneInput>(null);

  const handlePhoneSubmit = async () => {
    if (phoneNumber) {
      const result = await verifyPhoneNumber(formattedPhoneNumber);
      if (result) {
        setConfirmationResult(result);
        setStep('code');
      }
    }
  };

  const handleCodeSubmit = async () => {
    if (confirmationResult && verificationCode) {
      await confirmVerificationCode(confirmationResult, verificationCode);
    }
  };

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
          
          {step === 'phone' ? (
            <>
              <View style={styles.phoneInputContainer}>
                <PhoneInputWrapper
                  ref={phoneInput}
                  defaultValue={phoneNumber}
                  defaultCode="CA"
                  onChangeText={(text: string) => {
                    setPhoneNumber(text);
                  }}
                  onChangeFormattedText={(text: string) => {
                    setFormattedPhoneNumber(text);
                  }}
                  withDarkTheme
                  withShadow
                  containerStyle={styles.phoneInput}
                  textContainerStyle={styles.phoneInputTextContainer}
                  textInputStyle={styles.phoneInputText}
                  codeTextStyle={styles.phoneInputCodeText}
                />
              </View>
              
              <Pressable 
                style={[styles.button, !phoneNumber && styles.disabledButton]}
                onPress={handlePhoneSubmit}
                disabled={!phoneNumber}
              >
                <MaterialIcons name="login" size={24} color="#7dacf9" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Continue with Phone</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                placeholderTextColor="#ffffff80"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              
              <Pressable 
                style={[styles.button, !verificationCode && styles.disabledButton]}
                onPress={handleCodeSubmit}
                disabled={!verificationCode}
              >
                <MaterialIcons name="check" size={24} color="#7dacf9" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Verify Code</Text>
              </Pressable>
            </>
          )}
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
    marginBottom: 24,
  },
  phoneInputContainer: {
    width: '80%',
    maxWidth: 300,
    marginBottom: 24,
  },
  phoneInput: {
    backgroundColor: '#ffffff20',
    borderRadius: 12,
    width: '100%',
  },
  phoneInputTextContainer: {
    backgroundColor: 'transparent',
  },
  phoneInputText: {
    color: '#ffffff',
    fontSize: 16,
  },
  phoneInputCodeText: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff20',
    width: '80%',
    maxWidth: 300,
    padding: 16,
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
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
