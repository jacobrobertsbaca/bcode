"use client";

import FormikTextField from "@/components/FormikTextField";
import { courier } from "@/components/ThemeRegistry/fonts";
import { MaxStarterCodeLength, Room, SupportedLanguages, groupsForCount } from "@/types/Room";
import { LoadingButton } from "@mui/lab";
import {
  Alert,
  Box,
  Collapse,
  MenuItem,
  Slider,
  Stack,
  Tooltip as MuiTooltip,
  Typography,
  useMediaQuery,
  useTheme,
  TooltipProps,
  Switch,
} from "@mui/material";
import { useFormikContext } from "formik";
import { debounce, isEqual } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { minifyURL } from "../util";
import FormikEditor from "@/components/code/FormikEditor";

function Tooltip({ children, ...rest }: TooltipProps) {
  const theme = useTheme();
  const sm = useMediaQuery(theme.breakpoints.up(900));
  const placement = sm ? "left" : "bottom";
  return (
    <MuiTooltip disableInteractive placement={placement} arrow {...rest}>
      {children}
    </MuiTooltip>
  );
}

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
        title={
          <Typography variant="inherit" component="ul" px="24px" py="8px">
            <Typography variant="inherit" component="li">
              Each group will begin with this starter code (optional).
            </Typography>
            {exists && (
              <Typography variant="inherit" component="li" fontWeight={600}>
                Changing this will overwrite any existing code!
              </Typography>
            )}
          </Typography>
        }
      >
        <Box>
          <FormikEditor
            placeholder="Add starter code here"
            language={formik.values.language}
            minHeight="100px"
            name="starter_code"
            max={MaxStarterCodeLength}
          />
        </Box>
      </Tooltip>
      <Collapse
        in={exists && formik.initialValues.starter_code !== formik.values.starter_code}
        sx={{ mt: "0 !important", ".MuiCollapse-wrapperInner": { mt: 2 } }}
      >
        <Alert severity="warning">
          Changing the starter code will{" "}
          <Typography display="inline" variant="inherit" fontWeight={600}>
            permanently overwrite
          </Typography>{" "}
          any code that has been written for this room.
        </Alert>
      </Collapse>

      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
        <Stack>
          <Typography variant="subtitle2">Lock Room</Typography>
          <Typography variant="caption" color="text.secondary">
            Prevent guests from making changes to the room
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center">
          <Switch
            defaultChecked
            checked={formik.values.locked}
            onChange={(e) => formik.setFieldValue("locked", e.target.checked)}
          />
        </Stack>
      </Stack>

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
