import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat, rm, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const builder = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));

async function fixture(run) {
  const temporary = await mkdtemp(path.join(tmpdir(), 'offshift-artifact-test-'));
  try {
    const compiler = path.join(temporary, 'compiler.mjs');
    const output = path.join(temporary, 'release/OFFSHIFT.PRG');
    const environment = path.join(temporary, 'private.env');
    await mkdir(path.dirname(output));
    await writeFile(environment, 'OFFSHIFT_ACCESS_CODE=synthetic-build-test-code\n', { mode: 0o600 });
    // Garmin emits MIR beside -o. Reproduce that real compiler side effect without an SDK in CI.
    await writeFile(compiler, `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const output = process.argv[process.argv.indexOf('-o') + 1];
mkdirSync(path.join(path.dirname(output), 'external-mir'), { recursive: true });
writeFileSync(output, 'compiled-release');
writeFileSync(output + '.debug.xml', '<symbols/>');
writeFileSync(path.join(path.dirname(output), 'external-mir/Deployment.mir'), 'synthetic-build-test-code');
if (process.env.OFFSHIFT_TEST_COMPILER_FAIL) process.exit(1);
`, { mode: 0o700 });
    function build(fail = false) {
      return spawnSync(process.execPath, [builder, '--sdk', temporary, '--java', compiler, '--key', 'synthetic-key', '--out', output, '--access-code-file', environment], {
        encoding: 'utf8', env: { ...process.env, OFFSHIFT_TEST_COMPILER_FAIL: fail ? '1' : '' },
      });
    }
    await run({ output, build });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

test('private compiler intermediates are not published beside the release', async () => fixture(async ({ output, build }) => {
  const result = build();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual((await readdir(path.dirname(output))).sort(), ['OFFSHIFT.PRG', 'OFFSHIFT.PRG.debug.xml']);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.equal((await stat(output + '.debug.xml')).mode & 0o777, 0o600);
  assert.equal(result.stdout.includes('synthetic-build-test-code'), false);
}));

test('a failed compiler preserves the last known good release', async () => fixture(async ({ output, build }) => {
  await writeFile(output, 'last-known-good');
  const result = build(true);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(output, 'utf8'), 'last-known-good');
  assert.deepEqual(await readdir(path.dirname(output)), ['OFFSHIFT.PRG']);
}));

test('a checkout and temporary folder with spaces in their paths still build', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'offshift-spaces-test-'));
  try {
    // A real checkout path, e.g. ".../Semester 2 2026/Final Project/Offshift", with the builder copied into it.
    const watch = path.join(temporary, 'Final Project', 'offshift-watch');
    const original = path.resolve(path.dirname(builder), '..');
    for (const part of ['scripts', 'source', 'resources', 'manifest.xml']) await cp(path.join(original, part), path.join(watch, part), { recursive: true });
    const scratch = path.join(temporary, 'Temp Folder');
    await mkdir(scratch);
    const compiler = path.join(temporary, 'compiler.mjs');
    const output = path.join(temporary, 'release/OFFSHIFT.PRG');
    // Garmin's jungle parser drops every space from a value, then resolves it against the jungle's folder.
    await writeFile(compiler, `#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const jungle = process.argv[process.argv.indexOf('-f') + 1];
for (const line of readFileSync(jungle, 'utf8').split('\\n').filter(Boolean)) {
  const value = path.resolve(path.dirname(jungle), line.slice(line.indexOf('=') + 1).replace(/\\s/g, ''));
  if (!existsSync(value)) { console.error('The specified file does not exist: ' + value); process.exit(104); }
}
writeFileSync(process.argv[process.argv.indexOf('-o') + 1], 'compiled-release');
`, { mode: 0o700 });
    const result = spawnSync(process.execPath, [path.join(watch, 'scripts/build.mjs'), '--sdk', temporary, '--java', compiler, '--key', 'synthetic-key', '--out', output], {
      encoding: 'utf8', env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(output, 'utf8'), 'compiled-release');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
