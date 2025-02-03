import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router'

import { useAuth } from '../../ctx';

import db from '@react-native-firebase/database';
import { useEffect } from 'react';

export default function Index() {
  const { signOut } = useAuth();
  

  useEffect(() => {
    const getGroups = async () => {
      const val = (await db().ref('/groups').once('value')).val()
      console.log(val)
    }

    getGroups()
  })

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen!</Text>
      <Link href="/about" style={styles.button}>Go to About</Link>
      <Text onPress={() => signOut()}>Log out</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7dacf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
  },
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
});
