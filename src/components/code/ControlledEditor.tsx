import { v4 } from "uuid";
import { EditorStyles, useEditor } from "./EditorBase";
import EditorFrame from "./EditorFrame";
import { useState } from "react";
import { EditorView } from "codemirror";
import { placeholder } from "@codemirror/view";

type ControlledEditorProps = {
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
    <EditorFrame sx={{ minHeight: 100 }} onMouseEnter={() => console.log("ENTER")}>
      <EditorStyles id={editorId} minHeight={100} />
    </EditorFrame>
  );
}
