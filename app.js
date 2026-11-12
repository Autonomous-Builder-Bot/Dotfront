

(()=>{'use strict';
const c=document.getElementById('game'),g=c.getContext('2d');const $=id=>document.getElementById(id);const W=1400,H=850;let width=0,height=0,dpr=1,scale=1,ox=0,oy=0;let planets=[],units=[],particles=[],starBackground=null,edges=[],selected=new Set(),selectedPlanet=null,wallPlacement=false,paused=true,finished=false,elapsed=0,lastTime=0,aiTimer=0,spawnTimer=0,toastTimer=0,tipTimer=0,mouse={x:0,y:0},drag=null,lastClick={t:0,x:-200,y:-200},nextId=1,difficulty='normal',aiConfig={easy:{delay:18,interval:4.5,speed:.82,production:.86},normal:{delay:6,interval:2.5,speed:1,production:1},hard:{delay:0,interval:1.35,speed:1.2,production:1.22}};const teams=['#7ee6ff','#ff718f','#d4d6eb'],color=t=>teams[t+0]||teams[2];const rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const specs={
circle:{speed:91,hp:32,armor:2,damage:8,range:24,period:.75,attackPeriod:.85,capture:1},
square:{speed:60,hp:85,armor:5,damage:11,range:26,period:1.5,attackPeriod:.95,capture:1},
triangle:{speed:116,hp:17,armor:0,damage:7,range:110,period:1.5,attackPeriod:1.05,capture:1,ranged:true},
rectangle:{speed:39,hp:190,armor:10,damage:19,range:27,period:3,attackPeriod:1.2,capture:0},
cavalry:{speed:156,hp:47,armor:1,damage:11,range:26,period:2.25,attackPeriod:1.05,capture:1}
};const typeIcons={circle:'●',square:'■',triangle:'▲',rectangle:'▰',cavalry:'❯'};let lasers=[];
// Data-driven campaign. Every group of 20 levels introduces a new tactical lesson.
const CAMPAIGN_SIZE=200,ARC_NAMES=['First Contact','The Expansion','Fortress Systems','Laser Frontier','Heavy Industry','Siege Warfare','Hostile Territory','Split Command','Adaptive Enemies','The Core Worlds'];
const MODS=[{id:'production1',branch:'Production',title:'Efficient Factories',desc:'All planets produce 8% faster',cost:1,req:null},{id:'production2',branch:'Production',title:'Assembly Lines',desc:'Production +12% (stacks)',cost:2,req:'production1'},{id:'production3',branch:'Production',title:'Stellar Foundries',desc:'Production +15% (stacks)',cost:3,req:'production2'},
{id:'combat1',branch:'Combat',title:'Reinforced Hulls',desc:'Units spawn with +10% health',cost:1,req:null},{id:'combat2',branch:'Combat',title:'Reactive Armor',desc:'Units gain +1 armor',cost:2,req:'combat1'},{id:'combat3',branch:'Combat',title:'Focused Weapons',desc:'Units deal +12% damage',cost:3,req:'combat2'},
{id:'expansion1',branch:'Tactics',title:'Twin Emitters',desc:'Triangles fire two laser shots per attack',cost:1,req:null},{id:'expansion2',branch:'Tactics',title:'Shield Wall',desc:'Select 3+ squares, then drag a defensive line',cost:2,req:'expansion1'},{id:'expansion3',branch:'Tactics',title:'Bulwark Doctrine',desc:'Shield walls gain 4 additional armor',cost:3,req:'expansion2'},
{id:'command1',branch:'Command',title:'Fast Engines',desc:'Your units move 8% faster',cost:1,req:null},{id:'command2',branch:'Command',title:'Capture Drills',desc:'Capturing planets deals 12% more damage',cost:2,req:'command1'},{id:'command3',branch:'Command',title:'Advanced Logistics',desc:'Allied planets regenerate 50% faster',cost:3,req:'command2'}];
// All old upgrades retain their existing IDs and costs, preserving save compatibility.
MODS.push(
 {id:'overclock',branch:'Production',title:'Overclock Reactors',desc:'Activate 12 seconds of double production on a planet; 50-second cooldown.',cost:4,req:'production2',minLevel:15,kind:'ACTIVE'},
 {id:'factorynetwork',branch:'Production',title:'Factory Network',desc:'Nearby friendly planets increase each other’s production, up to 18%.',cost:6,req:'production3',minLevel:35,kind:'ECONOMY'},
 {id:'massfabrication',branch:'Production',title:'Mass Fabrication',desc:'Every seventh circle produced creates a bonus circle.',cost:8,req:'factorynetwork',minLevel:55,kind:'SPECIAL'},
 {id:'shieldfront',branch:'Combat',title:'Forward Shields',desc:'Squares resist frontal attacks more effectively.',cost:4,req:'combat2',minLevel:18,kind:'TACTIC'},
 {id:'fortress',branch:'Combat',title:'Fortress Doctrine',desc:'Fortify a planet against capture damage for 15 seconds; 55-second cooldown.',cost:5,req:'combat2',minLevel:25,kind:'ACTIVE'},
 {id:'shockarmor',branch:'Combat',title:'Shock Armor',desc:'Rectangle strikes damage closely packed enemies.',cost:7,req:'combat3',minLevel:45,kind:'SPECIAL'},
 {id:'cavalrycharges',branch:'Tactics',title:'Lancer Training',desc:'Cavalry charge damage increases after a long approach.',cost:4,req:'expansion1',minLevel:20,kind:'TACTIC'},
 {id:'flankdrills',branch:'Tactics',title:'Flanking Drills',desc:'Cavalry are deadlier when striking enemies from behind.',cost:5,req:'cavalrycharges',minLevel:32,kind:'TACTIC'},
 {id:'combinedarms',branch:'Tactics',title:'Combined Arms',desc:'Cavalry fighting near allied squares gain attack power.',cost:6,req:'flankdrills',minLevel:55,kind:'SPECIAL'},
 {id:'supplylines',branch:'Command',title:'Supply Lines',desc:'Your units slowly recover health near friendly planets.',cost:3,req:'command1',minLevel:15,kind:'SUPPORT'},
 {id:'warplogistics',branch:'Command',title:'Warp Logistics',desc:'Every fourth rally-spawned unit jumps forward on its supply route.',cost:6,req:'command2',minLevel:35,kind:'SPECIAL'},
 {id:'rapidredeploy',branch:'Command',title:'Rapid Redeployment',desc:'Warp every second rally-spawned unit farther forward.',cost:8,req:'warplogistics',minLevel:70,kind:'SPECIAL'}
);
const MASTERY=[
 {id:'productionmastery',branch:'Production',title:'Industrial Mastery',desc:'Another +3% production speed per rank.',costs:[2,4,6,8,10],levels:[15,30,55,85,125],req:'production2',kind:'MASTERY'},
 {id:'combatmastery',branch:'Combat',title:'Warrior Mastery',desc:'Another +3% damage per rank.',costs:[2,4,6,8,10],levels:[20,40,70,100,140],req:'combat2',kind:'MASTERY'},
 {id:'tacticsmastery',branch:'Tactics',title:'Conquest Mastery',desc:'Another +5% capture damage per rank.',costs:[2,4,6,8,10],levels:[25,50,75,110,150],req:'expansion2',kind:'MASTERY'},
 {id:'commandmastery',branch:'Command',title:'Mobility Mastery',desc:'Another +4% friendly speed per rank.',costs:[2,4,6,8,10],levels:[20,45,75,110,150],req:'command2',kind:'MASTERY'}
];
const rankOf=id=>Math.max(0,Math.min(5,Math.floor(progress.ranks?.[id]||0)));
const cavalryUnlocked=()=>progress.unlocked>=20;
const SAVE_KEY='dotfront_campaign_v1';const BACKUP_KEY='dotfront_campaign_backup_v1';const LEGACY_SAVE_KEY='starforge_campaign_v1';const LEGACY_BACKUP_KEY='starforge_campaign_backup_v1';function loadProgress(){try{let raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(BACKUP_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)||localStorage.getItem(LEGACY_BACKUP_KEY)||'{}';if(raw.length>100000)throw Error('Save too large');let o=JSON.parse(raw);return{unlocked:clamp(Math.floor(o.unlocked||1),1,CAMPAIGN_SIZE),completed:Array.isArray(o.completed)?o.completed.filter(v=>Number.isInteger(v)&&v>=1&&v<=CAMPAIGN_SIZE):[],owned:Array.isArray(o.owned)?[...new Set(o.owned.filter(v=>MODS.some(m=>m.id===v)))]:[],ranks:Object.fromEntries(MASTERY.map(m=>[m.id,Math.max(0,Math.min(m.costs.length,Math.floor(Number(o.ranks?.[m.id])||0)))]))}}catch(e){return{unlocked:1,completed:[],owned:[],ranks:{}}}}let progress=loadProgress(),currentLevel=progress.unlocked,menuTab='play',menuFromPause=false;

// Time control changes the pacing of both armies equally; it does not alter AI difficulty.
const GAME_SPEEDS=[1,2,4];let speedIndex=0;
function setGameSpeed(index){
 speedIndex=(index+GAME_SPEEDS.length)%GAME_SPEEDS.length;
 const speed=GAME_SPEEDS[speedIndex],button=$('speed');
 button.textContent='⏱ '+speed+'×';
 button.title='Battle speed '+speed+'×. Tap to change to '+GAME_SPEEDS[(speedIndex+1)%GAME_SPEEDS.length]+'×';
 button.setAttribute('aria-label',button.title);
 button.setAttribute('aria-pressed',String(speed!==1));
}
const TUTORIAL_KEY='dotfront_tutorial_v2';
const tutorialSteps=[
 {title:'Welcome to skirmish training',event:'read',scene:'basics',body:'You will learn with <b>just a few units at a time</b>. Blue is your team; red is the enemy; gray planets are neutral.<div class="tutUnits"><div><b>● Circle</b> — Fast to produce; fights up close and captures planets.</div><div><b>■ Square</b> — Armored defender; fights and captures.</div><div><b>▲ Triangle</b> — Fragile ranged laser attacker.</div><div><b>▰ Rectangle</b> — Slow heavy tank; defeats units but <b>cannot capture</b> planets.</div></div><small>We will practice selecting, moving and watching small matchups before managing a whole swarm.</small>'},
 {title:'Tap a blue circle',event:'tap',scene:'basics',body:'<b>Tap once</b> directly on any <b>blue circle</b> in the training arena. This selects ONE unit. A glowing selection ring appears around it.<br><small>If the touch target feels small, try touching the center of the bright dot.</small>'},
 {title:'Select several units',event:'select',scene:'basics',body:'Now <b>put your finger on empty space beside the blue dots, hold it down, and drag diagonally</b> so the selection box surrounds at least TWO circles. Lift your finger to select them together.<br><small>Tap = one unit. Drag a box = a group. The <b>Select all</b> button is another option during regular play.</small>'},
 {title:'Move your selected group',event:'move',scene:'basics',body:'Keep your selected circles and <b>tap an empty spot on the battlefield</b>. The group moves there together. Watch them travel.<br><small>If your selection was cleared, drag a box around the blue circles again.</small>'},
 {title:'Mini battle: circles vs triangle',event:'duel',scene:'circles',body:'This is a <b>two circles versus one triangle</b> skirmish. <b>Drag a box around the two blue circles, then tap the RED triangle.</b> Watch them close in and defeat it.<br><small>The triangle shoots from far away, but circles can overwhelm it. You will advance after the triangle is defeated.</small>'},
 {title:'Mini battle: rectangle vs triangle',event:'duel',scene:'rectangle',body:'Now try <b>one heavy rectangle against one ranged triangle</b>. <b>Tap your blue rectangle, then tap the red triangle.</b> The rectangle is slow but can absorb punishment.<br><small>Wait until the red triangle is defeated. A rectangle can fight units but cannot capture a planet.</small>'},
 {title:'Capture a neutral planet',event:'capture',scene:'capture',body:'Here is a small squad facing a <b>gray neutral planet</b>. <b>Drag to select your blue dots, then tap the gray planet.</b> Your circles and square will attack until it turns blue.<br><small>Taking planets is how you expand. Wait until the planet changes color.</small>'},
 {title:'Select a friendly planet',event:'planet',scene:'planet',body:'<b>Tap the blue HOME planet.</b> The production controls will appear at the bottom. Each friendly planet automatically makes units.'},
 {title:'Choose a unit to produce',event:'production',scene:'planet',body:'With HOME selected, tap <b>▲ Triangle</b>, <b>■ Square</b>, or another shape in the bottom bar to choose what this planet produces.<br><small>Circle = cheap swarm, square = defense, triangle = range, rectangle = tank.</small>'},
 {title:'Set a rally point',event:'rally',scene:'planet',body:'With HOME still selected, <b>tap an empty position away from HOME</b>. Newly created units automatically move to this rally point.<br><small>Rally points help concentrate troops without issuing every move manually.</small>'},
 {title:'Upgrade your planet',event:'upgrade',scene:'planet',body:'We placed <b>20 practice dots</b> beside HOME. Tap HOME if needed, then press <b>⬆ Upgrade · 20</b>. The planet consumes 20 nearby dots to become stronger.<br><small>You can also order 20+ dots onto a friendly planet. Use Skip Step if this does not work.</small>'},
 {title:'Ready for the campaign',event:'read',scene:'planet',body:'You have practiced selecting, moving, battling, capturing, producing and upgrading.<br><b>Pause</b> stops combat but allows commands. In <b>Menu → Upgrade Tree</b> you can buy permanent improvements.<br><b>Shield Wall</b> is a later Tactics unlock: select 3+ squares, tap Shield Wall, and drag a defensive line.<br><small>Finish to enter your saved campaign level. Replay training from the Menu anytime.</small>'}
];
let tutorialActive=false,tutorialIndex=0,tutorialStepDone=false,tutorialReadPause=false,tutorialScene='',tutorialFoeId=null,tutorialDetailsOpen=false;
const tutorialBriefs=[
 'Blue dots are yours; red is the enemy. Learn each control in a tiny battle.',
 'Tap one blue circle to select it.',
 'Drag a box around two or more blue circles.',
 'Tap empty space to move your selected dots.',
 'Select both blue circles, then attack the red triangle.',
 'Select the blue rectangle, then attack the red triangle.',
 'Select your blue squad and tap the gray planet.',
 'Tap your blue HOME planet.',
 'Choose a unit shape in the production bar.',
 'Tap empty ground to send new units to a rally point.',
 'Tap Upgrade · 20 to improve HOME.',
 'Training complete. Start your campaign.'
];
function tutorialPauseReading(){if(!paused&&!finished){paused=true;$('pause').textContent='▶ Resume';tutorialReadPause=true}}
function tutorialResumeReading(){if(tutorialReadPause&&!finished){paused=false;$('pause').textContent='Ⅱ Pause'}tutorialReadPause=false}
function tutorialRender(){
 const panel=$('tutorial');
 if(!panel)return;
 panel.hidden=!tutorialActive||!$('overlay').classList.contains('hidden');
 if(panel.hidden)return;
 const step=tutorialSteps[tutorialIndex];
 const reading=step.event==='read';
 panel.classList.toggle('reading',reading);
 panel.classList.toggle('controlsStep',['production','rally','upgrade'].includes(step.event));
 panel.classList.toggle('expanded',reading||tutorialDetailsOpen);
 $('production').classList.toggle('tutorialFocus',step.event==='production');$('upgrade').classList.toggle('tutorialFocus',step.event==='upgrade');
 $('tutorialBrief').textContent=tutorialBriefs[tutorialIndex];
 $('tutorialBrief').hidden=reading;
 $('tutorialBody').hidden=!reading&&!tutorialDetailsOpen;
 $('tutorialDetails').hidden=reading;
 $('tutorialDetails').textContent=tutorialDetailsOpen?'Less help':'More help';
 $('tutorialDetails').setAttribute('aria-expanded',String(tutorialDetailsOpen));
 $('tutorialCount').textContent='STEP '+(tutorialIndex+1)+' OF '+tutorialSteps.length;
 $('tutorialTitle').textContent=step.title;
 $('tutorialBody').innerHTML=step.body;
 $('tutorialFeedback').textContent=tutorialStepDone?'✓ Action completed. Continue when ready.':step.event==='read'?'Read this guide, then tap Got It.':'Complete the action in the game, or skip this step.';
 $('tutorialNext').textContent=step.event==='read'?'GOT IT':tutorialIndex===tutorialSteps.length-1?'FINISH':'NEXT STEP';
 $('tutorialNext').disabled=step.event!=='read'&&!tutorialStepDone;
}

function tutorialMakeUnit(type,team,x,y,hp){
 const unit=spawnUnit({x,y,r:0,team,rally:null},type,true);
 if(!unit)return null;
 unit.x=x;unit.y=y;unit.vx=0;unit.vy=0;unit.cooldown=0;
 if(hp){unit.hp=hp;unit.maxHp=hp}
 return unit;
}
function tutorialBuildScene(index){
 const scene=tutorialSteps[index].scene;
 if(scene===tutorialScene){
  if(tutorialSteps[index].event==='select')selected.clear();
  if(tutorialSteps[index].event==='upgrade'){
   const home=planets.find(p=>p.team===0);
   if(home){for(let i=0;i<22;i++){const a=i*2.399963,r=54+Math.sqrt(i)*11;tutorialMakeUnit('circle',0,home.x+Math.cos(a)*r,home.y+Math.sin(a)*r)}
    selectedPlanet=home}
  }
  updateHud();return;
 }
 tutorialScene=scene;tutorialFoeId=null;
 planets=[];units=[];particles=[];lasers=[];edges=[];selected.clear();selectedPlanet=null;wallPlacement=false;finished=false;elapsed=0;aiTimer=0;spawnTimer=0;nextId=1;
 if(scene==='basics'){
  tutorialMakeUnit('circle',0,600,445,52);
  tutorialMakeUnit('circle',0,660,450,52);
  tutorialMakeUnit('circle',0,720,445,52);
 }else if(scene==='circles'){
  tutorialMakeUnit('circle',0,605,450,64);
  tutorialMakeUnit('circle',0,655,480,64);
  const foe=tutorialMakeUnit('triangle',1,845,455,18);tutorialFoeId=foe&&foe.id;
 }else if(scene==='rectangle'){
  tutorialMakeUnit('rectangle',0,620,450,190);
  const foe=tutorialMakeUnit('triangle',1,840,450,32);tutorialFoeId=foe&&foe.id;
 }else if(scene==='capture'){
  const target=addPlanet(847,460,2,42,'TARGET',false);target.hp=36;target.maxHp=36;
  for(let i=0;i<4;i++)tutorialMakeUnit(i===0?'square':'circle',0,610+i*35,450+(i%2)*28,70);
 }else if(scene==='planet'){
  const home=addPlanet(620,460,0,43,'HOME',false);
  home.hp=230;home.maxHp=230;
  for(let i=0;i<4;i++)tutorialMakeUnit('circle',0,565+i*28,525,45);
 }
 resize();updateHud();
}

function tutorialStart(force=false){
 if(!force){try{if(localStorage.getItem(TUTORIAL_KEY)==='done')return}catch(e){}}
 tutorialActive=true;dismissToast();tutorialIndex=0;tutorialDetailsOpen=false;tutorialStepDone=false;tutorialReadPause=false;tutorialScene='';tutorialBuildScene(0);tutorialPauseReading();tutorialRender();
}
function tutorialFinish(){
 tutorialResumeReading();tutorialActive=false;tutorialScene='';$('tutorial').hidden=true;$('production').classList.remove('tutorialFocus');$('upgrade').classList.remove('tutorialFocus');
 try{localStorage.setItem(TUTORIAL_KEY,'done')}catch(e){}
 init();resize();
}
function tutorialNext(skip=false){
 if(!tutorialActive)return;
 const step=tutorialSteps[tutorialIndex];
 if(!skip&&step.event!=='read'&&!tutorialStepDone)return;
 if(tutorialIndex===tutorialSteps.length-1){tutorialFinish();return}
 tutorialResumeReading();tutorialIndex++;tutorialDetailsOpen=false;tutorialStepDone=false;tutorialBuildScene(tutorialIndex);if(tutorialSteps[tutorialIndex].event==='read')tutorialPauseReading();tutorialRender();
}
function tutorialAction(action,details){
 if(!tutorialActive||tutorialStepDone||!$('overlay').classList.contains('hidden'))return;
 const step=tutorialSteps[tutorialIndex];
 if(step.event!==action)return;
 if(action==='tap'&&(!details||details.type!=='circle'))return;
 if(action==='select'&&(!details||details.count<2||details.gesture!=='box'))return;
 tutorialStepDone=true;tutorialRender();
}
$('tutorialNext').onclick=()=>tutorialNext();
$('tutorialSkip').onclick=()=>tutorialNext(true);
$('tutorialDetails').onclick=()=>{tutorialDetailsOpen=!tutorialDetailsOpen;tutorialRender()};
$('tutorialExit').onclick=()=>tutorialFinish();

function saveProgress(){try{const encoded=JSON.stringify(progress);const old=localStorage.getItem(SAVE_KEY);if(old)localStorage.setItem(BACKUP_KEY,old);localStorage.setItem(SAVE_KEY,encoded)}catch(e){console.warn('Dotfront: unable to persist progress');}}
function exportProgress(){const payload={format:'dotfront-save',version:1,exported:new Date().toISOString(),progress};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dotfront-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importProgress(file){if(!file||file.size>100000){toast('Save must be a small Dotfront JSON file.');return}file.text().then(s=>{let data=JSON.parse(s);if(!['dotfront-save','starforge-save'].includes(data.format)||data.version!==1||typeof data.progress!=='object')throw Error('Invalid save');let p=data.progress;const completed=Array.isArray(p.completed)?[...new Set(p.completed.filter(v=>Number.isInteger(v)&&v>=1&&v<=CAMPAIGN_SIZE))]:[];const allowed=new Set(MODS.map(m=>m.id));const owned=Array.isArray(p.owned)?[...new Set(p.owned.filter(v=>typeof v==='string'&&allowed.has(v)))]:[];const ranks=Object.fromEntries(MASTERY.map(m=>[m.id,Math.max(0,Math.min(m.costs.length,Math.floor(Number(p.ranks?.[m.id])||0)))]));
 const rankCost=MASTERY.reduce((n,m)=>n+m.costs.slice(0,ranks[m.id]).reduce((a,b)=>a+b,0),0);
 const cost=owned.reduce((a,id)=>a+(MODS.find(m=>m.id===id)?.cost||0),0)+rankCost;
 if(cost>completed.length)throw Error('Invalid upgrade balance');
 for(const id of owned){const req=MODS.find(m=>m.id===id)?.req;if(req&&!owned.includes(req))throw Error('Invalid upgrade tree')}
 for(const m of MASTERY)if(ranks[m.id]&&m.req&&!owned.includes(m.req))throw Error('Invalid mastery tree');
 const unlocked=Math.min(CAMPAIGN_SIZE,Math.max(1,...completed.map(n=>n+1)));progress={completed,unlocked,owned,ranks};saveProgress();currentLevel=unlocked;menuFromPause=false;showMenu('play');toast('Save imported successfully.');}).catch(()=>toast('Could not import save. Check file format.'))}

function hasMod(id){return progress.owned.includes(id)}
function modValue(){
 const spent=progress.owned.reduce((a,id)=>a+(MODS.find(m=>m.id===id)?.cost||0),0);
 const masterySpent=MASTERY.reduce((total,m)=>total+m.costs.slice(0,rankOf(m.id)).reduce((sum,cost)=>sum+cost,0),0);
 return Math.max(0,progress.completed.length-spent-masterySpent);
}
function colonyCost(){return hasMod('expansion2')?20:hasMod('expansion1')?23:25}
function seeded(seed){let v=seed>>>0;return()=>{v=(Math.imul(1664525,v)+1013904223)>>>0;return v/4294967296}}
function levelDesign(n){let arc=Math.floor((n-1)/20),stage=(n-1)%20,rng=seeded(n*7027+91),template=['duel','frontier','split','rush','fortress','flank','relay','siege','mixed','boss'][stage%10];if(arc===0&&n<=3)template=['duel','frontier','relay'][n-1];
const difficultyIndex=arc+stage/20;let setups=[],names=['AURORA','VESTA','RELIC','HALO','DUSK','NOVA','DRIFT','ATLAS','RIFT','LYRA','SOL','VEGA'];
const add=(x,y,t,r=30,name)=>setups.push([Math.round(x),Math.round(y),t,r,name||names[setups.length%names.length]]);
add(155,410,0,38,'HOME');add(1240,410,1,38,'HOSTILE');
if(n>=5)add(240,650,0,27,'OUTPOST');if(n>=8)add(1160,180,1,27,'BASTION');
const patterns={duel:[[700,410],[470,410],[930,410]],frontier:[[370,300],[550,540],[840,300],[1050,545]],split:[[430,190],[430,660],[700,410],[970,190],[970,660]],rush:[[525,360],[750,160],[900,530]],fortress:[[380,350],[650,250],[670,565],[990,350]],flank:[[370,175],[390,680],[700,410],[1040,170],[1010,670]],relay:[[400,430],[700,430],[1000,430]],siege:[[360,240],[460,635],[690,375],[920,240],[1030,640]],mixed:[[430,260],[500,620],[710,430],[910,265],[950,630]],boss:[[360,160],[360,670],[690,230],[690,620],[1030,160],[1030,670],[710,440]]};
const pts=patterns[template].map(([x,y],i)=>[clamp(x+(rng()-.5)*Math.min(65,arc*8),100,1300),clamp(y+(rng()-.5)*Math.min(68,arc*8),110,735)]);
for(let i=0;i<pts.length;i++){let [x,y]=pts[i];let t=2;if((template==='fortress'||template==='siege'||template==='boss')&&i===pts.length-1)t=1;if(template==='split'&&i===0&&arc>=5)t=1;add(x,y,t,25+Math.floor(rng()*8))}
let starter=24+Math.min(24,Math.floor(n/13)),enemyStarter=16+Math.floor(n/18)+Math.min(12,arc*2),aiStyle=['expander','raider','defender','swarm','siege'][Math.floor((stage+arc)/2)%5];
if(n<=3){starter=[6,9,12][n-1];enemyStarter=[3,5,7][n-1]}if(template==='rush')enemyStarter+=10;if(template==='boss')enemyStarter+=16;
return{arc,stage,template,setups,starter,enemyStarter,aiStyle,title:`${ARC_NAMES[arc]} · ${template.charAt(0).toUpperCase()+template.slice(1)}`,hint:({duel:'Use your production advantage to win the first battle.',frontier:'Claim neutral worlds before the enemy does.',split:'Divide your army to threaten multiple routes.',rush:'The enemy begins with a stronger swarm. Defend first.',fortress:'Break through defended worlds with mixed units.',flank:'Capture distant planets to surround the opponent.',relay:'Establish a production chain toward the enemy.',siege:'Protect your tanks and ranged units while capturing.',mixed:'Choose the correct troops for each approach.',boss:'Control the center while defending both flanks.'})[template]}}

// Curated opening chapter: each stage deliberately changes the topology and resource balance.
// Records are [x,y,team,radius,name]. These are authored layouts, not random rearrangements.
const OPENING_MISSIONS=[
 {name:'First Light',style:'defender',hint:'Select a swarm and capture the central world.',start:6,foe:3,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[665,425,2,29,'BRIDGE']]},
 {name:'The Shortcut',style:'expander',hint:'The closer planet is not always the most valuable. Claim production early.',start:9,foe:5,sites:[[155,420,0,38,'HOME'],[1240,420,1,38,'HOSTILE'],[440,410,2,30,'NEAR'],[790,275,2,30,'UPPER'],[960,580,2,28,'LOWER']]},
 {name:'The Long Road',style:'expander',hint:'Build momentum through a chain of neutral worlds.',start:12,foe:7,sites:[[155,410,0,38,'HOME'],[1240,410,1,38,'HOSTILE'],[390,410,2,28,'GATE'],[695,410,2,28,'RELAY'],[980,410,2,28,'FRONT']]},
 {name:'A Fork in Space',style:'raider',hint:'Choose which of two routes to develop, then defend the weak flank.',start:16,foe:10,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[425,230,2,30,'NORTH'],[425,655,2,30,'SOUTH'],[770,230,2,28,'RIDGE'],[770,655,2,28,'VALLEY']]},
 {name:'Forward Station',style:'expander',hint:'Use your forward outpost to capture the center before the enemy.',start:20,foe:13,sites:[[155,410,0,38,'HOME'],[1240,410,1,38,'HOSTILE'],[355,540,0,27,'OUTPOST'],[690,420,2,32,'CENTER'],[910,220,2,25,'HILL']]},
 {name:'Under Pressure',style:'raider',hint:'An early enemy rush is coming. Decide whether to defend or counterattack.',start:24,foe:17,sites:[[155,410,0,38,'HOME'],[1240,410,1,38,'HOSTILE'],[475,420,2,29,'SHIELD'],[825,420,2,29,'GATE'],[680,665,2,27,'SOUTH']]},
 {name:'Two Fronts',style:'swarm',hint:'Divide production and keep both lanes supplied.',start:28,foe:19,sites:[[155,415,0,38,'HOME'],[1240,415,1,38,'HOSTILE'],[430,180,2,28,'NORTH'],[430,680,2,28,'SOUTH'],[970,180,2,28,'NORTH II'],[970,680,2,28,'SOUTH II']]},
 {name:'Exposed Flank',style:'raider',hint:'The enemy owns a forward bastion. Attack its supply line, not just its units.',start:31,foe:21,sites:[[155,410,0,38,'HOME'],[1240,410,1,38,'HOSTILE'],[970,185,1,28,'BASTION'],[390,175,2,28,'NORTH'],[460,665,2,28,'SOUTH'],[750,410,2,32,'CENTER']]},
 {name:'Hold the Line',style:'defender',hint:'An extra starting planet helps only if you protect it.',start:34,foe:23,sites:[[155,410,0,38,'HOME'],[1240,410,1,38,'HOSTILE'],[280,665,0,27,'RESERVE'],[690,410,2,31,'PASS'],[780,190,2,28,'LEDGE'],[970,655,2,28,'GAP']]},
 {name:'First Siege',style:'siege',hint:'Capture territory with circles while armored allies hold the front.',start:38,foe:32,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[1040,230,1,28,'FORT'],[440,260,2,28,'SUPPLY'],[690,425,2,32,'PASS'],[480,670,2,28,'FLANK']]},
 {name:'Empty Center',style:'expander',hint:'Race for both distant resources instead of fighting in the middle.',start:42,foe:29,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[635,150,2,30,'UPPER'],[750,700,2,30,'LOWER'],[475,440,2,25,'WEST'],[950,430,2,25,'EAST']]},
 {name:'Three Lanes',style:'swarm',hint:'Control two of the three paths and force the enemy to split.',start:44,foe:35,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[470,170,2,27,'TOP'],[470,425,2,27,'MIDDLE'],[470,680,2,27,'BOTTOM'],[920,170,2,27,'TOP II'],[920,425,2,27,'MID II'],[920,680,2,27,'BOT II']]},
 {name:'Counterattack',style:'raider',hint:'The enemy has the early advantage. Draw out its forces and hit back.',start:46,foe:46,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[315,650,0,27,'HARBOR'],[580,270,2,29,'NORTH'],[590,620,2,29,'SOUTH'],[900,420,2,32,'RELIC']]},
 {name:'Long Flank',style:'defender',hint:'The defended center is costly. Expand around the sides instead.',start:43,foe:43,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[910,425,1,30,'WALL'],[410,170,2,29,'NORTH'],[410,690,2,29,'SOUTH'],[755,170,2,29,'NORTH II'],[755,690,2,29,'SOUTH II']]},
 {name:'Production Race',style:'expander',hint:'Capture several small planets quickly before superior enemy forces arrive.',start:46,foe:30,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[350,240,2,25,'A'],[350,600,2,25,'B'],[580,425,2,25,'C'],[780,225,2,25,'D'],[780,635,2,25,'E'],[1040,420,2,25,'F']]},
 {name:'Central Lock',style:'siege',hint:'Two enemy defenses protect the approach. Build a larger combined army.',start:48,foe:44,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[910,270,1,27,'LOCK A'],[910,580,1,27,'LOCK B'],[410,250,2,29,'NORTH'],[410,600,2,29,'SOUTH'],[665,425,2,30,'HUB']]},
 {name:'Split Supply',style:'raider',hint:'Your outpost is isolated. Decide whether to rescue it or use it as a distraction.',start:46,foe:48,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[870,665,0,27,'CUT OFF'],[470,210,2,30,'NORTH'],[680,425,2,29,'MID'],[1010,205,1,27,'WATCH']]},
 {name:'Enemy Industry',style:'defender',hint:'The enemy starts with three planets. Expand before launching a focused strike.',start:53,foe:43,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[1050,185,1,27,'YARD'],[1050,665,1,27,'DOCK'],[360,270,2,28,'NORTH'],[360,590,2,28,'SOUTH'],[670,425,2,33,'HUB']]},
 {name:'The Pincer',style:'swarm',hint:'Threaten both sides simultaneously so the enemy cannot reinforce everything.',start:52,foe:50,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[330,170,0,27,'NORTH BASE'],[330,680,0,27,'SOUTH BASE'],[690,170,2,29,'RIDGE'],[690,680,2,29,'VALLEY'],[970,425,1,27,'GUARD']]},
 {name:'Gatekeeper',style:'siege',hint:'Chapter final: preserve your economy, dismantle the forward forts, then capture the core.',start:60,foe:60,sites:[[155,425,0,38,'HOME'],[1240,425,1,38,'HOSTILE'],[310,670,0,27,'RESERVE'],[1000,230,1,29,'NORTH FORT'],[1000,625,1,29,'SOUTH FORT'],[440,200,2,28,'NORTH PATH'],[440,650,2,28,'SOUTH PATH'],[685,425,2,32,'CENTER'],[770,195,2,26,'RIDGE'],[770,655,2,26,'VALLEY']]}
];
const proceduralLevelDesign=levelDesign;
levelDesign=function(n){
 const base=proceduralLevelDesign(n);
 if(n<=OPENING_MISSIONS.length){const o=OPENING_MISSIONS[n-1];return {...base,setups:o.sites.map(s=>s.slice()),starter:o.start,enemyStarter:o.foe,aiStyle:o.style,title:'First Contact · '+o.name,hint:o.hint,handcrafted:true};}
 // Campaign remains deterministic, with rotating tactical pressures; later chapters need playtesting.
 const scenarios=['Contested center','Fast expansion','Defensive stand','Flanking operation','Ranged engagement','Armored assault','Split economy','Enemy foothold','Counteroffensive','Chapter showdown'];
 const part=(n-21)%10;
 return {...base,title:ARC_NAMES[base.arc]+' · '+scenarios[part],hint:base.hint+' Enemy doctrine: '+base.aiStyle+'.'};
};

