import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  onSubmit: (input: string) => Promise<void>;
  isProcessing: boolean;
}

export default function AddContentForm({ onSubmit, isProcessing }: Props) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'url'>('text');

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    await onSubmit(input.trim());
    setInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'text' && styles.tabActive]}
          onPress={() => setMode('text')}
        >
          <Text style={[styles.tabText, mode === 'text' && styles.tabTextActive]}>Paste Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'url' && styles.tabActive]}
          onPress={() => setMode('url')}
        >
          <Text style={[styles.tabText, mode === 'url' && styles.tabTextActive]}>URL</Text>
        </TouchableOpacity>
      </View>

      {mode === 'text' ? (
        <TextInput
          style={styles.textArea}
          value={input}
          onChangeText={setInput}
          placeholder="Paste the content you want to remember..."
          multiline
          textAlignVertical="top"
        />
      ) : (
        <TextInput
          style={styles.urlInput}
          value={input}
          onChangeText={setInput}
          placeholder="https://example.com/article"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!input.trim() || isProcessing) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!input.trim() || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Digest & Generate Questions</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#4A90D9' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff' },
  textArea: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
    minHeight: 200, textAlignVertical: 'top',
  },
  urlInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
  },
  submitButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitButtonDisabled: { backgroundColor: '#CCC' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
