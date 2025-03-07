import React, { useEffect, useState } from 'react';
import { View, Switch, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../ctx';

interface Props {
  groupId: string;
}

export default function NotificationToggle({ groupId }: Props) {
  const { notificationsEnabled, toggleNotifications, checkNotificationStatus } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check initial notification status for this group
    checkNotificationStatus(groupId).then(status => setIsEnabled(status));
  }, [groupId]);

  const onToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue); // Optimistically update UI

    try {
      const success = await toggleNotifications(groupId, newValue);
      if (!success) {
        setIsEnabled(!newValue); // Revert on failure
        Alert.alert('Error', 'Failed to update notification settings');
      }
    } catch (error) {
      setIsEnabled(!newValue); // Revert on error
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  if (!notificationsEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.disabledText}>
          Enable notifications in your device settings to receive updates
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Notifications</Text>
      <Switch
        trackColor={{ false: "#767577", true: "#5c8ed6" }}
        thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
        onValueChange={onToggle}
        value={isEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    color: '#2c3e50',
  },
  disabledText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
}); 