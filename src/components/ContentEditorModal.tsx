/**
 * Slide-up modal with WYSIWYG editor for viewing/editing content.
 * Used in the manage page to let users edit stored Markdown content
 * and optionally regenerate questions.
 */

import React, { useState, useCallback, useEffect } from 'react';
import Alert from '../utils/alertWrapper';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MarkdownEditor from './MarkdownEditor';
import { useColors } from '../theme/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  title: string;
  markdown: string;
  onSave: (newMarkdown: string) => Promise<void>;
  onRegenerate: (newMarkdown: string) => Promise<void>;
}

export default function ContentEditorModal({
  visible,
  onClose,
  contentId,
  title,
  markdown,
  onSave,
  onRegenerate,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [editedMarkdown, setEditedMarkdown] = useState(markdown);
  const [saving, setSaving] = useState(false);
  const [modalOpenCount, setModalOpenCount] = useState(0);

  // Reset when opening with different content
  useEffect(() => {
    if (visible) {
      setEditedMarkdown(markdown);
      setModalOpenCount(prev => prev + 1);
    }
  }, [visible, markdown]);

  const handleCancel = useCallback(() => {
    if (editedMarkdown === markdown) {
      onClose();
      return;
    }
    Alert.alert(
      'Unsaved Changes',
      'Save your changes before closing?',
      [
        { text: 'No', style: 'destructive', onPress: onClose },
        {
          text: 'Yes',
          onPress: async () => {
            setSaving(true);
            try {
              await onSave(editedMarkdown);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to save');
            } finally {
              setSaving(false);
              onClose();
            }
          },
        },
      ]
    );
  }, [editedMarkdown, markdown, onSave, onClose]);

  const handleSave = useCallback(async () => {
    if (editedMarkdown === markdown) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Always save first
      await onSave(editedMarkdown);

      // Ask about regeneration — unified for web & native
      Alert.alert(
        'Content Updated',
        'Clear old questions and regenerate based on the new content?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: onClose,
          },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                await onRegenerate(editedMarkdown);
              } finally {
                onClose();
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [editedMarkdown, markdown, onSave, onRegenerate, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleCancel} disabled={saving}>
            <Text style={[styles.closeBtn, { color: c.blue }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.textPrimary }]} numberOfLines={1}>
              {title || 'Edit Content'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || editedMarkdown === markdown}
          >
            {saving ? (
              <ActivityIndicator size="small" color={c.blue} />
            ) : (
              <Text
                style={[
                  styles.saveBtn,
                  { color: editedMarkdown !== markdown ? c.blue : c.textSecondary },
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toolbar hint */}
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          Edit your content using the toolbar above. Changes are saved to Markdown format.
        </Text>

        {/* Editor */}
        <View style={styles.editorWrapper}>
          <MarkdownEditor
            key={`editor-${contentId}-${modalOpenCount}`}
            value={editedMarkdown}
            onChange={setEditedMarkdown}
            placeholder="Edit your content..."
            minHeight={400}
          />
        </View>

        {/* Bottom action: Save & Regenerate directly */}
        {editedMarkdown !== markdown && (
          <View style={[styles.bottomBar, { borderTopColor: c.border }]}>
            <TouchableOpacity
              style={[styles.regenerateBtn, { backgroundColor: c.accent }]}
              onPress={async () => {
                setSaving(true);
                try {
                  await onSave(editedMarkdown);
                  await onRegenerate(editedMarkdown);
                  onClose();
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Failed');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              <Text style={styles.regenerateBtnText}>
                {saving ? 'Saving & Regenerating...' : 'Save & Regenerate Questions'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeBtn: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 16,
  },
  editorWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  regenerateBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  regenerateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
