// AudioContext defaults to an ambient session. On iOS this can be muted by
// the Ring/Silent switch even while the AudioWorklet and sequencer run.
// Request music playback synchronously inside the user's Play/tap gesture.
export function configurePlaybackSession(nav){
 try{if(nav?.audioSession&&nav.audioSession.type!=='playback')nav.audioSession.type='playback';}catch{/* Optional API; ordinary Web Audio must still work. */}
}
