import { Typography, TypographyProps } from "@mui/material";

export default function Logo(props: TypographyProps) {
  return (
    <Typography variant="h3" fontWeight={300} {...props}>
      <Typography variant="inherit" display="inline">
        b
      </Typography>
      <Typography variant="inherit" display="inline" color="text.secondary">
        code
      </Typography>
      <Typography
        variant="inherit"
        display="inline"
        color="text.secondary"
        sx={{
          "@keyframes blinking": {
            "50%": { opacity: 0 },
          },
          animation: "blinking 1s ease-in-out infinite",
        }}
      >
        _
      </Typography>
    </Typography>
  );
}
