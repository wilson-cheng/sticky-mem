/**
 * Native WYSIWYG Markdown editor using react-native-pell-rich-editor.
 * Converts between Markdown (app storage format) and HTML (editor format).
 *
 * Uses editorInitializedCallback + ref.setContentHTML() for reliable
 * content injection (avoids timing issues with initialContentHTML prop).
 *
 * Layout: toolbar on TOP, editor fills remaining space.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useColors } from '../theme/useColors';

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
}

// Module-level turndown instance — pre-loaded on first import
let turndownPromise: Promise<any> | null = null;
let turndownInstance: any = null;

function ensureTurndown() {
  if (!turndownPromise) {
    turndownPromise = (async () => {
      const Turndown = await import('turndown');
      const td = Turndown.default || Turndown;
      turndownInstance = new td({ headingStyle: 'atx', bulletListMarker: '-' });
    })();
  }
  return turndownPromise;
}

// Kick off pre-load immediately
ensureTurndown();

function markdownToHtml(md: string): string {
  if (!md) return '<p></p>';
  const safe = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  let html = safe;
  // Code blocks (```) — must be before inline code
  html = html.replace(/```(\\w*)\\n([\\s\\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Unordered lists (dash only)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');
  // Paragraphs — wrap remaining lines
  html = html.replace(/^(?!<[a-zA-Z/])(.+)$/gm, '<p>$1</p>');
  return html;
}

export default React.memo(function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Edit your content...',
  minHeight = 300,
  editable = true,
}: Props) {
  const richText = useRef<RichEditor>(null);
  const c = useColors();
  const [editorReady, setEditorReady] = useState(false);
  const [contentSet, setContentSet] = useState(false);

  // Convert markdown to HTML — runs once (mount only) due to React.memo + never-update.
  // Content switching is handled by key prop in ContentEditorModal.
  const html = React.useMemo(() => markdownToHtml(value), []);

  // Once the editor WebView is ready, inject the content
  useEffect(() => {
    if (editorReady && !contentSet && html) {
      try {
        richText.current?.setContentHTML(html);
        setContentSet(true);
      } catch (e) {
        console.error('[MarkdownEditor] Failed to set content:', e);
      }
    }
  }, [editorReady, contentSet, html]);

  const handleEditorInit = useCallback(() => {
    setEditorReady(true);
  }, []);

  // onChange fires immediately — React.memo(() => true) prevents re-render
  // from parent state updates, so cursor position is preserved.
  // Turndown is pre-loaded so the conversion is synchronous after first keystroke.
  const handleChange = useCallback(
    (rawHtml: string) => {
      const td = turndownInstance;
      if (td) {
        try {
          const md = td.turndown(rawHtml);
          onChange(md);
        } catch {
          onChange(rawHtml);
        }
      } else {
        // Fallback: pass raw HTML if turndown isn't loaded yet
        onChange(rawHtml);
      }
    },
    [onChange],
  );

  const editorStyle = {
    backgroundColor: c.inputBg || '#F9F9F9',
    color: c.textPrimary || '#333',
    placeholderColor: c.textSecondary || '#999',
    caretColor: c.blue || '#4A90D9',
    contentCSSText: `font-size: 16px; line-height: 1.6; padding: 8px; min-height: ${Math.max(200, minHeight - 80)}px; overflow-y: auto;`,
  };

  return (
    <View style={styles.container}>
      {/* Toolbar on TOP */}
      {editable && (
        <View style={[styles.toolbarWrapper, { backgroundColor: c.cardBg || '#fff' }]}>
          <RichToolbar
            editor={richText}
            style={[styles.toolbar, { backgroundColor: c.cardBg || '#fff' }]}
            flatContainerStyle={styles.toolbarFlat}
            selectedIconTint={c.blue || '#4A90D9'}
            iconTint={c.textSecondary || '#666'}
            disabledIconTint="#CCC"
            unselectedButtonStyle={styles.toolBtn}
            actions={[
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.heading1,
              actions.heading2,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.insertLink,
              actions.blockquote,
              actions.code,
              actions.undo,
              actions.redo,
            ]}
          />
        </View>
      )}
      {/* Editor fills remaining space — overflow-y:auto only on web (native handled by the editor webview) */}
      <View
        style={[
          styles.editorWrapper,
          { borderColor: c.border || '#DDD' },
          Platform.OS === 'web' && { overflowY: 'auto' as const },
        ]}
      >
        <RichEditor
          ref={richText}
          onChange={handleChange}
          placeholder={placeholder}
          editorStyle={editorStyle}
          disabled={!editable}
          style={styles.editor}
          editorInitializedCallback={handleEditorInit}
        />
      </View>
    </View>
  );
}, () => true); // Never re-render from prop changes — editor is uncontrolled via setContentHTML

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toolbarWrapper: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#DDD',
  },
  toolbar: {
    borderWidth: 0,
    paddingTop: 16,
    paddingBottom: 4,
    height: 58,
  },
  toolbarFlat: {
    flexGrow: 0,
  },
  toolbarDivider: {
    height: 1,
    backgroundColor: '#DDD',
  },
  editorWrapper: {
    flex: 1,
    borderWidth: 1,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  editor: {
    flex: 1,
  },
  toolBtn: {
    marginHorizontal: 2,
  },
});
