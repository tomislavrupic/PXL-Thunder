import {Engine} from './engine.mjs?v=20261025-5';
import {createState,normalizeState,applyKit,applyPattern,clamp,stepIndex,GLOBAL_DEFAULTS} from '../model.mjs?v=20261025-5';
const DIV=[8,4,2,4/3,1],MUL=[1,2,1.5,4];
export function nearestStep(beat,track){const duration=.25*DIV[track.division]/MUL[track.multiply];let tick=Math.floor(beat/duration),position=beat/duration,start=tick+(tick%2?track.shuffle*.5:0);if(position<start){tick--;start=tick+(tick%2?track.shuffle*.5:0);}const next=tick+1+((tick+1)%2?track.shuffle*.5:0);return stepIndex(position-start<next-position?tick:tick+1,track.length,track.direction);}
export class Runtime{
 constructor(rate){this.rate=rate;this.engine=new Engine(rate);this.state=createState();this.playing=false;this.record=false;this.beat=0;this.nextBoundary=0;this.restart=true;this.chain=[];this.chainPosition=-1;this.pending=null;this.selected=null;this.changed=false;this.recorded=[];}
 preparePreset(preset){const state=normalizeState(this.state);applyPattern(state,preset.pattern);if(preset.kit)applyKit(state,preset.kit);return {state,hasKit:!!preset.kit,slot:preset.slot,kitIndex:preset.kitIndex};}
 activate(preset){const old=this.state;preset.state.globals.bpm=old.globals.bpm;preset.state.globals.multiMidi=old.globals.multiMidi;if(!preset.hasKit){preset.state.voices=old.voices;preset.state.globals=old.globals;for(let v=0;v<4;v++)preset.state.tracks[v].mod=old.tracks[v].mod;}this.state=preset.state;this.selected={slot:preset.slot,kit:preset.hasKit?preset.kitIndex:null};this.changed=true;}
 message(m){
  if(!m||typeof m.type!=='string')return;
  if(Number.isInteger(m.revision))this.revision=m.revision;if(Number.isInteger(m.generation))this.generation=m.generation;
  if(m.type==='state'){this.state=normalizeState(m.state);this.pending=null;this.chain=[];this.chainPosition=-1;this.selected=null;this.changed=false;this.recorded=[];this.restart=true;this.engine.resetClock();this.engine.suppressed.fill(false);return;}
  if(m.type==='play'){if(!!m.value&&!this.playing){this.restart=true;if(this.chain.length)this.chainPosition=-1;}this.playing=!!m.value;return;}
  if(m.type==='record'){this.record=!!m.value;return;}
  if(m.type==='reset'){this.beat=0;this.restart=true;this.chainPosition=-1;this.engine.resetClock();return;}
  if(m.type==='panic'){this.playing=false;this.engine.fillMask=0;this.engine.panic();return;}
  if(m.type==='fill'){this.engine.fillMask=m.value&15;return;}
  if(m.type==='trigger'){const v=m.voice|0;if(v>=0&&v<4){this.engine.trigger(v,clamp(m.velocity??1),this.state.voices[v]);if(this.record&&this.playing)this.recordHit(v,m.velocity??1,60);}return;}
  if(m.type==='pattern'){const preset=this.preparePreset(m.preset);this.chain=[];if(m.immediate||!this.playing){this.pending=null;this.activate(preset);this.restart=true;}else this.pending=preset;return;}
  if(m.type==='chain'){this.pending=null;this.chain=Array.isArray(m.presets)?m.presets.slice(0,64).map(p=>this.preparePreset(p)):[];this.chainPosition=-1;if(!this.playing)this.restart=true;return;}
  if(m.type==='kit'){applyKit(this.state,m.kit);this.changed=true;return;}
  if(m.type==='samples'){if(m.slot>=0&&m.slot<3&&m.data instanceof Float32Array&&m.data.length>=2&&m.data.length<=131072)this.engine.samples[m.slot]=m.data;return;}
  if(m.type==='voicePattern'){const next=normalizeState({tracks:[m.track]});if(m.voice>=0&&m.voice<4)this.state.tracks[m.voice]=next.tracks[0];return;}
  if(m.type==='midi'){this.midi(m.data);return;}
  if(m.type!=='patch')return;
  applyMutation(this.state,m);
 }
 recordHit(v,velocity,note){const step=nearestStep(this.beat,this.state.tracks[v]),s=this.state.tracks[v].steps[step];s.on=true;s.velocity=clamp(velocity);if(this.state.globals.multiMidi)s.locks[0]=clamp(this.state.voices[v][0]+(note-60)/84);this.recorded.push({voice:v,step,velocity:s.velocity,tune:s.locks[0]});}
 midi(data){if(!data||data.length<3)return;const kind=data[0]&0xf0,channel=(data[0]&15),note=data[1],velocity=data[2]/127;
  if(kind===0xb0&&(note===120||note===123)){this.message({type:'panic'});return;}
  if(kind===0x90&&data[2]>0){const v=this.state.globals.multiMidi?channel:note%12;if(v<4){this.engine.trigger(v,velocity,this.state.voices[v],this.state.globals.multiMidi?(note-60)/84:0);if(this.record&&this.playing)this.recordHit(v,velocity,note);}}
  else if(kind===0xb0){const v=this.state.globals.multiMidi?channel:Math.floor((note-70)/11),k=this.state.globals.multiMidi?note-70:(note-70)%11;if(v>=0&&v<4&&k>=0&&k<11){this.state.voices[v][k]=k<8?velocity:Math.round(velocity*2);this.changed=true;}}
 }
 render(){
  if(this.playing&&(this.restart||this.beat+1e-8>=this.nextBoundary)){
   if(this.chain.length){this.chainPosition=(this.chainPosition+1)%this.chain.length;this.activate(this.chain[this.chainPosition]);}else if(this.pending){this.activate(this.pending);this.pending=null;}
   this.nextBoundary=(this.restart?this.beat:this.nextBoundary)+this.state.masterLength*.25;this.restart=false;
  }
  const out=this.engine.render(this.state,this.beat,this.playing);if(this.playing)this.beat+=this.state.globals.bpm/(60*this.rate);return out;
 }
}

