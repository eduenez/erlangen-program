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
  // The landing page (the talks' QR target) links both decks and both handouts.
  await page.goto(pathToFileURL(path.join(__dirname,'../web/algebra-geometry/index.html')).href);
  assert.equal(await page.locator('.talks a[href$=".pdf"]').count(),6);
  for(const f of ['geometry-and-algebra-slides','geometry-and-algebra-handout','functions-and-transcendence-slides','functions-and-transcendence-handout'])
   assert.ok(await page.locator(`.talks a[href$="/${f}.pdf"]`).count()>=1,f);
  assert.equal(await page.locator('.links:not(.talks) > section > a').count(),7);
  await page.screenshot({path:path.join(out,'index.png'),fullPage:true});
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
  // Dragging a vertex keeps the three side intersections on the axis.
  await page.evaluate(()=>lesson.moveVertex(0,-2.1,.6));
  assert.ok(await page.evaluate(()=>lesson.sideErrors.every(x=>x<1e-9)&&lesson.I.every(p=>Math.abs(p[1]+1.2)<1e-9&&Math.abs(p[2])<1e-9)));
  {const before=await page.evaluate(()=>lesson.state.A[2].slice()),box=await page.locator('#scene').boundingBox();
   const at=await page.evaluate(()=>{const c=document.getElementById('scene'),r=c.getBoundingClientRect(),[x0,x1,y0,y1]=[-4.2,3.2,-2.7,1.9],s=Math.min((r.width-70)/(x1-x0),(r.height-70)/(y1-y0)),a=lesson.state.A[2];return [r.width/2+(a[0]-(x0+x1)/2)*s,r.height/2-(a[1]-(y0+y1)/2)*s]});
   await page.mouse.move(box.x+at[0],box.y+at[1]);await page.mouse.down();await page.mouse.move(box.x+at[0]+60,box.y+at[1]+25,{steps:4});await page.mouse.up();
   const after=await page.evaluate(()=>lesson.state.A[2].slice());assert.ok(after[0]>before[0]+.2&&after[1]<before[1]-.05,'pointer drag moves C');
   assert.ok(await page.evaluate(()=>lesson.sideErrors.every(x=>x<1e-9)))}
  await page.screenshot({path:path.join(out,'desargues-dragged.png'),fullPage:true});
  await open('arithmetic');await page.evaluate(()=>{lesson.set('a',1.5);lesson.set('b',2)});
  let r=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(r.sum-3.5)<1e-10&&Math.abs(r.product-3)<1e-10&&Math.abs(r.productBA-3)<1e-10);
  await page.evaluate(()=>{lesson.set('a',-1.2);lesson.set('b',.5)});r=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(r.sum+.7)<1e-10&&Math.abs(r.product+.6)<1e-10);
  await page.screenshot({path:path.join(out,'arithmetic-add.png'),fullPage:true});
  for(const mode of ['mul','comm']){await page.selectOption('#mode',mode);await page.evaluate(()=>{lesson.set('a',1.7);lesson.set('b',1.25)});await page.screenshot({path:path.join(out,'arithmetic-'+mode+'.png'),fullPage:true})}
  await open('bezout');
  const count=()=>page.evaluate(()=>{const d=lesson.calculate();return [d.real,d.nonreal,d.atInfinity,d.total,d.product,Math.max(...d.points.map(p=>p.multiplicity))]});
  for(const [mode,values]of Object.entries({cubic:[-1.7,-.4,0,.3,1.1,1.8],conics:[-3.3,-1.4,0,.5,2.2,3.3],circles:[.2,.6,1.4,1.8],conicCubic:[.3,.6,1,1.7,2.4,2.6],parabola:[-1.5,0,.8]})){
   await page.selectOption('#mode',mode);for(const v of values){await set('parameter',v);const c=await count();assert.equal(c[3],c[4],`${mode} at ${v}: total equals the product of degrees`)}}
  await page.selectOption('#mode','cubic');assert.deepEqual((await count()).slice(0,3),[3,0,0]);
  await page.locator('#special').click();assert.deepEqual(await count(),[3,0,0,3,3,2]);
  await set('parameter',1.5);assert.deepEqual((await count()).slice(0,3),[1,2,0]);
  await page.screenshot({path:path.join(out,'bezout-cubic.png'),fullPage:true});
  await page.selectOption('#mode','conics');assert.deepEqual((await count()).slice(0,3),[4,0,0]);
  await page.locator('#special').click();assert.deepEqual(await count(),[4,0,0,4,4,2]);
  await page.screenshot({path:path.join(out,'bezout-conics.png'),fullPage:true});
  await set('parameter',3.3);assert.deepEqual((await count()).slice(0,3),[0,4,0]);
  // An ellipse and a cubic: six real points, then two tangencies (each counted twice), then four nonreal.
  await page.selectOption('#mode','conicCubic');assert.deepEqual(await count(),[6,0,0,6,6,1]);
  await page.screenshot({path:path.join(out,'bezout-conic-cubic.png'),fullPage:true});
  await page.locator('#special').click();assert.deepEqual(await count(),[6,0,0,6,6,2]);
  await set('parameter',.5);assert.deepEqual((await count()).slice(0,3),[2,4,0]);
  await page.selectOption('#mode','circles');assert.deepEqual((await count()).slice(0,3),[2,0,2]);
  await set('parameter',1.5);assert.deepEqual((await count()).slice(0,3),[0,2,2]);
  await page.selectOption('#mode','parabola');assert.deepEqual((await count()).slice(0,3),[1,0,1]);
  await page.screenshot({path:path.join(out,'bezout-parabola.png'),fullPage:true});
  // The projective plane: lines through 0, a hemisphere, and the plane z = 1.
  await open('projective-plane');
  const proj=()=>page.evaluate(()=>{const d=lesson.calculate();return {affine:d.affine,hemi:d.hemi,horizontal:d.horizontal,h:d.homogeneous,arcs:d.arcs}});
  const near=(a,b,eps=1e-9)=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<eps);
  await set('a',45);await set('b',0);{const d=await proj();assert.ok(near(d.affine,[1,0])&&near(d.hemi,[Math.SQRT1_2,0,Math.SQRT1_2])&&!d.horizontal)}
  await page.screenshot({path:path.join(out,'projective-point.png'),fullPage:true});
  await page.locator('#special').click();{const d=await proj();assert.ok(d.horizontal&&d.affine===null&&Math.abs(d.hemi[2])<1e-9&&near(d.h,[1,0,0]),'a horizontal line is a point at infinity')}
  await page.screenshot({path:path.join(out,'projective-infinity.png'),fullPage:true});
  await set('a',135);{const d=await proj();assert.ok(near(d.affine,[-1,0])&&d.hemi[2]>0,'past the horizontal, P returns from the opposite side')}
  await page.evaluate(()=>lesson.set({theta:60,phi:120}));
  {const d=await proj();assert.ok(near(d.h.slice(0,2),d.affine)&&Math.abs(Math.hypot(...d.hemi)-1)<1e-12&&near(d.affine,[d.hemi[0]/d.hemi[2],d.hemi[1]/d.hemi[2]]))}
  {const box=await page.locator('#right').boundingBox();await page.evaluate(()=>lesson.set({theta:45,phi:0}));
   const at=await page.evaluate(()=>{const c=document.getElementById('right'),r=c.getBoundingClientRect(),s=Math.min((r.width-90)/4.4,(r.height-90)/4.4);return [r.width/2+s,r.height/2]});
   await page.mouse.move(box.x+at[0],box.y+at[1]);await page.mouse.down();await page.mouse.move(box.x+at[0]-40,box.y+at[1]-50,{steps:4});await page.mouse.up();
   const d=await proj();assert.ok(d.affine[0]<.95&&d.affine[1]>.2,'pointer drag moves P')}
  await page.selectOption('#mode','lines');assert.equal(await page.locator('#b').isDisabled(),true);
  await set('a',.5);{const d=await proj();assert.ok(near(d.affine,[-2,0])&&near(d.h,[-2,0,1]))
   // every sampled point of each semicircle lies on the plane through 0 of its line, on the unit sphere
   for(const g of d.arcs)for(const a of [0,.7,1.6,2.9,Math.PI]){const p=g.u.map((u,i)=>u*Math.cos(a)+g.w[i]*Math.sin(a));assert.ok(Math.abs(p[0]*g.normal[0]+p[1]*g.normal[1]+p[2]*g.normal[2])<1e-12&&Math.abs(Math.hypot(...p)-1)<1e-12&&p[2]>-1e-12)}}
  await page.screenshot({path:path.join(out,'projective-lines.png'),fullPage:true});
  await page.locator('#special').click();{const d=await proj();assert.ok(d.horizontal&&near(d.h,[1,0,0])&&d.arcs.every(g=>near(g.u.map(Math.abs),[1,0,0])),'parallel lines meet on the equator at [1:0:0]')}
  await page.locator('#sphere').check();await page.locator('#azimuth').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>lesson.state.azimuth),-17);
  await page.screenshot({path:path.join(out,'projective-parallel-sphere.png'),fullPage:true});
  await open('exponential');assert.ok(await page.evaluate(()=>lesson.calculate().error<1e-9));
  await page.evaluate(()=>lesson.set(0,Math.PI));r=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(r.w[0]+1)<1e-9&&Math.abs(r.w[1])<1e-9&&r.error<1e-9);
  await page.evaluate(()=>lesson.set(.3,.8));await page.screenshot({path:path.join(out,'exponential.png'),fullPage:true});
  await open('branching');await page.locator('#one').click();
  let d=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(d.t[0]-1)<1e-10&&Math.abs(d.u[0]+1)<1e-10&&d.error<1e-10);
  await page.screenshot({path:path.join(out,'branching.png'),fullPage:true});
  await page.locator('#two').click();d=await page.evaluate(()=>lesson.calculate());assert.ok(Math.abs(d.u[0]-1)<1e-10);
  for(const turns of [.125,.3,.75,1.333,1.875]){await set('turns',turns);assert.ok(await page.evaluate(()=>lesson.calculate().error<1e-10))}
  await set('radius',1.8);assert.ok(await page.evaluate(()=>lesson.calculate().error<1e-10));
  await page.setViewportSize({width:390,height:844});
  for(const name of ['intersections','desargues','branching','arithmetic','bezout','exponential','projective-plane']){
   await open(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const pixels=await page.locator('canvas').first().evaluate(c=>{const x=c.getContext('2d'),a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<220&&a[i+1]<220&&a[i+2]<220)n++;return n});assert.ok(pixels>100);
   await page.screenshot({path:path.join(out,name+'-mobile.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('Passed: intersection counts, infinity, spatial and planar incidences under dragging, ruler arithmetic, Bezout totals, the hemisphere model of the projective plane, exponential fibres, root continuation, keyboard control, mobile layout, and browser runtime.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
