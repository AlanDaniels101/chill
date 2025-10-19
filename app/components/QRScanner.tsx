import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
    onScan: (userId: string) => void;
    onClose: () => void;
};

export default function QRScanner({ onScan, onClose }: Props) {
    const [permission, setPermission] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
        onScan(data);
    };

    if (permission === null) {
        return <Text>Requesting camera permission...</Text>;
    }
    if (!permission) {
        return <Text>No access to camera</Text>;
    }

    return (
        <View style={styles.container}>
            <CameraView
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />
            <Pressable 
                style={styles.closeButton}
                onPress={onClose}
            >
                <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 300,  // Give the camera view some height
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 