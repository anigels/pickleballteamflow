import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupIosUpdate, lookupAndroidUpdate, openOptionalUpdate } from '../src/services/updateStores.mjs';
const config = {applicationId:'com.pickleballteamflow.app',iosAppStoreId:'6804800516',iosStoreCountry:'us',androidProductionUrl:'https://example.test/release.json'};
const installed = {id:config.applicationId,version:'1.2.0',build:'10'};
const release = {schemaVersion:1,applicationId:installed.id,release:{track:'production',version:'1.3.0',versionCode:11}};
const http = data => ({get:async()=>({status:200,data})});
const info = {updateAvailability:2,availableVersionCode:'11',currentVersionCode:'10',flexibleUpdateAllowed:true};
test('Apple lookup uses numeric ID and rejects a different bundle',async()=>{
  let request;
  const apple={get:async options=>{request=options;return {status:200,data:{results:[{trackId:6804800516,bundleId:installed.id,version:'1.3.0'}]}};}};
  assert.equal((await lookupIosUpdate(installed,config,apple)).version,'1.3.0');
  assert.equal(request.params.id,'6804800516');
  assert.equal(await lookupIosUpdate(installed,config,http({results:[{trackId:6804800516,bundleId:'wrong',version:'1.3.0'}]})),null);
});
test('Android requires an exact public production code match',async()=>{
  assert.equal((await lookupAndroidUpdate(installed,config,http(release),{getAppUpdateInfo:async()=>info})).version,'1.3.0');
  for (const change of [{availableVersionCode:'12'},{updateAvailability:1},{currentVersionCode:'9'}]) {
    assert.equal(await lookupAndroidUpdate(installed,config,http(release),{getAppUpdateInfo:async()=>({...info,...change})}),null);
  }
});
test('inactive, testing, malformed, equal and wrong-app metadata do not call Play',async()=>{
  for (const data of [null,{}, {...release,release:null},{...release,applicationId:'wrong'},
    {...release,release:{...release.release,track:'internal'}},
    {...release,release:{...release.release,version:'1.2.0'}},
    {...release,release:{...release.release,versionCode:'oops'}}]) {
    assert.equal(await lookupAndroidUpdate(installed,config,http(data),{getAppUpdateInfo:()=>assert.fail()}),null);
  }
});
test('store errors propagate to the silent controller boundary',async()=>{
  await assert.rejects(lookupIosUpdate(installed,config,{get:async()=>({status:503})}));
  await assert.rejects(lookupAndroidUpdate(installed,config,{get:async()=>{throw Error('offline');}},{}));
});
for (const code of [0,1,2]) test(`flexible update result ${code}: only failures use fallback`,async()=>{
  let stores=0;
  await openOptionalUpdate({platform:'android',versionCode:'11'},config,{
    getAppUpdateInfo:async()=>info,startFlexibleUpdate:async()=>({code}),openAppStore:async()=>{stores++;}
  });
  assert.equal(stores,code===2?1:0);
});
test('unsupported flexible updates use the package-specific store fallback',async()=>{
  let options;
  await openOptionalUpdate({platform:'android',versionCode:'11'},config,{
    getAppUpdateInfo:async()=>({...info,flexibleUpdateAllowed:false}),openAppStore:async value=>{options=value;}
  });
  assert.equal(options.androidPackageName,installed.id);
});
test('changed testing-track offer is not started after Update is tapped',async()=>{
  await openOptionalUpdate({platform:'android',versionCode:'11'},config,{
    getAppUpdateInfo:async()=>({...info,availableVersionCode:'12'}),startFlexibleUpdate:()=>assert.fail(),openAppStore:()=>assert.fail()
  });
});
test('a previously downloaded matching production update is handed to restart consent',async()=>{
  let ready=0;
  assert.equal(await lookupAndroidUpdate(installed,config,http(release),{
    getAppUpdateInfo:async()=>({...info,installStatus:11})
  },()=>{ready++;}),null);
  assert.equal(ready,1);
});
test('iOS opens the supplied stable product ID',async()=>{
  let options;
  await openOptionalUpdate({platform:'ios'},config,{openAppStore:async value=>{options=value;}});
  assert.equal(options.appId,'6804800516');
});
