import { Text, View } from 'react-native';

import { useAuth } from '../ctx';

export default function Login() {
  const { signIn, isLoading } = useAuth();

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        onPress={() => {
          signIn();
        }}>
        Log In Here
      </Text>
    </View>
  );
}
