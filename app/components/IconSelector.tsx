import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GroupIcon } from '../../types';
import { useState } from 'react';
import { uploadGroupProfileImage, ProfileImagePhase } from '../../utils/profileImage';

const MATERIAL_ICONS = [
  'group', 'sports-esports', 'sports-basketball', 'restaurant',
  'movie', 'music-note', 'beach-access', 'hiking'
];

type Props = {
  selectedIcon: GroupIcon;
  onSelect: (icon: GroupIcon) => void;
  groupId: string;
};

export default function IconSelector({ selectedIcon, onSelect, groupId }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [photoPhase, setPhotoPhase] = useState<ProfileImagePhase | null>(null);

  const validateImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Image.getSize(
        url,
        () => resolve(true),
        () => resolve(false)
      );
    });
  };

  const handlePickPhoto = async () => {
    if (!groupId || photoPhase) return;

    setPhotoPhase('picking');
    try {
      const downloadUrl = await uploadGroupProfileImage(groupId, setPhotoPhase);
      if (downloadUrl) {
        onSelect({ type: 'image', value: downloadUrl });
      }
    } catch (error) {
      console.error('Error uploading group profile image:', error);
      Alert.alert('Error', 'Failed to upload group photo');
    } finally {
      setPhotoPhase(null);
    }
  };

  const handleImageSubmit = async () => {
    if (!imageUrl.trim()) return;

    setIsLoadingUrl(true);
    try {
      const isValid = await validateImageUrl(imageUrl.trim());
      if (isValid) {
        onSelect({ type: 'image', value: imageUrl.trim() });
        setImageUrl('');
      } else {
        Alert.alert('Error', 'Invalid image URL. Please try another URL.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load image. Please try another URL.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const busy = photoPhase !== null || isLoadingUrl;

  return (
    <View style={styles.container}>
      {selectedIcon.type === 'image' ? (
        <Image source={{ uri: selectedIcon.value }} style={styles.preview} />
      ) : null}

      <Pressable
        style={[styles.photoButton, busy && styles.disabledButton]}
        onPress={handlePickPhoto}
        disabled={busy}
      >
        {photoPhase ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <MaterialIcons name="photo-camera" size={20} color="#fff" />
        )}
        <Text style={styles.buttonText}>
          {photoPhase === 'uploading'
            ? 'Uploading...'
            : photoPhase === 'picking'
              ? 'Loading...'
              : 'Choose from photos'}
        </Text>
      </Pressable>

      <View style={styles.urlInput}>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="Or paste an image URL"
          placeholderTextColor="#666"
          editable={!busy}
        />
        <Pressable
          style={[
            styles.setImageButton,
            (!imageUrl.trim() || busy) && styles.disabledButton
          ]}
          onPress={handleImageSubmit}
          disabled={!imageUrl.trim() || busy}
        >
          <Text style={styles.buttonText}>
            {isLoadingUrl ? 'Loading...' : 'Set URL'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.orText}>- or choose an icon -</Text>

      <ScrollView horizontal style={styles.iconList}>
        {MATERIAL_ICONS.map((iconName) => (
          <Pressable
            key={iconName}
            style={[
              styles.iconButton,
              selectedIcon.type === 'material' &&
              selectedIcon.value === iconName &&
              styles.selectedIcon
            ]}
            onPress={() => onSelect({ type: 'material', value: iconName })}
            disabled={busy}
          >
            <MaterialIcons
              name={iconName as any}
              size={24}
              color={
                selectedIcon.type === 'material' &&
                selectedIcon.value === iconName
                  ? '#fff'
                  : '#666'
              }
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
  },
  photoButton: {
    backgroundColor: '#5c8ed6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
  },
  urlInput: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  setImageButton: {
    backgroundColor: '#5c8ed6',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 8,
  },
  iconList: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedIcon: {
    backgroundColor: '#5c8ed6',
  },
});
