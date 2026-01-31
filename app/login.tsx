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
  const {
    verifyPhoneNumber,
    confirmVerificationCode,
    isLoading,
    appCheckStatus,
    appCheckError,
  } = useAuth();
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
      try {
        await confirmVerificationCode(confirmationResult, verificationCode);
      } catch (e) {
        console.error(e);
      }
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
          <Text style={styles.subtitle}>Sustain meaningful connections!</Text>

          {step === 'phone' ? (
            <>
              <View style={styles.phoneInputContainer}>
                <PhoneInputWrapper
                  key={`phone-input-${step}`}
                  ref={phoneInput}
                  value={phoneNumber}
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
              <View style={styles.backButtonContainer}>
                <Pressable 
                  style={styles.backButton}
                  onPress={() => {
                    setStep('phone');
                    setConfirmationResult(null);
                    setVerificationCode('');
                    setPhoneNumber('');
                    setFormattedPhoneNumber('');
                  }}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </View>
              
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

        <View style={styles.footerStatus}>
          <View style={[
            styles.appCheckBadge,
            appCheckStatus === 'success'
              ? styles.appCheckBadgeSuccess
              : styles.appCheckBadgeError,
          ]}>
            <MaterialIcons
              name={appCheckStatus === 'success' ? 'verified-user' : 'error-outline'}
              size={18}
              color="#ffffff"
              style={styles.appCheckIcon}
            />
            <Text style={styles.appCheckText}>
              App protection: {appCheckStatus === 'success' ? 'active' : 'failed'}
            </Text>
          </View>

          {appCheckError && appCheckStatus !== 'success' ? (
            <View style={styles.appCheckErrorContainer}>
              <Text style={styles.appCheckErrorLabel}>Reason:</Text>
              <Text style={styles.appCheckErrorText} numberOfLines={2}>
                {appCheckError}
              </Text>
            </View>
          ) : null}
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
  appCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 24,
    backgroundColor: '#ffffff30',
  },
  appCheckBadgeSuccess: {
    backgroundColor: '#27ae6040',
  },
  appCheckBadgeError: {
    backgroundColor: '#e74c3c40',
  },
  appCheckBadgeEmpty: {
    backgroundColor: '#f39c1240',
  },
  appCheckBadgePending: {
    backgroundColor: '#f1c40f40',
  },
  appCheckIcon: {
    marginRight: 6,
  },
  appCheckText: {
    color: '#ffffff',
    fontSize: 13,
  },
  appCheckErrorContainer: {
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  appCheckErrorLabel: {
    color: '#ffffffcc',
    fontSize: 11,
    marginBottom: 2,
  },
  appCheckErrorText: {
    color: '#ffffffaa',
    fontSize: 11,
  },
  authErrorContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  authErrorText: {
    color: '#ffdddd',
    fontSize: 13,
  },
  footerStatus: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  phoneInputContainer: {
    width: '90%',
    maxWidth: 400,
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
    width: '90%',
    maxWidth: 400,
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
    width: '90%',
    maxWidth: 400,
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
  },
  backButtonContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButton: {
    backgroundColor: '#ffffff20',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
