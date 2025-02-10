import { router } from 'expo-router';
import { useContext, createContext, type PropsWithChildren, useEffect, useState } from 'react';

import { getAuth } from '@react-native-firebase/auth'

const AuthContext = createContext(
  {
    signIn: async () => {},
    signOut: async () => {},
    userId: '',
    isLoading: true,
  }
)

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [userId, setUserId] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const signIn = async () => {
      try {
        setIsLoading(true)
        const result = await getAuth().signInWithPhoneNumber('+16505554948')
        await result.confirm('123321')
      } catch (e) {
        console.log(e)
      }
    }

    const signOut = async () => {
      try {
        await getAuth().signOut()
      } catch (e) {
        console.log(e)
      }
    }

    useEffect(() => {
      const unsubscribe = getAuth().onAuthStateChanged(user => {
        setUserId(user?.uid ?? '')
        setIsLoading(false)
        if (user) {
          router.push('/')
        }
      })
      return unsubscribe
    }, [])
  
    return (
      <AuthContext.Provider
        value={{
          signIn,
          signOut,
          userId,
          isLoading,
        }}>
        {children}
      </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)