let bonusKey='',cachedBonuses=null;
function levelBonuses(){
 const key=currentLevel+'|'+progress.owned.join(',')+'|'+MASTERY.map(m=>rankOf(m.id)).join(',');
 if(key===bonusKey&&cachedBonuses)return cachedBonuses;
 const d=levelDesign(currentLevel);
 bonusKey=key;cachedBonuses={
  prod:1+(hasMod('production1')?.08:0)+(hasMod('production2')?.12:0)+(hasMod('production3')?.15:0)+rankOf('productionmastery')*.03,
  speed:1+(hasMod('command1')?.08:0)+rankOf('commandmastery')*.04,
  hp:1+(hasMod('combat1')?.10:0),armor:hasMod('combat2')?1:0,
  damage:(hasMod('combat3')?1.12:1)*(1+rankOf('combatmastery')*.03),
  capture:(hasMod('command2')?1.12:1)*(1+rankOf('tacticsmastery')*.05),
  regen:hasMod('command3')?1.5:1,aiScale:1+Math.min(.6,(currentLevel-1)/400),design:d
 };
 return cachedBonuses;
}
function buyMod(id){let m=MODS.find(m=>m.id===id);if(!m||hasMod(id)||m.req&&!hasMod(m.req)||modValue()<m.cost)return;progress.owned.push(id);saveProgress();showMenu('upgrades')}
function showMenu(tab='play'){menuTab=tab;paused=true;$('pause').textContent='▶ Resume';$('overlay').classList.remove('hidden');tutorialRender();let d=levelDesign(currentLevel),nav=`<div class="modalNav"><button class="button ${tab==='play'?'active':''}" data-tab="play">Campaign</button><button class="button ${tab==='upgrades'?'active':''}" data-tab="upgrades">Upgrade tree</button><button class="button ${tab==='levels'?'active':''}" data-tab="levels">Levels</button></div>`,body='';
if(tab==='upgrades'){body=`<p>Earn 1 upgrade point the first time you beat each level. <span id="upgradePoints">${modValue()} points available</span>.</p><div id="upgradeTree">${['Production','Combat','Tactics','Command'].map(branch=>`<div class="branch"><strong>${branch.toUpperCase()}</strong>${MODS.filter(m=>m.branch===branch).map(m=>{let owned=hasMod(m.id),locked=m.req&&!hasMod(m.req);return `<button class="button node ${owned?'owned':locked?'locked':''}" data-buy="${m.id}" ${owned||locked||modValue()<m.cost?'disabled':''}>${owned?'✓':locked?'🔒':'+'} ${m.title} · ${m.cost} pt${m.cost===1?'':'s'}<small>${m.desc}${locked?' · Requires '+MODS.find(o=>o.id===m.req).title:''}</small></button>`}).join('')}</div>`).join('')}</div><p class="subtle">All purchased upgrades apply to every future battle and replayed level.</p>`}
else if(tab==='levels'){body=`<p>Select any unlocked level. Completed levels are marked ✓.</p><div id="levelChooser">${Array.from({length:CAMPAIGN_SIZE},(_,i)=>{let n=i+1,done=progress.completed.includes(n);return `<button class="button ${done?'done':''} ${n===currentLevel?'active':''}" data-level="${n}" ${n>progress.unlocked?'disabled':''}>${done?'✓ ':''}${n}</button>`}).join('')}</div>`}
else body=`<div class="campaignInfo"><b>Level ${currentLevel} / ${CAMPAIGN_SIZE} — ${d.title}</b><br>${d.hint}<br>Enemy strategy: ${d.aiStyle} · ${d.setups.length} planets · Completed: ${progress.completed.length}/${CAMPAIGN_SIZE}<br><span class="subtle">Each level has a repeatable, seeded layout. The enemy evolves over the campaign.</span></div><label id="difficultyLabel" for="difficulty">ENEMY DIFFICULTY</label><select id="difficulty"><option value="easy">Easy — slower AI, 18s head start</option><option value="normal">Normal — balanced, 6s head start</option><option value="hard">Hard — faster AI, no head start</option></select>`;
$('modal').innerHTML=`<h2>DOTFRONT</h2>${nav}${body}<div class="modalNav"><button class="button" id="resumeGame">${menuFromPause&&!finished?'RESUME':'CLOSE'}</button><button class="button" id="restartLevel">↺ RESTART LEVEL</button><button class="button" id="playLevel">▶ ${currentLevel===progress.unlocked&&!progress.completed.includes(currentLevel)?"CONTINUE":"PLAY"} LEVEL ${currentLevel}</button></div><div class="modalNav"><button class="button" id="tutorialReplay">? TUTORIAL</button><button class="button" id="exportSave">Export save</button><button class="button" id="importSave">Import save</button><input id="saveFile" type="file" accept="application/json,.json" style="display:none"></div>`;
$('tutorialReplay').onclick=()=>{const resume=!finished&&planets.length>0;if(resume){$('overlay').classList.add('hidden');paused=false;$('pause').textContent='Ⅱ Pause'}else startLevel();tutorialStart(true)};
$('exportSave').onclick=exportProgress;$('importSave').onclick=()=>$('saveFile').click();$('saveFile').onchange=e=>{const file=e.target.files?.[0];if(file)importProgress(file)};
if($('difficulty'))$('difficulty').value=difficulty;
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>showMenu(b.dataset.tab);
for(const b of document.querySelectorAll('[data-buy]'))b.onclick=()=>buyMod(b.dataset.buy);
for(const b of document.querySelectorAll('[data-level]'))b.onclick=()=>{currentLevel=+b.dataset.level;showMenu('play')};
$('resumeGame').onclick=()=>{if(!menuFromPause||finished){startLevelAfterAdBreak();return}$('overlay').classList.add('hidden');paused=false;$('pause').textContent='Ⅱ Pause';tutorialRender()};
$('restartLevel').onclick=()=>{difficulty=$('difficulty')?.value||difficulty;startLevel()};
$('playLevel').onclick=()=>{difficulty=$('difficulty')?.value||difficulty;startLevelAfterAdBreak()};}
function startLevelAfterAdBreak(){if(window.DotfrontAds)window.DotfrontAds.beforeNextBattle(startLevel);else startLevel()}
function startLevel(){if(tutorialActive){tutorialActive=false;tutorialScene='';tutorialReadPause=false;$('tutorial').hidden=true}if(currentLevel>progress.unlocked)currentLevel=progress.unlocked;$('overlay').classList.add('hidden');$('menu').style.display='block';init();if(!tutorialActive)tutorialStart();else tutorialRender()}

