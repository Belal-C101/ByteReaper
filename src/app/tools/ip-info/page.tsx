"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const DynamicLeafletMap = dynamic(() => import("@/components/tools/leaflet-map").then((mod) => mod.LeafletMap), {
  ssr: false,
});

interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
  org: string;
  postal: string;
  timezone: string;
}

export default function IpInfoPage() {
  const [queryIp, setQueryIp] = useState("");
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (ip?: string) => {
    setLoading(true);
    setError("");

    try {
      const endpoint = ip?.trim()
        ? `/api/tools/ip-info?ip=${encodeURIComponent(ip.trim())}`
        : "/api/tools/ip-info";
      const response = await fetch(endpoint);
      const data = (await response.json()) as IpInfo & { error?: boolean; reason?: string };
      if (data.error) {
        throw new Error(data.reason || "Unable to lookup IP");
      }
      setInfo(data);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Lookup failed");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="IP & Network Info"
      description="Lookup public IP metadata and plot location on OpenStreetMap using Leaflet."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void lookup()} disabled={loading}>{loading ? "Loading..." : "Lookup my IP"}</Button>
          <Input value={queryIp} onChange={(event) => setQueryIp(event.target.value)} placeholder="8.8.8.8" className="max-w-xs" />
          <Button variant="outline" onClick={() => void lookup(queryIp)} disabled={loading || !queryIp.trim()}>
            Lookup IP
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {info && (
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-xl border p-3 text-sm space-y-1">
              <p><span className="font-medium">IP:</span> {info.ip}</p>
              <p><span className="font-medium">City:</span> {info.city}</p>
              <p><span className="font-medium">Region:</span> {info.region}</p>
              <p><span className="font-medium">Country:</span> {info.country_name}</p>
              <p><span className="font-medium">ISP/Org:</span> {info.org}</p>
              <p><span className="font-medium">Postal:</span> {info.postal}</p>
              <p><span className="font-medium">Timezone:</span> {info.timezone}</p>
              <p><span className="font-medium">Coordinates:</span> {info.latitude}, {info.longitude}</p>
            </section>
            <DynamicLeafletMap lat={info.latitude} lon={info.longitude} />
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
