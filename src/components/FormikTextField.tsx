import { Box, TextField, TextFieldProps } from "@mui/material";
import { useFormikContext } from "formik";
import { get } from "lodash";
import { forwardRef } from "react";

export type FormikTextFieldProps = TextFieldProps & {
  name: string;
  max?: number;
};

const FormikTextField = forwardRef(
  ({ name, max, inputProps, ...rest }: FormikTextFieldProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const formik = useFormikContext();
    const error = get(formik.touched, name) && get(formik.errors, name);

    const helperText = (() => {
      if (error) return typeof error === "string" ? error : JSON.stringify(error);
      if (max) return `${(get(formik.values, name) as string).length}/${max}`;
      return "";
    })();

    return (
      <TextField
        error={!!error}
        helperText={helperText}
        onChange={formik.handleChange}
        value={get(formik.values, name)}
        name={name}
        inputProps={{
          maxLength: max,
          onBlur: formik.handleBlur,
          ...inputProps,
        }}
        ref={ref}
        {...rest}
      />
    );
  }
);

export default FormikTextField;