export function applyMutation(state,m){
  const v=m.voice|0,s=m.step|0,k=m.parameter|0;
  if(m.kind==='global'&&Object.hasOwn(GLOBAL_DEFAULTS,m.key)){const initial=GLOBAL_DEFAULTS[m.key];state.globals[m.key]=typeof initial==='boolean'?!!m.value:clamp(Number.isFinite(m.value)?m.value:initial,m.key==='bpm'?20:0,m.key==='bpm'?420:m.key==='lfoWave'?6:1);return;}
  if(m.kind==='masterLength'){state.masterLength=clamp(Math.round(m.value),1,64);return;}
  if(m.kind==='fxLock'&&s>=0&&s<16&&Object.hasOwn(GLOBAL_DEFAULTS,m.key)){if(m.value<0)delete state.fxSteps[s].locks[m.key];else state.fxSteps[s].locks[m.key]=clamp(m.value,0,m.key==='lfoWave'?6:1);return;}
  if(v<0||v>3)return;const t=state.tracks[v];
  if(m.kind==='voice'&&k>=0&&k<11){state.voices[v][k]=clamp(m.value,0,k<8?1:2);return;}
  if(m.kind==='mod'&&k>=0&&k<8){t.mod[k]=clamp(m.value,0,.8);return;}
  if(m.kind==='track'){const ranges={length:[1,16],division:[0,4],multiply:[0,3],direction:[0,3],groove:[-1,3],fillRate:[0,7],shuffle:[0,1]};if(ranges[m.key])t[m.key]=clamp(m.value,...ranges[m.key]);return;}
  if(s<0||s>15)return;const step=t.steps[s];
  if(m.kind==='lock'&&k>=0&&k<11){step.locks[k]=m.value<0?-1:k<8?clamp(m.value,0,1):clamp(Math.round(m.value),0,2);return;}
  if(m.kind==='step'){if(m.key==='on')step.on=!!m.value;else{const ranges={velocity:[0,1],probability:[0,1],ratchet:[1,5],oddsN:[1,7],oddsD:[1,8]};if(ranges[m.key])step[m.key]=clamp(m.value,...ranges[m.key]);}}
}
