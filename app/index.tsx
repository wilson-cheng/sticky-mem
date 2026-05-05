import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    // TODO: Load from DB in Task 9
    setDueCount(3);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa', padding: 16 }}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#1a1a2e' }}>
          StickyMem
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 4 }}>
          Make knowledge stick
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/review')}
        style={{
          backgroundColor: dueCount > 0 ? '#4a6cf7' : '#e0e0e0',
          padding: 24,
          borderRadius: 16,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 48, fontWeight: '700', color: '#fff' }}>
          {dueCount}
        </Text>
        <Text style={{ fontSize: 16, color: '#fff', marginTop: 4 }}>
          cards due for review
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          onPress={() => router.push('/add')}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#e8e8e8',
          }}
        >
          <Text style={{ fontSize: 24, marginBottom: 4 }}>+</Text>
          <Text style={{ color: '#333' }}>Add Content</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/progress')}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#e8e8e8',
          }}
        >
          <Text style={{ fontSize: 24, marginBottom: 4 }}>📊</Text>
          <Text style={{ color: '#333' }}>Progress</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/settings')}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: 8,
        }}
      >
        <Text style={{ fontSize: 20 }}>⚙️</Text>
      </Pressable>
    </View>
  );
}
