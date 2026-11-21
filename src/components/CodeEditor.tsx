import { useEffect, useRef } from 'react';
import { MergeView } from '@codemirror/merge';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/**
 * Editor chrome draws from the theme tokens only, so every palette works
 * without a second definition of the syntax colours.
 */
const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--text)', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--faint)', border: 'none', paddingInlineStart: '8px' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--elevated) 60%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 26%, transparent)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '.cm-merge-a .cm-changedLine, .cm-deletedChunk': { backgroundColor: 'color-mix(in srgb, var(--danger) 16%, transparent)' },
  '.cm-merge-b .cm-changedLine, .cm-insertedChunk': { backgroundColor: 'color-mix(in srgb, var(--success) 16%, transparent)' },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: 'var(--accent)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--success)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--warning)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--faint)', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.tagName], color: 'var(--info, var(--accent))' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--muted)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--text)', fontWeight: '600' },
  { tag: [t.heading, t.strong], fontWeight: '700' },
  { tag: [t.link, t.url], color: 'var(--accent)', textDecoration: 'underline' },
  { tag: t.invalid, color: 'var(--danger)' },
]);

function language(path: string): Extension[] {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
      return [javascript({ typescript: true })];
    case 'tsx':
      return [javascript({ typescript: true, jsx: true })];
    case 'jsx':
      return [javascript({ jsx: true })];
    case 'js':
    case 'mjs':
    case 'cjs':
      return [javascript()];
    case 'json':
      return [json()];
    case 'css':
      return [css()];
    case 'html':
    case 'htm':
      return [html()];
    case 'md':
    case 'mdx':
      return [markdown()];
    default:
      return [];
  }
}

export interface CodeEditorProps {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

/** CodeMirror 6 editor. Loaded lazily so the first paint stays small. */
export default function CodeEditor({ path, value, onChange, readOnly = false }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        syntaxHighlighting(highlight),
        theme,
        language(path),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change.current(update.state.doc.toString());
        }),
      ],
    });
    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;
    instance.focus();
    return () => {
      instance.destroy();
      view.current = null;
    };
    // The document is recreated only when the open file changes.
  }, [path, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current !== value) {
      instance.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full min-h-0 overflow-auto" dir="ltr" />;
}

export interface DiffViewProps {
  original: string;
  current: string;
}

/** Side-by-side saved/working diff from `@codemirror/merge`. Read-only. */
export function DiffView({ original, current }: DiffViewProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const extensions: Extension[] = [
      theme,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      EditorState.tabSize.of(2),
    ];
    const merge = new MergeView({
      a: { doc: original, extensions },
      b: { doc: current, extensions },
      parent: host.current,
      highlightChanges: true,
      gutter: true,
    });
    return () => merge.destroy();
  }, [original, current]);

  return <div ref={host} className="h-full min-h-0 overflow-auto" dir="ltr" />;
}
