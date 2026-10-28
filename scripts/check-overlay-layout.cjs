// Run against npm run dev with Playwright available in NODE_PATH (no app dependency).
// Synthetic insets test layout geometry, not native iOS/Android rendering.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const baseUrl = process.env.AUDIT_URL || 'http://127.0.0.1:4223';
const output = process.env.AUDIT_OUTPUT || 'artifacts/overlay-audit';
const only = process.env.AUDIT_CASE;
const baseline = process.env.AUDIT_BASELINE === '1';
const cases = baseline ? [['iphone17-pro',402,874,62,34,0,16,'ios']] : [
 ['iphone17-pro',402,874,62,34,0,16,'ios'],['iphone17-pro-max',440,956,62,34,0,16,'ios'],
 ['small-iphone',375,667,20,0,0,16,'ios'],['dynamic-island',393,852,59,34,0,16,'ios'],
 ['iphone-landscape',874,402,0,21,62,16,'ios'],['ipad-portrait',768,1024,24,20,0,16,'ios'],
 ['ipad-landscape',1024,768,24,20,0,16,'ios'],['android-small',360,640,24,24,0,16,'md'],
 ['android-cutout',412,915,40,24,0,16,'md'],['android-tablet',800,1280,24,24,0,16,'md'],
 ['web-narrow',320,568,0,0,0,16,'md'],['web-desktop',1440,900,0,0,0,16,'md'],
 ['large-text',402,874,62,34,0,32,'ios'],['keyboard-height',402,400,62,0,0,16,'ios']
];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 try {for(const [name,width,height,top,bottom,side,font,mode] of cases.filter(c=>!only||c[0]===only)){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route(`${baseUrl}/**`,async route=>{
   const response=await route.fetch();const type=response.headers()['content-type']||'';
   if(!/javascript|css|html/.test(type))return route.fulfill({response});
   let body=await response.text();
   body=body.replace(/env\(safe-area-inset-(top|bottom|left|right)\)/g,(_,edge)=>`${edge==='top'?top:edge==='bottom'?bottom:side}px`);
   if(route.request().url().includes('/src/main.js'))body=body.replace('app.use(IonicVue)',`app.use(IonicVue, { mode: '${mode}' })`);
   await route.fulfill({response,body});
  });
  await context.addInitScript(()=>{const players=Array.from({length:120},(_,i)=>({id:`p${i}`,displayName:i===0?'Alexandria Montgomery':'Player '+(i+1)}));localStorage.setItem('ptf.savedRosters',JSON.stringify({schemaVersion:1,players,rosters:Array.from({length:12},(_,i)=>({id:`r${i}`,name:'Weekend group '+(i+1),playerIds:players.slice(0,12).map(p=>p.id)})),workingRoster:{namesText:players.slice(0,12).map(p=>p.displayName).join('\n'),courtCount:3,roundCount:4}}));});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.goto(`${baseUrl}/app.html#/`);
  await page.addStyleTag({content:`html {font-size:${font}px !important}`});
  const before=await page.evaluate(()=>localStorage.getItem('ptf.savedRosters'));
  await page.getByRole('button',{name:'Load Players & Rosters',exact:true}).click();
  const modal=page.locator('ion-modal.selector-component');await modal.waitFor({state:'visible'});await page.waitForTimeout(450);
  const geometry=await modal.evaluate(el=>{const b=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};return {modal:b(el.shadowRoot.querySelector('[part="content"]')),header:b(el.querySelector('header')),close:b(el.querySelector('header ion-button'))};});
  await page.screenshot({path:path.join(output,name+'.png')});
  if(!baseline){assert(geometry.modal.top>=top-1,`${name}: modal top in safe area`);assert(geometry.modal.bottom<=height-bottom+1,`${name}: modal bottom in safe area`);assert(geometry.close.top>=top-1);assert(geometry.close.bottom<=height-bottom+1);assert(geometry.close.height>=43.5, `${name}: Close touch target ${geometry.close.height}`);assert(geometry.modal.left>=side-1);assert(geometry.modal.right<=width-side+1);}
  await modal.locator('ion-segment-button').filter({hasText:'Select Players'}).click();await modal.getByRole('button',{name:'Select All',exact:true}).click();
  const footer=modal.locator('footer');await footer.waitFor({state:'visible'});
  const footerBox=await footer.boundingBox();if(!baseline)assert(footerBox.y+footerBox.height<=height-bottom+1,`${name}: footer reachable`);
  const scrolled=await modal.locator('ion-content').evaluate(async el=>{const s=await el.getScrollElement();s.scrollTop=s.scrollHeight;return {scrollTop:s.scrollTop,scrollHeight:s.scrollHeight,clientHeight:s.clientHeight};});assert(scrolled.scrollTop>0,`${name}: player list scrolls`);
  if (!baseline && name === 'iphone17-pro') {
    for (const viewport of [{width:768,height:1024},{width:402,height:400},{width,height}]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(250);
      const close=await modal.getByRole('button',{name:'Close',exact:true}).boundingBox();
      const actions=await footer.boundingBox();
      assert(close.y>=top-1 && close.y+close.height<=viewport.height-bottom+1,'Close follows live resize');
      assert(actions.y+actions.height<=viewport.height-bottom+1,'footer follows live resize');
    }
  }
  await modal.getByRole('button',{name:'Close',exact:true}).click();await modal.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('ptf.savedRosters')),before,`${name}: library/working roster unchanged`);
  for(const route of ['players','settings','about']){await page.goto(`${baseUrl}/app.html#/`+route);await page.locator('ion-content').first().waitFor();}
  assert(await page.getByText('Version 1.4.1',{exact:true}).count()||baseline,'About version');
  if (!baseline && ['iphone17-pro','ipad-portrait','large-text'].includes(name)) {
    const safeModal = async selector => {
      const overlay = page.locator(selector); await overlay.waitFor({state:'visible'}); await page.waitForTimeout(650);
      const box = await overlay.evaluate(el=>{const r=el.shadowRoot.querySelector('[part="content"]').getBoundingClientRect();return {top:r.top,bottom:r.bottom};});
      assert(box.top>=top-1 && box.bottom<=height-bottom+1, `${name}: ${selector} safe bounds ${JSON.stringify(box)}`);
      return overlay;
    };
    await page.goto(`${baseUrl}/app.html#/players`);
    await page.getByRole('button',{name:'Edit Weekend group 1 roster',exact:true}).click();
    await page.getByRole('button',{name:'Add Players',exact:true}).click();
    const picker = await safeModal('ion-modal.picker-modal');
    await picker.getByRole('button',{name:'Select All',exact:true}).click();
    await page.screenshot({path:path.join(output,name+'-picker.png')});
    await picker.getByRole('button',{name:'Cancel',exact:true}).click(); await picker.waitFor({state:'detached'});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Delete Weekend group 1 roster',exact:true}).click();
    const alert=page.locator('ion-alert.saved-roster-overlay'); await alert.waitFor({state:'visible'});
    await alert.getByRole('button',{name:'Cancel',exact:true}).click(); await alert.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>localStorage.getItem('ptf.savedRosters')),before,'cancelled roster edit/deletion preserves data');
    await page.goto(`${baseUrl}/app.html#/`);
    await page.getByRole('button',{name:'Save Players & Roster',exact:true}).click();
    const save=page.locator('ion-alert.saved-roster-overlay'); await save.waitFor({state:'visible'});
    await page.screenshot({path:path.join(output,name+'-save.png')});
    await save.getByRole('button',{name:'Cancel',exact:true}).click(); await save.waitFor({state:'detached'});
    await page.getByRole('button',{name:'Generate Court Assignments',exact:true}).click();
    await page.getByRole('button',{name:'Complete round 1',exact:true}).click();
    await page.getByRole('button',{name:/^Swap /}).first().click();
    const swap=await safeModal('ion-modal.substitution-modal');
    await page.screenshot({path:path.join(output,name+'-swap.png')});
    await swap.getByRole('button',{name:'Close swap players window',exact:true}).click(); await swap.waitFor({state:'hidden'});
    // Exercise the actual optional prompt UI only; no store lookup or update action.
    await page.evaluate(()=>{void import('/src/services/updateService.js').then(m=>m.promptForUpdate());});
    const update=page.locator('ion-alert.optional-update-alert'); await update.waitFor({state:'visible'});
    await update.getByRole('button',{name:'Not Now',exact:true}).click(); await update.waitFor({state:'detached'});
    assert.equal(await page.getByLabel('Round 1, completed' ,{exact:true}).count(),1,'completed round retained after closing swap');
    assert.equal(await page.getByRole('button',{name:'Complete round 2',exact:true}).count(),1,'open round retained');
    assert.equal(await page.evaluate(()=>localStorage.getItem('ptf.savedRosters')),before,'gameplay does not mutate saved library');
  }
  results.push({name,width,height,insets:{top,bottom,side},rootFont:font,mode,geometry,scroll:scrolled,status:'pass'});await context.unrouteAll({behavior:"wait"});await context.close();
 }} finally {await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exit(1)});
