// Run against the local production app on :3210 and an isolated headless Chrome profile on :9333.
// This walkthrough uses synthetic data, clears localhost:3210 storage in that profile, and writes screenshots to /tmp/offshift-watch-qa.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const target=await (await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let counter=0;const pending=new Map(),errors=[],requests=[];
socket.addEventListener('message',event=>{
 const message=JSON.parse(event.data);
 if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(message.error):p.resolve(message.result);}
 if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+' '+(message.params.exceptionDetails.exception?.description||''));
 if(message.method==='Network.requestWillBeSent')requests.push(message.params.request);
});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Browser evaluation failed');return result.result.value;}
async function wait(expression){return evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true)}else if(Date.now()-start>10000){clearInterval(timer);reject(new Error('Timed out waiting for UI'))}},50)})`);}
async function navigate(path){await command('Page.navigate',{url:'http://localhost:3210'+path});}
async function click(text){const result=await evaluate(`(()=>{const el=[...document.querySelectorAll('button,a,summary')].find(e=>e.textContent.replace(/[＋↗]/g,'').trim()===${JSON.stringify(text)});if(!el)return false;el.click();return true})()`);assert.equal(result,true,'Missing button '+text);}
async function screenshot(name){await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.mkdir('/tmp/offshift-watch-qa',{recursive:true});await fs.writeFile('/tmp/offshift-watch-qa/'+name+'.png',Buffer.from(data,'base64'));}
await command('Runtime.enable');await command('Network.enable');await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await command('Storage.clearDataForOrigin',{origin:'http://localhost:3210',storageTypes:'local_storage'});
await navigate('/watch');await wait(`document.querySelector('.watch-bpm')?.textContent.includes('76')`);
assert.equal(await evaluate(`getComputedStyle(document.querySelector('.watch-dial')).borderRadius`),'50%');
assert.equal(await evaluate(`(()=>{const r=document.querySelector('.watch-dial').getBoundingClientRect();return Math.abs(r.width-r.height)<1})()`),true,'Watch must remain a circle');
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
await screenshot('watch-desktop');
await click('Reflect');await wait(`document.querySelector('.watch-face-reflect')`);await click('Reading');
await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await evaluate(`document.querySelector('.watch-showcase').scrollIntoView({block:'center'})`);await screenshot('watch-mobile');
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Mobile overflow');
await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
await navigate('/calendar?date=2026-09-16');await wait(`document.querySelectorAll('.daily-reading-values li').length===5`);
assert.equal(await evaluate(`document.querySelectorAll('.daily-activity').length`),3);
await evaluate(`document.querySelector('#activity-reflection').focus()`);await command('Input.insertText',{text:'Tired after standing all day. Browser QA private note.'});
await click('Save reflection');await wait(`document.querySelector('[role=status]')?.textContent.includes('saved')`);
await click('Preview recovery time');await wait(`document.querySelector('[aria-label="Recovery time preview"]')`);
assert.equal(await evaluate(`document.querySelectorAll('.daily-recovery').length`),0);
await click('Cancel');assert.equal(await evaluate(`document.querySelectorAll('.daily-recovery').length`),0);
await click('Preview recovery time');await click('Confirm recovery time');await wait(`document.querySelectorAll('.daily-recovery').length===1`);
await screenshot('calendar-desktop');
await navigate('/calendar?date=2026-09-16');await wait(`document.querySelectorAll('.daily-recovery').length===1`);
assert.equal(await evaluate(`document.querySelector('#activity-reflection').value`),'Tired after standing all day. Browser QA private note.');
await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Calendar mobile overflow');
await navigate('/watch');await wait(`document.querySelector('.watch-bpm')?.textContent.includes('76')`);await click('Import a watch export');
const imported={version:1,device:'Browser test watch',readings:[{id:'browser-1',recordedAt:'2026-09-17T13:30:00+10:00',bpm:83}]};
await evaluate(`document.querySelector('#watch-json').focus()`);await command('Input.insertText',{text:JSON.stringify(imported)});await click('Import to this browser');
await wait(`document.querySelector('.watch-bpm')?.textContent.includes('83')`);
assert.equal(await evaluate(`document.querySelector('.watch-data-panel').textContent.includes('Not connected')`),true);
await navigate('/calendar?date=2026-09-17');await wait(`document.querySelectorAll('.daily-reading').length===1`);
assert.equal(await evaluate(`document.querySelector('.daily-reading').textContent.includes('83')`),true);
await navigate('/watch');await wait(`document.querySelector('.watch-bpm')?.textContent.includes('83')`);await click('Delete my watch data');await click('Keep my data');assert.equal(await evaluate(`document.querySelector('.watch-bpm').textContent.includes('83')`),true);
await click('Delete my watch data');await click('Delete all private data');await wait(`document.querySelector('.watch-bpm')?.textContent.includes('—')`);
assert.equal(await evaluate(`document.querySelector('.watch-data-panel .reflect-badge').textContent.includes('No readings')`),true);
const store=await evaluate(`JSON.parse(localStorage.getItem('offshift-private-watch-v1')).state`);assert.deepEqual(store.readings,[]);assert.deepEqual(store.notes,{});assert.deepEqual(store.recoveries,{});
for(const request of requests.filter(r=>/\/api\/(state|assistant)/.test(r.url))){assert.equal((request.postData||'').includes('Browser QA private note'),false);assert.equal((request.postData||'').includes('browser-1'),false);}
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'passed',checks:['round watch frame','reading and reflect screens','mobile overflow','calendar activity/readings match','optional reflection persists','preview and cancellation do not schedule','confirmation schedules one recovery block','recovery persists after navigation','imported reading displayed on correct date','import stays unverified and disconnected','deletion requires confirmation and clears private state','private note and readings absent from shared API requests','no browser exceptions'],screenshots:'/tmp/offshift-watch-qa'},null,2));
socket.close();
