import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GroupIcon } from '../../types';
import { useState } from 'react';

const MATERIAL_ICONS = [
  'group', 'sports-esports', 'sports-basketball', 'restaurant', 
  'movie', 'music-note', 'beach-access', 'hiking'
];

type Props = {
  selectedIcon: GroupIcon;
  onSelect: (icon: GroupIcon) => void;
};

export default function IconSelector({ selectedIcon, onSelect }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Image.getSize(
        url,
        () => resolve(true),
        () => resolve(false)
      );
    });
  };

  const handleImageSubmit = async () => {
    if (!imageUrl.trim()) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.urlInput}>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="Enter image URL"
          placeholderTextColor="#666"
        />
        <Pressable 
          style={[
            styles.setImageButton,
            (!imageUrl.trim() || isLoading) && styles.disabledButton
          ]}
          onPress={handleImageSubmit}
          disabled={!imageUrl.trim() || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Set Image'}
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