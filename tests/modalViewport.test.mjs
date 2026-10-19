import test from 'node:test';
import assert from 'node:assert/strict';
import { trackModalViewport } from '../src/services/modalViewport.mjs';

test('modal viewport follows keyboard shrink/restore, ignores pinch zoom and cleans up', () => {
  const listeners = new Map(), values = new Map();
  const viewport = {height:844,offsetTop:0,scale:1,
    addEventListener:(key,fn)=>listeners.set(key,fn),
    removeEventListener:(key,fn)=>{assert.equal(listeners.get(key),fn);listeners.delete(key);}};
  const root = {style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)}};
  const stop = trackModalViewport({visualViewport:viewport},root);
  assert.equal(values.get('--modal-visible-height'),'844px');
  viewport.height=400;viewport.offsetTop=20;listeners.get('resize')();
  assert.equal(values.get('--modal-visible-height'),'400px');
  assert.equal(values.get('--modal-visible-top'),'20px');
  viewport.scale=2;viewport.height=200;listeners.get('resize')();
  assert.equal(values.get('--modal-visible-height'),'400px');
  viewport.scale=1;viewport.height=844;viewport.offsetTop=0;listeners.get('scroll')();
  assert.equal(values.get('--modal-visible-height'),'844px');
  stop();assert.equal(listeners.size,0);assert.equal(values.size,0);
});
test('missing visualViewport gracefully keeps CSS fallback',()=>{
  assert.doesNotThrow(()=>trackModalViewport({}, {})());
});
