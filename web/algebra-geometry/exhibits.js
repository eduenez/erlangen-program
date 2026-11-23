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
    return {ctx,p,line,text,point,scale,width,height,bounds,x0,y0};
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
    const O=[0,0,3],A=[[-1,-.8,0],[1,-.4,0],[.2,1,0]],B=A.map(a=>add(O,mul(sub(a,O),2.4/(3+.5*a[1]))));
    const pairs=[[0,1],[0,2],[1,2]],I=pairs.map(([i,j])=>add(A[i],mul(sub(A[j],A[i]),(-1.2-A[i][1])/(A[j][1]-A[i][1]))));
    const state={view:'space',azimuth:-62,elevation:22,axis:true};
    const S=[0,2,6],project=p=>add(S,mul(sub(p,S),6/(6-p[2]))).slice(0,2);
    function draw(){
      const {ctx,width,height}=context(el('scene'));
      const az=state.azimuth*Math.PI/180,elev=state.elevation*Math.PI/180;
      const transform=p=>state.view==='plane'?project(p):[Math.cos(az)*p[0]+Math.sin(az)*p[1],-Math.sin(elev)*(-Math.sin(az)*p[0]+Math.cos(az)*p[1])+Math.cos(elev)*p[2]];
      const plane1=[[-3.3,-1.5,0],[1.8,-1.5,0],[1.8,1.3,0],[-3.3,1.3,0]],plane2=plane1.map(([x,y])=>[x,y,.6+.5*y]);
      const all=[O,...A,...B,...I,...(state.view==='space'?[...plane1,...plane2]:[])].map(transform);
      const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
      const scale=Math.min((width-70)/(xmax-xmin),(height-70)/(ymax-ymin));
      const pixel=p=>{const q=transform(p);return [width/2+(q[0]-(xmin+xmax)/2)*scale,height/2-(q[1]-(ymin+ymax)/2)*scale]};
      const line=(points,color,lw=2,dash=false)=>{ctx.beginPath();points.forEach((p,i)=>{const q=pixel(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dash?[4,5]:[]);ctx.stroke();ctx.setLineDash([])};
      const labels=[];
      const point=(p,label,color,offset=[9,-9])=>{const q=pixel(p);ctx.beginPath();ctx.arc(...q,5,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();labels.push({q,label,color,offset})};
      if(state.view==='space')for(const [pl,col]of [[plane1,'#87b3b5'],[plane2,'#d0a0ac']])line([...pl,pl[0]],col,1,true);
      for(let i=0;i<3;i++)line([O,A[i]],'#9ba8b2',1,true);
      for(let k=0;k<3;k++){const [i]=pairs[k];line([A[i],I[k]],'#7ba8aa',1);line([B[i],I[k]],'#ce95a4',1)}
      line([...A,A[0]],C.teal,3);line([...B,B[0]],C.wine,3);
      if(state.axis){line([[-3.3,-1.2,0],[1.8,-1.2,0]],C.gold,2.5);I.forEach((p,i)=>point(p,['P','Q','R'][i],C.gold,[6,22]))}
      A.forEach((p,i)=>point(p,['A','B','C'][i],C.teal,[-18,-12]));B.forEach((p,i)=>point(p,['A′','B′','C′'][i],C.wine,[9,20]));point(O,'O',C.ink);
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
      el('result').textContent=state.view==='space'?'All three side intersections lie on Π ∩ Π′: y = −1.2, z = 0.':'The same incidence configuration after central projection: P, Q, R remain collinear.';
    }
    for(const id of ['azimuth','elevation'])el(id).addEventListener('input',()=>{state[id]=+el(id).value;draw()});
    el('view').addEventListener('change',()=>{state.view=el('view').value;el('azimuth').disabled=el('elevation').disabled=state.view==='plane';draw()});
    el('axis').addEventListener('change',()=>{state.axis=el('axis').checked;draw()});
    el('reset').addEventListener('click',()=>{Object.assign(state,{view:'space',azimuth:-62,elevation:22,axis:true});el('view').value='space';for(const id of ['azimuth','elevation']){el(id).value=state[id];el(id).disabled=false}el('axis').checked=true;draw()});
    let start=null;el('scene').addEventListener('pointerdown',e=>{if(state.view!=='space')return;start=[e.clientX,e.clientY,state.azimuth,state.elevation];el('scene').setPointerCapture(e.pointerId)});
    el('scene').addEventListener('pointermove',e=>{if(!start)return;state.azimuth=((start[2]+(e.clientX-start[0])*.4+540)%360)-180;state.elevation=Math.max(5,Math.min(80,start[3]+(e.clientY-start[1])*.25));el('azimuth').value=state.azimuth;el('elevation').value=state.elevation;draw()});
    for(const event of ['pointerup','pointercancel'])el('scene').addEventListener(event,()=>start=null);
    const sideErrors=I.map((p,k)=>{const[i,j]=pairs[k];return norm(cross(sub(p,B[i]),sub(B[j],B[i])))});
    window.lesson={state,O,A,B,I,project,sideErrors,draw};observe(['scene'],draw);
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
  const demo=document.body.dataset.demo;
  if(demo==='intersections')intersections();else if(demo==='desargues')desargues();else if(demo==='branching')branching();
})();
