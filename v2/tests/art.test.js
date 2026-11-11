import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../../scripts/make-v2-art.mjs", import.meta.url));
const ART_DIR = fileURLToPath(new URL("../art/", import.meta.url));
const row = (ch = ".") => ch.repeat(16);

test("importing the generator writes nothing", () => {
  const out = join(mkdtempSync(join(tmpdir(), "v2-art-")), "never-created");
  try {
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(SCRIPT)})`],
      { env: { ...process.env, ART_OUT: out }, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(existsSync(out), false, "import must not create the output dir");
    assert.equal(run.stdout, "");
  } finally {
    rmSync(join(out, ".."), { recursive: true, force: true });
  }
});

test("toSvg validates its input", async () => {
  const { toSvg } = await import(SCRIPT);
  assert.throws(() => toSvg("short", Array(15).fill(row())), /need 16/);
  assert.throws(() => toSvg("wide", [row("."), "." + row(), ...Array(14).fill(row())]), /columns/);
  assert.throws(() => toSvg("odd", [row("?"), ...Array(15).fill(row())]), /unknown colour/);
  assert.match(toSvg("ok", Array(16).fill(row())), /^<svg /);
});

test("running the generator reproduces the committed SVGs byte for byte", () => {
  const out = mkdtempSync(join(tmpdir(), "v2-art-"));
  try {
    const run = spawnSync(process.execPath, [SCRIPT], { env: { ...process.env, ART_OUT: out }, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const svgs = readdirSync(ART_DIR).filter((f) => f.endsWith(".svg"));
    assert.ok(svgs.length > 0);
    assert.deepEqual(readdirSync(out).filter((f) => f.endsWith(".svg")).sort(), svgs.sort());
    for (const f of svgs) assert.equal(readFileSync(join(out, f), "utf8"), readFileSync(join(ART_DIR, f), "utf8"), f);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
