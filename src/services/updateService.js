import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppUpdate } from '@capawesome/capacitor-app-update';
import { alertController, modalController, popoverController, loadingController, actionSheetController } from '@ionic/vue';
import { createUpdateController } from './updateController.mjs';
import { lookupIosUpdate, lookupAndroidUpdate, openOptionalUpdate } from './updateStores.mjs';
import { isRecent } from './updatePolicy.mjs';
import { updateConfig } from './updateConfig';
import './updateService.css';

export async function promptForUpdate() {
  const alert = await alertController.create({
    header: 'Update Available',
    message: 'A newer version of Pickleball Team Flow is available with the latest improvements and fixes.',
    cssClass: 'optional-update-alert',
    buttons: [{ text: 'Not Now', role: 'cancel' }, { text: 'Update', role: 'update' }]
  });
  await alert.present();
  return (await alert.onDidDismiss()).role;
}

// Called after mounting: never await this in rendering/router startup.
export function startUpdateChecks() {
  const platform = Capacitor.getPlatform();
  if (!Capacitor.isNativePlatform() || !['ios', 'android'].includes(platform)) return () => {};
  let active = true, disposed = false, downloaded = false, readyBusy = false;
  const listeners = [];
  const key = `ptf.optionalUpdate.v1.${platform}`;
  let lastReadyAt = 0;
  try { lastReadyAt = Number(localStorage.getItem(`${key}.readyAt`)) || 0; } catch { /* optional storage */ }
  const canPresent = async () => active && !disposed &&
    !(await alertController.getTop()) && !(await modalController.getTop()) &&
    !(await popoverController.getTop()) && !(await loadingController.getTop()) &&
    !(await actionSheetController.getTop());
  async function offerRestart() {
    if (!downloaded || readyBusy || isRecent(lastReadyAt, Date.now())) return;
    readyBusy = true;
    try {
      if (!(await canPresent())) return;
      lastReadyAt = Date.now();
      try { localStorage.setItem(`${key}.readyAt`, String(lastReadyAt)); } catch { /* memory throttle */ }
      const alert = await alertController.create({ header: 'Update Ready',
        message: 'The update has downloaded. Restart the app to finish installing it.',
        cssClass: 'optional-update-alert',
        buttons: [{ text: 'Not Now', role: 'cancel' }, { text: 'Restart', role: 'restart' }] });
      await alert.present();
      if ((await alert.onDidDismiss()).role === 'restart' && !disposed) {
        await AppUpdate.completeFlexibleUpdate();
        downloaded = false;
      }
    } catch { /* Never interrupt normal app use. */ } finally { readyBusy = false; }
  }
  const controller = createUpdateController({
    isNative: () => Capacitor.isNativePlatform(),
    getInstalled: () => App.getInfo(),
    lookup: installed => platform === 'ios'
      ? lookupIosUpdate(installed, updateConfig, CapacitorHttp)
      : lookupAndroidUpdate(installed, updateConfig, CapacitorHttp, AppUpdate, () => { downloaded = true; }),
    readState: () => JSON.parse(localStorage.getItem(key) || '{}'),
    writeState: state => localStorage.setItem(key, JSON.stringify(state)),
    canPresent,
    prompt: promptForUpdate,
    update: candidate => openOptionalUpdate(candidate, updateConfig, AppUpdate)
  });
  const check = async () => {
    if (!active || disposed) return;
    await controller.check();
    await offerRestart();
  };
  const retain = promise => void promise.then(handle => {
    if (disposed) void handle.remove().catch(() => {});
    else listeners.push(handle);
  }).catch(() => {});
  const timer = setTimeout(() => void check(), 1500);
  retain(App.addListener('appStateChange', state => {
    active = state.isActive;
    if (active) void check();
  }));
  if (platform === 'android') retain(AppUpdate.addListener('onFlexibleUpdateStateChange', state => {
    if (state.installStatus === 11) { downloaded = true; void offerRestart(); }
  }));
  void App.getState().then(state => { active = state.isActive; }).catch(() => {});
  return () => {
    disposed = true;
    clearTimeout(timer);
    controller.stop();
    listeners.forEach(handle => void handle.remove().catch(() => {}));
  };
}
