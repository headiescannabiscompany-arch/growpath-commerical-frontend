import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

export default function LoginScreen() {
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={styles.title}>Login Screen (paste your full code here)</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18 }
});
