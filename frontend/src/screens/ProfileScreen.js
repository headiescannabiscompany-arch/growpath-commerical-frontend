import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

export default function ProfileScreen() {
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text>Profile (paste full screen code here)</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
