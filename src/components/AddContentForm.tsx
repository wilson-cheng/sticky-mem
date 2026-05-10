import React, { useState } from 'react';
import Alert from '../utils/alertWrapper';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '../theme/useColors';

interface Props {
  onSubmit: (input: string) => Promise<void>;
  isProcessing: boolean;
}

export default function AddContentForm({ onSubmit, isProcessing }: Props) {
  const c = useColors();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing || fetchingUrl) return;

    if (mode === 'url') {
      // Fetch URL content and convert to markdown
      setFetchingUrl(true);
      try {
        const { fetchUrlAsMarkdown } = await import('../utils/fetchUrl');
        const markdown = await fetchUrlAsMarkdown(input.trim());
        setInput('');
        await onSubmit(markdown);
      } catch (e: any) {
        console.error('[AddContentForm] URL fetch failed:', e);
        Alert.alert(
          'Failed to Fetch URL',
          e.message || 'An unexpected error occurred while fetching the URL.\n\nPlease check the URL and try again, or paste the content manually.',
        );
      } finally {
        setFetchingUrl(false);
      }
    } else {
      await onSubmit(input.trim());
      setInput('');
    }
  };

  const isBusy = isProcessing || fetchingUrl;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: c.statBoxBg }, mode === 'text' && { backgroundColor: c.accent }]}
          onPress={() => setMode('text')}
        >
          <Text style={[styles.tabText, { color: c.textSecondary }, mode === 'text' && { color: c.textOnPrimary }]}>Paste Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: c.statBoxBg }, mode === 'url' && { backgroundColor: c.accent }]}
          onPress={() => setMode('url')}
        >
          <Text style={[styles.tabText, { color: c.textSecondary }, mode === 'url' && { color: c.textOnPrimary }]}>URL</Text>
        </TouchableOpacity>
      </View>

      {mode === 'text' ? (
        <TextInput
          style={[styles.textArea, { backgroundColor: c.inputBg, borderColor: c.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="Paste the content you want to remember..."
          placeholderTextColor={c.textSecondary}
          multiline
          textAlignVertical="top"
        />
      ) : (
        <TextInput
          style={[styles.urlInput, { backgroundColor: c.inputBg, borderColor: c.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="https://example.com/article"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: c.accent }, (!input.trim() || isBusy) && { backgroundColor: c.border }]}
        onPress={handleSubmit}
        disabled={!input.trim() || isBusy}
      >
        {fetchingUrl ? (
          <ActivityIndicator color={c.textOnPrimary} />
        ) : isProcessing ? (
          <ActivityIndicator color={c.textOnPrimary} />
        ) : (
          <Text style={[styles.submitText, { color: c.textOnPrimary }]}>
            {mode === 'url' ? 'Fetch & Edit Content' : 'Edit Content'}
          </Text>
        )}
      </TouchableOpacity>

      {mode === 'url' && !fetchingUrl && (
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          The URL will be fetched, converted to Markdown, and opened in the editor for review.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: {},
  textArea: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, fontSize: 16,
    minHeight: 200, textAlignVertical: 'top',
  },
  urlInput: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, fontSize: 16,
  },
  submitButton: {
    borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitButtonDisabled: {},
  submitText: { fontSize: 16, fontWeight: '600' },
  hint: {
    fontSize: 12, marginTop: 8,
    textAlign: 'center', lineHeight: 16,
  },
});
