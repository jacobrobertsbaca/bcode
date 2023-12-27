import { Annotation, Compartment, EditorState, Extension, Transaction, TransactionSpec } from "@codemirror/state";
import { Box, BoxProps, Theme, useTheme } from "@mui/material";
import { CSSSelectorObjectOrCssVariables } from "@mui/system";
import { jakarta } from "../ThemeRegistry/fonts";
import { EditorView } from "codemirror";
import { useEffect, useRef, useState } from "react";
import { light } from "./theme/light";
import { dark } from "./theme/dark";
import { basicSetup } from "./setup";
import { EditorViewConfig, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { SupportedLanguages } from "./languages";
import { languages } from "@codemirror/language-data";
import { YSyncConfig } from "y-codemirror.next";

/**
 * Options for creating an interactive editor.
 */
export type EditorConfig = {
  /**
   * Called once to initialize the editor state.
   * @returns The editor config. Base extensions will be included.
   */
  onCreate?: () => EditorViewConfig;

  /**
   * Called when the editor is being destroyed (when the calling component is unmounted).
   */
  onDestroy?: () => void;

  /**
   * The editor language syntax highlighting.
   * Should match the `name` field of one of the {@link SupportedLanguages}.
   * If `undefined`, syntax highlighting will be disabled.
   */
  language?: string;

  /**
   * Maximum number of characters allowed to be entered into the editor.
   */
  max?: number;
};

const EditorTheme = new Compartment();
const EditorLanguage = new Compartment();

/**
 * Checks if a transaction is remote.
 * @param tr A {@link Transaction} to check
 * @returns Whether or not the transaction originated from YJS and is therefore remote.
 *
 * @remarks This function is kind of a hack because it directly inspects a Transaction's annotations.
 * Once this PR is merged (https://github.com/yjs/y-codemirror.next/pull/30), should be able to
 * check this directly using `tr.annotation(ySyncAnnotation)`.
 */
function isRemote(tr: Transaction): boolean {
  const spec = tr as TransactionSpec;
  const annotations = spec.annotations;
  if (!annotations) return false;
  if (annotations instanceof Annotation) return annotations.value instanceof YSyncConfig;
  return annotations.some((a) => a.value instanceof YSyncConfig);
}

function maxLength(max?: number): Extension {
  if (max === undefined) return [];
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;
    if (isRemote(tr)) return tr; // Ignore remote updates
    if (tr.newDoc.length <= max) return tr;

    /* Get changed ranges, sorted from latest to earliest in the document */
    const ranges: [from: number, to: number][] = [];
    tr.changes.iterChangedRanges((_, __, from, to) => ranges.push([from, to]));
    ranges.sort((a, b) => b[0] - a[0]);

    /* Remove characters from the end of ranges (starting with latest ranges first)
     * until the document has exactly `max` characters */
    const supressed: [from: number, to: number][] = [];
    let length = tr.newDoc.length;
    for (let i = 0; i < ranges.length && length > max; i++) {
      const [from, to] = ranges[i];
      if (from === to) continue;
      const n = Math.min(length - max, to - from);
      supressed.push([to - n, to]);
      length -= n;
    }

    return [
      tr,
      ...supressed.map(([from, to]) => ({
        changes: { from, to },
        sequential: true,
      })),
    ];
  });
}

export function useEditor(config: EditorConfig): EditorView | undefined {
  const [editorView, setEditorView] = useState<EditorView>();

  /* Theme */
  const theme = useTheme();
  const editorTheme = theme.palette.mode === "light" ? light : dark;

  useEffect(() => {
    const state = config.onCreate?.() ?? {};
    const { extensions, ...rest } = state;

    // prettier-ignore
    setEditorView(
      new EditorView({
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          EditorTheme.of(editorTheme),
          EditorLanguage.of([]),
          maxLength(config.max),
        ].concat(extensions ?? []),
        ...rest,
      })
    );

    return () => {
      config.onDestroy?.();
      state?.parent?.replaceChildren();
      setEditorView(undefined);
    };
  }, []);

  /* Update the editor theme when the MUI theme changes */
  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: EditorTheme.reconfigure(editorTheme),
    });
  }, [theme.palette.mode]);

  /* Update editor language when room language changes or editor loads in */
  const languageVersion = useRef(0);
  useEffect(() => {
    if (!editorView) return;
    const version = ++languageVersion.current;
    if (!config.language) return editorView.dispatch({ effects: EditorLanguage.reconfigure([]) });

    /* Find CodeMirror language description from user-passed language */
    const cmName = SupportedLanguages.find((info) => info.name === config.language)?.cm;
    const cmLanguage = languages.find((info) => info.name === cmName);
    if (!cmLanguage) throw new Error(`Couldn't find language: '${config.language}'`);

    /* Load in language asynchronously */
    cmLanguage.load().then((ls) => {
      if (languageVersion.current !== version) return; // Optimistic lock language loading
      editorView.dispatch({
        effects: EditorLanguage.reconfigure([ls]),
      });
    });
  }, [editorView, config.language]);

  return editorView;
}

export type EditorStylesProps = Omit<BoxProps, "sx"> & {
  /**
   * Styles applied to the CodeMirror editor element (`.cm-editor`).
   */
  editorSx?: CSSSelectorObjectOrCssVariables<Theme>[".cm-editor"];
};

export function EditorStyles({ editorSx, ...rest }: EditorStylesProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        ".cm-editor": editorSx ?? {},
        ".cm-gutters": { borderRight: `1px solid ${theme.palette.divider}` },
        ".cm-lineNumbers > .cm-gutterElement": { pl: "20px" },
        ".cm-ySelectionInfo": { fontFamily: jakarta.style.fontFamily },
        ".cm-focused": { outline: "none" },
      }}
      {...rest}
    />
  );
}
