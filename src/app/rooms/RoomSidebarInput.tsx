"use client";

import FormikTextField from "@/components/FormikTextField";
import { courier } from "@/components/ThemeRegistry/fonts";
import { Room, groupsForCount } from "@/types/Room";
import { LoadingButton } from "@mui/lab";
import { Box, MenuItem, Slider, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useFormikContext } from "formik";
import { debounce, isEqual } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { minifyURL } from "../util";
import { SupportedLanguages } from "@/components/code/languages";
import ControlledEditor from "@/components/code/ControlledEditor";

function maskCodeInput(code: string): string {
  return code
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .substring(0, 30);
}

export default function RoomSidebarInput() {
  const formik = useFormikContext<Room>();
  const exists = !!formik.initialValues.code;
  const [codeModified, setCodeModified] = useState(false);

  // Use breakpoint for tooltip placement
  const theme = useTheme();
  const sm = useMediaQuery(theme.breakpoints.up(900));
  const placement = sm ? "left" : "bottom";

  const debouncedValidate = useMemo(
    () => debounce(formik.validateForm, 500, { trailing: true }),
    [formik.validateForm]
  );
  useEffect(() => {
    debouncedValidate(formik.values);
  }, [formik.values, debouncedValidate]);

  return (
    <Stack m={3} spacing={2}>
      <Typography variant="subtitle2">Room Info</Typography>
      <Tooltip
        placement={placement}
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Students will see this name when connecting to the room.
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
            formik.handleChange(event);
            if (codeModified || exists) return;
            formik.setFieldValue("code", maskCodeInput(event.currentTarget.value), false);
            formik.setFieldTouched("code", true, false);
          }}
        />
      </Tooltip>
      <Tooltip
        placement={placement}
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Students will add this to the end of the URL to connect to the room and start coding!
            </Typography>
            {!exists && (
              <Typography variant="inherit" component="li">
                For example, they link they'll connect to will look like{" "}
                <Typography display="inline" variant="inherit" fontWeight={600}>
                  {minifyURL(process.env.NEXT_PUBLIC_SITE_URL!)}/{formik.values.code.toLocaleLowerCase() || "my-code"}
                </Typography>
                .
              </Typography>
            )}
            {exists && (
              <Typography variant="inherit" component="li">
                Cannot be changed after the room has been created.
              </Typography>
            )}
          </Typography>
        }
      >
        <FormikTextField
          name="code"
          label="Code"
          disabled={exists}
          InputProps={{
            sx: { fontFamily: courier.style.fontFamily },
          }}
          max={30}
          onChange={(event) => {
            setCodeModified(true);
            event.currentTarget.value = maskCodeInput(event.currentTarget.value);
            formik.handleChange(event);
          }}
        />
      </Tooltip>
      <FormikTextField select name="language" label="Language">
        {SupportedLanguages.map((sl) => (
          <MenuItem key={sl.name} value={sl.name}>
            {sl.label ?? sl.cm}
          </MenuItem>
        ))}
      </FormikTextField>
      <Typography variant="subtitle2">Groups</Typography>
      <Tooltip
        placement={placement}
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              This is the number of groups that students can join.
            </Typography>
            {!exists && (
              <Typography variant="inherit" component="li">
                You can change this later.
              </Typography>
            )}
          </Typography>
        }
      >
        <Box px={2}>
          <Slider
            aria-label="Groups"
            defaultValue={1}
            valueLabelDisplay="auto"
            step={1}
            min={1}
            max={8}
            marks
            value={formik.values.groups.length}
            onChange={(_, v) => formik.setFieldValue("groups", groupsForCount(v as number))}
          />
        </Box>
      </Tooltip>
      <Tooltip
        placement={placement}
        arrow
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Each group will default to this starter code (optional).
            </Typography>
            <Typography variant="inherit" component="li">
              Changing this won't affect groups after they've been created.
            </Typography>
          </Typography>
        }
      >
        <Box>
          <ControlledEditor
            placeholder="Starter code goes here..."
            language={formik.values.language}
            value="hello world!"
            onChange={(v) => {
              console.log(v);
            }}
          />
        </Box>
      </Tooltip>
      <LoadingButton
        variant="outlined"
        size="large"
        type="submit"
        loading={formik.isSubmitting}
        disabled={!formik.isValid || isEqual(formik.initialValues, formik.values)}
      >
        <span>Save</span>
      </LoadingButton>
    </Stack>
  );
}
