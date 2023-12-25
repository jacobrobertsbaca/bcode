import { Compartment, Extension } from "@codemirror/state";
import { Box, BoxProps, SxProps, Theme, useTheme } from "@mui/material";
import { jakarta } from "../ThemeRegistry/fonts";
import { EditorView } from "codemirror";
import { useEffect, useRef, useState } from "react";
import { light } from "./theme/light";
import { dark } from "./theme/dark";
import { basicSetup } from "./setup";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { SupportedLanguages } from "./languages";
import { languages } from "@codemirror/language-data";

/**
 * Options for creating an interactive editor.
 */
export type EditorConfig = {
  /**
   * Gets the DOM element that will the parent of the editor.
   */
  parent: () => Element;

  /**
   * Called once to initialize the editor with any user-provided extensions.
   * @returns An extension object, included in the editor after all base extensions.
   */
  onCreate?: () => Extension;

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
};

const EditorTheme = new Compartment();
const EditorLanguage = new Compartment();

export function useEditor(config: EditorConfig): EditorView | undefined {
  const [editorView, setEditorView] = useState<EditorView>();

  /* Theme */
  const theme = useTheme();
  const editorTheme = theme.palette.mode === "light" ? light : dark;

  useEffect(() => {
    const parent = config.parent();
    const editor = new EditorView({
      parent,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        EditorTheme.of(editorTheme),
        EditorLanguage.of([]),
        config.onCreate?.() ?? [],
      ],
    });

    setEditorView(editor);

    return () => {
      config.onDestroy?.();
      parent.replaceChildren();
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
  paddingTop?: string | number;
};

export function EditorStyles({ paddingTop, ...rest }: EditorStylesProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        ".cm-content": { paddingTop: paddingTop },
        ".cm-content, .cm-gutter": { minHeight: "400px" },
        ".cm-gutters": { borderRight: `1px solid ${theme.palette.divider}` },
        ".cm-lineNumbers > .cm-gutterElement": { pl: "20px" },
        ".cm-ySelectionInfo": { fontFamily: jakarta.style.fontFamily },
        ".cm-focused": { outline: "none" },
      }}
      {...rest}
    />
  );
}
