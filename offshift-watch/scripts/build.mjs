/** Builds with a temporary private resource override; secrets never enter tracked properties. */
import { mkdtemp, cp, writeFile, readFile, mkdir, rm, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deploymentUrls, propertiesXml } from './build-config.mjs';

const args = process.argv.slice(2);
function option(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdk = option('--sdk', process.env.OFFSHIFT_GARMIN_SDK);
const key = option('--key', process.env.OFFSHIFT_GARMIN_KEY);
if (!sdk || !key) throw new Error('Set OFFSHIFT_GARMIN_SDK and OFFSHIFT_GARMIN_KEY or pass --sdk and --key. Keep the signing key outside the repository.');
const development = args.includes('--development');
const test = args.includes('--test');
const output = path.resolve(option('--out', path.join(root, 'bin', test ? 'offshift-test.prg' : 'device/OFFSHIFT.PRG')));
let code = '';
const codeFile = option('--access-code-file');
if (codeFile) {
  const text = await readFile(codeFile, 'utf8');
  const match = /^OFFSHIFT_ACCESS_CODE=(.+)$/m.exec(text);
  if (!match) throw new Error('The supplied private environment file has no OFFSHIFT_ACCESS_CODE.');
  code = match[1].trim().replace(/^(["'])(.*)\1$/, '$2');
}
const config = deploymentUrls(option('--url', 'https://offshift-nine.vercel.app'), code, development);
const temporary = await mkdtemp(path.join(tmpdir(), 'offshift-garmin-build-'));
try {
  const resources = path.join(temporary, 'resources');
  await cp(path.join(root, 'resources'), resources, { recursive: true });
  await writeFile(path.join(resources, 'properties/properties.xml'), propertiesXml(config.baseUrl), { mode: 0o600 });
  const source = path.join(temporary, 'source');
  await cp(path.join(root, 'source'), source, { recursive: true });
  await writeFile(path.join(source, 'Deployment.mc'), `(:background)\nmodule Deployment { const BASE_URL = ${JSON.stringify(config.baseUrl)}; }\n`, { mode: 0o600 });
  const jungle = path.join(temporary, 'build.jungle');
  // Jungle values can contain spaces; the compiler parses the whole value to the right of '='.
  await writeFile(jungle, `project.manifest = ${path.join(root, 'manifest.xml')}\nbase.sourcePath = ${source}\nbase.resourcePath = ${resources}\n`, { mode: 0o600 });
  await mkdir(path.dirname(output), { recursive: true });
  const compilerArgs = ['-f', jungle, '-d', option('--device', 'fenix847mm'), '-y', key, '-o', output];
  if (test) compilerArgs.push('--unit-test');
  else compilerArgs.push('-r');
  const java = option('--java', process.env.OFFSHIFT_JAVA);
  const executable = java || path.join(sdk, 'bin/monkeyc');
  const passed = java ? ['-Xms1g', '-Dfile.encoding=UTF-8', '-Dapple.awt.UIElement=true', '-classpath', path.join(sdk, 'bin/monkeybrains.jar'), 'com.garmin.monkeybrains.Monkeybrains', ...compilerArgs] : compilerArgs;
  const result = spawnSync(executable, passed, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Garmin compiler exited ${result.status}.`);
  await chmod(output, 0o600);
  // Report only the public origin, never a secret-bearing /w/<code> route.
  console.log(JSON.stringify({ output, device: option('--device', 'fenix847mm'), origin: config.origin, accessProtected: config.protected, unitTests: test }));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
