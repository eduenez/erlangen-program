'use strict';
(() => {
  const C={ink:'#152c46',teal:'#006e70',wine:'#ac3653',gold:'#a56600',grid:'#d7dfe6'};
  const el=id=>document.getElementById(id);
  const n=(v,d=3)=>Math.abs(v)<.5*10**(-d)?(0).toFixed(d):v.toFixed(d);
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const mul=(a,s)=>a.map(x=>x*s);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>Math.hypot(...a);
  const complex=(a,b)=>`${n(a)} ${b<0?'−':'+'} ${n(Math.abs(b))}i`;
  function context(canvas){
    const {width,height}=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.font='15px system-ui';
    return {ctx,width,height};
  }
  function chart(canvas,bounds=[-2,2,-2,2],names=['Re','Im']){
    const {ctx,width,height}=context(canvas),pad=45;
    const [xmin,xmax,ymin,ymax]=bounds;
    const scale=Math.min((width-2*pad)/(xmax-xmin),(height-2*pad)/(ymax-ymin));
    const x0=width/2-(xmin+xmax)*scale/2,y0=height/2+(ymin+ymax)*scale/2;
    const p=([x,y])=>[x0+x*scale,y0-y*scale];
    function line(points,color=C.ink,lw=2,dashed=false){ctx.beginPath();points.forEach((a,i)=>{const q=p(a);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dashed?[5,5]:[]);ctx.stroke();ctx.setLineDash([])}
    function text(s,a,color=C.ink,offset=[8,-9]){const q=p(a);ctx.fillStyle=color;ctx.fillText(s,q[0]+offset[0],q[1]+offset[1])}
    function point(a,color=C.teal,shape='circle',radius=6){const q=p(a);ctx.fillStyle=color;if(shape==='square')ctx.fillRect(q[0]-radius,q[1]-radius,2*radius,2*radius);else{ctx.beginPath();ctx.arc(...q,radius,0,2*Math.PI);ctx.fill()}}
    line([[xmin,0],[xmax,0]],C.grid,1);line([[0,ymin],[0,ymax]],C.grid,1);
    ctx.fillStyle=C.ink;ctx.font='14px system-ui';ctx.fillText(names[0],width-42,y0-9);ctx.fillText(names[1],x0+9,21);ctx.font='15px system-ui';
    const inv=([px,py])=>[(px-x0)/scale,(y0-py)/scale];
    return {ctx,p,inv,line,text,point,scale,width,height,bounds,x0,y0};
  }
  const circle=(r=1,start=0,end=2*Math.PI,count=160)=>Array.from({length:count+1},(_,i)=>{const t=start+(end-start)*i/count;return [r*Math.cos(t),r*Math.sin(t)]});
  function observe(ids,draw){const ro=new ResizeObserver(draw);ids.forEach(id=>ro.observe(el(id)));draw()}

  function intersections(){
    const state={mode:'circle',parameter:.5};
    function calculate(){const v=state.parameter;if(state.mode==='infinity')return {homogeneous:[1,0,-v],affine:Math.abs(v)<1e-12?null:[-1/v,0]};const d=1-v*v;return {discriminant:d,roots:d>=0?[[Math.sqrt(d),0],[-Math.sqrt(d),0]]:[[0,Math.sqrt(-d)],[0,-Math.sqrt(-d)]],realCount:Math.abs(d)<1e-10?1:d>0?2:0,multiplicity:2}}
    function draw(){
      const v=state.parameter,data=calculate();el('parameterValue').textContent=`${state.mode==='circle'?'h':'m'} = ${n(v,2)}`;
      const a=chart(el('left'),[-2.2,2.2,-1.9,1.9],['x','y']);
      if(state.mode==='circle'){
        a.line(circle(),C.teal,3);a.line([[-2.2,v],[2.2,v]],C.wine,2.5);
        const b=chart(el('right'),[-1.8,1.8,-1.8,1.8],['Re x','Im x']);
        for(const r of data.roots){b.point(r,C.wine);if(Math.abs(r[1])<1e-10)a.point([r[0],v],C.wine)}
        if(data.realCount===1){b.text('multiplicity 2',[0,0],C.wine,[12,24]);el('result').textContent='One real intersection, counted twice: tangency. Total complex count = 2.'}
        else if(data.realCount===2)el('result').textContent=`Two real intersections: x = ±${n(Math.sqrt(data.discriminant))}. Total count = 2.`;
        else el('result').textContent=`No real intersections. Complex roots: x = ±${n(Math.sqrt(-data.discriminant))}i. Total count = 2.`;
      }else{
        a.line([[-2.2,0],[2.2,0]],C.teal,3);a.line([[-2.2,1-2.2*v],[2.2,1+2.2*v]],C.wine,2.5);
        const b=chart(el('right'),[-1.5,1.5,-1.5,1.5],['X','Z']);b.line(circle(),C.grid,2);
        const q=[1/Math.hypot(1,v),-v/Math.hypot(1,v)];
        b.line([mul(q,-1.3),mul(q,1.3)],C.gold,1.5);b.point(q,C.gold);b.point(mul(q,-1),C.gold,'square');
        if(data.affine){if(Math.abs(data.affine[0])<2.2)a.point(data.affine,C.gold);el('result').textContent=`Affine intersection: (${n(data.affine[0])}, 0). Homogeneous point [1 : 0 : ${n(-v,2)}].`}
        else el('result').textContent='Parallel in the affine chart. Their projective intersection is [1 : 0 : 0].';
      }
    }
    function configure(){
      const infinite=state.mode==='infinity';el('parameter').min=infinite?-1:-1.6;el('parameter').max=infinite?1:1.6;el('parameter').value=state.parameter;
      el('paramLabel').textContent=infinite?'Slope m of y = mx + 1':'Line height h';el('special').textContent=infinite?'Show infinity':'Show tangency';
      el('rightTitle').textContent=infinite?'Projective coordinate [X : Z]':'The complex x-coordinate';
      el('leftCaption').textContent=infinite?'Lines y = 0 and y = mx + 1. The intersection may leave this bounded picture.':'The circle has equation x² + y² = 1. Drag the line or use the slider.';
      el('rightCaption').textContent=infinite?'Opposite markers on the circle represent the same projective direction. The horizontal direction has Z = 0.':'The same two roots can leave the real axis without disappearing.';
      el('explanation').textContent=infinite?'The intersection has homogeneous coordinates [1 : 0 : −m]. For m ≠ 0 it lies in the affine chart Z ≠ 0, with x = −1/m. At m = 0 it is the point at infinity. The right picture shows the (X,Z) direction, not the full projective plane.':'Substituting y = h gives x² = 1 − h². There are two roots over ℂ, counted with multiplicity. At h = ±1, one root counts twice. A real-locus drawing cannot display a nonreal point of ℂ².';
      el('left').setAttribute('aria-label',infinite?'Two lines with a movable slope and a possible intersection at infinity':'A circle intersected by a movable horizontal line');
      el('right').setAttribute('aria-label',infinite?'The projective direction of the intersection, with antipodal points identified':'Roots of the intersection equation in the complex plane');draw();
    }
    el('mode').addEventListener('change',()=>{state.mode=el('mode').value;state.parameter=state.mode==='circle'?.5:.5;configure()});
    el('parameter').addEventListener('input',()=>{state.parameter=+el('parameter').value;draw()});
    el('special').addEventListener('click',()=>{state.parameter=state.mode==='circle'?1:0;el('parameter').value=state.parameter;draw()});
    el('reset').addEventListener('click',()=>{state.parameter=.5;configure()});
    let dragging=false;el('left').addEventListener('pointerdown',e=>{if(state.mode!=='circle')return;dragging=true;el('left').setPointerCapture(e.pointerId);move(e)});
    function move(e){if(!dragging)return;const r=el('left').getBoundingClientRect();const scale=Math.min((r.width-90)/4.4,(r.height-90)/3.8);state.parameter=Math.max(-1.6,Math.min(1.6,Math.round(((r.height/2-(e.clientY-r.top))/scale)*100)/100));el('parameter').value=state.parameter;draw()}
    el('left').addEventListener('pointermove',move);el('left').addEventListener('pointerup',()=>dragging=false);el('left').addEventListener('pointercancel',()=>dragging=false);
    window.lesson={state,calculate,draw};observe(['left','right'],draw);
  }

  function desargues(){
    // Π is z = 0 and Π′ is z = 0.6 + 0.5y, so Π ∩ Π′ is the fixed line y = −1.2, z = 0.
    // A, B, C may be dragged in Π; A′, B′, C′ and the side intersections follow.
    const O=[0,0,3],A0=[[-1,-.8,0],[1,-.4,0],[.2,1,0]],pairs=[[0,1],[0,2],[1,2]];
    const state={view:'space',azimuth:-62,elevation:22,axis:true,A:A0.map(a=>[...a])};
    const S=[0,2,6],project=p=>add(S,mul(sub(p,S),6/(6-p[2]))).slice(0,2);
    function compute(){
      const A=state.A,B=A.map(a=>add(O,mul(sub(a,O),2.4/(3+.5*a[1]))));
      const I=pairs.map(([i,j])=>add(A[i],mul(sub(A[j],A[i]),(-1.2-A[i][1])/(A[j][1]-A[i][1]))));
      const sideErrors=I.map((p,k)=>{const[i,j]=pairs[k];return norm(cross(sub(p,B[i]),sub(B[j],B[i])))/(1+norm(p))});
      return {A,B,I,sideErrors};
    }
    const planeBox=[-4.2,3.2,-2.7,1.9];let toWorld=null;
    function draw(){
      const {A,B,I}=compute(),{ctx,width,height}=context(el('scene'));
      const az=state.azimuth*Math.PI/180,elev=state.elevation*Math.PI/180,flat=state.view==='plane';
      const transform=p=>flat?project(p):[Math.cos(az)*p[0]+Math.sin(az)*p[1],-Math.sin(elev)*(-Math.sin(az)*p[0]+Math.cos(az)*p[1])+Math.cos(elev)*p[2]];
      const plane1=[[-3.3,-1.5,0],[1.8,-1.5,0],[1.8,1.3,0],[-3.3,1.3,0]],plane2=plane1.map(([x,y])=>[x,y,.6+.5*y]);
      let xmin,xmax,ymin,ymax;
      if(flat)[xmin,xmax,ymin,ymax]=planeBox;
      else{const all=[O,...A0,...A0.map(a=>add(O,mul(sub(a,O),2.4/(3+.5*a[1])))),...plane1,...plane2].map(transform),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);xmin=Math.min(...xs);xmax=Math.max(...xs);ymin=Math.min(...ys);ymax=Math.max(...ys)}
      const scale=Math.min((width-70)/(xmax-xmin),(height-70)/(ymax-ymin));
      const pixel=p=>{const q=transform(p);return [width/2+(q[0]-(xmin+xmax)/2)*scale,height/2-(q[1]-(ymin+ymax)/2)*scale]};
      toWorld=flat?([px,py])=>[(px-width/2)/scale+(xmin+xmax)/2,(height/2-py)/scale+(ymin+ymax)/2]:null;
      const ok=p=>p.every(Number.isFinite)&&norm(p)<60;
      const line=(points,color,lw=2,dash=false)=>{if(!points.every(ok))return;ctx.beginPath();points.forEach((p,i)=>{const q=pixel(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dash?[4,5]:[]);ctx.stroke();ctx.setLineDash([])};
      const labels=[];
      const point=(p,label,color,offset=[9,-9],r=5)=>{if(!ok(p))return;const q=pixel(p);ctx.beginPath();ctx.arc(...q,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();labels.push({q,label,color,offset})};
      if(!flat)for(const [pl,col]of [[plane1,'#87b3b5'],[plane2,'#d0a0ac']])line([...pl,pl[0]],col,1,true);
      for(let i=0;i<3;i++)line([O,A[i]],'#9ba8b2',1,true);
      for(let k=0;k<3;k++){const [i]=pairs[k];line([A[i],I[k]],'#7ba8aa',1);line([B[i],I[k]],'#ce95a4',1)}
      line([...A,A[0]],C.teal,3);line([...B,B[0]],C.wine,3);
      if(state.axis){line([[-4.2,-1.2,0],[3.2,-1.2,0]],C.gold,2.5);I.forEach((p,i)=>point(p,['P','Q','R'][i],C.gold,[6,22]))}
      A.forEach((p,i)=>point(p,['A','B','C'][i],C.teal,[-18,-12],flat?8:5));B.forEach((p,i)=>point(p,['A′','B′','C′'][i],C.wine,[9,20]));point(O,'O',C.ink);
      const occupied=[];ctx.font='16px system-ui';
      for(const {q,label,color,offset}of labels){
        const w=ctx.measureText(label).width,options=[offset,[10,-12],[10,23],[-w-10,-12],[-w-10,23],[12,-30],[-w-12,-30],[12,40],[-w-12,40]];
        let best=null,cost=Infinity;
        for(const [dx,dy]of options){const x=q[0]+dx,y=q[1]+dy,box=[x-3,y-17,w+6,23];let c=Math.hypot(dx,dy);
          for(const b of occupied){const ox=Math.max(0,Math.min(box[0]+box[2],b[0]+b[2])-Math.max(box[0],b[0])),oy=Math.max(0,Math.min(box[1]+box[3],b[1]+b[3])-Math.max(box[1],b[1]));c+=ox*oy*10}
          if(x<4||x+w>width-4||y<18||y>height-4)c+=10000;
          if(c<cost){cost=c;best={x,y,box}}
        }
        occupied.push(best.box);ctx.fillStyle=color;
        if(Math.hypot(best.x-q[0],best.y-q[1])>24){ctx.beginPath();ctx.moveTo(...q);ctx.lineTo(best.x,best.y-5);ctx.strokeStyle=color;ctx.lineWidth=.7;ctx.stroke()}
        ctx.fillText(label,best.x,best.y);
      }
      el('result').textContent=flat?'Drag A, B, or C. The triangles change; P, Q, R stay on one line.':'All three side intersections lie on Π ∩ Π′: y = −1.2, z = 0. Drag to rotate.';
    }
    for(const id of ['azimuth','elevation'])el(id).addEventListener('input',()=>{state[id]=+el(id).value;draw()});
    el('view').addEventListener('change',()=>{state.view=el('view').value;el('azimuth').disabled=el('elevation').disabled=state.view==='plane';draw()});
    el('axis').addEventListener('change',()=>{state.axis=el('axis').checked;draw()});
    el('reset').addEventListener('click',()=>{Object.assign(state,{view:'space',azimuth:-62,elevation:22,axis:true,A:A0.map(a=>[...a])});el('view').value='space';for(const id of ['azimuth','elevation']){el(id).value=state[id];el(id).disabled=false}el('axis').checked=true;draw()});
    function moveVertex(i,x,y){state.A[i]=[Math.max(-3.6,Math.min(2.8,x)),Math.max(-1.05,Math.min(1.7,y)),0];draw()}
    let start=null,grab=-1;
    const where=e=>{const r=el('scene').getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
    el('scene').addEventListener('pointerdown',e=>{
      el('scene').setPointerCapture(e.pointerId);
      if(state.view==='plane'){const w=toWorld(where(e));let d=.45;grab=-1;state.A.forEach((a,i)=>{const t=Math.hypot(a[0]-w[0],a[1]-w[1]);if(t<d){d=t;grab=i}});return}
      start=[e.clientX,e.clientY,state.azimuth,state.elevation]});
    el('scene').addEventListener('pointermove',e=>{
      if(state.view==='plane'){if(grab>=0){const w=toWorld(where(e));moveVertex(grab,w[0],w[1])}return}
      if(!start)return;state.azimuth=((start[2]+(e.clientX-start[0])*.4+540)%360)-180;state.elevation=Math.max(5,Math.min(80,start[3]+(e.clientY-start[1])*.25));el('azimuth').value=state.azimuth;el('elevation').value=state.elevation;draw()});
    for(const event of ['pointerup','pointercancel'])el('scene').addEventListener(event,()=>{start=null;grab=-1});
    window.lesson={state,O,project,compute,moveVertex,draw,get A(){return compute().A},get B(){return compute().B},get I(){return compute().I},get sideErrors(){return compute().sideErrors}};
    observe(['scene'],draw);
  }

  function branching(){
    const state={turns:0,radius:1};
    function calculate(){const theta=2*Math.PI*state.turns,r=state.radius,s=Math.sqrt(r),t=[r*Math.cos(theta),r*Math.sin(theta)],u=[s*Math.cos(theta/2),s*Math.sin(theta/2)];return {theta,t,u,other:mul(u,-1),error:Math.hypot(u[0]*u[0]-u[1]*u[1]-t[0],2*u[0]*u[1]-t[1])}}
    function draw(){
      const data=calculate(),base=chart(el('base'),[-2.1,2.1,-2.1,2.1],['Re t','Im t']),roots=chart(el('roots'),[-1.65,1.65,-1.65,1.65],['Re u','Im u']);
      base.line(circle(state.radius),C.grid,2);base.line(circle(state.radius,0,data.theta),C.ink,2);base.point(data.t,C.ink);base.text('t',data.t);
      const s=Math.sqrt(state.radius);roots.line(circle(s),C.grid,2);roots.line(circle(s,0,data.theta/2),'#9fcacc',3);roots.line(circle(s,Math.PI,Math.PI+data.theta/2),'#dba8b6',3);
      roots.point(data.u,C.teal);roots.text('tracked +',data.u,C.teal,[9,-12]);roots.point(data.other,C.wine,'square');roots.text('tracked −',data.other,C.wine,[9,24]);
      el('turnValue').textContent=`${n(state.turns,3)} circuits; θ = ${n(2*state.turns,3)}π`;
      el('radiusValue').textContent=`r = ${n(state.radius,2)}`;
      let explanation='Follow both roots continuously.';if(Math.abs(state.turns-1)<1e-8)explanation='The input is back; the tracked roots have exchanged.';if(Math.abs(state.turns-2)<1e-8)explanation='Both the input and the tracked roots are back.';
      el('result').textContent=`${explanation} Tracked u = ${complex(...data.u)}; u² = t.`;
    }
    for(const [id,key]of [['turns','turns'],['radius','radius']])el(id).addEventListener('input',()=>{state[key]=+el(id).value;draw()});
    for(const [id,value]of [['one',1],['two',2]])el(id).addEventListener('click',()=>{state.turns=value;el('turns').value=value;draw()});
    el('reset').addEventListener('click',()=>{Object.assign(state,{turns:0,radius:1});el('turns').value=0;el('radius').value=1;draw()});
    window.lesson={state,calculate,draw};observe(['base','roots'],draw);
  }
  // Planar incidence in homogeneous coordinates: joins and meets are cross products.
  const H=([x,y])=>[x,y,1],join=(a,b)=>cross(H(a),H(b)),meet=(l,m)=>{const p=cross(l,m);return [p[0]/p[2],p[1]/p[2]]};
  const parallelThrough=(l,p)=>[l[0],l[1],-(l[0]*p[0]+l[1]*p[1])];
  function grabber(canvas,targets,toWorld,move){
    let grab=null;const where=e=>{const r=canvas.getBoundingClientRect();return toWorld([e.clientX-r.left,e.clientY-r.top])};
    canvas.addEventListener('pointerdown',e=>{const w=where(e);let d=.4;grab=null;for(const [key,p]of Object.entries(targets())){const t=Math.hypot(p[0]-w[0],p[1]-w[1]);if(t<d){d=t;grab=key}}if(grab){canvas.setPointerCapture(e.pointerId);move(grab,w)}});
    canvas.addEventListener('pointermove',e=>{if(grab)move(grab,where(e))});
    for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>grab=null);
  }

  function arithmetic(){
    const state={mode:'add',a:1.7,b:1.25};let view=null;
    const xAxis=join([0,0],[1,0]),yAxis=join([0,0],[0,1]);
    function calculate(){
      const {a,b}=state,aux=[.55,1.3],top=parallelThrough(xAxis,aux);
      // Sum: translate the triangle 0, b, aux along the line by a, using parallels only.
      const aux2=meet(parallelThrough(join([0,0],aux),[a,0]),top),sum=meet(parallelThrough(join([b,0],aux),aux2),xAxis)[0];
      // Product: the parallel through a to the line joining 1 and b′ = (0,b).
      const product=meet(parallelThrough(join([1,0],[0,b]),[a,0]),yAxis)[1],productBA=meet(parallelThrough(join([1,0],[0,a]),[b,0]),yAxis)[1];
      return {aux,aux2,sum,product,productBA};
    }
    function draw(){
      const {a,b}=state,d=calculate(),mode=state.mode,vals=[a,b,d.product,d.productBA],g=chart(el('scene'),mode==='add'?[Math.min(-2.6,d.sum-.5),Math.max(3,d.sum+.5),-.7,1.9]:[-2.6,3,Math.min(-.8,...vals)-.5,Math.max(2.4,...vals)+.5],['','']);view=g;
      const [xmin,xmax,ymin,ymax]=g.bounds;g.line([[xmin,0],[xmax,0]],C.ink,1.5);
      const mark=(p,label,color=C.ink,offset=[-5,24],shape='circle')=>{g.point(p,color,shape,6);g.text(label,p,color,offset)};
      if(mode==='add'){
        g.line([[xmin,d.aux[1]],[xmax,d.aux[1]]],'#9ba8b2',1,true);
        g.line([[0,0],d.aux],C.teal,2.5);g.line([[a,0],d.aux2],C.teal,2.5);g.line([[b,0],d.aux],C.wine,2.5);g.line([[d.sum,0],d.aux2],C.wine,2.5);
        g.point(d.aux,'#9ba8b2');g.point(d.aux2,'#9ba8b2');mark([0,0],'0');mark([d.sum,0],'a + b',C.gold,[-16,44],'square');mark([a,0],'a',C.teal);mark([b,0],'b',C.wine);
        el('result').textContent=`a + b = ${n(d.sum,2)}. Same-coloured segments are parallel: the triangle over 0 and b has been slid along the line by a.`;
      }else{
        g.line([[0,ymin],[0,ymax]],C.ink,1.5);mark([0,0],'0',C.ink,[-18,22]);mark([1,0],'1');
        g.line([[1,0],[0,b]],C.teal,2.5);g.line([[a,0],[0,d.product]],C.teal,2.5);
        if(mode==='comm'){g.line([[1,0],[0,a]],C.wine,2.5,true);g.line([[b,0],[0,d.productBA]],C.wine,2.5,true);g.line([[a,0],[0,a]],'#9ba8b2',1);g.line([[b,0],[0,b]],'#9ba8b2',1);mark([0,a],'a′',C.teal,[-30,5])}
        mark([0,b],'b′',C.wine,[-30,5]);mark([0,d.product],mode==='comm'?'ab = ba':'ab',C.gold,[12,5],'square');mark([a,0],'a',C.teal);mark([b,0],'b',C.wine);
        el('result').textContent=mode==='comm'?`a·b = ${n(d.product,3)} and b·a = ${n(d.productBA,3)}. The solid and the dashed construction end at the same point: that coincidence is Pappus's theorem.`:`a·b = ${n(d.product,2)}. The two teal lines are parallel: similar triangles with ratio a.`;
      }
      for(const k of ['a','b']){el(k).value=state[k];el(k+'Value').textContent=`${k} = ${n(state[k],2)}`}
    }
    const text={add:'Choose any helper point above the line. Join it to 0 and to b. Through a, draw the parallel to the first segment up to the dashed parallel; from there, the parallel to the second segment comes down at a + b. Only joining points and drawing parallels is used — and a parallel is a line meeting another at infinity.',
      mul:'A second axis carries a copy b′ of b. Join 1 to b′. The parallel through a meets the second axis at ab. Coordinates check it: the line through (1, 0) and (0, b) is y = b(1 − x), so the parallel through (a, 0) is y = b(a − x).',
      comm:'Do the construction twice: a times b (solid) and b times a (dashed). The grey lines join each number to its copy and are parallel. With them, the six lines form a Pappus configuration; Pappus\'s theorem says the two constructions land on the same point. In a geometry where Pappus fails, ab ≠ ba.'};
    const clamp=v=>Math.max(-2.2,Math.min(2.6,Math.round(v*100)/100));
    function set(key,v){state[key]=clamp(v);draw()}
    el('mode').addEventListener('change',()=>{state.mode=el('mode').value;el('explanation').textContent=text[state.mode];draw()});
    for(const k of ['a','b'])el(k).addEventListener('input',()=>set(k,+el(k).value));
    el('reset').addEventListener('click',()=>{Object.assign(state,{a:1.7,b:1.25});draw()});
    grabber(el('scene'),()=>({a:[state.a,0],b:[state.b,0]}),q=>view.inv(q),(key,w)=>set(key,w[0]));
    el('explanation').textContent=text.add;window.lesson={state,calculate,draw,set};observe(['scene'],draw);
  }

  // Complex numbers as pairs, enough for quadratics and cubics.
  const cadd=(a,b)=>[a[0]+b[0],a[1]+b[1]],csub=(a,b)=>[a[0]-b[0],a[1]-b[1]],cmul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
  const cdiv=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]};
  const csqrt=a=>{const r=Math.hypot(...a),s=Math.sqrt((r+a[0])/2),t=Math.sqrt(Math.max(0,(r-a[0])/2));return [s,a[1]<0?-t:t]};
  function polyRoots(coefficients){ // Durand–Kerner; coefficients from the leading one down, real.
    const m=coefficients.length-1,c=coefficients.map(v=>v/coefficients[0]);let z=Array.from({length:m},(_,k)=>{const t=.4+2*Math.PI*k/m;return [1.3*Math.cos(t),1.3*Math.sin(t)]});
    const value=w=>c.reduce((s,v)=>cadd(cmul(s,w),[v,0]),[0,0]);
    for(let it=0;it<400;it++)z=z.map((w,i)=>{let d=[1,0];z.forEach((v,j)=>{if(j!==i)d=cmul(d,csub(w,v))});return csub(w,cdiv(value(w),d))});
    return z;
  }
  function bezout(){
    // Ellipse x²/a² + y²/b² = s² against y = x³ − 3x: in u = x², u³ − 6u² + (9 + b²/a²)u = b²s².
    const CC={a:2.4,b:.9};CC.k=9+CC.b*CC.b/(CC.a*CC.a);{const u=(12+Math.sqrt(144-12*CC.k))/6;CC.tangent=Math.sqrt(u*u*u-6*u*u+CC.k*u)/CC.b}
    const modes={
      cubic:{label:'Line height c',min:-1.8,max:1.8,start:.3,special:2*Math.pow(1.4/3,1.5),specialLabel:'Show tangency',degrees:[1,3],names:'the line y = 0.4x + c and the cubic y = x³ − x',
        text:'Substituting the line into the cubic gives x³ − 1.4x − c = 0: always three roots over ℂ, counted with multiplicity. As the line rises, two real intersections merge into one tangent point and then separate into a conjugate pair of nonreal points.'},
      conics:{label:'Shift p of the second ellipse',min:-3.4,max:3.4,start:0,special:1,specialLabel:'Show tangency',degrees:[2,2],names:'the ellipses x²/4 + y² = 1 and (x − p)² + y²/4 = 1',
        text:'Eliminating y² leaves a quadratic in x, and each root x has two values of y: four intersections in all. At p = ±1 the ellipses touch at a point where y = 0 and the two values of y coincide: that point counts twice. When the ellipses separate, all four points are still there, with nonreal coordinates.'},
      circles:{label:'Half-distance p between centres',min:.2,max:1.8,start:.6,special:1,specialLabel:'Show tangency',degrees:[2,2],names:'the unit circles centred at (−p, 0) and (p, 0)',
        text:'Two circles are conics, yet they never meet in more than two points of the plane. Homogenize: every circle X² + Y² + (lower terms)·Z = 0 contains the two points [1 : i : 0] and [1 : −i : 0] at infinity. Those two are always shared, so only two intersections are left for the affine plane.'},
      conicCubic:{label:'Size s of the ellipse',min:.3,max:2.6,start:1,special:CC.tangent,specialLabel:'Show tangency',degrees:[2,3],names:'the ellipse x²/a² + y²/b² = s² (a = 2.4, b = 0.9) and the cubic y = x³ − 3x',
        text:'Substituting the cubic into the ellipse gives a polynomial of degree six in x: six intersections, all in the affine plane. For a wide range of sizes all six are real. Shrink the ellipse and two pairs merge into tangent points, each counted twice, then leave the real plane as conjugate pairs; the count stays 2 · 3 = 6. Neither curve loses a point at infinity here: the cubic meets the line at infinity only at [0 : 1 : 0], which is not on the ellipse.'},
      parabola:{label:'Position c of the vertical line',min:-1.8,max:1.8,start:.8,special:0,specialLabel:'Line through the vertex',degrees:[1,2],names:'the vertical line x = c and the parabola y = x²',
        text:'A vertical line meets the parabola in one point, not two. Homogenize: Y Z = X² and X = c Z. Besides [c : c² : 1] they share the point [0 : 1 : 0] at infinity — the direction in which the parabola opens. Vertical lines are exactly the lines through that point.'}};
    const state={mode:'cubic',parameter:.3};
    const isReal=p=>Math.abs(p.x[1])<1e-6&&Math.abs(p.y[1])<1e-6;
    function calculate(){
      const v=state.parameter,mode=state.mode;let raw=[],infinity=[];
      if(mode==='cubic')raw=polyRoots([1,0,-1.4,-v]).map(x=>({x,y:cadd(cmul([.4,0],x),[v,0])}));
      else if(mode==='conics'){const a=15/16,b=-2*v,c=v*v-.75,s=csqrt([b*b-4*a*c,0]);for(const sign of [1,-1]){const x=cdiv(cadd([-b,0],cmul([sign,0],s)),[2*a,0]),y=csqrt(csub([1,0],cmul([.25,0],cmul(x,x))));raw.push({x,y},{x,y:cmul([-1,0],y)})}}
      else if(mode==='conicCubic')raw=polyRoots([1,0,-6,0,CC.k,0,-CC.b*CC.b*v*v]).map(x=>({x,y:csub(cmul(x,cmul(x,x)),cmul([3,0],x))}));
      else if(mode==='circles'){const y=csqrt([1-v*v,0]);raw=[{x:[0,0],y},{x:[0,0],y:cmul([-1,0],y)}];infinity=['[1 : i : 0]','[1 : −i : 0]']}
      else{raw=[{x:[v,0],y:[v*v,0]}];infinity=['[0 : 1 : 0]']}
      const points=[];for(const p of raw){const q=points.find(q=>Math.hypot(q.x[0]-p.x[0],q.x[1]-p.x[1],q.y[0]-p.y[0],q.y[1]-p.y[1])<2e-3);if(q)q.multiplicity++;else points.push({...p,multiplicity:1})}
      const count=f=>points.filter(f).reduce((s,p)=>s+p.multiplicity,0),[d,e]=modes[mode].degrees;
      return {points,infinity,real:count(isReal),nonreal:count(p=>!isReal(p)),atInfinity:infinity.length,product:d*e,total:count(()=>true)+infinity.length};
    }
    function draw(){
      const v=state.parameter,mode=state.mode,data=calculate(),a=chart(el('left'),[-3,3,-2.6,2.6],['x','y']),b=chart(el('right'),[-2.4,2.4,-2.4,2.4],['Re x','Im x']);
      const ellipse=(cx,rx,ry)=>circle().map(([x,y])=>[cx+rx*x,ry*y]),xs=Array.from({length:241},(_,i)=>-3+i/40);
      if(mode==='cubic'){a.line(xs.map(x=>[x,x**3-x]).filter(p=>Math.abs(p[1])<3),C.teal,3);a.line([[-3,-1.2+v],[3,1.2+v]],C.wine,2.5)}
      else if(mode==='conics'){a.line(ellipse(0,2,1),C.teal,3);a.line(ellipse(v,1,2),C.wine,3)}
      else if(mode==='conicCubic'){a.line(xs.map(x=>[x,x**3-3*x]).filter(p=>Math.abs(p[1])<3),C.teal,3);a.line(ellipse(0,CC.a*v,CC.b*v),C.wine,3)}
      else if(mode==='circles'){a.line(ellipse(-v,1,1),C.teal,3);a.line(ellipse(v,1,1),C.wine,3)}
      else{a.line(xs.map(x=>[x,x*x]).filter(p=>p[1]<3),C.teal,3);a.line([[v,-2.6],[v,2.6]],C.wine,2.5)}
      for(const p of data.points){const real=isReal(p),r=p.multiplicity>1?9:6;if(real)a.point([p.x[0],p.y[0]],C.ink,'circle',r);b.point(p.x,real?C.ink:C.gold,real?'circle':'square',r);if(p.multiplicity>1)b.text(`×${p.multiplicity}`,p.x,C.ink,[12,-10])}
      el('parameterValue').textContent=n(v,2);
      const parts=[`${data.real} real`,`${data.nonreal} nonreal`,`${data.atInfinity} at infinity`];
      el('result').textContent=`${parts.join(' + ')} = ${data.total} = ${modes[mode].degrees.join(' · ')}.`+(data.infinity.length?` At infinity: ${data.infinity.join(', ')}.`:'');
    }
    function configure(){
      const m=modes[state.mode];Object.assign(el('parameter'),{min:m.min,max:m.max,value:state.parameter});el('paramLabel').textContent=m.label;el('special').textContent=m.specialLabel;
      el('leftCaption').textContent=`The real picture of ${m.names}. Round markers: real intersections; a large marker counts twice.`;el('explanation').textContent=m.text;draw();
    }
    el('mode').addEventListener('change',()=>{state.mode=el('mode').value;state.parameter=modes[state.mode].start;configure()});
    el('parameter').addEventListener('input',()=>{state.parameter=+el('parameter').value;draw()});
    el('special').addEventListener('click',()=>{state.parameter=modes[state.mode].special;el('parameter').value=state.parameter;draw()});
    el('reset').addEventListener('click',()=>{state.parameter=modes[state.mode].start;configure()});
    window.lesson={state,calculate,draw,polyRoots};observe(['left','right'],configure);
  }

  function exponential(){
    const state={x:.3,y:.8,copies:true};let view=null;const TAU=2*Math.PI;
    function calculate(){const r=Math.exp(state.x),w=[r*Math.cos(state.y),r*Math.sin(state.y)],fibre=[-2,-1,0,1,2].map(k=>[state.x,state.y+TAU*k]);
      return {w,modulus:r,fibre,error:Math.max(...fibre.map(z=>Math.hypot(Math.exp(z[0])*Math.cos(z[1])-w[0],Math.exp(z[0])*Math.sin(z[1])-w[1])))}}
    function draw(){
      const d=calculate(),a=chart(el('left'),[-9,9,-9,9],['Re z','Im z']),b=chart(el('right'),[-3.6,3.6,-3.6,3.6],['Re w','Im w']);view=a;
      for(const k of [-1,0,1])a.line([[-9,TAU*k-Math.PI],[9,TAU*k-Math.PI]],C.grid,1,true);
      a.line([[state.x,-9],[state.x,9]],'#9fcacc',2);a.line([[-9,state.y],[9,state.y]],'#dba8b6',2);
      a.line([[state.x,state.y],[state.x,state.y+TAU]],C.teal,4);
      if(state.copies)for(const z of d.fibre)if(Math.abs(z[1])<9)a.point(z,C.gold,'square',5);
      a.point([state.x,state.y],C.ink,'circle',8);a.text('z',[state.x,state.y],C.ink,[12,-10]);
      b.line(circle(d.modulus),C.teal,3);b.line([[0,0],mul(d.w,3.6/Math.max(d.modulus,1e-9))],'#dba8b6',2);b.line(circle(1),C.grid,1,true);
      b.point(d.w,C.ink,'circle',8);b.text('w = eᶻ',d.w,C.ink,[12,-10]);
      el('xValue').textContent=`x = ${n(state.x,2)}`;el('yValue').textContent=`y = ${n(state.y,2)} = ${n(state.y/Math.PI,2)}π`;el('x').value=state.x;el('y').value=state.y;
      el('result').textContent=`eᶻ = ${complex(...d.w)}, with |eᶻ| = eˣ = ${n(d.modulus,3)}. Every gold square z + 2πik has this same image.`;
    }
    function set(x,y){state.x=Math.max(-2,Math.min(1.25,x));state.y=Math.max(-8.5,Math.min(8.5,y));draw()}
    el('x').addEventListener('input',()=>set(+el('x').value,state.y));el('y').addEventListener('input',()=>set(state.x,+el('y').value));
    el('copies').addEventListener('change',()=>{state.copies=el('copies').checked;draw()});
    el('reset').addEventListener('click',()=>set(.3,.8));
    grabber(el('left'),()=>({z:[state.x,state.y]}),q=>view.inv(q),(key,w)=>set(Math.round(w[0]*100)/100,Math.round(w[1]*100)/100));
    window.lesson={state,calculate,draw,set};observe(['left','right'],draw);
  }

  function projective(){
    // The real projective plane as lines through 0 in R³. Each line meets the upper unit
    // hemisphere once and the plane z = 1 once (central, or gnomonic, projection), except
    // the horizontal lines: those meet only the equator, in two opposite points.
    const R=2.2,rad=d=>d*Math.PI/180,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],unit=a=>mul(a,1/norm(a));
    const start={mode:'point',theta:50,phi:25,slope:.6,azimuth:-18,elevation:24,sphere:false},state={...start};
    const lines=()=>{const m=state.slope;return [{color:C.teal,q:[0,0],d:[1,0],normal:[0,1,0]},{color:C.wine,q:[0,1],d:unit([1,m,0]).slice(0,2),normal:[m,-1,1]}]};
    function calculate(){
      const t=rad(state.theta),f=rad(state.phi),m=state.slope;
      const dir=unit(state.mode==='point'?[Math.sin(t)*Math.cos(f),Math.sin(t)*Math.sin(f),Math.cos(t)]:[1,0,-m]);
      const horizontal=Math.abs(dir[2])<1e-9,hemi=horizontal||dir[2]>0?dir:mul(dir,-1);
      const affine=horizontal?null:[dir[0]/dir[2],dir[1]/dir[2]];
      // Great circles of the two lines y = 0 and y = mx + 1: unit vectors orthogonal to the normal of the plane through 0.
      const arcs=lines().map(({normal})=>{const u=unit(cross(normal,[0,0,1]));let w=unit(cross(normal,u));if(w[2]<0)w=mul(w,-1);return {normal,u,w}});
      return {dir,hemi,antipode:mul(hemi,-1),affine,horizontal,homogeneous:horizontal?[hemi[0],hemi[1],0]:[...affine,1],arcs};
    }
    // The part of the line q + t d inside the square |x|, |y| ≤ R.
    function clip(q,d){let lo=-1e9,hi=1e9;for(const i of [0,1]){if(Math.abs(d[i])<1e-12){if(Math.abs(q[i])>R)return null;continue}const a=(-R-q[i])/d[i],b=(R-q[i])/d[i];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b))}return lo<hi?[[q[0]+lo*d[0],q[1]+lo*d[1]],[q[0]+hi*d[0],q[1]+hi*d[1]]]:null}
    let plane=null;
    function draw(){
      const data=calculate(),{ctx,width,height}=context(el('scene')),az=rad(state.azimuth),e=rad(state.elevation);
      const right=[Math.cos(az),Math.sin(az),0],fwd=[-Math.sin(az),Math.cos(az),0],view=[-fwd[0]*Math.cos(e),-fwd[1]*Math.cos(e),Math.sin(e)];
      const scale=Math.min((width-24)/5.9,(height-24)/(state.sphere?3.9:3.3)),cy=state.sphere?.2:.52;
      const px=p=>[width/2+dot(p,right)*scale,height/2-(p[2]*Math.cos(e)+dot(p,fwd)*Math.sin(e)-cy)*scale];
      const path=(points,color,lw=2,dash=false,alpha=1)=>{ctx.beginPath();points.forEach((p,i)=>{const q=px(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dash?[4,5]:[]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1};
      // A curve on the sphere: solid where it faces the viewer, dashed where the sphere hides it.
      const onSphere=(points,color,lw)=>{let run=[],front=null;const flush=()=>{if(run.length>1)path(run,color,front?lw:Math.max(1,lw-1),!front,front?1:.6)};for(const p of points){const f=dot(p,view)>=0;if(front!==null&&f!==front){run.push(p);flush();run=[]}front=f;run.push(p)}flush()};
      const dotAt=(p,color,r=5,hollow=false)=>{const q=px(p);ctx.beginPath();ctx.arc(...q,r,0,2*Math.PI);if(hollow){ctx.fillStyle='white';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke()}else{ctx.fillStyle=color;ctx.fill()}};
      const label=(s,p,color,offset)=>{const q=px(p);ctx.fillStyle=color;ctx.fillText(s,q[0]+offset[0],q[1]+offset[1])};
      const ring=(z,count=120)=>{const r=Math.sqrt(1-z*z);return Array.from({length:count+1},(_,i)=>{const a=2*Math.PI*i/count;return [r*Math.cos(a),r*Math.sin(a),z]})};
      // Silhouette: the unit circle on screen; for the hemisphere, its upper half closed by the near half of the equator.
      const centre=px([0,0,0]);ctx.beginPath();
      if(state.sphere)ctx.arc(...centre,scale,0,2*Math.PI);
      else{ctx.arc(...centre,scale,Math.PI,2*Math.PI);ctx.ellipse(...centre,scale,scale*Math.sin(e),0,0,Math.PI)}
      ctx.fillStyle='rgba(0,110,112,.07)';ctx.fill();
      ctx.beginPath();ctx.arc(...centre,scale,state.sphere?0:Math.PI,2*Math.PI);ctx.strokeStyle='#9ba8b2';ctx.lineWidth=1.2;ctx.stroke();
      for(const z of state.sphere?[-.8,-.45,.45,.8]:[.45,.8])onSphere(ring(z),C.grid,1.2);
      onSphere(ring(0),C.gold,3);
      const arc=({u,w})=>Array.from({length:121},(_,i)=>{const a=(state.sphere?2:1)*Math.PI*i/120;return add(mul(u,Math.cos(a)),mul(w,Math.sin(a)))});
      if(state.mode==='lines')data.arcs.forEach((g,i)=>onSphere(arc(g),lines()[i].color,3));
      // The line through 0.
      const inside=data.affine&&Math.abs(data.affine[0])<=R&&Math.abs(data.affine[1])<=R,P=data.affine?[...data.affine,1]:null;
      if(data.horizontal)path([mul(data.hemi,-3.1),mul(data.hemi,3.1)],C.gold,2.2);
      else{path([mul(data.hemi,-(state.sphere?1.25:.5)),[0,0,0]],C.ink,1.2,true,.7);path([[0,0,0],inside?P:mul(data.hemi,3.2)],C.ink,1.8)}
      // The affine plane z = 1, drawn translucent over the hemisphere.
      const corners=[[-R,-R,1],[R,-R,1],[R,R,1],[-R,R,1]];
      ctx.beginPath();corners.forEach((p,i)=>{const q=px(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fillStyle='rgba(0,110,112,.10)';ctx.fill();ctx.strokeStyle='#87b3b5';ctx.lineWidth=1;ctx.stroke();
      path([[-R,0,1],[R,0,1]],state.mode==='lines'?C.teal:C.grid,state.mode==='lines'?3:1);path([[0,-R,1],[0,R,1]],C.grid,1);
      if(state.mode==='lines'){const seg=clip(lines()[1].q,lines()[1].d);if(seg)path(seg.map(p=>[...p,1]),C.wine,3)}
      ctx.font='15px system-ui';dotAt([0,0,0],C.ink,4);label('0',[0,0,0],C.ink,[-16,16]);
      label('z = 1',[R,R,1],C.teal,[-52,-8]);label('equator: z = 0',[0,0,0],C.gold,[-48,(state.sphere?scale:scale*Math.sin(e))+20]);
      if(inside){dotAt(P,C.ink,6);label('P',P,C.ink,[9,-9])}
      if(data.horizontal){dotAt(data.hemi,C.gold,7);dotAt(data.antipode,C.gold,7);label('p',data.hemi,C.gold,[10,18]);label('−p',data.antipode,C.gold,[-28,18])}
      else{dotAt(data.hemi,C.ink,6);label('p',data.hemi,C.ink,[-20,-6]);if(state.sphere){dotAt(data.antipode,C.ink,6,true);label('−p',data.antipode,C.ink,[9,18])}}
      // The affine plane seen from above.
      plane=chart(el('right'),[-R,R,-R,R],['x','y']);
      if(state.mode==='lines'){plane.line([[-R,0],[R,0]],C.teal,3);const seg=clip(lines()[1].q,lines()[1].d);if(seg)plane.line(seg,C.wine,3)}
      if(inside){plane.point(data.affine,state.mode==='lines'?C.gold:C.ink,7);plane.text('P',data.affine,C.ink,[10,-10])}
      else{const h=[data.hemi[0],data.hemi[1]],len=Math.hypot(...h),s=data.affine&&dot([...data.affine,0],[h[0],h[1],0])<0?-1:1,v=mul(h,s/len);
        const sides=data.horizontal?[1,-1]:[1];
        for(const k of sides){const tip=mul(v,k*(R-.35)),tail=mul(v,k*(R-1.25)),nrm=[-v[1],v[0]];plane.line([tail,tip],C.gold,3);plane.line([add(tip,add(mul(v,-k*.22),mul(nrm,.14))),tip,add(tip,add(mul(v,-k*.22),mul(nrm,-.14)))],C.gold,3)}}
      const h=data.homogeneous,hom=`[${n(h[0],2)} : ${n(h[1],2)} : ${n(h[2],0)}]`;
      if(state.mode==='point'){el('aValue').textContent=`θ = ${n(state.theta,0)}°`;el('bValue').textContent=`φ = ${n(state.phi,0)}°`;
        el('result').textContent=data.horizontal?`A horizontal line: it never reaches the plane z = 1. It meets the equator at p and −p, one point at infinity ${hom}.`:`The line meets the hemisphere at p and the plane at P = (${n(data.affine[0],2)}, ${n(data.affine[1],2)}) = ${hom}.`+(inside?'':' P is outside the picture, in the direction of the arrow.')}
      else{el('aValue').textContent=`m = ${n(state.slope,2)}`;el('bValue').textContent='';
        el('result').textContent=data.horizontal?'Parallel lines: no common point in the plane. Their semicircles meet at the two ends of a diameter of the equator: the single point at infinity [1 : 0 : 0].':`The lines y = 0 and y = ${n(state.slope,2)}x + 1 meet at P = (${n(data.affine[0],2)}, 0) = [1 : 0 : ${n(-state.slope,2)}].`+(inside?'':' P is outside the picture; on the hemisphere it is close to the equator.')}
    }
    function configure(){
      const point=state.mode==='point';
      Object.assign(el('a'),point?{min:0,max:180,step:1,value:state.theta}:{min:-1.5,max:1.5,step:.01,value:state.slope});
      el('b').value=state.phi;el('b').disabled=!point;
      el('aLabel').textContent=point?'Tilt θ of the line from the vertical':'Slope m of the second line';
      el('special').textContent=point?'Tip the line to horizontal':'Make the lines parallel';
      el('rightCaption').textContent=point?'Drag P. Tilting the line past the horizontal brings P back from the opposite side.':'The teal line is y = 0, the rose line y = mx + 1. As m passes through 0 their meeting point leaves on one side and returns on the other.';
      el('explanation').textContent=point?'A point of the projective plane is a line through 0. If the line is not horizontal it pierces the upper hemisphere in exactly one point p and the plane z = 1 in exactly one point P, so the open hemisphere is a copy of the whole affine plane, however far P goes. A horizontal line pierces neither; it meets the hemisphere only on its rim, in two opposite points. Those two are one projective point, a point at infinity. Gluing each rim point to its opposite turns the hemisphere into the projective plane. Equivalently, take the whole sphere and identify every p with −p.':'A line of the plane z = 1, together with 0, spans a plane; that plane cuts the hemisphere in half a great circle. Two lines of the affine plane give two such semicircles, and two great circles always cross at a pair of opposite points. If the lines are not parallel, one of the pair is on the upper hemisphere and projects to their meeting point. If they are parallel, the pair lies on the equator: the lines meet at infinity, in the direction they share.';
      draw();
    }
    function set(values){Object.assign(state,values);for(const id of ['azimuth','elevation'])el(id).value=state[id];el('mode').value=state.mode;el('sphere').checked=state.sphere;configure()}
    el('mode').addEventListener('change',()=>set({mode:el('mode').value}));
    el('a').addEventListener('input',()=>{state[state.mode==='point'?'theta':'slope']=+el('a').value;draw()});
    el('b').addEventListener('input',()=>{state.phi=+el('b').value;draw()});
    for(const id of ['azimuth','elevation'])el(id).addEventListener('input',()=>{state[id]=+el(id).value;draw()});
    el('sphere').addEventListener('change',()=>{state.sphere=el('sphere').checked;draw()});
    el('special').addEventListener('click',()=>set(state.mode==='point'?{theta:90}:{slope:0}));
    el('reset').addEventListener('click',()=>set({...start,mode:state.mode}));
    let orbit=null;
    el('scene').addEventListener('pointerdown',e=>{el('scene').setPointerCapture(e.pointerId);orbit=[e.clientX,e.clientY,state.azimuth,state.elevation]});
    el('scene').addEventListener('pointermove',e=>{if(!orbit)return;state.azimuth=((orbit[2]+(e.clientX-orbit[0])*.4+540)%360)-180;state.elevation=Math.max(5,Math.min(80,orbit[3]+(e.clientY-orbit[1])*.25));el('azimuth').value=state.azimuth;el('elevation').value=state.elevation;draw()});
    for(const event of ['pointerup','pointercancel'])el('scene').addEventListener(event,()=>orbit=null);
    grabber(el('right'),()=>{const d=calculate();return state.mode==='point'&&d.affine?{P:d.affine}:{}},q=>plane.inv(q),(key,w)=>{const r=Math.hypot(w[0],w[1]);set({theta:Math.round(Math.atan(r)*180/Math.PI),phi:r<1e-9?state.phi:Math.round(Math.atan2(w[1],w[0])*180/Math.PI)})});
    window.lesson={state,calculate,draw,set};observe(['scene','right'],configure);
  }

  function conics(){
    // One ellipse x²/A² + y²/B² = 1 and a movable line L: x cos α + y sin α = d. The projective map
    // T(p) = d p/(d − p·n) sends L to infinity, fixes the centre and moves each point along its ray from the centre.
    const A=1.5,B=1,DMIN=.4,DMAX=3.2,rad=v=>v*Math.PI/180;
    const start={alpha:0,d:2.4,old:true},state={...start};
    function calculate(){
      const a=rad(state.alpha),d=state.d,nrm=[Math.cos(a),Math.sin(a)],h=Math.hypot(A*nrm[0],B*nrm[1]);
      const type=Math.abs(d-h)<1e-9?'parabola':d>h?'ellipse':'hyperbola';
      // Points of the ellipse (A cos φ, B sin φ) on L: h cos(φ − φ0) = d.
      const phi0=Math.atan2(B*nrm[1],A*nrm[0]),gap=type==='ellipse'?null:type==='parabola'?0:Math.acos(d/h);
      const angles=gap===null?[]:gap===0?[phi0]:[phi0-gap,phi0+gap],hits=angles.map(f=>[A*Math.cos(f),B*Math.sin(f)]);
      const den=p=>d-p[0]*nrm[0]-p[1]*nrm[1],image=p=>mul(p,d/den(p));
      // The image conic is (d x/A)² + (d y/B)² = (d + x cos α + y sin α)²; its type is the sign of this discriminant.
      const conic=[d*d/(A*A)-nrm[0]**2,-2*nrm[0]*nrm[1],d*d/(B*B)-nrm[1]**2],discriminant=conic[1]**2-4*conic[0]*conic[2];
      // The tangents at the two points of L meet at the pole of L; their images, the asymptotes, meet at its image.
      const centre=type==='hyperbola'?mul([A*A*nrm[0],B*B*nrm[1]],d/(d*d-h*h)):null;
      return {type,nrm,d,h,phi0,gap,hits,den,image,conic,discriminant,centre,real:hits.length};
    }
    let left=null;
    function draw(){
      const data=calculate(),{nrm,d}=data,along=[-nrm[1],nrm[0]],foot=mul(nrm,d);
      el('dValue').textContent=`d = ${n(d,2)}`;el('alphaValue').textContent=`α = ${n(state.alpha,0)}°`;
      left=chart(el('left'),[-3.4,3.4,-2.5,2.5],['x','y']);
      const R=6.5,right=chart(el('right'),[-R,R,-R*.74,R*.74],['x','y']);
      // The conic in runs of constant side of L, each drawn in both panels.
      const count=1440,first=data.phi0+(data.gap||0);let run=[],side=0;
      const flush=()=>{if(run.length<2){run=[];return}const color=side>0?C.teal:C.wine;left.line(run,color,3.5);
        let piece=[];const out=()=>{if(piece.length>1)right.line(piece,color,3.5);piece=[]};
        for(const p of run){const k=data.den(p);if(Math.abs(k)<1e-7){out();continue}const q=data.image(p);if(Math.hypot(...q)>12*R)out();else piece.push(q)}out();run=[]};
      for(let i=0;i<=count;i++){const f=first+2*Math.PI*i/count,p=[A*Math.cos(f),B*Math.sin(f)],k=data.den(p),sg=k>1e-9?1:k<-1e-9?-1:0;
        if(sg===0){run.push(p);flush();run=[p];continue}
        if(side&&sg!==side){flush()}side=sg;run.push(p)}
      flush();
      right.line(Array.from({length:181},(_,i)=>[A*Math.cos(i*Math.PI/90),B*Math.sin(i*Math.PI/90)]),C.grid,1.5,true);
      left.line([add(foot,mul(along,-9)),add(foot,mul(along,9))],C.gold,3);left.point(foot,C.gold,'square',6);
      left.text('L',add(foot,mul(along,1.9)),C.gold,[10,-6]);
      for(const q of data.hits){
        if(data.type==='hyperbola'){const t=[-q[1]*A/B,q[0]*B/A];left.line([add(q,mul(t,-9)),add(q,mul(t,9))],'#8f9ba6',1.3,true);
          right.line([add(data.centre,mul(q,-30)),add(data.centre,mul(q,30))],'#8f9ba6',1.3,true)}
        left.point(q,C.gold,'circle',6)}
      left.point([0,0],C.ink,'circle',3.5);right.point([0,0],C.ink,'circle',3.5);
      if(state.old){const g=mul(nrm,-d);right.line([add(g,mul(along,-30)),add(g,mul(along,30))],C.ink,1.5,true);
        const at=add(g,mul(along,Math.abs(along[1])>.5?-R*.5/Math.abs(along[1]):0));right.text('the old line at infinity',Math.abs(at[0])<R-2&&Math.abs(at[1])<R*.7?at:g,C.ink,[8,-8])}
      const words={ellipse:'L misses the conic: no real point of it goes to infinity, so it stays closed. In the new affine plane it is an ellipse.',
        parabola:'L touches the conic. The point of tangency, counted twice, has gone to infinity, and the curve has opened up: a parabola.',
        hyperbola:'L cuts the conic in two points. Both have gone to infinity; the arc beyond L (rose) returns from the opposite side, and the tangents at the two points have become the asymptotes: a hyperbola.'};
      el('result').textContent=words[data.type];
    }
    const snap=d=>{const h=calculate().h;return Math.abs(d-h)<=.0051?h:d};
    function set(values){Object.assign(state,values);state.d=Math.max(DMIN,Math.min(DMAX,state.d));el('d').value=state.d;el('alpha').value=state.alpha;el('old').checked=state.old;draw()}
    el('d').addEventListener('input',()=>{state.d=snap(+el('d').value);draw()});
    el('alpha').addEventListener('input',()=>{state.alpha=+el('alpha').value;state.d=snap(state.d);draw()});
    el('old').addEventListener('change',()=>{state.old=el('old').checked;draw()});
    el('special').addEventListener('click',()=>set({d:calculate().h}));
    el('reset').addEventListener('click',()=>set({...start}));
    grabber(el('left'),()=>({L:mul(calculate().nrm,state.d)}),q=>left.inv(q),(key,w)=>{const r=Math.hypot(...w);if(r<1e-6)return;
      state.alpha=Math.atan2(w[1],w[0])*180/Math.PI;const h=calculate().h,d=Math.max(DMIN,Math.min(DMAX,r));set({d:Math.abs(d-h)<.05?h:d})});
    window.lesson={state,calculate,draw,set,A,B};observe(['left','right'],draw);
  }

  const demo=document.body.dataset.demo;
  const demos={intersections,desargues,branching,arithmetic,bezout,exponential,projective,conics};
  if(demos[demo])demos[demo]();
})();
