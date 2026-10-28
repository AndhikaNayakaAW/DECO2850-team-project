/** Validate a server address before embedding it in a watch build. */
export function deploymentUrls(input, accessCode = '', development = false) {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash) throw new Error('Use the site address without credentials, query parameters or fragments.');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(development && loopback && url.protocol === 'http:')) throw new Error('A device release requires HTTPS; HTTP is only allowed for explicit loopback simulation.');
  let path = url.pathname.replace(/\/+$/, '');
  // The exhibition demo build reads the demo week: /demo after the site, or after /w/<code>.
  const demo = /\/demo$/.test(path);
  if (demo) path = path.slice(0, -'/demo'.length);
  if (['', '/calendar', '/watch', '/team'].includes(path)) path = '';
  else if (!/^\/w\/[^/]+$/.test(path)) throw new Error('Use the site origin, /calendar, /demo, or an existing /w/<code> route.');
  if (accessCode && path) throw new Error('Supply the access code separately or in the URL, not both.');
  if (accessCode) path = `/w/${encodeURIComponent(accessCode)}`;
  const baseUrl = `${url.origin}${path}${demo ? '/demo' : ''}`;
  return { baseUrl, endpoint: `${baseUrl}/api/watch`, origin: url.origin, protected: !!path };
}
export function propertiesXml(baseUrl) {
  const escaped = baseUrl.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  return `<properties>\n    <property id="baseUrl" type="string">${escaped}</property>\n</properties>\n`;
}
