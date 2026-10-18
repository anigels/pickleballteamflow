import test from 'node:test';
import assert from 'node:assert/strict';
import { createRosterNotifier } from '../src/services/rosterNotifications.mjs';
function harness() {
  const toasts=[];
  const notifier=createRosterNotifier({async create(options){let resolve; const dismissed=new Promise(r=>resolve=r); const toast={options,presented:false,dismissed:false,async present(){this.presented=true;},async dismiss(){this.dismissed=true;resolve();},onDidDismiss:()=>dismissed};toasts.push(toast);return toast;}});
  return {toasts,notifier};
}
test('success toast is green, bottom positioned, announced, and duplicate notifications suppressed',async()=>{
  const {toasts,notifier}=harness(); await notifier.show('Saved'); await notifier.show('Saved');
  assert.equal(toasts.length,1); assert.equal(toasts[0].options.position,'bottom');
  assert.ok(toasts[0].options.cssClass.includes('roster-toast-success')); assert.equal(toasts[0].options.htmlAttributes,undefined);
  assert.equal(toasts[0].options.duration,6000); await notifier.close(); assert.equal(toasts[0].dismissed,true);
});
test('errors replace previous toast, persist for reading, and provide dismissal',async()=>{
  const {toasts,notifier}=harness(); await notifier.show('Saved'); await notifier.show('Storage failed',true);
  assert.equal(toasts[0].dismissed,true); assert.equal(toasts[1].options.duration,0);
  assert.equal(toasts[1].options.htmlAttributes,undefined); assert.equal(toasts[1].options.buttons[0].text,'Dismiss');
  await notifier.close(); await notifier.show('Late'); assert.equal(toasts.length,2);
});
test('rapid notifications suppress stale asynchronous creation',async()=>{
  const {toasts,notifier}=harness(); await Promise.all([notifier.show('First'),notifier.show('Latest')]);
  assert.equal(toasts.filter(t=>t.presented && !t.dismissed).length,1);
  assert.equal(toasts.find(t=>t.presented && !t.dismissed).options.message,'Latest'); await notifier.close();
});
