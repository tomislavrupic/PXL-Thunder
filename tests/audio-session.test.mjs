import test from 'node:test';
import assert from 'node:assert/strict';
import {configurePlaybackSession} from '../audio/session.mjs';
test('iPhone music output requests playback instead of ambient session',()=>{const nav={audioSession:{type:'auto'}};configurePlaybackSession(nav);assert.equal(nav.audioSession.type,'playback');});
test('browsers without Audio Session API continue using Web Audio',()=>{assert.doesNotThrow(()=>configurePlaybackSession({}));});
test('restricted Audio Session API does not block instrument startup',()=>{const nav={get audioSession(){throw Error('Unsupported');}};assert.doesNotThrow(()=>configurePlaybackSession(nav));});
test('playback session is not unnecessarily reconfigured on every trigger',()=>{let writes=0;const nav={audioSession:{get type(){return 'playback';},set type(v){writes++;}}};configurePlaybackSession(nav);assert.equal(writes,0);});