function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(2,devicePixelRatio||1);c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);scale=Math.min((width-24)/W,(height-42)/(H*.78));if(tutorialActive)scale=Math.min(1.25,scale*1.65);ox=(width-W*scale)/2;oy=(height-H*.78*scale)/2+15;if(tutorialActive&&width>height&&height<500)ox-=width*.14;g.setTransform(dpr,0,0,dpr,0,0);rebuildStarBackground()}

function rebuildStarBackground(){
 const sky=document.createElement('canvas'),density=Math.min(dpr,1.5);
 sky.width=Math.max(1,Math.round(width*density));sky.height=Math.max(1,Math.round(height*density));
 const ctx=sky.getContext('2d',{alpha:false});ctx.setTransform(density,0,0,density,0,0);
 const base=ctx.createLinearGradient(0,0,width,height);
 base.addColorStop(0,'#030816');base.addColorStop(.46,'#080d20');base.addColorStop(1,'#110b23');
 ctx.fillStyle=base;ctx.fillRect(0,0,width,height);
 const rng=seeded((Math.imul(Math.round(width)+19,92837111)^Math.imul(Math.round(height)+67,689287499)^0xD07F0A)>>>0);
 const span=Math.max(width,height);
 const clouds=[[width*(.12+rng()*.24),height*(.15+rng()*.32),span*.65,'44,100,180',.10],[width*(.53+rng()*.32),height*(.42+rng()*.3),span*.57,'120,64,162',.075],[width*(.3+rng()*.4),height*(.69+rng()*.2),span*.44,'32,144,162',.055]];
 for(const [x,y,r,color,a] of clouds){
  const grad=ctx.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,'rgba('+color+','+a+')');grad.addColorStop(.48,'rgba('+color+','+(a*.35)+')');grad.addColorStop(1,'rgba('+color+',0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
 }
 const layers=[[24000,.3,.85,.32],[14000,.55,1.25,.53],[29000,1,2,.75]];
 for(let layer=0;layer<layers.length;layer++){
  const [spacing,minR,maxR,opacity]=layers[layer],count=Math.min(260,Math.max(10,Math.round(width*height/spacing)));
  for(let i=0;i<count;i++){
   const x=rng()*width,y=rng()*height,r=minR+rng()*(maxR-minR),alpha=opacity*(.42+rng()*.58),tint=rng();
   const rgb=tint<.13?'255,216,194':tint>.78?'161,211,255':'229,239,255';
   if(layer===2&&r>1.5){const halo=ctx.createRadialGradient(x,y,0,x,y,r*5);halo.addColorStop(0,'rgba('+rgb+','+(alpha*.16)+')');halo.addColorStop(1,'rgba('+rgb+',0)');ctx.fillStyle=halo;ctx.fillRect(x-r*5,y-r*5,r*10,r*10)}
   ctx.fillStyle='rgba('+rgb+','+alpha+')';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
 }
 const shade=ctx.createRadialGradient(width*.5,height*.48,Math.min(width,height)*.14,width*.5,height*.48,span*.77);
 shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.26)');
 ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);starBackground=sky;
}
function p2s(x,y,z=0){return{x:ox+(x+(y-H/2)*.075)*scale,y:oy+(y*.78-z*.9)*scale}}function s2p(x,y){const wy=(y-oy)/(scale*.78);return{x:(x-ox)/scale-(wy-H/2)*.075,y:wy}}function cleanSelected(){for(const u of selected)if(u.dead||u.team!==0)selected.delete(u);if(selectedPlanet&&selectedPlanet.team!==0)selectedPlanet=null}
function init(){$('pause').textContent='Ⅱ Pause';planets=[];units=[];particles=[];lasers=[];edges=[];selected.clear();selectedPlanet=null;wallPlacement=false;finished=false;elapsed=0;aiTimer=0;spawnTimer=0;nextId=1;paused=false;
const design=levelDesign(currentLevel),setups=design.setups;for(const [x,y,t,r,name] of setups)addPlanet(x,y,t,r,name,false);for(let i=0;i<design.starter;i++)spawnUnit(planets[0],i%7===0?'square':'circle',true);for(let i=0;i<design.enemyStarter;i++)spawnUnit(planets[1],i%7===0?'square':'circle',true);for(const p of planets){if(p.team===0&&p!==planets[0])for(let i=0;i<7;i++)spawnUnit(p,'circle',true);if(p.team===1&&p!==planets[1])for(let i=0;i<5;i++)spawnUnit(p,'circle',true)}$('modeMove').classList.add('active');updateHud();toast('Select your units by dragging a box, then click a destination.');}
function addPlanet(x,y,team,r,name,constructed=true){const p={id:nextId++,x,y,team,r,name:name||('STAR '+Math.floor(rand(100,999))),hp:team===2?180:230,maxHp:team===2?180:230,type:'circle',level:1,spawn:rand(0,.5),rally:null,flash:0,pulse:rand(0,7),built:constructed?0:1,shield:0};planets.push(p);burst(x,y,team,19,2);return p}
function spawnUnit(p,type,instant=false){if(units.length>=1100)return null;if(units.length>800&&units.reduce((count,u)=>count+(!u.dead&&u.team===p.team),0)>=700)return null;let a=rand(0,Math.PI*2),r=rand(p.r+10,p.r+52);let u={id:nextId++,x:clamp(p.x+Math.cos(a)*r,12,W-12),y:clamp(p.y+Math.sin(a)*r,12,H-12),team:p.team,type,hp:specs[type].hp*(p.team===0?levelBonuses().hp:1),maxHp:specs[type].hp*(p.team===0?levelBonuses().hp:1),vx:0,vy:0,z:rand(7,15),bob:rand(0,6.28),cooldown:rand(0,.8),angle:a,target:null,moveTo:null,upgradeTarget:null,seed:rand(-1,1),shieldWall:null,dead:false};units.push(u);if(p.rally)u.moveTo={x:p.rally.x+rand(-15,15),y:p.rally.y+rand(-15,15)};else if(p.team===1&&!instant){let target=nearestEnemyPlanet(p,1);if(target&&Math.random()<.35)u.moveTo={x:target.x+rand(-30,30),y:target.y+rand(-30,30)}}return u}
function burst(x,y,t,n=8,strength=1){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),v=rand(15,85)*strength;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rand(5,45),life:rand(.24,.7),max:.7,size:rand(1,3.4)*strength,team:t})}if(particles.length>1200)particles.splice(0,particles.length-1200)}
function nearestEnemyPlanet(origin,team){let best=null,d=Infinity;for(const p of planets)if(p.team!==team){let q=dist(p,origin)*(p.team===2?.86:1);if(q<d){d=q;best=p}}return best}
function order(list,pos,upgradePlanet=null){let n=0;for(const u of list){if(u.dead||u.team!==0)continue;u.shieldWall=null;let a=n*2.39996,r=Math.sqrt(n)*6;u.moveTo={x:clamp(pos.x+Math.cos(a)*r,10,W-10),y:clamp(pos.y+Math.sin(a)*r,10,H-10)};u.target=null;u.upgradeTarget=upgradePlanet&&upgradePlanet.level<3?upgradePlanet.id:null;n++}if(n)burst(pos.x,pos.y,0,7,.32);return n}
function buildAt(pos,team=0,force=false){if(pos.x<55||pos.x>W-55||pos.y<65||pos.y>H-65){if(team===0)toast('Build inside the starfield.');return false}if(planets.some(p=>dist(p,pos)<p.r+75)){if(team===0)toast('Too close to another planet.');return false}let pool=units.filter(u=>!u.dead&&u.team===team&&(force?dist(u,pos)<310:selected.has(u)));let cost=team===0?colonyCost():25;if(pool.length<cost){if(team===0)toast(`Need ${cost} selected units (${pool.length} available).`);return false}pool.sort((a,b)=>dist(a,pos)-dist(b,pos));for(const u of pool.slice(0,cost)){u.dead=true;selected.delete(u);burst(u.x,u.y,team,5,.53)}let newP=addPlanet(pos.x,pos.y,team,27,team===0?'NEW STAR':'RIFT');if(team===0&&hasMod('expansion3')){newP.maxHp+=100;newP.hp+=100}if(team===0){toast('New planet forged — '+cost+' units converted to matter.')}return true}
function capturePlanet(p,team){p.team=team;p.hp=p.maxHp*.55;p.type='circle';p.level=1;p.spawn=0;p.rally=null;p.flash=1;p.shield=1.6;burst(p.x,p.y,team,55,1.8);if(selectedPlanet===p&&team!==0)selectedPlanet=null;if(team===0)toast(p.name+' captured!');else toast('An enemy captured '+p.name+'.');}
function update(dt){elapsed+=dt;aiTimer+=dt;lasers=lasers.filter(l=>(l.life-=dt)>0);for(const p of planets){p.pulse+=dt;p.flash=Math.max(0,p.flash-dt*1.7);p.shield=Math.max(0,p.shield-dt);if(p.team===2)continue;p.spawn+=dt*(p.level===1?1:1.35)*(p.team===1?aiConfig[difficulty].production*levelBonuses().aiScale:levelBonuses().prod);while(p.spawn>=specs[p.type].period){p.spawn-=specs[p.type].period;spawnUnit(p,p.type)}p.hp=Math.min(p.maxHp,p.hp+dt*(p.level>1?2.8:1.2)*(p.team===0?levelBonuses().regen:1))}
const cell=115,cells=new Map(),key=(x,y)=>Math.floor(x/cell)+','+Math.floor(y/cell);for(const u of units)if(!u.dead){let k=key(u.x,u.y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(u)}const near=(u)=>{let result=[],cx=Math.floor(u.x/cell),cy=Math.floor(u.y/cell);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){let a=cells.get((cx+i)+','+(cy+j));if(a)result.push(...a)}return result};
for(const u of units){if(u.dead)continue;const spec=specs[u.type];u.bob+=dt*3;u.cooldown-=dt;let enemy=null,ed=Infinity;
for(const v of near(u))if(v.team!==u.team&&!v.dead){let d=dist(u,v);if(d<Math.max(70,spec.range+18)&&d<ed){ed=d;enemy=v}}
let ep=null,epd=Infinity;
for(const p of planets)if(p.team!==u.team){const d=dist(u,p)-p.r;if(d<Math.max(68,spec.range+18)&&d<epd){epd=d;ep=p}}
// Fire at a nearby enemy unit; triangles hold their laser firing distance.
if(enemy&&ed<spec.range+4){
 if(u.cooldown<=0){
  const wallArmor=enemy.team===0&&enemy.type==='square'&&enemy.shieldWall&&dist(enemy,enemy.shieldWall)<27?(hasMod('expansion3')?10:6):0;
  const hit=Math.max(1,spec.damage*(u.team===0?levelBonuses().damage:1)-(specs[enemy.type].armor||0)-(enemy.team===0?levelBonuses().armor:0)-wallArmor);enemy.hp-=hit;
  if(u.team===0&&u.type==='triangle'&&hasMod('expansion1'))enemy.hp-=hit;
  u.cooldown=spec.attackPeriod;
  if(spec.ranged){lasers.push({x1:u.x,y1:u.y,x2:enemy.x,y2:enemy.y,team:u.team,life:.16,max:.16});if(u.team===0&&u.type==='triangle'&&hasMod('expansion1'))lasers.push({x1:u.x+4,y1:u.y+3,x2:enemy.x-4,y2:enemy.y-3,team:u.team,life:.18,max:.18})}
  else burst(enemy.x,enemy.y,enemy.team,2,.3);
  if(enemy.hp<=0){enemy.dead=true;selected.delete(enemy);burst(enemy.x,enemy.y,enemy.team,9,.8)}
 }
 u.vx*=.75;u.vy*=.75;continue;
}
// Rectangles can kill defenders but cannot damage or capture planets.
if(ep&&epd<spec.range&&spec.capture){
 if(u.cooldown<=0&&ep.shield<=0){
  const healthFactor=.3+.7*clamp(u.hp/u.maxHp,0,1);
  const captureDamage=spec.damage*.7*healthFactor*(u.team===0?levelBonuses().capture*levelBonuses().damage:1)*(u.team===0&&u.type==='triangle'&&hasMod('expansion1')?2:1);
  ep.hp-=captureDamage;u.cooldown=spec.attackPeriod;ep.flash=.22;
  if(spec.ranged)lasers.push({x1:u.x,y1:u.y,x2:ep.x,y2:ep.y,team:u.team,life:.16,max:.16});
  else burst(ep.x+rand(-ep.r,ep.r),ep.y+rand(-ep.r,ep.r),ep.team,3,.3);
  if(ep.hp<=0)capturePlanet(ep,u.team);
 }
 continue;
}
let goal=u.moveTo;if(enemy&&ed<65)goal=enemy;else if(ep&&epd<65&&spec.capture)goal=ep;if(goal){let dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy);if(d>6){let speed=spec.speed*(u.team===1?aiConfig[difficulty].speed:levelBonuses().speed)*(d<35?.5:1);u.vx+=(dx/d*speed-u.vx)*Math.min(1,dt*5);u.vy+=(dy/d*speed-u.vy)*Math.min(1,dt*5)}else{u.vx*=Math.max(0,1-dt*7);u.vy*=Math.max(0,1-dt*7);if(goal===u.moveTo)u.moveTo=null}}else{u.vx*=Math.max(0,1-dt*5);u.vy*=Math.max(0,1-dt*5)}if(u.shieldWall&&!u.moveTo&&dist(u,u.shieldWall)>13)u.moveTo={x:u.shieldWall.x,y:u.shieldWall.y};// soft nearby ally separation
let sx=0,sy=0,k=0;for(const other of near(u))if(other!==u&&other.team===u.team&&!other.dead){let dx=u.x-other.x,dy=u.y-other.y,d2=dx*dx+dy*dy;if(d2>0&&d2<160){sx+=dx/Math.sqrt(d2);sy+=dy/Math.sqrt(d2);if(++k>10)break}}u.x=clamp(u.x+(u.vx+sx*18)*dt,4,W-4);u.y=clamp(u.y+(u.vy+sy*18)*dt,4,H-4);if(Math.hypot(u.vx,u.vy)>3)u.angle=Math.atan2(u.vy,u.vx)}processUpgradeArrivals();units=units.filter(u=>!u.dead);for(const pa of particles){pa.x+=pa.vx*dt;pa.y+=pa.vy*dt;pa.vx*=Math.max(0,1-dt*2);pa.vy*=Math.max(0,1-dt*2);pa.life-=dt}particles=particles.filter(p=>p.life>0);if(tutorialActive){const step=tutorialSteps[tutorialIndex];if(step.event==='duel'&&tutorialFoeId&&!units.some(u=>!u.dead&&u.id===tutorialFoeId))tutorialAction('duel');if(step.event==='capture'&&planets.some(p=>p.team===0&&p.name==='TARGET'))tutorialAction('capture')}else{if(elapsed>=aiConfig[difficulty].delay&&aiTimer>aiConfig[difficulty].interval/Math.min(1.6,levelBonuses().aiScale)){aiTimer=0;aiThink()}checkEnd()}updateHud();}
function performUpgrade(p,pool){if(!p||p.team!==0||p.level>=3||pool.length<20)return false;for(const u of pool.slice(0,20)){u.dead=true;selected.delete(u);burst(u.x,u.y,0,5,.55)}p.level++;p.maxHp+=85;p.hp=p.maxHp;burst(p.x,p.y,0,38,1.5);toast(p.name+' upgraded to level '+p.level+'! 20 dots consumed.');updateHud();tutorialAction('upgrade');return true}
function processUpgradeArrivals(){for(const p of planets){if(p.team!==0||p.level>=3)continue;const pool=units.filter(u=>!u.dead&&u.team===0&&u.upgradeTarget===p.id&&dist(u,p)<p.r+76);if(pool.length>=20){performUpgrade(p,pool);for(const u of units)if(u.upgradeTarget===p.id)u.upgradeTarget=null}}}
// Utility-based AI: estimates local defense, opportunities, and threat rather than always attacking nearest.
function aiPower(u){return (u.hp/u.maxHp)*(u.type==='rectangle'?2.7:u.type==='square'?1.9:u.type==='triangle'?1.35:1)}
function aiSend(group,target,count){group.sort((a,b)=>dist(a,target)-dist(b,target));let sent=0;for(const u of group){if(sent>=count)break;const a=sent*2.399963,r=Math.sqrt(sent)*5.8;u.moveTo={x:clamp(target.x+Math.cos(a)*r,8,W-8),y:clamp(target.y+Math.sin(a)*r,8,H-8)};u.aiOrder=elapsed;u.upgradeTarget=null;sent++}return sent}
function aiThink(){
 const doctrine=levelBonuses().design.aiStyle,owned=planets.filter(p=>p.team===1),foe=planets.filter(p=>p.team===0),neutral=planets.filter(p=>p.team===2),mine=units.filter(u=>u.team===1&&!u.dead),theirs=units.filter(u=>u.team===0&&!u.dead);
 if(!owned.length||!foe.length)return;
 const radiusCount=(arr,p,r)=>arr.filter(u=>dist(u,p)<r), power=arr=>arr.reduce((s,u)=>s+aiPower(u),0);
 const aggressive=doctrine==='raider'||doctrine==='swarm',cautious=doctrine==='defender';
 const preferences={expander:{neutral:80,attack:0,defense:15},raider:{neutral:15,attack:65,defense:-5},defender:{neutral:25,attack:-15,defense:70},swarm:{neutral:40,attack:30,defense:10},siege:{neutral:10,attack:30,defense:35}}[doctrine];
 // Strategic production: reinforce under threat; otherwise pick an army composition appropriate to doctrine.
 for(const p of owned){
  const friendly=radiusCount(mine,p,220),enemies=radiusCount(theirs,p,280),threat=power(enemies),guard=power(friendly);
  const mix=theirs.filter(u=>dist(u,p)<390);const tanks=mix.filter(u=>u.type==='square'||u.type==='rectangle').length, ranged=mix.filter(u=>u.type==='triangle').length;
  if(threat>guard*.75&&enemies.length>3)p.type=tanks>ranged?'triangle':'square';
  else if(doctrine==='siege')p.type=mine.filter(u=>u.type==='rectangle').length<mine.length*.14?'rectangle':mine.filter(u=>u.type==='triangle').length<mine.length*.3?'triangle':'circle';
  else if(doctrine==='defender')p.type=mine.filter(u=>u.type==='square').length<mine.length*.24?'square':'circle';
  else if(doctrine==='raider')p.type=mine.filter(u=>u.type==='triangle').length<mine.length*.29?'triangle':'circle';
  else if(doctrine==='swarm'||doctrine==='expander')p.type='circle';
  if(p.level<2&&friendly.length>=68&&threat<guard*.35&&elapsed>35){p.level=2;p.maxHp+=85;p.hp+=85;burst(p.x,p.y,1,10,.6)}
 }
 // Defend valuable threatened planets first. Leave an actual reserve rather than throwing every unit forward.
 const threatened=owned.map(p=>({p,threat:power(radiusCount(theirs,p,260)),defenders:power(radiusCount(mine,p,180))})).filter(t=>t.threat>t.defenders*.65&&t.threat>5).sort((a,b)=>b.threat/(b.defenders+1)-a.threat/(a.defenders+1));
 for(const emergency of threatened.slice(0,2)){
  const reinforcements=mine.filter(u=>dist(u,emergency.p)>160&&dist(u,emergency.p)<590&&(!u.aiOrder||elapsed-u.aiOrder>7));
  if(reinforcements.length>5){const needed=Math.ceil(Math.min(reinforcements.length*.65,Math.max(8,emergency.threat*1.15-emergency.defenders)));aiSend(reinforcements,emergency.p,needed)}
 }
 const targets=[...neutral,...foe];
 for(const p of owned){
  const local=mine.filter(u=>dist(u,p)<265&&(!u.aiOrder||elapsed-u.aiOrder>7));
  if(local.length<8)continue;
  const availablePower=power(local),nearEnemy=power(radiusCount(theirs,p,250)),reserve=(cautious?17:aggressive?7:11)+nearEnemy*.55;
  if(availablePower<reserve+7)continue;
  let best=null,bestScore=-Infinity;
  for(const t of targets){
    const distance=dist(p,t),defenders=radiusCount(theirs,t,150),defPower=power(defenders),attackers=local.filter(u=>u.type!=='rectangle'),capturePower=power(attackers);
    if(t.team===2&&attackers.length<5)continue;
    if(t.team===0&&attackers.length<5)continue;
    const effective=availablePower-reserve;
    const attackCost=(t.team===2?12:22)+defPower*(t.team===2?.85:1.25)+(t.hp/t.maxHp)*10;
    const tooHard=effective<attackCost*(difficulty==='easy'?1.35:difficulty==='hard'?.7:1);
    const centerBonus=Math.max(0,1-Math.abs(t.x-W/2)/(W/2))*12;
    const economyValue=t.team===2?28:16;
    let score=85+(t.team===2?preferences.neutral:preferences.attack)+economyValue+centerBonus-distance*.055-defPower*.85;
    if(t.team===0){score+=(1-t.hp/t.maxHp)*35;score+=t.level>1?11:0}
    if(tooHard)score-=difficulty==='hard'?37:70;
    // Slightly prefer the same rally direction to avoid pointless oscillation.
    if(p.rally&&dist(p.rally,t)<65)score+=10;
    if(score>bestScore){bestScore=score;best=t}
  }
  if(!best||bestScore<0){p.rally=null;continue}
  const adjacent=radiusCount(theirs,best,140),resist=power(adjacent);
  const count=clamp(Math.ceil((best.team===2?12:21)+resist*1.2+(best.hp/best.maxHp)*8),9,Math.floor(local.length*(cautious?.58:.78)));
  if(count<9)continue;
  p.rally={x:best.x,y:best.y};
  aiSend(local,best,count);
 }
 // AI uses only the defined planets in each level; construction is disabled.

}

