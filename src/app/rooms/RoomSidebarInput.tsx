"use client";

import FormikTextField from "@/components/FormikTextField";
import { courier } from "@/components/ThemeRegistry/fonts";
import { Room } from "@/types/Room";
import { LoadingButton } from "@mui/lab";
import { Stack, Tooltip, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import { useState } from "react";

function maskCodeInput(code: string): string {
  return code
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .substring(0, 30);
}

export default function RoomSidebarInput() {
  const formik = useFormikContext<Room>();
  const [codeModified, setCodeModified] = useState(false);

  return (
    <Stack m={3} spacing={2}>
      <Tooltip
        placement="left"
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Students will see this name when connecting to the room
            </Typography>
            <Typography variant="inherit" component="li">
              Choose something relevant to the problem you're doing, like{" "}
              <Typography display="inline" variant="inherit" fontWeight={600}>
                Week 5 Make Change Problem
              </Typography>
              .
            </Typography>
          </Typography>
        }
      >
        <FormikTextField
          name="name"
          label="Name"
          max={60}
          onChange={(event) => {
            console.log(formik.touched);
            formik.handleChange(event);
            if (codeModified) return;
            formik.setFieldValue("code", maskCodeInput(event.currentTarget.value));
          }}
        />
      </Tooltip>
      <Tooltip
        placement="left"
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Students will add this to the end of the URL to connect to the room and start coding!
            </Typography>
            <Typography variant="inherit" component="li">
              For example, they might connect to{" "}
              <Typography display="inline" variant="inherit" fontWeight={600}>
                cs106b.vercel.app/{formik.values.code.toLocaleLowerCase() || "my-code"}
              </Typography>
            </Typography>
          </Typography>
        }
      >
        <FormikTextField
          name="code"
          label="Code"
          InputProps={{ sx: { fontFamily: courier.style.fontFamily } }}
          max={30}
          onChange={(event) => {
            setCodeModified(true);
            event.currentTarget.value = maskCodeInput(event.currentTarget.value);
            formik.handleChange(event);
          }}
        />
      </Tooltip>
      <LoadingButton variant="outlined" size="large" type="submit" loading={formik.isSubmitting}>
        <span>Save</span>
      </LoadingButton>
    </Stack>
  );
}
