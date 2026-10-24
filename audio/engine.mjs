// Independent PXL Thunder synthesis port. No sample-by-sample object allocation.
import {clamp,randomAt,stepIndex,GLOBAL_DEFAULTS,FX_LOCK_KEYS} from '../model.mjs?v=20261025-4';
const TAU=Math.PI*2,BASE=[24,40,55,160],DIVISIONS=[8,4,2,4/3,1],MULTIPLIERS=[1,2,1.5,4],METAL=[1,1.342,1.791,2.129,2.731,3.571],DELAY_RATIOS=[.125,.25,.5,1,1.5,2,3,4],GLOBAL_KEYS=Object.keys(GLOBAL_DEFAULTS);
export function factorySample(mode){const size=[9000,30000,48000][mode],sample=new Float32Array(size);let rng=917+mode,lp=0;for(let i=0;i<size;i++){rng=(Math.imul(1664525,rng)+1013904223)|0;const noise=rng/2147483648;lp+=.07*(noise-lp);const t=i/48000,metal=Math.sin(TAU*6073*t)*Math.sin(TAU*8391*t);sample[i]=((noise-lp)*.65+metal*.2)*Math.exp(-t*[40,10,5][mode])*clamp(i/40);}return sample;}
class Voice{
 constructor(rate,seed){this.rate=rate;this.seed=seed;this.string=new Float64Array(8192);this.smooth=new Float64Array(11);this.reset();}
 reset(){this.phase=this.modPhase=this.samplePos=0;this.age=100;this.velocity=1;this.pitchOffset=0;this.noiseLP=this.reverb=this.dcX=this.dcY=this.s1=this.s2=0;this.rng=this.seed;this.stringPos=0;this.stringLength=200;this.string.fill(0);this.smooth.set([.35,.35,.3,.25,.85,.1,.08,.7,0,0,2]);}
 noise(){this.rng=(Math.imul(1664525,this.rng)+1013904223)|0;return this.rng/2147483648;}
 trigger(velocity,p,voice,offset=0){this.age=0;this.phase=this.modPhase=this.samplePos=0;this.velocity=clamp(velocity);this.pitchOffset=offset;this.smooth.set(p);const frequency=BASE[voice]*2**(clamp(p[0]+offset)*7);this.stringLength=clamp(Math.floor(this.rate*2/frequency),4,8190);this.stringPos=0;if(voice===2&&Math.round(p[8])===2)for(let i=0;i<this.stringLength;i++)this.string[i]=this.noise();}
 run(target,voice,samples,sampleStart){
  const p=this.smooth;for(let j=0;j<8;j++)p[j]+=.015*(target[j]-p[j]);for(let j=8;j<11;j++)p[j]=target[j];
  const algorithm=clamp(Math.round(p[8]),0,2),mode=clamp(Math.round(p[9]),0,2),filter=clamp(Math.round(p[10]),0,2),drone=target[1]>=.9995;
  if(this.age>30&&!drone)return 0;
  let output=0;
  for(let os=0;os<2;os++){
   const rate=this.rate*2,decay=.012*500**clamp(p[1]),envelope=drone?1:Math.exp(-this.age*5/decay),pitchEnvelope=Math.exp(-this.age/(algorithm===2&&voice===0?.002+.3*p[2]*p[2]:.012+.04*p[1]));
   const base=BASE[voice]*2**(clamp(p[0]+this.pitchOffset)*7),frequency=Math.min(rate*.2,base*2**(p[3]*4*pitchEnvelope));
   this.phase+=frequency/rate;this.phase-=Math.floor(this.phase);this.modPhase+=base*(.125+20*p[2]*p[2])/rate;this.modPhase-=Math.floor(this.modPhase);
   const sine=Math.sin(TAU*this.phase),noise=this.noise();let raw=0;
   if(voice<2){
    if(algorithm===0){raw=2/Math.PI*Math.asin(Math.sin(sine*(1+14*p[2])*Math.PI*.5));if(mode===1)raw+=noise*Math.exp(-this.age*450)*.7;if(mode===2)raw+=(this.phase<.35?1:-1)*Math.exp(-this.age*600)*.6;}
    else if(algorithm===1){let table=0;for(let harmonic=1;harmonic<=12;harmonic++){const amplitude=mode===0?1/(harmonic*harmonic):mode===1?(harmonic%2?1/harmonic:0):1/harmonic;table+=Math.sin(TAU*this.phase*harmonic+p[2]*harmonic)*amplitude*(.5+.5*Math.cos(harmonic*p[2]*Math.PI));}raw=table*.7;}
    else if(voice===0)raw=mode===0?sine:mode===1?2/Math.PI*Math.asin(sine):Math.tanh(sine*4);
    else {const mod=mode===0?Math.sin(TAU*this.modPhase):mode===1?2*this.modPhase-1:this.modPhase<.5?1:-1;raw=Math.sin(TAU*this.phase+(1+12*p[3])*mod*Math.exp(-this.age*3/decay));}
   }else if(voice===2){
    this.noiseLP+=(.015+.8*p[2]*p[2])*(noise-this.noiseLP);const toneNoise=noise-this.noiseLP;
    if(algorithm===0){const ne=drone?1:Math.exp(-this.age/(.008+.7*p[3]*p[3]));raw=mode===0?.45*sine+toneNoise*ne/(envelope+.00001)*.75:mode===1?Math.sin(TAU*this.phase+3*pitchEnvelope)*.9+toneNoise*.06:sine*.5+toneNoise*ne/(envelope+.00001)*.6;}
    else if(algorithm===1){let burst=Math.exp(-(this.age%(.011+mode*.006))*700);if(this.age>.025+mode*.014)burst=Math.exp(-this.age*32);const clap=toneNoise*(burst+.25*Math.exp(-this.age*8));this.reverb+=.003*(clap-this.reverb);raw=Math.tanh((clap+p[2]*this.reverb*3)*(1+18*p[3]));}
    else {const current=this.string[this.stringPos],next=this.string[(this.stringPos+1)%this.stringLength];this.string[this.stringPos]=(current+next)*(.43+.068*p[3]);this.stringPos=(this.stringPos+1)%this.stringLength;raw=current*(.5+.5*p[2])+sine*.05*p[2];if(drone)this.string[this.stringPos]+=noise*.012;}
   }else{
    const attack=(algorithm===0||algorithm===2)?.0001+.18*p[3]*p[3]:.0001+.12*p[3]*p[3],ae=drone?1:clamp(this.age/attack);
    this.noiseLP+=.08*(noise-this.noiseLP);const high=noise-this.noiseLP;let metal=0;for(let j=0;j<6;j++)metal+=(Math.sin(this.phase*TAU*METAL[j]*13)>0?1:-1)/6;
    if(algorithm===0)raw=(mode===0?high:mode===1?metal*high:metal)*ae*(.35+.65*Math.exp(-this.age*(5+100*p[2])));
    else if(algorithm===1){if(mode===0){const period=Math.max(1,Math.floor(1+p[2]*127)),pos=Math.floor(this.age*base*64)>>>0;raw=(randomAt(Math.floor(pos/period)%2048)*2-1)*ae;}else raw=(high*(1-p[3])+metal*p[3])*(.3+.7*Math.exp(-this.age*(10+80*p[2])));}
    else {const sample=samples[mode],start=sampleStart?p[3]*.85*sample.length:0,position=this.samplePos+start;if(position+1<sample.length){const i=Math.floor(position),fraction=position-i;raw=(sample[i]*(1-fraction)+sample[i+1]*fraction)*(sampleStart?1:ae);}this.samplePos+=(48000/rate)*2**((p[0]-.5+this.pitchOffset)*7)*(.25+1.75*p[2]);}
   }
   raw=clamp(raw,-4,4)*envelope*this.velocity;
   const hz=25*800**clamp(p[4]),g=Math.tan(Math.PI*Math.min(hz,rate*.44)/rate),a=1/(1+g*(g+Math.SQRT2)),v1=a*(this.s1+g*(raw-this.s2)),v2=this.s2+g*v1;
   this.s1=2*v1-this.s1;this.s2=2*v2-this.s2;const shaped=filter===0?raw-Math.SQRT2*v1-v2:filter===1?v1*Math.SQRT2:v2;
   output+=(shaped*(1-p[5])+Math.tanh(shaped*5)*.9*p[5])*.5;this.age+=1/rate;
  }
  const dc=output-this.dcX+.995*this.dcY;this.dcX=output;this.dcY=dc;return clamp(dc,-3,3);
 }
}
export class Engine{
 constructor(rate=48000){this.rate=rate;this.effectiveGlobals={...GLOBAL_DEFAULTS};this.voices=Array.from({length:4},(_,v)=>new Voice(rate,1234+v*897));this.samples=[0,1,2].map(factorySample);this.target=Array.from({length:4},()=>new Float64Array(11));this.hits=new Uint32Array(4);this.positions=new Int8Array(4).fill(-1);this.lastTick=new Float64Array(4).fill(-1);this.lastRat=new Int8Array(4).fill(-1);this.activeStep=new Int8Array(4).fill(-1);this.suppressed=new Uint8Array(4);this.voiceOutputs=new Float64Array(4);this.delay=new Float64Array(Math.floor(rate*2.1)+8);this.write=0;this.delayLP=this.compEnvelope=this.lfoPhase=this.delayPhase=this.lfoCycles=0;this.delaySamples=rate*.25;this.wasRunning=false;this.previousBeat=0;this.fillMask=0;}
 resetClock(){this.lastTick.fill(-1);this.lastRat.fill(-1);this.activeStep.fill(-1);this.positions.fill(-1);}
 panic(){for(const voice of this.voices)voice.reset();this.delay.fill(0);this.delayLP=this.compEnvelope=0;this.suppressed.fill(1);}
 trigger(v,velocity,p,offset=0){if(v<0||v>3)return;this.suppressed[v]=0;this.voices[v].trigger(velocity,p,v,offset);this.hits[v]++;}
 render(s,beat,running){
  const g=this.effectiveGlobals;for(let i=0;i<GLOBAL_KEYS.length;i++){const key=GLOBAL_KEYS[i];g[key]=s.globals[key];}if(running){const locks=s.fxSteps?.[Math.floor(Math.max(0,beat)*4)%16]?.locks;if(locks)for(let i=0;i<FX_LOCK_KEYS.length;i++){const key=FX_LOCK_KEYS[i];if(locks[key]!==undefined)g[key]=typeof GLOBAL_DEFAULTS[key]==='boolean'?locks[key]>.5:locks[key];}}
  if(running&&!this.wasRunning||running&&beat<this.previousBeat-.00001)this.resetClock();if(!running&&this.wasRunning){this.activeStep.fill(-1);this.positions.fill(-1);}this.wasRunning=running;this.previousBeat=beat;
  for(let v=0;v<4;v++)if(running&&beat>=0){
   const t=s.tracks[v],filling=!!(this.fillMask&(1<<v)),division=filling?(t.fillRate<4?t.fillRate:4):t.division,multiply=filling?(t.fillRate<4?0:t.fillRate-4):t.multiply,duration=.25*DIVISIONS[division]/MULTIPLIERS[multiply],pos=beat/duration;
   let tick=Math.floor(pos),start=tick+(tick%2?t.shuffle*.5:0);if(pos+1e-8<start){tick--;start=tick+(tick%2?t.shuffle*.5:0);}
   if(tick<0)continue;const index=stepIndex(tick,t.length,t.direction);this.positions[v]=index;const step=t.steps[index],end=tick+1+((tick+1)%2?t.shuffle*.5:0),ratchets=filling?1:step.ratchet,rat=clamp(Math.floor((pos-start)/(end-start)*ratchets+1e-7),0,ratchets-1);
   if(tick!==this.lastTick[v]||rat!==this.lastRat[v]){
    this.activeStep[v]=index;const cycle=Math.floor(tick/t.length),seed=cycle*131+index*17+v*991;
    if(filling||step.on&&cycle%step.oddsD<step.oddsN&&randomAt(seed)<step.probability){const p=this.target[v];p.set(s.voices[v]);for(let k=0;k<11;k++)if(step.locks[k]>=0)p[k]=step.locks[k];let groove=1;if(t.groove===0)groove=index%4===0?1:.78;else if(t.groove===1)groove=index%2?.7:1;else if(t.groove===2)groove=index%3===0?1:.65;else if(t.groove===3)groove=.6+.4*randomAt(seed+7);this.trigger(v,step.velocity*groove,p);}
    this.lastTick[v]=tick;this.lastRat[v]=rat;
   }
  }
  const lfoHz=g.lfoSync?g.bpm/60*2**(Math.round(g.lfoRate*6)-3):.1*200**g.lfoRate;this.lfoPhase+=lfoHz/this.rate;if(this.lfoPhase>=1)this.lfoCycles++;this.lfoPhase-=Math.floor(this.lfoPhase);const phase=this.lfoPhase;let lfo=0;
  switch(Math.round(g.lfoWave)){case 0:lfo=Math.sin(TAU*phase);break;case 1:lfo=1-4*Math.abs(phase-.5);break;case 2:lfo=2*phase-1;break;case 3:lfo=1-2*phase;break;case 4:lfo=phase<.5?1:-1;break;case 5:lfo=2*Math.exp(-((phase*2)%1)*5)-1;break;default:lfo=2*randomAt(this.lfoCycles+993)-1;}
  let sum=0,send=0;
  for(let v=0;v<4;v++){
   const p=this.target[v];p.set(s.voices[v]);const step=this.activeStep[v];if(running&&step>=0){const locks=s.tracks[v].steps[step].locks;for(let k=0;k<11;k++)if(locks[k]>=0)p[k]=locks[k];}for(let k=0;k<8;k++)p[k]=clamp(p[k]+lfo*g.lfoLevel*s.tracks[v].mod[k]);if(p[1]<.9995)this.suppressed[v]=0;
   const x=this.suppressed[v]?0:this.voices[v].run(p,v,this.samples,g.sampleStart);this.voiceOutputs[v]=x*p[7];sum+=this.voiceOutputs[v];send+=x*p[6];
  }
  this.delayPhase+=(.05+8*g.delayRate*g.delayRate)/this.rate;this.delayPhase-=Math.floor(this.delayPhase);let time=g.time;
  if(g.delaySync){const seconds=60/g.bpm*DELAY_RATIOS[clamp(Math.floor(time*7.99),0,7)];time=Math.sqrt(clamp((seconds-.003)/(g.delayLong?1.2:.3)));}
  let target=this.rate*(.003+(g.delayLong?1.2:.3)*time*time);target*=1+.025*g.delayDepth*Math.sin(TAU*this.delayPhase);this.delaySamples+=.0008*(target-this.delaySamples);
  let read=this.write-this.delaySamples;if(read<0)read+=this.delay.length;const i=Math.floor(read),fraction=read-i,wet=this.delay[i%this.delay.length]*(1-fraction)+this.delay[(i+1)%this.delay.length]*fraction;
  this.delayLP+=(g.delayColour?.08:.3)*(wet-this.delayLP);this.delay[this.write]=Math.tanh(send*.7+this.delayLP*Math.min(.985,g.feedback));this.write=(this.write+1)%this.delay.length;
  sum=(sum+this.delayLP*g.masterSend)*.38;const abs=Math.abs(sum);this.compEnvelope+=(abs>this.compEnvelope?.03:.00012)*(abs-this.compEnvelope);const threshold=.025+.8*g.threshold*g.threshold,gain=this.compEnvelope>threshold?(threshold/(this.compEnvelope+1e-8))**(.8*g.compression):1;
  return Math.tanh(sum*gain*g.master*1.7);
 }
}
