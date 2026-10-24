export const VOICE_KEYS=['tune','decay','p1','p2','cutoff','drive','send','level','algo','mode','filter'];
export const VOICE_LABELS=['Tune','Decay','P1','P2','Filter','Drive','Send','Level'];
export const COLOURS=['#31d7cb','#e4cb73','#ee8c9e','#a59af4'];
export const ALGORITHMS=[['Fold Drum 1','Wavetable Drum','Simple Drum'],['Fold Drum 2','Wavetable Drum','Complex Drum'],['Resonant Drums','Slap','Karplus'],['Noise Hat','Noise / Tone','Acoustic Hats']];
export const PARAM_NAMES=[[['Fold','Pitch env'],['Surf','Pitch env'],['Pitch decay','Pitch env']],[['Fold','Pitch env'],['Surf','Pitch env'],['Mod frequency','Pitch env']],[['Noise tone','Noise decay'],['Reverb','Crunch'],['Edge','Twang']],[['Env amount','Attack'],['Timbre / env','Attack / mix'],['Sample rate','Attack / start']]];
export const GLOBAL_DEFAULTS={bpm:128,time:.32,feedback:.27,delayRate:.2,delayDepth:.12,master:.72,masterSend:.4,threshold:.55,compression:.3,lfoRate:.35,lfoWave:0,lfoLevel:0,lfoSync:false,delayLong:true,delayColour:false,delaySync:false,sampleStart:false,multiMidi:false};
export const FX_LOCK_KEYS=Object.keys(GLOBAL_DEFAULTS).filter(k=>!['bpm','multiMidi'].includes(k));
export const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
export const hash=x=>{x|=0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return (x^(x>>>16))>>>0;};
export const randomAt=x=>(hash(x)>>>8)/16777216;
export function stepIndex(tick,length,direction){length=clamp(Math.round(length),1,16);tick=Math.max(0,Math.floor(tick));if(direction===1)return length-1-tick%length;if(direction===2){const k=tick%Math.max(1,2*length-2);return k<length?k:2*length-2-k;}if(direction===3)return hash(tick+7221)%length;return tick%length;}
export const createStep=()=>({on:false,velocity:.85,probability:1,ratchet:1,oddsN:1,oddsD:1,locks:Array(11).fill(-1)});
export const createTrack=()=>({steps:Array.from({length:16},createStep),length:16,division:4,multiply:0,direction:0,groove:-1,shuffle:0,fillRate:4,mod:Array(8).fill(0)});
export function createState(){return {voices:Array.from({length:4},(_,v)=>[v===0?.18:v===1?.38:v===2?.3:.6,v===3?.25:.38,.3,.25,v===3?.55:.88,.1,.08,.7,0,0,v===3?0:2]),tracks:Array.from({length:4},createTrack),globals:{...GLOBAL_DEFAULTS},fxSteps:Array.from({length:16},()=>({locks:{}})),masterLength:16};}
const number=(x,initial,lo=0,hi=1,integer=false)=>{const n=Number.isFinite(x)?clamp(x,lo,hi):initial;return integer?Math.round(n):n;};
export function normalizeState(input={}){
 const out=createState();if(!input||typeof input!=='object')return out;
 for(let v=0;v<4;v++){
  for(let k=0;k<11;k++)out.voices[v][k]=number(input.voices?.[v]?.[k],out.voices[v][k],0,k<8?1:2,k>=8);
  const t=out.tracks[v],src=input.tracks?.[v]??{};
  for(const [key,lo,hi]of [['length',1,16],['division',0,4],['multiply',0,3],['direction',0,3],['groove',-1,3],['fillRate',0,7]])t[key]=number(src[key],t[key],lo,hi,true);
  t.shuffle=number(src.shuffle,0);for(let k=0;k<8;k++)t.mod[k]=number(src.mod?.[k],0,0,.8);
  for(let i=0;i<16;i++){const s=t.steps[i],a=src.steps?.[i]??{};s.on=a.on===true;s.velocity=number(a.velocity,.85);s.probability=number(a.probability,1);s.ratchet=number(a.ratchet,1,1,5,true);s.oddsN=number(a.oddsN,1,1,7,true);s.oddsD=number(a.oddsD,1,1,8,true);for(let k=0;k<11;k++)s.locks[k]=k>=8?(Number.isFinite(a.locks?.[k])&&a.locks[k]>=0?number(a.locks[k],0,0,2,true):-1):number(a.locks?.[k],-1,-1,1);}
 }
 for(const [key,initial]of Object.entries(GLOBAL_DEFAULTS))out.globals[key]=typeof initial==='boolean'?(typeof input.globals?.[key]==='boolean'?input.globals[key]:initial):number(input.globals?.[key],initial,key==='bpm'?20:0,key==='bpm'?420:key==='lfoWave'?6:1,key==='lfoWave');
 for(let i=0;i<16;i++)for(const key of FX_LOCK_KEYS){const value=input.fxSteps?.[i]?.locks?.[key];if(Number.isFinite(value)&&value>=0)out.fxSteps[i].locks[key]=number(value,0,0,key==='lfoWave'?6:1,key==='lfoWave'||typeof GLOBAL_DEFAULTS[key]==='boolean');}
 out.masterLength=number(input.masterLength,16,1,64,true);return out;
}
export function demoState(){const s=createState();for(let v=0;v<4;v++)for(let i=0;i<16;i++){s.tracks[v].steps[i].on=v===0?i%4===0:v===1?i===6||i===14:v===2?i%8===4:i%2===0;s.tracks[v].steps[i].velocity=i%4===0?1:.75;}s.voices[1][8]=2;s.voices[1][2]=.12;s.voices[1][7]=.48;s.voices[2][2]=.6;s.voices[2][3]=.22;s.voices[3][9]=1;s.voices[3][1]=.19;s.voices[3][7]=.38;s.tracks[3].steps[14].locks[1]=.55;s.tracks[1].steps[14].ratchet=3;s.voices[0][5]=.22;return s;}
export function randomizePattern(state,voice,rng=Math.random){
 if(!Number.isInteger(voice)||voice<0||voice>3)return;
 const t=state.tracks[voice],length=t.length,density=[.28,.24,.38,.58][voice]+rng()*.2,pulses=clamp(Math.round(length*density),1,length),rotation=Math.floor(rng()*length);
 for(let i=0;i<16;i++){const s=t.steps[i];s.on=i<length&&(((i+rotation)*pulses)%length<pulses);s.velocity=.6+rng()*.4;s.ratchet=voice>0&&rng()<.07?2:1;s.probability=1;s.oddsN=s.oddsD=1;}
 if(!t.steps.some(x=>x.on))t.steps[0].on=true;
}
const FX_KEYS=Object.keys(GLOBAL_DEFAULTS).filter(k=>!['bpm','multiMidi'].includes(k));
export function captureKit(s){return {voices:s.voices.map(v=>[...v]),mod:s.tracks.map(t=>[...t.mod]),fx:Object.fromEntries(FX_KEYS.map(k=>[k,s.globals[k]]))};}
export function capturePattern(s){return {tracks:s.tracks.map(({mod,...t})=>structuredClone(t)),masterLength:s.masterLength,fxSteps:structuredClone(s.fxSteps)};}
export function applyKit(s,kit){if(!kit||typeof kit!=='object')return;const n=normalizeState({voices:kit.voices,globals:{...s.globals,...kit.fx},tracks:s.tracks.map((t,v)=>({...t,mod:kit.mod?.[v]??t.mod}))});s.voices=n.voices;s.globals={...s.globals,...Object.fromEntries(FX_KEYS.map(k=>[k,n.globals[k]]))};s.tracks.forEach((t,v)=>t.mod=n.tracks[v].mod);}
export function applyPattern(s,pattern){if(!pattern||typeof pattern!=='object')return;const n=normalizeState({voices:s.voices,globals:s.globals,tracks:pattern.tracks?.map((t,v)=>({...t,mod:s.tracks[v].mod})),masterLength:pattern.masterLength,fxSteps:pattern.fxSteps});s.tracks=n.tracks;s.masterLength=n.masterLength;s.fxSteps=n.fxSteps;}
export function copyStep(s){return structuredClone(s);}
