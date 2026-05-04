const VIDEO_KEYS = {
  "/idle-bg.mp4": "beyblade/idle-bg.mp4",
  "/battle-bg.mp4": "beyblade/battle-bg.mp4",
};

const CONTENT_TYPE = {
  mp4: "video/mp4",
  webm: "video/webm",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = VIDEO_KEYS[url.pathname];
    if (key) {
      const range = request.headers.get("range");
      const opts = range ? { range: parseRange(range) } : {};
      const obj = await env.MEDIA.get(key, opts);
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("cache-control", "public, max-age=86400");
      headers.set("accept-ranges", "bytes");
      const ext = key.split(".").pop().toLowerCase();
      headers.set("content-type", CONTENT_TYPE[ext] || "application/octet-stream");
      if (obj.range) {
        const total = obj.size;
        const start = obj.range.offset ?? 0;
        const end = start + (obj.range.length ?? total - start) - 1;
        headers.set("content-range", `bytes ${start}-${end}/${total}`);
        headers.set("content-length", String(end - start + 1));
        return new Response(obj.body, { status: 206, headers });
      }
      headers.set("content-length", String(obj.size));
      return new Response(obj.body, { headers });
    }
    return env.ASSETS.fetch(request);
  },
};

function parseRange(header) {
  const m = /bytes=(\d*)-(\d*)/.exec(header);
  if (!m) return undefined;
  const start = m[1] ? Number(m[1]) : undefined;
  const end = m[2] ? Number(m[2]) : undefined;
  if (start !== undefined && end !== undefined) return { offset: start, length: end - start + 1 };
  if (start !== undefined) return { offset: start };
  if (end !== undefined) return { suffix: end };
  return undefined;
}
