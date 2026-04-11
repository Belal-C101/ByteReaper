"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type ErrorLevel = "L" | "M" | "Q" | "H";

export default function QrCodePage() {
  const [value, setValue] = useState("https://github.com/Belal-C101/ByteReaper");
  const [size, setSize] = useState("256");
  const [level, setLevel] = useState<ErrorLevel>("M");
  const [foreground, setForeground] = useState("#111111");
  const [background, setBackground] = useState("#ffffff");
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const generate = async () => {
      const url = await QRCode.toDataURL(value, {
        width: Number(size) || 256,
        errorCorrectionLevel: level,
        color: {
          dark: foreground,
          light: background,
        },
      });
      setDataUrl(url);
    };

    if (value.trim()) {
      void generate();
    }
  }, [background, foreground, level, size, value]);

  const downloadPng = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "qr-code.png";
    link.click();
  };

  const downloadSvg = async () => {
    const svg = await QRCode.toString(value, {
      type: "svg",
      width: Number(size) || 256,
      errorCorrectionLevel: level,
      color: { dark: foreground, light: background },
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-code.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPageShell
      title="QR Code Generator"
      description="Create custom QR codes with configurable size, colors, and error correction, then download as PNG or SVG."
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-xl border p-3 space-y-2">
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Text or URL" />
          <Input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Size in pixels" />
          <select value={level} onChange={(event) => setLevel(event.target.value as ErrorLevel)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="L">Low (L)</option>
            <option value="M">Medium (M)</option>
            <option value="Q">Quartile (Q)</option>
            <option value="H">High (H)</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Foreground<Input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} className="h-10 p-1" /></label>
            <label className="text-sm">Background<Input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-10 p-1" /></label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={downloadPng}>Download PNG</Button>
            <Button size="sm" variant="outline" onClick={() => void downloadSvg()}>Download SVG</Button>
          </div>
        </section>

        <section className="rounded-xl border p-3 flex items-center justify-center min-h-[320px]">
          {dataUrl ? (
            <Image
              src={dataUrl}
              alt="Generated QR code"
              width={Number(size) || 256}
              height={Number(size) || 256}
              className="max-w-full h-auto"
              unoptimized
            />
          ) : (
            <p className="text-sm text-muted-foreground">Enter value to generate QR.</p>
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}
