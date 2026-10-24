import {Runtime} from './runtime.mjs';
class ThunderWorklet extends AudioWorkletProcessor{
 constructor(){super();this.runtime=new Runtime(sampleRate);this.peaks=new Float32Array(4);this.frames=0;this.port.onmessage=event=>this.runtime.message(event.data);}
 process(inputs,outputs){const channels=outputs[0];if(!channels?.length)return true;const n=channels[0].length,r=this.runtime;
  for(let i=0;i<n;i++){const value=r.render();for(let channel=0;channel<channels.length;channel++)channels[channel][i]=value;for(let voice=0;voice<4;voice++)this.peaks[voice]=Math.max(this.peaks[voice],Math.abs(r.engine.voiceOutputs[voice]));}
  this.frames+=n;if(this.frames>=sampleRate/30){this.frames=0;this.port.postMessage({type:'telemetry',levels:Array.from(this.peaks),positions:Array.from(r.engine.positions),playing:r.playing,beat:r.beat,revision:r.revision,generation:r.generation});this.peaks.fill(0);}
  if(r.changed){r.changed=false;this.port.postMessage({type:'state',state:r.state,selected:r.selected,revision:r.revision,generation:r.generation});r.selected=null;}
  if(r.recorded.length){this.port.postMessage({type:'recorded',notes:r.recorded,revision:r.revision,generation:r.generation});r.recorded=[];}
  return true;
 }
}
registerProcessor('pxl-thunder',ThunderWorklet);
