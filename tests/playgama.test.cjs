'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function adsHarness({supported=true,now=0}={}){
 const events=[],calls=[],timers=[],DateMock=class extends Date{static now(){return clock}};
 let clock=now;
 const ad={
  isInterstitialSupported:supported,
  interstitialState:'idle',
  on(event,fn){events.push(fn)},
  off(event,fn){const i=events.indexOf(fn);if(i>=0)events.splice(i,1)},
  showInterstitial(placement){calls.push(placement);ad.interstitialState='loading'},
  emit(state){ad.interstitialState=state;for(const fn of [...events])fn(state)}
 };
 const bridge={EVENT_NAME:{INTERSTITIAL_STATE_CHANGED:'interstitial_state_changed'},advertisement:ad};
 const win={DotfrontPlaygama:{getSdk:()=>bridge}};
 const sandbox={window:win,Date:DateMock,setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},console};
 vm.runInNewContext(read('playgama/ads.js'),sandbox);
 let started=0;
 const play=()=>win.DotfrontAds.beforeNextBattle(()=>started++);
 return{win,ad,calls,timers,play,start:()=>started,setTime:t=>clock=t};
}
test('no ads at launch or levels one through four',()=>{
 const h=adsHarness();h.play();for(let n=1;n<5;n++){h.win.DotfrontAds.markVictory(n,true);h.play()}
 assert.equal(h.calls.length,0);assert.equal(h.start(),5);
});
test('five newly completed levels queue exactly one interstitial',()=>{
 const h=adsHarness();h.win.DotfrontAds.markVictory(5,true);h.play();
 assert.equal(h.calls.length,1);assert.equal(h.start(),0);
 h.ad.emit('opened');h.ad.emit('closed');assert.equal(h.start(),1);
 h.play();assert.equal(h.calls.length,1);assert.equal(h.start(),2);
});
test('replays and retries do not queue an advertisement',()=>{
 const h=adsHarness();h.win.DotfrontAds.markVictory(5,false);h.play();h.win.DotfrontAds.markVictory(4,true);h.play();assert.equal(h.calls.length,0);
});
test('failed ad continues and does not spend an impression',()=>{
 const h=adsHarness();h.win.DotfrontAds.markVictory(5,true);h.play();h.ad.emit('failed');assert.equal(h.start(),1);
 h.win.DotfrontAds.markVictory(10,true);h.play();assert.equal(h.calls.length,2);
});
test('ad-blocked or unsupported SDK continues immediately',()=>{
 const h=adsHarness({supported:false});h.win.DotfrontAds.markVictory(5,true);h.play();assert.equal(h.calls.length,0);assert.equal(h.start(),1);
 const a=adsHarness();a.win.DotfrontPlaygama.getSdk=()=>null;a.win.DotfrontAds.markVictory(5,true);a.play();assert.equal(a.start(),1);
});
test('eight-minute cooldown counts only displayed ads',()=>{
 const h=adsHarness({now:1000});h.win.DotfrontAds.markVictory(5,true);h.play();h.ad.emit('opened');h.ad.emit('closed');
 h.win.DotfrontAds.markVictory(10,true);h.play();assert.equal(h.calls.length,1);
 h.setTime(1000+8*60000+1);h.win.DotfrontAds.markVictory(15,true);h.play();assert.equal(h.calls.length,2);
});
test('two displayed ads maximum per session',()=>{
 const h=adsHarness({now:1000});for(let i=1;i<=3;i++){h.setTime(1000+(i-1)*9*60000);h.win.DotfrontAds.markVictory(i*5,true);h.play();if(i<3){h.ad.emit('opened');h.ad.emit('closed')}}
 assert.equal(h.calls.length,2);assert.equal(h.start(),3);
});
test('unresponsive ad load times out without blocking the next level',()=>{
 const h=adsHarness();h.win.DotfrontAds.markVictory(5,true);h.play();
 assert.equal(h.start(),0);h.timers[0]();assert.equal(h.start(),1);
});
test('tutorial upgrade uses planet distance and Playgama hooks do not replace PWA saves',()=>{
 const s=read('app.js');
 assert.match(s,/dist\(u,p\)<140/);
 assert.match(s,/window\.DotfrontPlaygama\?\.write\(SAVE_KEY,encoded\)/);
 assert.match(s,/window\.DotfrontPlaygama\?\.write\(TUTORIAL_KEY,'done'\)/);
 assert.match(s,/window\.DotfrontPlaygama\?\.updatePlaying\(playing\)/);
 assert.match(s,/function startLevelAfterAdBreak\(\)/);
});
test('Playgama config and build source satisfy archive entry requirements',()=>{
 const config=JSON.parse(read('playgama/playgama-bridge-config.json'));
 assert.deepEqual(config.device.supportedOrientations,['landscape','portrait']);
 for(const file of ['index.html','app.css','app.js','playgama/boot.js','playgama/ads.js','playgama/playgama-bridge-config.json','scripts/build-playgama.mjs','icons/icon-192.png','icons/icon-512.png'])assert.ok(fs.existsSync(path.join(root,file)),file);
});
test('all source scripts parse',()=>{
 for(const f of ['app.js','playgama/boot.js','playgama/ads.js','scripts/build-playgama.mjs']){
  const result=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});
  assert.equal(result.status,0,f+': '+result.stderr);
 }
});
