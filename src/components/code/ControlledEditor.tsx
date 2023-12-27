import { v4 } from "uuid";
import { EditorStyles, useEditor } from "./EditorBase";
import EditorFrame, { type EditorFrameProps } from "./EditorFrame";
import { useState } from "react";
import { EditorView } from "codemirror";
import { placeholder } from "@codemirror/view";

type ControlledEditorProps = EditorFrameProps & {
  minHeight?: string | number;
  placeholder?: string;
  language?: string;
  value: string;
  onChange: (value: string) => void;
};

export default function ControlledEditor(props: ControlledEditorProps) {
  const [editorId] = useState(v4());

  useEditor({
    language: props.language,
    onCreate: () => ({
      doc: props.value,
      parent: document.getElementById(editorId)!,
      extensions: [
        ...(props.placeholder ? [placeholder(props.placeholder)] : []),
        EditorView.updateListener.of(({ state }) => {
          props.onChange(state.doc.toString());
        }),
      ],
    }),
  });

  return (
    <EditorFrame sx={{ minHeight: props.minHeight }}>
      <EditorStyles
        id={editorId}
        editorSx={{
          ".cm-gutters": { minHeight: `${props.minHeight} !important` },
        }}
      />
    </EditorFrame>
  );
}
