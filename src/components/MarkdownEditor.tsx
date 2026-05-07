/**
 * Native fallback for Markdown editor.
 * On mobile, shows a simple TextInput with the raw Markdown source.
 * The full WYSIWYG (TipTap) is only available on web.
 */

import React from 'react';
import { View, TextInput, StyleSheet, Text, Platform } from 'react-native';

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Edit your content...',
  minHeight = 300,
  editable = true,
}: Props) {
  return (
    <View style={[styles.container, { minHeight }]}>
      {Platform.OS !== 'web' && (
        <Text style={styles.badge}>
          Markdown source editor (WYSIWYG available on web)
        </Text>
      )}
      <TextInput
        style={[styles.textArea, { minHeight: minHeight - 40 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline
        textAlignVertical="top"
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  badge: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    padding: 8,
    paddingBottom: 0,
  },
  textArea: {
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    lineHeight: 24,
  },
});
