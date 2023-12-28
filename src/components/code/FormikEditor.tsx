import { v4 } from "uuid";
import { EditorStyles, useEditor } from "./EditorBase";
import EditorFrame, { type EditorFrameProps } from "./EditorFrame";
import { useState } from "react";
import { EditorView } from "codemirror";
import { placeholder } from "@codemirror/view";
import { Stack, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import { get } from "lodash";

type FormikEditorProps = EditorFrameProps & {
  name: string;
  minHeight?: string | number;
  placeholder?: string;
  language?: string;
  max?: number;
};

export default function FormikEditor(props: FormikEditorProps) {
  const [editorId] = useState(v4());
  const formik = useFormikContext();

  useEditor({
    language: props.language,
    max: props.max,
    onCreate: () => ({
      doc: get(formik.values, props.name),
      parent: document.getElementById(editorId)!,
      extensions: [
        ...(props.placeholder ? [placeholder(props.placeholder)] : []),
        EditorView.updateListener.of(({ state }) => {
          formik.setFieldValue(props.name, state.doc.toString());
        }),
      ],
    }),
  });

  return (
    <Stack spacing={0.5}>
      <EditorFrame sx={{ minHeight: props.minHeight }}>
        <EditorStyles
          id={editorId}
          editorSx={{
            ".cm-gutters": { minHeight: `${props.minHeight} !important` },
          }}
        />
      </EditorFrame>
      {props.max !== undefined && (
        <Typography variant="caption" color="text.secondary" pl={1.75}>
          {(get(formik.values, props.name) as string).length}/{props.max}
        </Typography>
      )}
    </Stack>
  );
}
