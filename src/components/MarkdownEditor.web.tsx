/**
 * Web-specific Markdown WYSIWYG editor using TipTap.
 * Only rendered on web (Platform.OS === 'web').
 *
 * Markdown → HTML → TipTap (for editing)
 * TipTap → HTML → Markdown → saved to DB
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TurndownService from 'turndown';
import { marked } from 'marked';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
}

function markdownToHtml(md: string): string {
  try {
    const result = marked.parse(md || '', { async: false });
    return typeof result === 'string' ? result : '';
  } catch {
    return md || '';
  }
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Edit your content...',
  minHeight = 300,
  editable = true,
}: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track the latest value key for content switching
  const valueKey = useRef(0);
  const prevValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content: markdownToHtml(value) || `<p>${placeholder}</p>`,
    editable,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const markdown = turndownService.turndown(html);
      onChangeRef.current(markdown);
    },
  });

  // Sync external value changes (e.g., switching between contents)
  useEffect(() => {
    if (!editor) return;
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      valueKey.current += 1;
      editor.commands.setContent(markdownToHtml(value) || '<p></p>');
    }
  }, [value, editor]);

  const ToolbarButton = useCallback(
    ({ label, command, active }: { label: string; command: () => void; active?: boolean }) => (
      <button
        type="button"
        style={{
          ...tbStyles.btn,
          ...(active ? tbStyles.btnActive : {}),
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          command();
        }}
      >
        {label}
      </button>
    ),
    []
  );

  if (!editor) {
    return (
      <View style={[styles.container, { minHeight }]}>
        <div style={edStyles.loading}>Loading editor...</div>
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight }]}>
      {/* Toolbar */}
      <div style={tbStyles.toolbar}>
        <ToolbarButton
          label="B"
          command={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        />
        <ToolbarButton
          label="I"
          command={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        />
        <ToolbarButton
          label="U"
          command={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
        />
        <span style={tbStyles.separator}>|</span>
        <ToolbarButton
          label="H1"
          command={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        />
        <ToolbarButton
          label="H2"
          command={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        />
        <ToolbarButton
          label="H3"
          command={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        />
        <span style={tbStyles.separator}>|</span>
        <ToolbarButton
          label="•"
          command={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        />
        <ToolbarButton
          label="1."
          command={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        />
        <ToolbarButton
          label={'"'}
          command={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        />
        <span style={tbStyles.separator}>|</span>
        <ToolbarButton
          label="<>"
          command={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
        />
      </div>

      {/* Editor content area */}
      <div
        style={{
          ...edStyles.editorArea,
          minHeight: minHeight - 44,
          ...(editable ? {} : { pointerEvents: 'none', opacity: 0.6 }),
        }}
      >
        <EditorContent editor={editor} style={edStyles.editorContent} />
      </div>
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
});

// Real DOM inline styles (TipTap needs real DOM, not React Native views)
const tbStyles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    padding: '6px 8px',
    borderBottom: '1px solid #E0E0E0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  btn: {
    padding: '4px 10px',
    border: '1px solid transparent',
    borderRadius: 4,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    lineHeight: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  btnActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90D9',
    color: '#1565C0',
  },
  separator: {
    color: '#CCC',
    fontSize: 12,
    padding: '0 4px',
    userSelect: 'none',
  },
};

const edStyles: Record<string, React.CSSProperties> = {
  loading: {
    padding: 20,
    textAlign: 'center',
    color: '#888',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 14,
  },
  editorArea: {
    padding: '12px 16px',
    overflowY: 'auto',
  },
  editorContent: {
    outline: 'none',
    minHeight: 'inherit',
  },
};
