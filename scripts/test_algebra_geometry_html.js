// Browser and mathematical checks for web/algebra-geometry/.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const out=path.resolve(process.env.QA_DIR||require('node:os').tmpdir()+'/erlangen-algebra-geometry-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const open=async name=>{await page.goto(pathToFileURL(path.join(__dirname,'../web/algebra-geometry',name+'.html')).href);await page.waitForFunction(()=>window.lesson)};
  const set=async(id,v)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
  await open('intersections');
  await set('parameter',0);assert.equal(await page.evaluate(()=>lesson.calculate().realCount),2);
  await page.locator('#special').click();assert.equal(await page.evaluate(()=>lesson.calculate().realCount),1);
  await set('parameter',1.4);assert.equal(await page.evaluate(()=>lesson.calculate().realCount),0);
  await page.screenshot({path:path.join(out,'intersections.png'),fullPage:true});
  await page.selectOption('#mode','infinity');await page.locator('#special').click();
  assert.deepEqual(await page.evaluate(()=>lesson.calculate().homogeneous.map(v=>v===0?0:v)),[1,0,0]);
  assert.equal(await page.evaluate(()=>lesson.calculate().affine),null);
  await set('parameter',.5);assert.deepEqual(await page.evaluate(()=>lesson.calculate().affine),[-2,0]);
  await page.screenshot({path:path.join(out,'infinity.png'),fullPage:true});
  await open('desargues');
  assert.ok(await page.evaluate(()=>lesson.sideErrors.every(x=>x<1e-10)));
  assert.ok(await page.evaluate(()=>lesson.I.every(p=>Math.abs(p[1]+1.2)<1e-10&&Math.abs(p[2])<1e-10)));
  await page.screenshot({path:path.join(out,'desargues.png'),fullPage:true});
  const old=await page.evaluate(()=>lesson.state.azimuth);await page.locator('#azimuth').focus();await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.evaluate(()=>lesson.state.azimuth),old);
  await page.selectOption('#view','plane');assert.equal(await page.locator('#azimuth').isDisabled(),true);
  assert.ok(await page.evaluate(()=>{const p=lesson.I.map(lesson.project),a=p[0],b=p[1],c=p[2];return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-10}));
  await page.screenshot({path:path.join(out,'desargues-plane.png'),fullPage:true});
  await open('branching');await page.locator('#one').click();
  let d=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(d.t[0]-1)<1e-10&&Math.abs(d.u[0]+1)<1e-10&&d.error<1e-10);
  await page.screenshot({path:path.join(out,'branching.png'),fullPage:true});
  await page.locator('#two').click();d=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(d.u[0]-1)<1e-10);
  for(const turns of [.125,.3,.75,1.333,1.875]){await set('turns',turns);assert.ok(await page.evaluate(()=>lesson.calculate().error<1e-10))}
  await set('radius',1.8);assert.ok(await page.evaluate(()=>lesson.calculate().error<1e-10));
  await page.setViewportSize({width:390,height:844});
  for(const name of ['intersections','desargues','branching']){
   await open(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const pixels=await page.locator('canvas').first().evaluate(c=>{const x=c.getContext('2d'),a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<220&&a[i+1]<220&&a[i+2]<220)n++;return n});assert.ok(pixels>100);
   await page.screenshot({path:path.join(out,name+'-mobile.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('Passed: intersection counts, infinity, spatial and planar incidences, root continuation, keyboard control, mobile layout, and browser runtime.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
