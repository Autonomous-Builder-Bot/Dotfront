/* Lightweight, original Web Audio cues for Playgama. No third-party assets or autoplay. */
(function () {
  'use strict';
  let context=null,enabled=true,platformEnabled=true,hostPaused=false;
  const tools=document.getElementById('tools');
  const button=document.createElement('button');
  button.id='soundToggle';
  button.className='button';
  button.type='button';
  try{enabled=localStorage.getItem('dotfront_sound_muted')!=='yes'}catch(_){}
  function label(){button.textContent=enabled?'♫ Sound On':'♫ Muted';button.setAttribute('aria-pressed',String(enabled))}
  label();
  if(tools)tools.appendChild(button);
  const AudioClass=window.AudioContext||window.webkitAudioContext;
  function canPlay(){return enabled&&platformEnabled&&!hostPaused&&!document.hidden}
  function awaken(){
    if(!canPlay()||!AudioClass)return;
    try{if(!context)context=new AudioClass();if(context.state==='suspended')context.resume().catch(()=>{})}catch(_){}
  }
  document.addEventListener('pointerdown',awaken,{passive:true});
  function sound(name){
    if(!canPlay()||!context||context.state!=='running')return;
    const cues={
      select:[520,700,.035],
      move:[260,345,.05],
      capture:[440,660,.12],
      upgrade:[420,830,.16],
      victory:[480,960,.24],
      defeat:[290,125,.23]
    };
    const spec=cues[name];if(!spec)return;
    try{
      const [from,to,duration]=spec,at=context.currentTime;
      const osc=context.createOscillator(),gain=context.createGain();
      osc.type=name==='defeat'?'triangle':'sine';
      osc.frequency.setValueAtTime(from,at);
      osc.frequency.exponentialRampToValueAtTime(to,at+duration);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(.045,at+.01);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain);gain.connect(context.destination);
      osc.start(at);osc.stop(at+duration+.015);
    }catch(_){}
  }
  button.addEventListener('click',()=>{
    enabled=!enabled;label();
    try{localStorage.setItem('dotfront_sound_muted',enabled?'no':'yes')}catch(_){}
    if(enabled)awaken();
  });
  function setPlatformEnabled(value){platformEnabled=Boolean(value);if(platformEnabled)awaken()}
  function setHostPaused(value){hostPaused=Boolean(value);if(!hostPaused)awaken()}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)awaken()});
  window.DotfrontAudio={play:sound,setPlatformEnabled,setHostPaused};
})();
