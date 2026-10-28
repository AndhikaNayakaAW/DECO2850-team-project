import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentUrls, propertiesXml } from '../scripts/build-config.mjs';

test('a calendar link resolves to the deployed watch API, never /calendar/api/watch', () => {
  assert.deepEqual(deploymentUrls('https://offshift-nine.vercel.app/calendar'), {
    baseUrl: 'https://offshift-nine.vercel.app', endpoint: 'https://offshift-nine.vercel.app/api/watch', origin: 'https://offshift-nine.vercel.app', protected: false,
  });
});
test('a private device build includes the access code only in its watch route', () => {
  const result = deploymentUrls('https://offshift-nine.vercel.app/calendar', 'test-code');
  assert.equal(result.baseUrl, 'https://offshift-nine.vercel.app/w/test-code');
  assert.equal(result.endpoint, 'https://offshift-nine.vercel.app/w/test-code/api/watch');
  assert.equal(result.protected, true);
  assert.equal(result.origin, 'https://offshift-nine.vercel.app');
});
test('a preconfigured watch route does not duplicate the access path or the API suffix', () => {
  assert.equal(deploymentUrls('https://offshift-nine.vercel.app/w/test-code/').endpoint, 'https://offshift-nine.vercel.app/w/test-code/api/watch');
});
test('release builds reject laptop HTTP URLs rather than installing a broken device endpoint', () => {
  assert.throws(() => deploymentUrls('http://127.0.0.1:3000'), /HTTPS/);
});
test('the simulator can explicitly opt into a loopback development server', () => {
  assert.equal(deploymentUrls('http://127.0.0.1:3000/', '', true).endpoint, 'http://127.0.0.1:3000/api/watch');
  assert.throws(() => deploymentUrls('http://public.example', '', true), /HTTPS/);
});
test('an exhibition demo build talks to the demo week, never the participant\'s', () => {
  assert.deepEqual(deploymentUrls('https://offshift-nine.vercel.app/demo'), {
    baseUrl: 'https://offshift-nine.vercel.app/demo', endpoint: 'https://offshift-nine.vercel.app/demo/api/watch', origin: 'https://offshift-nine.vercel.app', protected: false,
  });
  assert.equal(deploymentUrls('https://offshift-nine.vercel.app/demo/', 'test-code').endpoint, 'https://offshift-nine.vercel.app/w/test-code/demo/api/watch');
  assert.equal(deploymentUrls('https://offshift-nine.vercel.app/w/test-code/demo').endpoint, 'https://offshift-nine.vercel.app/w/test-code/demo/api/watch');
});
test('unknown paths, credentials and query tokens are rejected instead of silently leaking them', () => {
  for (const url of ['https://offshift-nine.vercel.app/other', 'https://user:secret@offshift-nine.vercel.app', 'https://offshift-nine.vercel.app?token=secret']) assert.throws(() => deploymentUrls(url));
});
test('property XML escapes user-provided URL values', () => {
  assert.equal(propertiesXml('https://example.test/w/a&b'), '<properties>\n    <property id="baseUrl" type="string">https://example.test/w/a&amp;b</property>\n</properties>\n');
});
