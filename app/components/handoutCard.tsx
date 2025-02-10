import { View, StyleSheet, Text } from "react-native";
import { Hangout } from "../../types";
import { formatDistanceToNow } from "date-fns";

export default function HangoutCard(props: {hangout: Hangout}) {
    const timeDiff = formatDistanceToNow(props.hangout.time * 1000, { addSuffix: true })

    return (
        <View style={styles.hangoutCard}>
            <Text style={styles.hangoutName}>{props.hangout.name}</Text>
            <Text>{timeDiff}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
  hangoutCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#777',
    padding: 10,
  },
  hangoutName: {
    fontSize: 20,
    fontWeight: 'bold',
  }
});