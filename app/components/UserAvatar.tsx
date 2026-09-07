import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  uri?: string;
  size?: number;
  fallbackIcon?: IconName;
  fallbackColor?: string;
  // Overlays a small circular icon, used to keep the admin cue on rows that
  // would otherwise only show a photo.
  badgeIcon?: IconName;
  badgeColor?: string;
}

export default function UserAvatar({
  uri,
  size = 28,
  fallbackIcon = 'person',
  fallbackColor = '#666',
  badgeIcon,
  badgeColor = '#5c8ed6',
}: Props) {
  const badgeSize = Math.round(size * 0.5);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <MaterialIcons name={fallbackIcon} size={size} color={fallbackColor} />
      )}

      {badgeIcon ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badgeColor,
            },
          ]}
        >
          <MaterialIcons name={badgeIcon} size={Math.round(badgeSize * 0.7)} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
});
