import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoadingScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <MaterialIcons name="groups" size={60} color="#7dacf9" style={styles.icon} />
                <ActivityIndicator size="large" color="#7dacf9" style={styles.spinner} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        transform: [{ translateY: -50 }], // Move up slightly for better visual balance
    },
    icon: {
        marginBottom: 20,
        opacity: 0.9,
    },
    spinner: {
        transform: [{ scale: 1.2 }], // Make the spinner slightly larger
    }
}); 