function checkEnd(){if(finished)return;let friendly=planets.filter(p=>p.team===0).length,enemy=planets.filter(p=>p.team===1).length;if(!friendly||!enemy){finished=true;paused=true;const win=!!friendly,justCompleted=win&&!progress.completed.includes(currentLevel);if(justCompleted){progress.completed.push(currentLevel);progress.unlocked=Math.max(progress.unlocked,Math.min(CAMPAIGN_SIZE,currentLevel+1));saveProgress()}if(win)window.DotfrontAds?.markVictory(currentLevel,justCompleted);let next=win&&currentLevel<CAMPAIGN_SIZE; const wonLevel=currentLevel;if(win)currentLevel=progress.unlocked;$('modal').innerHTML=`<h2 style="color:${win?'#84e8ff':'#ff8397'}">${win?'VICTORY':'DEFEAT'} — LEVEL ${wonLevel}</h2><p>${win?'The system belongs to your swarm.':'Your final planet has fallen.'}<br>Time: ${formatTime(elapsed)} · Upgrade points: ${modValue()}${justCompleted?'<br>+1 permanent upgrade point earned!':''}</p><div class="modalNav"><button class="button" id="again">↺ RETRY</button>${next?'<button class="button" id="nextLevel">NEXT LEVEL</button>':''}<button class="button" id="goUpgrades">UPGRADES</button><button class="button" id="goLevels">LEVELS</button></div>`;$('overlay').classList.remove('hidden');tutorialRender();$('again').onclick=()=>{window.DotfrontAds?.clearPending();currentLevel=wonLevel;startLevel()};if(next)$('nextLevel').onclick=()=>{currentLevel=Math.min(CAMPAIGN_SIZE,wonLevel+1);startLevelAfterAdBreak()};$('goUpgrades').onclick=()=>{menuFromPause=false;showMenu('upgrades')};$('goLevels').onclick=()=>{menuFromPause=false;showMenu('levels')}}}
function formatTime(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')}
function updateHud(){cleanSelected();$('mycount').textContent=units.filter(u=>u.team===0).length;$('theircount').textContent=units.filter(u=>u.team===1).length;$('planetcount').textContent=planets.filter(p=>p.team===0).length+' – '+planets.filter(p=>p.team===1).length;$('clock').textContent=formatTime(elapsed);$('levelnum').textContent=currentLevel+'/'+CAMPAIGN_SIZE;$('production').classList.toggle('show',!!selectedPlanet);if(selectedPlanet){$('status').innerHTML=`<b style="color:#87e8ff">${selectedPlanet.name}</b> · Lv.${selectedPlanet.level}<br>${typeIcons[selectedPlanet.type]} ${selectedPlanet.type.toUpperCase()} · ${Math.ceil(selectedPlanet.hp)} HP · ${specs[selectedPlanet.type].period.toFixed(2)}s/unit<br>${selectedPlanet.rally?'Rally point active':'Click map to set rally'}`;$('upgrade').disabled=selectedPlanet.level>=3;for(const b of document.querySelectorAll('[data-type]'))b.classList.toggle('active',b.dataset.type===selectedPlanet.type)}else $('status').innerHTML=`<b>${selected.size} units selected</b><br>Drag to select · click to order`;$('modeMove').classList.toggle('active',!wallPlacement);const squares=[...selected].filter(u=>!u.dead&&u.team===0&&u.type==='square');$('shieldWall').hidden=!hasMod('expansion2')||squares.length<3;$('shieldWall').classList.toggle('active',wallPlacement)}
function dismissToast(){toastTimer=0;$('toast').classList.remove('show')}
function toast(s){if(tutorialActive){dismissToast();return}$('toastText').textContent=s;$('toast').classList.add('show');toastTimer=2.4}
$('toastDismiss').addEventListener('click',e=>{e.stopPropagation();dismissToast()});$('toast').addEventListener('click',dismissToast);
function drawGlow(x,y,r,color,alpha=.2){let grd=g.createRadialGradient(x,y,0,x,y,r);grd.addColorStop(0,color);grd.addColorStop(1,'transparent');g.save();g.globalAlpha=alpha;g.fillStyle=grd;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.restore()}
function render(){g.setTransform(dpr,0,0,dpr,0,0);if(starBackground)g.drawImage(starBackground,0,0,width,height);else{g.fillStyle='#050919';g.fillRect(0,0,width,height)}g.save();g.beginPath();g.rect(0,0,width,height);g.clip();g.lineWidth=.6;g.strokeStyle='#5e88bc12';for(let x=0;x<=W;x+=100){let a=p2s(x,0),b=p2s(x,H);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()}for(let y=0;y<=H;y+=100){let a=p2s(0,y),b=p2s(W,y);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()}g.restore();
// planetary shadows and target lines
for(const p of planets){let a=p2s(p.x,p.y);if(p.rally){let b=p2s(p.rally.x,p.rally.y);g.save();g.strokeStyle=p.team===0?'#85dfff77':'#ff748855';g.lineWidth=1.4;g.setLineDash([5,6]);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.setLineDash([]);g.beginPath();g.arc(b.x,b.y,7,0,6.283);g.stroke();g.restore()}g.fillStyle='#00000077';g.beginPath();g.ellipse(a.x+2,a.y+11*scale,p.r*scale*1.22,p.r*scale*.32,0,0,6.283);g.fill()}
for(const p of planets){let a=p2s(p.x,p.y,12),r=Math.max(8,p.r*scale),col=color(p.team);drawGlow(a.x,a.y,r*2.7,col,p.team===2?.08:.17);g.save();g.translate(a.x,a.y);g.rotate(.2);g.strokeStyle=col;g.globalAlpha=.22;g.lineWidth=Math.max(.6,scale*1.6);g.beginPath();g.ellipse(0,0,r*1.42,r*.54,.18,0,6.283);g.stroke();g.globalAlpha=1;let dark=p.team===0?'#12314b':p.team===1?'#491a34':'#30324b';let grad=g.createRadialGradient(-r*.38,-r*.47,r*.08,r*.1,r*.2,r*1.3);grad.addColorStop(0,p.team===0?'#d4fdff':p.team===1?'#ffd0db':'#f3efff');grad.addColorStop(.26,col);grad.addColorStop(.57,dark);grad.addColorStop(1,'#070c1b');g.fillStyle=grad;g.beginPath();g.arc(0,0,r,0,6.283);g.fill();g.strokeStyle=col;g.globalAlpha=.6;g.lineWidth=1.2;g.stroke();g.globalAlpha=1;g.beginPath();g.ellipse(-r*.32,-r*.40,r*.31,r*.17,-.5,0,6.283);g.fillStyle='#ffffff48';g.fill();g.restore();if(p.flash>0)drawGlow(a.x,a.y,r*1.5,'#ffffff',p.flash*.4);if(p.shield>0){g.strokeStyle='#ffffff66';g.lineWidth=2;g.beginPath();g.arc(a.x,a.y,r*1.4,0,6.283);g.stroke()}if(selectedPlanet===p){g.strokeStyle='#b0efff';g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.ellipse(a.x,a.y,r*1.65,r*.95,0,0,6.283);g.stroke();g.setLineDash([])}g.textAlign='center';g.font=`${Math.max(9,10*scale+4)}px system-ui`;g.fillStyle='#dcecffdd';g.fillText(p.name,a.x,a.y+r+17);g.fillStyle='#182438';g.fillRect(a.x-r*.7,a.y+r+23,r*1.4,3);g.fillStyle=col;g.fillRect(a.x-r*.7,a.y+r+23,r*1.4*clamp(p.hp/p.maxHp,0,1),3);if(p.level>1){g.fillStyle='#ffe49b';g.fillText('★'.repeat(p.level-1),a.x,a.y-r-12)}}
// tiny swarms, with 3d-looking light spheres and distinct silhouettes
for(const u of units){let a=p2s(u.x,u.y,8+Math.sin(u.bob)*3),r=tutorialActive?Math.max(6,6.4*scale):Math.max(2.2,3.3*scale),col=color(u.team);if(u.shieldWall&&dist(u,u.shieldWall)<28){g.strokeStyle='#a1ecff99';g.lineWidth=2;g.beginPath();g.arc(a.x,a.y,r*2.9,0,6.283);g.stroke()}if(selected.has(u)){g.strokeStyle='#b9f9ffba';g.lineWidth=1;g.beginPath();g.ellipse(a.x,a.y+4,r*2.4,r*1.1,0,0,6.283);g.stroke()}drawGlow(a.x,a.y,r*4,col,.14);g.save();g.translate(a.x,a.y);g.fillStyle=col;g.shadowColor=col;g.shadowBlur=6;if(u.type==='square'){g.rotate(Math.PI/4);g.fillRect(-r,-r,r*2,r*2)}else if(u.type==='rectangle'){g.rotate(u.angle||0);g.fillRect(-r*1.9,-r*.83,r*3.8,r*1.66);g.fillStyle='#ffffff77';g.fillRect(r*.55,-r*.6,r*.55,r*.35)}else if(u.type==='triangle'){g.beginPath();g.moveTo(0,-r*1.55);g.lineTo(r*1.32,r*.95);g.lineTo(-r*1.32,r*.95);g.closePath();g.fill()}else{g.beginPath();g.arc(0,0,r*1.1,0,6.283);g.fill()}g.shadowBlur=0;g.fillStyle='#ffffffbb';g.beginPath();g.arc(-r*.28,-r*.34,r*.36,0,6.283);g.fill();g.restore()}
for(const l of lasers){let a=p2s(l.x1,l.y1,10),b=p2s(l.x2,l.y2,10);g.save();g.globalAlpha=l.life/l.max;g.strokeStyle=color(l.team);g.shadowColor=color(l.team);g.shadowBlur=9;g.lineWidth=Math.max(1,1.4*scale);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle='#f9ffff';g.lineWidth=.65;g.stroke();g.restore()}
for(const p of particles){let a=p2s(p.x,p.y,p.vz*(1-p.life));g.save();g.globalAlpha=clamp(p.life*2.4,0,1);g.fillStyle=color(p.team);g.beginPath();g.arc(a.x,a.y,p.size*scale,0,6.283);g.fill();g.restore()}
tutorialDrawTargets();if(drag&&drag.active&&!drag.wall){let a=drag.start,b=drag.end;g.strokeStyle='#99eeff';g.fillStyle='#65d8ff1a';g.lineWidth=1;g.setLineDash([6,4]);g.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));g.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));g.setLineDash([])}if(wallPlacement&&drag&&drag.wall){g.save();g.strokeStyle='#9eefff';g.lineWidth=4;g.lineCap='round';g.setLineDash([8,5]);g.beginPath();g.moveTo(drag.start.x,drag.start.y);g.lineTo(drag.end.x,drag.end.y);g.stroke();g.restore()} }

