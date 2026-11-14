/* Dotfront original procedural soundtrack & sound effects.
 * All sounds are synthesized with Web Audio. No downloads, external libraries,
 * licensed recordings, or HTMLAudioElements are required.
 * Sound preferences use their own key and never touch campaign progress.
 */
(() => {
 'use strict';
 const SAVE='dotfront_audio_v1';
 let settings={music:true,sfx:true};
 try {
  const value=JSON.parse(localStorage.getItem(SAVE)||'{}');
  if(typeof value.music==='boolean')settings.music=value.music;
  if(typeof value.sfx==='boolean')settings.sfx=value.sfx;
 }catch(_){}
 const AudioClass=window.AudioContext||window.webkitAudioContext;
 let ctx=null,master=null,musicBus=null,fxBus=null,noiseBuffer=null;
 let battle=false,paused=false,intensity=0,hidden=document.hidden;
 let timer=null,nextStep=0,stepIndex=0,battleNumber=1;
 const lastEffect=new Map();
 const intervals={select:.075,order:.14,laser:.11,hit:.13,heavy:.22,destroy:.22,
  capture:.6,lost:.65,upgrade:.3,ability:.24,alert:2,button:.08,victory:1,defeat:1};
 const midi=n=>440*Math.pow(2,(n-69)/12);
 function save(){try{localStorage.setItem(SAVE,JSON.stringify(settings))}catch(_){}}
 function refresh(){
  document.querySelectorAll('[data-audio-toggle]').forEach(el=>{
   const type=el.getAttribute('data-audio-toggle');
   if(!(type in settings))return;
   const on=settings[type];
   const label=type==='music'?'Music':'SFX',glyph=type==='music'?'♫':'♪';
   el.textContent=glyph+' '+label+(on?' On':' Off');
   el.setAttribute('aria-pressed',String(on));
   el.setAttribute('title',label+(on?' on; tap to mute':' muted; tap to enable'));
   el.classList.toggle('muted',!on);
  });
 }
 function unlock(){
  if(!AudioClass||(!settings.music&&!settings.sfx))return false;
  try{
   if(!ctx){
    ctx=new AudioClass();
    master=ctx.createGain();musicBus=ctx.createGain();fxBus=ctx.createGain();
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-18;limiter.knee.value=15;limiter.ratio.value=3;
    limiter.attack.value=.008;limiter.release.value=.25;
    master.gain.value=.84;musicBus.gain.value=.32;fxBus.gain.value=.48;
    musicBus.connect(master);fxBus.connect(master);master.connect(limiter);
    limiter.connect(ctx.destination);
    noiseBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.25);
   }
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   if(battle&&settings.music)startScheduler();
   return true;
  }catch(_){return false}
 }
 function level(){
  if(!musicBus||!ctx)return;
  const target=settings.music&&battle&&!hidden?(paused?.23:1):0;
  musicBus.gain.setTargetAtTime(.32*target,ctx.currentTime,.18);
 }
 // Allocate a short-lived oscillator with a smooth attack/release envelope.
 function tone(freq,duration,volume,wave='sine',time=null,bus=null,slide=0,attack=.014){
  if(!ctx||ctx.state!=='running')return;
  const at=Math.max(ctx.currentTime+.001,time??ctx.currentTime);
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const end=at+duration;
  osc.type=wave;
  osc.frequency.setValueAtTime(Math.max(30,freq),at);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),end);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+Math.min(duration*.32,attack));
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  osc.connect(gain);gain.connect(bus||fxBus);
  osc.start(at);osc.stop(end+.015);
 }
 function noise(duration,volume,when=null){
  if(!ctx||ctx.state!=='running'||!noiseBuffer)return;
  const now=Math.max(ctx.currentTime+.001,when??ctx.currentTime);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=1500;
  gain.gain.setValueAtTime(volume,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(fxBus);
  source.start(now);source.stop(now+Math.min(.155,duration+.01));
 }
 function sound(kind){
  if(!settings.sfx||!ctx||ctx.state!=='running'||hidden)return;
  const at=ctx.currentTime;
  const last=lastEffect.get(kind)??-999;
  if(at-last<(intervals[kind]??.13))return;
  lastEffect.set(kind,at);
  switch(kind){
   case 'select':
    tone(740,.09,.043,'sine',at,fxBus,1.16);break;
   case 'order':
    tone(360,.11,.054,'triangle',at,fxBus,1.75);
    tone(610,.09,.028,'sine',at+.055);break;
   case 'button':
    tone(480,.07,.036,'sine',at,fxBus,1.18);break;
   case 'laser':
    tone(970,.115,.036,'sawtooth',at,fxBus,.44,.005);break;
   case 'hit':
    tone(140,.075,.065,'triangle',at,fxBus,.72,.004);
    noise(.06,.023,at);break;
   case 'heavy':
    tone(95,.28,.10,'sawtooth',at,fxBus,.43,.005);
    noise(.13,.051,at);break;
   case 'destroy':
    tone(220,.26,.09,'triangle',at,fxBus,.24,.009);
    noise(.105,.050,at);break;
   case 'capture':
    [62,65,69,74].forEach((note,i)=>tone(midi(note),.29,.065,'triangle',at+i*.095,fxBus,1,.015));break;
   case 'lost':
    [53,50,46].forEach((note,i)=>tone(midi(note),.38,.075,'sawtooth',at+i*.11));break;
   case 'upgrade':
    [57,60,64,69].forEach((note,i)=>tone(midi(note),.26,.05,'triangle',at+i*.08));break;
   case 'ability':
    tone(245,.48,.083,'sawtooth',at,fxBus,2.8,.028);
    tone(490,.34,.034,'sine',at+.11,fxBus,1.5);break;
   case 'alert':
    tone(220,.3,.075,'triangle',at);
    tone(185,.33,.074,'triangle',at+.23);break;
   case 'victory':
    [50,57,62,65,69,74].forEach((note,i)=>tone(midi(note),.53,.077,'triangle',at+i*.13,fxBus,1,.024));break;
   case 'defeat':
    [57,53,50,45].forEach((note,i)=>tone(midi(note),.64,.062,'sawtooth',at+i*.18,fxBus,.95,.025));break;
  }
 }
 // A generative four-chord space score. Composition and note order are
 // original to Dotfront; scheduling uses audio clock, not animation frames.
 const chords=[[50,53,57,60],[46,50,53,58],[43,46,50,55],[48,52,55,60]];
 const motif=[0,2,1,null,3,1,2,null,0,1,3,2,1,null,2,null];
 const eighth=60/90/2;
 function composeStep(n,when){
  const beat=n%16,bar=Math.floor(n/16),chord=chords[(bar+Math.floor(battleNumber/7))%chords.length];
  const extra=intensity>.48?1:0;
  if(beat===0){
   tone(midi(chord[0]-12),2.75,.085,'triangle',when,musicBus,1,.24);
   for(let j=1;j<4;j++)tone(midi(chord[j]),2.60,.022,'sine',when+.03*j,musicBus,1,.35);
  }
  if(beat===8)tone(midi(chord[0]-12),1.1,.063,'triangle',when,musicBus,1,.09);
  if(beat%2===0||extra&&beat%2===1){
   const which=motif[(beat+bar*3+battleNumber)%motif.length];
   if(which!==null){
    const pitch=chord[which]+12+(intensity>.72&&beat%4===0?12:0);
    tone(midi(pitch),intensity>.55?.27:.37,.033+intensity*.014,'sine',when,musicBus,1,.014);
   }
  }
  if(intensity>.60&&beat%4===0){
   tone(66,.19,.045,'triangle',when,musicBus,.75,.006);
  }
 }
 function schedule(){
  if(!ctx||ctx.state!=='running'||!settings.music||!battle||hidden)return;
  if(nextStep<ctx.currentTime-.3)nextStep=ctx.currentTime+.035;
  let loops=0;
  while(nextStep<ctx.currentTime+.35&&loops++<4){
   composeStep(stepIndex++,nextStep);
   nextStep+=eighth;
  }
 }
 function stopScheduler(){
  if(timer!==null){clearInterval(timer);timer=null}
 }
 function startScheduler(){
  if(!settings.music||!battle||hidden||!ctx)return;
  level();
  if(timer!==null)return;
  nextStep=ctx.currentTime+.10;
  timer=setInterval(schedule,95);
  schedule();
 }
 function startBattle(n){
  battle=true;paused=false;battleNumber=Math.max(1,Math.floor(n)||1);
  intensity=0;stepIndex=0;lastEffect.clear();
  unlock();level();startScheduler();
 }
 function setPaused(value){paused=!!value;level()}
 function setIntensity(value){
  intensity=Math.max(0,Math.min(1,Number(value)||0));
 }
 function finish(win){
  sound(win?'victory':'defeat');
  battle=false;paused=false;stopScheduler();level();
 }
 function toggle(type){
  if(!(type in settings))return;
  settings[type]=!settings[type];save();refresh();
  if(settings[type])unlock();
  if(type==='music'){
   if(settings.music)startScheduler();else stopScheduler();
   level();
  }else if(settings.sfx)sound('button');
 }
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-audio-toggle]');
  if(!button)return;
  event.preventDefault();toggle(button.dataset.audioToggle);
 });
 document.addEventListener('visibilitychange',()=>{
  hidden=document.hidden;
  if(hidden){stopScheduler();level()}
  else if(battle&&settings.music){unlock();startScheduler();level()}
 });
 document.addEventListener('DOMContentLoaded',refresh);
 window.DotfrontAudio={unlock,startBattle,setPaused,setIntensity,finish,
  play:sound,toggle,refresh,getSettings:()=>({...settings})};
})();
