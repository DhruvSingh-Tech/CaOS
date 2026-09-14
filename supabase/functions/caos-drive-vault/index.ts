// Supabase Edge Function: Drive Vault Proxy with In-Memory Caching
// Securely proxies Google Drive API v3 requests without exposing the API key to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CacheEntry {
  timestamp: number;
  data: any;
}

// 5-minute in-memory cache (300,000 ms)
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let folderId = url.searchParams.get("folderId") || "1tXX8-FI9xsCVBWtOoKpeAvtvU5AB6DGa";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.folderId) {
        folderId = body.folderId;
      }
    }

    // Check cache
    const cached = cache.get(folderId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Google Drive API Key from Supabase Secret
    const apiKey = Deno.env.get("CAOS_GOOGLE_DRIVE_API_KEY") || Deno.env.get("GOOGLE_DRIVE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GOOGLE_DRIVE_API_KEY is not configured in Supabase secrets.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent(
      "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)"
    );
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=folder,name&pageSize=100&key=${apiKey}`;

    const driveRes = await fetch(driveUrl);
    if (!driveRes.ok) {
      const errJson = await driveRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: errJson.error?.message || `Google Drive API error: ${driveRes.statusText}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: driveRes.status,
        }
      );
    }

    const driveData = await driveRes.json();
    const items = (driveData.files || []).map((f: any) => {
      const isFolder = f.mimeType === "application/vnd.google-apps.folder";
      const sizeBytes = f.size ? parseInt(f.size, 10) : undefined;
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        type: isFolder ? "folder" : "file",
        isFolder,
        size: isFolder
          ? "Folder"
          : sizeBytes
          ? sizeBytes < 1024 * 1024
            ? `${(sizeBytes / 1024).toFixed(1)} KB`
            : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : "—",
        sizeBytes,
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : undefined,
        url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        downloadUrl: f.webContentLink || `https://drive.google.com/uc?export=download&id=${f.id}`,
        previewUrl: isFolder ? undefined : `https://drive.google.com/file/d/${f.id}/preview`,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        parentId: folderId,
      };
    });

    const responsePayload = {
      folderId,
      items,
      count: items.length,
      timestamp: Date.now(),
    };

    // Store in cache
    cache.set(folderId, {
      timestamp: Date.now(),
      data: responsePayload,
    });

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

