// Real installed browser SDK; all fetch/XHR/beacon calls are intercepted locally.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const ts = require('typescript');
const policy = {exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/analytics/marketingPolicy.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(policy,policy.exports);
const dom = new JSDOM('<html><body>Public page</body></html>',{url:'https://growpathai.com/about',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window, requests=[];
w.fetch=async(url,options)=>{requests.push(options?.body);return{ok:true,status:200,text:async()=> '1',json:async()=>({status:1})};};
w.XMLHttpRequest.prototype.send=function(body){requests.push(body);};
w.navigator.sendBeacon=(_url,body)=>{requests.push(body);return true;};
w.module={exports:{}};w.exports=w.module.exports;
w.eval(fs.readFileSync(path.join(path.dirname(require.resolve('@heycatch/sdk')),'index.cjs'),'utf8'));
w.module.exports.analytics.init({projectKey:policy.exports.HEYCATCH_PROJECT_KEY,install:{framework:'react',frameworkVersion:'19',agent:'codex'},maskAllText:false,maskAllElementAttributes:true,persistence:'sessionStorage',respectDnt:true,requestBatching:false,beforeSend:event=>policy.exports.filterMarketingEvent(event,w.location.href)});
setTimeout(()=>{
  try {
    const events=requests.flatMap(body=>{const parsed=JSON.parse(body);return parsed.batch || [parsed];});
    const registration=events.filter(e=>e.event==='$groupidentify');
    assert.equal(registration.length,1,'SDK public-project registration must reach transport');
    assert.equal(registration[0].properties.$group_set.framework,'react');
    assert.equal(registration[0].properties.$group_key,policy.exports.HEYCATCH_PROJECT_KEY);
    assert.ok(events.some(e=>e.event==='$pageview'));
    const count=requests.length;
    w.history.replaceState({},'', '/feedback?token=PRIVATE_SENTINEL');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    setTimeout(()=>{
      try {assert.equal(requests.length,count);assert.ok(!JSON.stringify(requests).includes('PRIVATE_SENTINEL'));console.log(JSON.stringify({passed:true,offline:true,projectRegistration:1,publicPageview:true,privateLeak:false}));}
      catch(error){console.error(error.message);process.exitCode=1;}
      finally{w.close();}
    },100);
  } catch(error){console.error(error.message);w.close();process.exitCode=1;}
},100);