function tutorialDrawTargets(){
 if(!tutorialActive||tutorialStepDone||paused)return;
 const action=tutorialSteps[tutorialIndex].event;
 if(action==='read'||action==='production')return;
 g.save();g.lineWidth=2;g.setLineDash([6,5]);
 const ring=(x,y,r,col)=>{const p=p2s(x,y,10);g.strokeStyle=col;g.beginPath();g.arc(p.x,p.y,r,0,6.283);g.stroke()};
 if(action==='tap'||action==='select'){
  for(const u of units)if(u.team===0&&!u.dead)ring(u.x,u.y,17,'#a8f0ff77');
 }else if(action==='duel'){
  const enemy=units.find(u=>u.team===1&&!u.dead);
  if(enemy)ring(enemy.x,enemy.y,22,'#ffadad');
 }else if(action==='capture'){
  const target=planets.find(p=>p.team===2);
  if(target)ring(target.x,target.y,Math.max(25,target.r*scale+11),'#ffe3a5');
 }else if(action==='planet'||action==='upgrade'){
  const home=planets.find(p=>p.team===0);
  if(home)ring(home.x,home.y,Math.max(26,home.r*scale+15),'#a8f0ff');
 }else if(action==='move'||action==='rally'){
  ring(845,525,21,'#a8f0ff');
 }
 g.restore();
}

