/* Dotfront • Harmonic Battlefield, Build 40
   Original, offline Web Audio score. All five unit types are pitched to the
   A-minor pentatonic scale, and overlapping attacks become played phrases.
   Audio settings are independent of campaign progress and migration-safe.
*/
(() => {
 'use strict';
 const KEY='dotfront_audio_v1',LIMIT=(x,a,b)=>Math.max(a,Math.min(b,x));
 const NOTES={circle:69,square:60,triangle:76,rectangle:43,cavalry:74};
 const NOTES_ALT={circle:57,square:72,triangle:64,rectangle:55,cavalry:62};
 const VOICES={circle:{length:.39,brightness:.32,gain:.085},
  square:{length:.59,brightness:.24,gain:.115},
  triangle:{length:.78,brightness:.49,gain:.080},
  rectangle:{length:.95,brightness:.31,gain:.137},
  cavalry:{length:.39,brightness:.58,gain:.097}};
 const settings={music:true,sfx:true,musicVolume:.88,sfxVolume:.48};
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'{}');
  if(typeof old.music==='boolean')settings.music=old.music;
  if(typeof old.sfx==='boolean')settings.sfx=old.sfx;
  if(Number.isFinite(old.musicVolume))settings.musicVolume=LIMIT(old.musicVolume,0,1);
  if(Number.isFinite(old.sfxVolume))settings.sfxVolume=LIMIT(old.sfxVolume,0,1);
 }catch(_){}
 const Context=window.AudioContext||window.webkitAudioContext;
 const midi=n=>440*Math.pow(2,(n-69)/12);
 let ctx=null,musicBus=null,fxBus=null,master=null;
 let currentBattle=false,paused=false,hidden=document.hidden,intensity=0,desiredIntensity=0;
 let step=0,battle=1,nextStep=0,scheduler=null,musicDuckedUntil=0;
 let audioReady=false;
 const STRIDE=60/84/2; // eighth-note grid: spacious yet rhythmically consistent
 const attackCounts=Object.create(null),lastPlayed=new Map();
 const cooldown={select:.09,order:.12,button:.09,destroy:.65,capture:.8,
  lost:.8,upgrade:.35,ability:.2,alert:2,victory:1,defeat:1};
 let rotated=0;
 function save(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch(_){}}
 function refresh(){
  document.querySelectorAll('[data-audio-toggle]').forEach(button=>{
   const kind=button.getAttribute('data-audio-toggle'),on=settings[kind];
   if(typeof on!=='boolean')return;
   button.textContent=(kind==='music'?'♫ Music':'♪ SFX')+(on?' On':' Off');
   button.setAttribute('aria-pressed',String(on));
   button.setAttribute('title',(kind==='music'?'Music':'Sound effects')+(on?' on':' muted'));
   button.classList.toggle('muted',!on);
  });
  document.querySelectorAll('[data-audio-volume]').forEach(control=>{
   const kind=control.getAttribute('data-audio-volume');
   if(!['music','sfx'].includes(kind))return;
   const pct=Math.round(settings[kind+'Volume']*100);
   control.value=String(pct);
   const text=document.querySelector('[data-audio-value="'+kind+'"]');
   if(text)text.textContent=pct+'%';
  });
 }
 function setBuses(){
  if(!ctx)return;
  const now=ctx.currentTime;
  const duck=now<musicDuckedUntil?0.78:1;
  musicBus.gain.setTargetAtTime(
    settings.music&&currentBattle&&!hidden?settings.musicVolume*.80*(paused?.28:1)*duck:0,
    now,.12);
  fxBus.gain.setTargetAtTime(settings.sfx&&!hidden?settings.sfxVolume*.61:0,now,.06);
 }
 function prepare(){
  if(!Context||(!settings.music&&!settings.sfx))return false;
  try{
   if(!ctx){
    ctx=new Context();
    master=ctx.createGain();musicBus=ctx.createGain();fxBus=ctx.createGain();
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-16;limiter.knee.value=16;limiter.ratio.value=4;
    limiter.attack.value=.007;limiter.release.value=.28;
    master.gain.value=.94;
    musicBus.connect(master);fxBus.connect(master);
    master.connect(limiter);limiter.connect(ctx.destination);
    // Quiet, band-limited delay gives the piano spacious tails without a
    // high-cost convolution reverb or an aggressively echoing sound.
    const delay=ctx.createDelay(1);
    delay.delayTime.value=.32;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2500;
    const feedback=ctx.createGain();feedback.gain.value=.19;
    const wet=ctx.createGain();wet.gain.value=.30;
    const sendMusic=ctx.createGain();sendMusic.gain.value=.32;
    const sendEffects=ctx.createGain();sendEffects.gain.value=.14;
    musicBus.connect(sendMusic);sendMusic.connect(delay);
    fxBus.connect(sendEffects);sendEffects.connect(delay);
    delay.connect(filter);filter.connect(feedback);feedback.connect(delay);
    filter.connect(wet);wet.connect(master);
   }
   if(ctx.state==='suspended'){
    const res=ctx.resume();
    if(res&&res.then)res.then(()=>{audioReady=true;setBuses();if(currentBattle)startScheduler();}).catch(()=>{});
   }else audioReady=true;
   setBuses();
   if(currentBattle)startScheduler();
   return true;
  }catch(_){return false}
 }
 // A short note uses two harmonics and a natural exponential envelope.
 // A little high-frequency energy ensures notes remain audible on phone speakers.
 function pluck(note,when,velocity=1,style='circle',destination=fxBus){
  if(!ctx||ctx.state!=='running'||!destination)return;
  const config=VOICES[style]||VOICES.circle;
  const start=Math.max(ctx.currentTime+.005,when||ctx.currentTime+.005);
  const length=config.length*(.92+.16*Math.random());
  const pitch=midi(note),base=config.gain*velocity;
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0003,base),start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+length);
  gain.connect(destination);
  for(let k=0;k<2;k++){
   const oscillator=ctx.createOscillator();
   oscillator.type=k===0?'triangle':'sine';
   oscillator.frequency.value=pitch*(k===0?1:2.003);
   oscillator.detune.value=(Math.random()-.5)*3;
   const partial=ctx.createGain();
   partial.gain.value=k===0?1:config.brightness*.42;
   oscillator.connect(partial);partial.connect(gain);
   oscillator.start(start);oscillator.stop(start+length+.025);
  }
 }
 function pad(note,when,duration,volume){
  if(!ctx||ctx.state!=='running')return;
  const at=Math.max(ctx.currentTime+.005,when);
  const mix=ctx.createGain();
  mix.gain.setValueAtTime(.0001,at);
  mix.gain.linearRampToValueAtTime(volume,at+.85);
  mix.gain.setValueAtTime(volume,at+duration-1.2);
  mix.gain.linearRampToValueAtTime(.0001,at+duration);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';
  filter.frequency.value=1380+intensity*650;
  mix.connect(filter);filter.connect(musicBus);
  for(let k=0;k<2;k++){
   const o=ctx.createOscillator();o.type=k===0?'sine':'triangle';
   o.frequency.value=midi(note);o.detune.value=k===0?-3:3;
   const part=ctx.createGain();part.gain.value=k===0?.85:.18;
   o.connect(part);part.connect(mix);o.start(at);o.stop(at+duration+.03);
  }
 }
 // All harmonic material is original and derived from A minor pentatonic:
 // A, C, D, E, G. The upper notes carry the theme on small speakers.
 const HARMONY=[
  [45,52,55,60],[48,55,60,64],[50,57,60,64],[43,50,57,62]
 ];
 const THEME=[69,null,72,76,74,null,72,69,67,null,69,72,76,74,72,null];
 function score(n,at){
  const position=n%16,bar=Math.floor(n/16);
  const chord=HARMONY[(bar+Math.floor(battle/16))%HARMONY.length];
  intensity+=.13*(desiredIntensity-intensity);
  if(position===0){
   // Keep most of the harmony in the midrange: phone speakers lack deep bass.
   pad(chord[0]+12,at,6.2,.055);
   pad(chord[1]+12,at+.03,6.2,.040);
   pad(chord[2]+12,at+.07,6.2,.028);
  }
  if(position===8)pluck(chord[0]+24,at,.80,'square',musicBus);
  if(position%2===0){
   const n=THEME[(position+bar*2+battle)%THEME.length];
   if(n!==null&&n!==undefined)pluck(n,at+.03,.83+intensity*.28,
     position%4===0?'square':'triangle',musicBus);
  }
  // Combat introduces a low, soft rhythmic ostinato, never constant noise.
  if(intensity>.28&&position%4===0){
   pluck(45+(position===8?12:0),at,.44+intensity*.22,'rectangle',musicBus);
  }
  if(intensity>.66&&position%4===2)pluck(74,at,.48,'cavalry',musicBus);
 }
 function clearAttacks(){for(const name of Object.keys(attackCounts))delete attackCounts[name]}
 function unitAttack(type){
  if(!currentBattle||paused||hidden||!settings.sfx||!NOTES[type])return;
  attackCounts[type]=(attackCounts[type]||0)+1;
 }
 // Simultaneous attacks are clustered by instrument on each eighth-note.
 // Up to three voices represent an entire engagement, avoiding sonic overload.
 function playBattleNotes(at){
  if(!settings.sfx||paused){clearAttacks();return}
  const entries=Object.entries(attackCounts);
  clearAttacks();
  if(!entries.length)return;
  rotated++;
  entries.sort((a,b)=>{
   const score=([type,count])=>Math.sqrt(count)*
    (type==='rectangle'?1.65:type==='cavalry'?1.30:type==='triangle'?1.13:1);
   return score(b)-score(a);
  });
  const top=entries.slice(0,3);
  top.forEach(([type,count],index)=>{
   const primary=NOTES[type],alternate=NOTES_ALT[type];
   const pitch=(rotated+index)%7===0?alternate:primary;
   const magnitude=LIMIT(.67+.17*Math.log2(1+count),.68,1.25);
   const volume=magnitude/(1+.20*(top.length-1));
   pluck(pitch,at+index*.041,volume,type,fxBus);
  });
 }
 function cue(notes,kind='triangle',velocity=.9,space=.12){
  if(!ctx||ctx.state!=='running')return;
  const at=ctx.currentTime+.012;
  for(let i=0;i<notes.length;i++)
   pluck(notes[i],at+space*i,velocity,kind,fxBus);
 }
 function sound(kind){
  if(!settings.sfx||!ctx||ctx.state!=='running'||hidden)return;
  if(['laser','hit','heavy'].includes(kind)){
   unitAttack(kind==='laser'?'triangle':kind==='heavy'?'rectangle':'circle');return;
  }
  const now=ctx.currentTime,previous=lastPlayed.get(kind)??-Infinity;
  if(now-previous<(cooldown[kind]??.14))return;
  lastPlayed.set(kind,now);
  switch(kind){
   case 'select':pluck(69,now+.005,.40,'circle');break;
   case 'button':pluck(72,now+.005,.43,'square');break;
   case 'order':cue([72,76],'circle',.58,.075);break;
   case 'destroy':pluck(55,now+.005,.47,'rectangle');break;
   case 'capture':cue([69,72,76,81],'triangle',.94,.15);break;
   case 'lost':cue([64,62,60,57],'square',.87,.17);break;
   case 'upgrade':cue([57,60,64,69],'triangle',.85,.12);break;
   case 'ability':cue([57,64,69],'square',.91,.10);break;
   case 'alert':cue([55,62,64,67],'rectangle',1.05,.18);break;
   case 'victory':cue([69,72,76,79,81],'triangle',1.13,.17);break;
   case 'defeat':cue([76,74,72,69,57],'square',.98,.21);break;
  }
  if(['capture','lost','alert','victory','defeat'].includes(kind)){
   musicDuckedUntil=now+1.5;
   setBuses();
  }
 }
 function schedule(){
  if(!ctx||ctx.state!=='running'||hidden||!currentBattle)return;
  if(!settings.music&&!settings.sfx)return;
  if(nextStep<ctx.currentTime-.3)nextStep=ctx.currentTime+.05;
  let work=0;
  while(nextStep<ctx.currentTime+.28&&work++<3){
   if(settings.music)score(step,nextStep);
   playBattleNotes(nextStep);
   step++;nextStep+=STRIDE;
  }
  if(ctx.currentTime>musicDuckedUntil&&musicDuckedUntil){
   musicDuckedUntil=0;setBuses();
  }
 }
 function stopScheduler(){if(scheduler!==null){clearInterval(scheduler);scheduler=null}}
 function startScheduler(){
  if(!ctx||ctx.state!=='running'||!currentBattle||hidden||(!settings.music&&!settings.sfx))return;
  if(scheduler!==null)return;
  nextStep=ctx.currentTime+.085;
  scheduler=setInterval(schedule,80);
  schedule();
 }
 function startBattle(n){
  currentBattle=true;paused=false;step=0;intensity=0;desiredIntensity=0;
  battle=Math.max(1,Math.floor(n)||1);
  clearAttacks();lastPlayed.clear();musicDuckedUntil=0;
  prepare();setBuses();startScheduler();
 }
 function setPaused(value){
  paused=!!value;clearAttacks();setBuses();
 }
 function setIntensity(value){desiredIntensity=LIMIT(Number(value)||0,0,1)}
 function finish(won){
  sound(won?'victory':'defeat');
  currentBattle=false;paused=false;clearAttacks();stopScheduler();setBuses();
 }
 function toggle(type){
  if(type!=='music'&&type!=='sfx')return;
  settings[type]=!settings[type];save();refresh();
  if(settings[type])prepare();
  if(!settings.music&&!settings.sfx)stopScheduler();
  else startScheduler();
  setBuses();
  if(type==='sfx'&&settings.sfx)sound('button');
 }
 function volume(type,value){
  if(type!=='music'&&type!=='sfx')return;
  settings[type+'Volume']=LIMIT((Number(value)||0)/100,0,1);
  save();setBuses();refresh();
 }
 document.addEventListener('pointerdown',prepare,{capture:true,passive:true});
 document.addEventListener('keydown',prepare,{capture:true});
 document.addEventListener('click',event=>{
  const b=event.target.closest?.('[data-audio-toggle]');
  if(b){event.preventDefault();toggle(b.getAttribute('data-audio-toggle'))}
 });
 document.addEventListener('input',event=>{
  if(event.target.matches?.('[data-audio-volume]'))
   volume(event.target.getAttribute('data-audio-volume'),event.target.value);
 });
 document.addEventListener('visibilitychange',()=>{
  hidden=document.hidden;
  if(hidden){clearAttacks();stopScheduler();setBuses()}
  else{prepare();startScheduler();setBuses()}
 });
 document.addEventListener('DOMContentLoaded',refresh);
 window.DotfrontAudio={unlock:prepare,startBattle,setPaused,setIntensity,
  finish,play:sound,unitAttack,toggle,setVolume:volume,refresh,
  getSettings:()=>({...settings})};
})();
