// Minimal MCP stdio client for `photocraft-cli mcp` (headless PhotoCraft).
// Use it when the PhotoCraft MCP tools are not loaded in the session.
//
// Usage:
//   node mcp-client.mjs <root-dir> -list                 list the server's tools
//   node mcp-client.mjs <root-dir> -schema <tool> ...    print tool input schemas
//   node mcp-client.mjs <root-dir> <steps.json>          run [{tool, args, quiet?, saveImageAs?}] in order
//
// <root-dir> is granted as both the automation read and write root; file paths in the
// steps are relative to it. Images returned by render_preview are written to
// PREVIEW_DIR (default: <root-dir>) as saveImageAs. PHOTOCRAFT_CLI overrides the
// executable (default: photocraft-cli on PATH).
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CLI = process.env.PHOTOCRAFT_CLI ?? "photocraft-cli";
const root = process.argv[2];
if (!root || !process.argv[3]) {
  console.error("usage: node mcp-client.mjs <root-dir> <-list | -schema tool... | steps.json>");
  process.exit(2);
}
const mode = process.argv[3];

const child = spawn(CLI, ["mcp", "--automation-read-root", root, "--automation-write-root", root], {
  stdio: ["pipe", "pipe", "pipe"],
});
child.stderr.on("data", (d) => process.stderr.write("[stderr] " + d));

let buf = "";
const waiters = new Map();
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { console.log("[non-json] " + line); continue; }
    if (msg.id !== undefined && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); }
  }
});

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    waiters.set(id, resolve);
    setTimeout(() => { if (waiters.has(id)) { waiters.delete(id); reject(new Error("timeout " + method)); } }, 60000);
  });
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function short(v, n = 1500) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + `… (${s.length} chars)` : s;
}

try {
  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "roblox-vfx-animation", version: "1.0.0" },
  });
  console.log("INIT:", short(init.result ?? init.error, 800));
  notify("notifications/initialized", {});
  const tools = await request("tools/list", {});
  const list = tools.result?.tools ?? [];
  if (mode === "-list") {
    console.log(`TOOLS (${list.length}):`);
    for (const t of list) console.log(`- ${t.name}: ${(t.description ?? "").split("\n")[0].slice(0, 160)}`);
  } else if (mode === "-schema") {
    for (const name of process.argv.slice(4)) {
      const t = list.find((x) => x.name === name);
      console.log(`== ${name}\n${t ? (t.description ?? "") + "\n" + JSON.stringify(t.inputSchema, null, 1) : "not found"}`);
    }
  } else {
    const steps = JSON.parse(readFileSync(mode, "utf8"));
    for (const s of steps) {
      const r = await request("tools/call", { name: s.tool, arguments: s.args ?? {} });
      const out = r.error ?? r.result;
      console.log(`== ${s.tool} ${r.result?.isError ? "(isError)" : ""}`);
      for (const c of out?.content ?? [out]) {
        if (c?.type === "image") {
          const file = `${process.env.PREVIEW_DIR ?? root}/${s.saveImageAs ?? "preview.png"}`;
          writeFileSync(file, Buffer.from(c.data, "base64"));
          console.log(`[image ${c.mimeType}, saved ${file}]`);
        }
        else console.log(short(c?.text ?? c, s.quiet ? 160 : 2500));
      }
    }
  }
} catch (e) {
  console.error("ERROR", e.message);
} finally {
  child.stdin.end();
  setTimeout(() => child.kill(), 1500);
}
