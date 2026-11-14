// Runs scripts/animate.mjs over every JSON recipe in references/character-animation.md
// and expects each to pass, then breaks a recipe on purpose and expects animate.mjs
// to catch it. Run with: node tests/animate-recipes.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const animate = new URL("scripts/animate.mjs", root).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const doc = readFileSync(new URL("references/character-animation.md", root), "utf8");
const work = mkdtempSync(join(tmpdir(), "animate-recipes-"));

// A recipe is a fenced json block under a "### Name (... )" heading.
const recipes = [];
const pattern = /^### (.+)$[\s\S]*?```json\n([\s\S]*?)```/gm;
for (const match of doc.matchAll(pattern)) {
  const heading = match[1];
  let json;
  try {
    json = JSON.parse(match[2]);
  } catch {
    continue; // a fragment, not a whole animation
  }
  if (!json.keyframes) continue;
  const flags = [];
  if (heading.includes("--locomotion")) flags.push("--locomotion");
  if (heading.includes("--grounded")) flags.push("--grounded");
  recipes.push({ heading, json, flags });
}

function run(json, flags) {
  const file = join(work, `${json.name}.json`);
  writeFileSync(file, JSON.stringify(json));
  try {
    execFileSync(process.execPath, [animate, file, ...flags], { stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? -1;
  }
}

let failures = 0;
for (const { heading, json, flags } of recipes) {
  const code = run(json, flags);
  if (code !== 0) {
    failures++;
    console.log(`FAIL ${heading}: exit ${code}`);
  }
}
if (recipes.length < 5) {
  failures++;
  console.log(`FAIL found only ${recipes.length} recipes; the heading pattern no longer matches the doc`);
}

// Sabotage: each broken copy must be refused (1) or fail a check (3).
const walk = recipes.find((r) => r.heading.startsWith("Walk"));
const sabotage = [];
if (walk) {
  const broken = structuredClone(walk.json);
  broken.name = "WalkLoopBroken";
  broken.keyframes.pop(); // the loop no longer returns to its first pose
  sabotage.push({ label: "loop that does not close", json: broken, flags: walk.flags });
}
const wave = recipes.find((r) => r.heading.startsWith("Wave"));
if (wave) {
  const broken = structuredClone(wave.json);
  broken.name = "WaveUnknownJoint";
  broken.keyframes[1].joints.RightElbowX = { bend: 90 };
  sabotage.push({ label: "unknown joint name", json: broken, flags: wave.flags });
}
for (const { label, json, flags } of sabotage) {
  const code = run(json, flags);
  if (code === 0) {
    failures++;
    console.log(`FAIL sabotage not caught: ${label}`);
  }
}
if (sabotage.length < 2) {
  failures++;
  console.log("FAIL the Walk or Wave recipe is missing, so the sabotage cases did not run");
}

rmSync(work, { recursive: true, force: true });
console.log(`animate-recipes: ${recipes.length} recipes, ${sabotage.length} sabotage cases, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
