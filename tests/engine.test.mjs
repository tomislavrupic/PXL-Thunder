import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../audio/engine.mjs';
import {createState,stepIndex,normalizeState,randomizePattern,captureKit,capturePattern,applyKit,applyPattern} from '../model.mjs';

test('one four-beat cycle has one step-one hit; ratchets stay inside the step',()=>{
 const s=createState();s.tracks[0].steps[0].on=true;const e=new Engine(48000);
 for(let i=0;i<96000;i++)e.render(s,i/24000,true);
 assert.equal(e.hits[0],1);
 const r=new Engine(48000);s.tracks[0].steps[0].ratchet=4;
 for(let i=0;i<6000;i++)r.render(s,i/24000,true);
 assert.equal(r.hits[0],4);
});
test('probability and odds gate every ratchet consistently',()=>{
 const s=createState();const step=s.tracks[0].steps[0];step.on=true;step.probability=0;const e=new Engine(48000);
 for(let i=0;i<96000;i++)e.render(s,i/24000,true);assert.equal(e.hits[0],0);
 step.probability=1;step.oddsD=2;const o=new Engine(48000);for(let i=0;i<384000;i++)o.render(s,i/24000,true);assert.equal(o.hits[0],2);
});
test('backward and ping-pong preserve endpoints',()=>{assert.deepEqual([0,1,2,3].map(t=>stepIndex(t,4,1)),[3,2,1,0]);assert.deepEqual([0,1,2,3,4,5,6].map(t=>stepIndex(t,4,2)),[0,1,2,3,2,1,0]);});
test('all 36 variants produce bounded finite audio',()=>{
 for(let v=0;v<4;v++)for(let a=0;a<3;a++)for(let m=0;m<3;m++){
  const s=createState();s.voices[v][8]=a;s.voices[v][9]=m;const e=new Engine(48000);e.trigger(v,1,s.voices[v]);let energy=0;
  for(let i=0;i<16000;i++){const x=e.render(s,0,false);assert.ok(Number.isFinite(x)&&Math.abs(x)<=1);energy+=x*x;}
  assert.ok(energy>.0001,`voice ${v} algo ${a} mode ${m}`);
 }
});
test('fresh silence, full-decay drone, and panic stay distinct',()=>{
 const s=createState(),e=new Engine(48000);assert.equal(e.render(s,0,false),0);s.voices[0][1]=1;let energy=0;for(let i=0;i<4096;i++)energy+=e.render(s,0,false)**2;assert.ok(energy>1);
 e.panic();for(let i=0;i<4096;i++)assert.equal(e.render(s,0,false),0);e.trigger(0,1,s.voices[0]);assert.notEqual(e.render(s,0,false),0);
});
test('random generation is voice-local and keeps valid parameters',()=>{
 const s=createState();s.voices[2][0]=.678;const sound=structuredClone(s.voices),other=structuredClone(s.voices[2]),track=structuredClone(s.tracks[2]);
 randomizePattern(s,0,()=>.61);assert.deepEqual(s.voices,sound);assert.deepEqual(s.voices[2],other);assert.deepEqual(s.tracks[2],track);assert.ok(s.tracks[0].steps.some(x=>x.on));assert.ok(s.voices[0].slice(0,8).every(x=>x>=0&&x<=1));
});
test('normalizing malformed state clamps rather than creating NaN DSP',()=>{
 const s=normalizeState({voices:[[Infinity,-5,NaN,1e20]],tracks:[{length:-8,direction:123,steps:[{ratchet:100,locks:[NaN,8]}]}],globals:{bpm:0,feedback:Infinity}});
 assert.equal(s.tracks[0].length,1);assert.equal(s.tracks[0].steps[0].ratchet,5);assert.equal(s.voices[0][1],0);assert.ok(Number.isFinite(s.voices[0][0]));assert.ok(s.globals.bpm>=20);const e=new Engine(48000);e.trigger(0,1,s.voices[0]);for(let i=0;i<2048;i++)assert.ok(Number.isFinite(e.render(s,0,false)));
});
test('kit and pattern capture keep sound and sequence independent',()=>{
 const a=createState();a.voices[0][0]=.71;a.tracks[0].steps[3].on=true;a.tracks[0].steps[3].locks[1]=.9;const kit=captureKit(a),pattern=capturePattern(a);const b=createState();applyKit(b,kit);assert.equal(b.voices[0][0],.71);assert.equal(b.tracks[0].steps[3].on,false);applyPattern(b,pattern);assert.equal(b.tracks[0].steps[3].locks[1],.9);
});

test('FX lane locks apply per step and release to the base parameter',()=>{const s=createState(),e=new Engine(48000);s.voices[0][1]=1;s.fxSteps[0].locks.master=0;for(let i=0;i<1024;i++)assert.equal(Math.abs(e.render(s,i/24000,true)),0);let energy=0;for(let i=0;i<1024;i++)energy+=e.render(s,.25+i/24000,true)**2;assert.ok(energy>1);assert.equal(s.globals.master,.72);});