function pointPlanet(w){let best=null,d=1e9;for(const p of planets){let q=dist(w,p);if(q<p.r+14&&q<d){best=p;d=q}}return best}function pointEnemyUnit(s){let best=null,d=tutorialActive?27:16;for(const u of units)if(u.team===1&&!u.dead){const p=p2s(u.x,u.y,10),q=Math.hypot(s.x-p.x,s.y-p.y);if(q<d){d=q;best=u}}return best}
function pointUnit(s){let best=null,d=tutorialActive?26:15;for(const u of units)if(u.team===0){let p=p2s(u.x,u.y,10),q=Math.hypot(s.x-p.x,s.y-p.y);if(q<d){d=q;best=u}}return best}

function placeShieldWall(start,end){
 const squares=[...selected].filter(u=>!u.dead&&u.team===0&&u.type==='square');
 wallPlacement=false;
 if(!hasMod('expansion2')||squares.length<3){toast('Select 3 or more squares.');updateHud();return}
 let a=s2p(start.x,start.y),b=s2p(end.x,end.y);
 let dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 if(len<45){const mid=b;a={x:mid.x-90,y:mid.y};b={x:mid.x+90,y:mid.y};dx=180;dy=0;len=180}
 const ux=dx/len,uy=dy/len,step=Math.min(25,Math.max(12,len/Math.max(1,squares.length-1)));
 const cx=(a.x+b.x)*.5,cy=(a.y+b.y)*.5;
 squares.sort((u,v)=>(u.x-cx)*ux+(u.y-cy)*uy-((v.x-cx)*ux+(v.y-cy)*uy));
 for(let i=0;i<squares.length;i++){
  const offset=(i-(squares.length-1)/2)*step;
  const pos={x:clamp(cx+ux*offset,16,W-16),y:clamp(cy+uy*offset,16,H-16)};
  squares[i].shieldWall=pos;squares[i].moveTo={x:pos.x,y:pos.y};squares[i].upgradeTarget=null;
 }
 selected.clear();toast(squares.length+' squares ordered into a shield wall.');updateHud();
}

