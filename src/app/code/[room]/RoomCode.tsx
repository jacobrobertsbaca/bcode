"use client";

import { AppBar, IconButton, Stack, SvgIcon, Toolbar, Tooltip, Typography, useTheme } from "@mui/material";
import QRCode from "react-qr-code";
import { courier } from "@/components/ThemeRegistry/fonts";
import EditorFrame from "@/components/code/EditorFrame";
import { Room } from "@/types/Room";
import { useRoom } from "@/state/room";
import EditorOnline from "@/components/code/EditorOnline";
import ClipboardIcon from "@heroicons/react/24/outline/Square2StackIcon";
import SquaresIcon from "@heroicons/react/24/outline/Squares2X2Icon";
import { enqueueSnackbar } from "notistack";
import { Canvg } from "canvg";
import Navigation from "@/components/Navigation";

const kQRCodeId = "qr-code";

export default function RoomCode({ room }: { room: Room }) {
  const theme = useTheme();
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/${room.code}`;
  const localRoom = useRoom(room, true);
  if (localRoom != null) room = localRoom;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(link);
    enqueueSnackbar("Link copied to clipboard");
  }

  async function downloadQRCode() {
    const svgElement = document.getElementById(kQRCodeId)!;
    const svgXml = new XMLSerializer().serializeToString(svgElement);

    // Create temporary canvas to render SVG to
    const canvas = document.createElement("canvas");
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    const context = canvas.getContext("2d")!;

    // Render SVG to canvas using Canvg and download
    const canvg = await Canvg.from(context, svgXml);
    await canvg.render();
    const dataUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    downloadLink.download = `${room.code}.png`;

    // Download the PNG
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  return (
    <>
      <Navigation
        action={
          <>
            <Tooltip title="Copy Link" arrow>
              <IconButton onClick={copyToClipboard}>
                <SvgIcon>
                  <ClipboardIcon />
                </SvgIcon>
              </IconButton>
            </Tooltip>
            <Tooltip title="Download QR Code" arrow>
              <IconButton onClick={downloadQRCode}>
                <SvgIcon>
                  <SquaresIcon />
                </SvgIcon>
              </IconButton>
            </Tooltip>
          </>
        }
      />
      <Stack spacing={{ xs: 8, sm: 8 }} alignItems="center" direction={{ sm: "column", md: "row" }}>
        <EditorFrame sx={{ minHeight: "unset", p: 4, flexShrink: 1, minWidth: "225px" }}>
          <QRCode
            value={link}
            fgColor={theme.palette.background.contrast}
            bgColor="transparent"
            style={{ width: "100%", height: "100%" }}
            id={kQRCodeId}
          />
        </EditorFrame>
        <Stack spacing={2}>
          <Typography variant="h3" fontWeight={600} color="background.contrast">
            {room.name}
          </Typography>
          <Typography
            variant="h4"
            fontFamily={courier.style.fontFamily}
            color="background.contrast"
            sx={{ wordWrap: "anywhere" }}
          >
            {process.env.NEXT_PUBLIC_SITE_URL_SHORT}/{room.code}
          </Typography>
          <EditorOnline />
        </Stack>
      </Stack>
    </>
  );
}