function selectBox(a,b,add=false){wallPlacement=false;if(!add){selected.clear();selectedPlanet=null}const x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x),y1=Math.min(a.y,b.y),y2=Math.max(a.y,b.y);for(const u of units)if(u.team===0){let s=p2s(u.x,u.y,10);if(s.x>=x1&&s.x<=x2&&s.y>=y1&&s.y<=y2)selected.add(u)}updateHud();tutorialAction('select',{count:selected.size,gesture:'box'})}
function clickMap(s,shift=false,double=false){const w=s2p(s.x,s.y),planet=pointPlanet(w);if(selectedPlanet){if(planet===selectedPlanet){tutorialAction('planet');return}if(planet&&planet.team===0){selectedPlanet=planet;toast('Selected '+planet.name+' — choose production or set rally.');updateHud();tutorialAction('planet');return}selectedPlanet.rally={x:clamp(w.x,0,W),y:clamp(w.y,0,H)};burst(w.x,w.y,0,5,.4);toast(`${selectedPlanet.name} rally point set.`);updateHud();tutorialAction('rally');return}if(selected.size){wallPlacement=false;if(shift&&planet&&planet.team===0){selectedPlanet=planet;selected.clear();updateHud();return}const enemy=tutorialActive?pointEnemyUnit(s):null;const destination=enemy?{x:enemy.x,y:enemy.y}:w;let n=order(selected,destination,planet&&planet.team===0?planet:null);if(n&&(!tutorialActive||tutorialSteps[tutorialIndex].event==='move'))tutorialAction(planet&&planet.team!==0?'attack':'move');if(!n)toast('Select your units first.');else if(planet&&planet.team===0&&n>=20&&planet.level<3)toast('20 arriving dots will upgrade '+planet.name+'.');selected.clear();updateHud();return}if(planet&&planet.team===0){selectedPlanet=planet;selected.clear();toast('Select shape to change production, or click map to set rally.');updateHud();tutorialAction('planet');return}const u=pointUnit(s);if(u){if(!shift)selected.clear();selected.add(u);updateHud();tutorialAction('tap',{type:u.type});return}if(!shift){selected.clear();selectedPlanet=null;updateHud()}}
function local(e){let r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}c.addEventListener('pointerdown',e=>{if(finished||!$('overlay').classList.contains('hidden'))return;if(e.button!==0&&e.button!==2)return;e.preventDefault();c.setPointerCapture(e.pointerId);let s=local(e);drag={start:s,end:s,active:false,id:e.pointerId,shift:e.shiftKey,button:e.button,wall:wallPlacement&&e.button===0};mouse=s2p(s.x,s.y)});c.addEventListener('pointermove',e=>{let s=local(e);mouse=s2p(s.x,s.y);if(drag&&e.pointerId===drag.id){drag.end=s;if(Math.hypot(s.x-drag.start.x,s.y-drag.start.y)>7)drag.active=true}});c.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;let s=local(e),d=drag;drag=null;if(d.wall){placeShieldWall(d.start,s);return}if(d.active){if(d.button===0)selectBox(d.start,s,d.shift);return}let now=performance.now(),dbl=(now-lastClick.t<360&&Math.hypot(s.x-lastClick.x,s.y-lastClick.y)<24);lastClick={t:now,x:s.x,y:s.y};if(d.button===2){if(selected.size){let pos=s2p(s.x,s.y),planet=pointPlanet(pos);order(selected,pos,planet&&planet.team===0?planet:null);selected.clear();updateHud();if(pos&&planet&&planet.team!==0)tutorialAction('attack');else tutorialAction('move')}else if(selectedPlanet){selectedPlanet.rally=s2p(s.x,s.y);toast('Rally point set.');tutorialAction('rally')}}else clickMap(s,d.shift,dbl)});c.addEventListener('contextmenu',e=>e.preventDefault());
$('start').onclick=()=>{difficulty=$('difficulty').value;startLevel()};
$('restart').onclick=()=>startLevel();
$('speed').onclick=()=>{setGameSpeed(speedIndex+1);toast('Battle speed: '+GAME_SPEEDS[speedIndex]+'× (both sides).')};
setGameSpeed(speedIndex);
$('menu').onclick=()=>{menuFromPause=true;showMenu('play')};
$('pause').onclick=()=>{if(finished)return;paused=!paused;$('pause').textContent=paused?'▶ Resume':'Ⅱ Pause';toast(paused?'Paused — selection, production and orders still work':'Battle resumed')};$('modeMove').onclick=()=>{wallPlacement=false;selectedPlanet=null;updateHud()};$('shieldWall').onclick=()=>{if(!hasMod('expansion2'))return;const squares=[...selected].filter(u=>!u.dead&&u.team===0&&u.type==='square');if(squares.length<3)return;wallPlacement=!wallPlacement;toast(wallPlacement?'Drag a line to position the shield wall.':'Shield wall placement canceled.');updateHud()};$('selectAll').onclick=()=>{selectedPlanet=null;selected=new Set(units.filter(u=>u.team===0));wallPlacement=false;updateHud();tutorialAction('select',{count:selected.size,gesture:'button'})};for(const b of document.querySelectorAll('[data-type]'))b.onclick=()=>{if(selectedPlanet){selectedPlanet.type=b.dataset.type;selectedPlanet.spawn=0;toast(selectedPlanet.name+' now produces '+b.dataset.type+' units.');updateHud();tutorialAction('production')}};$('upgrade').onclick=()=>{if(!selectedPlanet)return;const p=selectedPlanet;if(p.level>=3){toast('Maximum level reached.');return}const nearby=units.filter(u=>!u.dead&&u.team===0&&dist(u,p)<140).sort((a,b)=>dist(a,p)-dist(b));if(!performUpgrade(p,nearby))toast(`Need 20 friendly dots near this planet (${nearby.length} nearby). Move dots onto it or select Upgrade later.`)};document.addEventListener('keydown',e=>{if(e.repeat)return;let k=e.key.toLowerCase();if(k===' '){e.preventDefault();if($('overlay').classList.contains('hidden'))$('pause').click()}else if(finished||!$('overlay').classList.contains('hidden'))return;else if(k==='m'||k==='escape'){wallPlacement=false;selected.clear();selectedPlanet=null;updateHud()}else if(k==='a')$('selectAll').click();else if('1234'.includes(k)&&selectedPlanet){let type=['circle','square','triangle','rectangle'][+k-1];selectedPlanet.type=type;updateHud();tutorialAction('production')}else if(k==='u')$('upgrade').click()});
function loop(t){let dt=Math.min(.04,((t-lastTime)||16)/1000);lastTime=t;
 if(!paused){
  const gameDt=dt*GAME_SPEEDS[speedIndex];
  const steps=Math.max(1,Math.ceil(gameDt/.04));
  for(let i=0;i<steps&&!paused&&!finished;i++)update(gameDt/steps);
 }
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)dismissToast()}render();requestAnimationFrame(loop)}addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden&&!finished&&!paused){paused=true;$('pause').textContent='▶ Resume'}});addEventListener('pagehide',()=>{lastTime=0;if(!finished&&!paused){paused=true;$('pause').textContent='▶ Resume'}});resize();requestAnimationFrame(loop);menuFromPause=false;showMenu('play');
})();
