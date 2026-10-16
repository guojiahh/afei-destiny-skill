(() => {
'use strict';
const model=JSON.parse(document.getElementById('report-data').textContent).diagram;
const scene=document.getElementById('scene'),play=document.getElementById('play');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const names={fact:'已知处境',hypothesis:'待验证的理解',action:'可尝试的介入',condition:'条件情景 · 尚未发生',unknown:'仍需了解'};
const ns='http://www.w3.org/2000/svg';
let active=model.tour[0],playing=false,elapsed=0,last=0,frame=0,blend=0,target=0,positions={},svg,parts=[],gate,trace,previousWidth=0;
function el(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function add(parent,tag,attrs,text){const n=el(tag,attrs,text);parent.append(n);return n;}
function path(a,b,mobile){return mobile?`M${a.x} ${a.y} C${a.x} ${a.y+55},${b.x} ${b.y-55},${b.x} ${b.y}`:`M${a.x} ${a.y} C${a.x+90} ${a.y},${b.x-90} ${b.y},${b.x} ${b.y}`;}
function openRef(id){const target=document.getElementById(id);if(!target)return;let p=target;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
document.addEventListener('click',event=>{const a=event.target.closest('a[href^="#source-"]');if(a){event.preventDefault();openRef(a.hash.slice(1));}});
function describe(){const n=model.nodes.find(n=>n.id===active);document.getElementById('step-kind').textContent=names[n.kind];document.getElementById('step-title').textContent=n.title;document.getElementById('step-text').textContent=n.text;const refs=document.getElementById('step-refs');refs.replaceChildren();n.refs.forEach((r,i)=>{if(i)refs.append(' · ');const a=document.createElement('a');a.href='#source-'+r.replace(':','-');a.textContent=(r.startsWith('user')?'查看解读 ':'查看依据 ')+r.split(':')[1];refs.append(a);});scene.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===active)));target=['action','condition'].includes(n.kind)?1:0;scene.dataset.state=active;}
function updatePlay(){play.textContent=playing?'暂停讲解 Ⅱ':elapsed>=model.tour.length*3500?'重播讲解 ↺':elapsed>0?'继续讲解 ↗':'播放讲解 ↗';play.setAttribute('aria-label',play.textContent);}
function pause(){playing=false;updatePlay();}
function select(id,manual=true){active=id;if(manual){pause();elapsed=0;updatePlay();}describe();last=0;request();}
function build(){const mobile=scene.clientWidth<660,w=mobile?400:1000,h=mobile?470:400;const width=scene.clientWidth;if(width===previousWidth)return;previousWidth=width;scene.style.aspectRatio=`${w}/${h}`;scene.replaceChildren();svg=add(scene,'svg',{viewBox:`0 0 ${w} ${h}`,'aria-hidden':'true'});parts=[];positions={};
 const defs=add(svg,'defs');let gradient=add(defs,'linearGradient',{id:'deck',x1:0,y1:0,x2:0,y2:1});add(gradient,'stop',{offset:'0%','stop-color':'#b6cbd0'});add(gradient,'stop',{offset:'100%','stop-color':'#e5ece8'});gradient=add(defs,'linearGradient',{id:'copper',x1:0,y1:0,x2:1,y2:1});add(gradient,'stop',{offset:'0%','stop-color':'#dfaa7a'});add(gradient,'stop',{offset:'100%','stop-color':'#a34e31'});const filter=add(defs,'filter',{id:'shadow',x:'-60%',y:'-100%',width:'220%',height:'300%'});add(filter,'feGaussianBlur',{stdDeviation:mobile?5:7});
 const groups=[model.nodes.filter(n=>n.kind==='fact'),model.nodes.filter(n=>n.kind==='hypothesis'||n.kind==='unknown'),model.nodes.filter(n=>n.kind==='action'),model.nodes.filter(n=>n.kind==='condition')];
 if(mobile){const count=model.nodes.length;const rows=Math.ceil(count/2);scene.style.aspectRatio=`400/${Math.max(470,rows*148+26)}`;const height=Math.max(470,rows*148+26);svg.setAttribute('viewBox',`0 0 400 ${height}`);model.nodes.forEach((n,i)=>positions[n.id]={x:i%2?290:100,y:75+Math.floor(i/2)*148+(i%2?24:0)});scene.dataset.height=height;
 }else{const height=Math.max(400,Math.max(...groups.map(g=>g.length))*125+100);scene.style.aspectRatio=`1000/${height}`;svg.setAttribute('viewBox',`0 0 1000 ${height}`);groups.forEach((g,col)=>g.forEach((n,i)=>positions[n.id]={x:[155,420,575,830][col]+(g.length>1?(i%2===0?-30:30):0),y:125+i*125}));scene.dataset.height=height;}
 const actualHeight=Number(scene.dataset.height);
 // One continuous spatial language. The data owns nodes, links, meanings and narration.
 for(const [i,n] of model.nodes.entries()){const p=positions[n.id],future=n.kind==='condition',size=mobile?49:59;
 add(svg,'ellipse',{cx:p.x,cy:p.y+23,rx:size,ry:14,fill:'#718f96',opacity:future?.055:.12,filter:'url(#shadow)'});
 if(!future){add(svg,'path',{d:`M${p.x-size} ${p.y} L${p.x} ${p.y-17} L${p.x+size} ${p.y} L${p.x} ${p.y+18}Z`,fill:n.kind==='action'?'#d5a17a':'url(#deck)',stroke:n.kind==='action'?'#ad5535':'#9ab1b8','stroke-width':.5});add(svg,'path',{d:`M${p.x-size} ${p.y}L${p.x} ${p.y+18}L${p.x+size} ${p.y}v12L${p.x} ${p.y+30}L${p.x-size} ${p.y+12}Z`,fill:n.kind==='action'?'#a15c40':'#527486',opacity:.85});}
 else{add(svg,'ellipse',{cx:p.x,cy:p.y+7,rx:size,ry:19,fill:'none',stroke:'#91a8ae','stroke-width':1,'stroke-dasharray':'3 5'});}
 const orb=add(svg,'circle',{cx:p.x,cy:p.y-3,r:4,fill:n.kind==='action'?'#b46541':'#43687d',opacity:future?.35:.75});parts.push({orb,n});
 const b=document.createElement('button');b.type='button';b.className='map-hit';b.dataset.id=n.id;b.dataset.kind=n.kind;b.style.left=p.x/w*100+'%';b.style.top=(p.y+(n.kind==='action'?32:-36))/actualHeight*100+'%';const sub=document.createElement('small');sub.textContent=names[n.kind].split(' · ')[0];b.append(sub,document.createTextNode(n.label));b.addEventListener('click',()=>select(n.id));scene.append(b);}
 const lines=add(svg,'g');svg.insertBefore(lines,svg.children[1]);
 for(const edge of model.edges){const a=positions[edge.from],b=positions[edge.to],d=path(a,b,mobile),future=edge.kind==='conditional';const shadow=add(lines,'path',{d,fill:'none',stroke:'#aab9ba','stroke-width':future?1:12,opacity:future?.35:.2,transform:'translate(0 10)'});const stroke=add(lines,'path',{d,fill:'none',stroke:future?'#99adb0':'#597f91','stroke-width':future?1.5:3,'stroke-linecap':'round','stroke-dasharray':edge.kind==='known'?'none':future?'4 9':'2 6',opacity:.75});parts.push({stroke,shadow,edge});}
 const action=model.nodes.find(n=>n.kind==='action'),hyp=model.nodes.find(n=>n.kind==='hypothesis');
 if(action&&model.type==='threshold'){const p=positions[action.id];gate=add(svg,'g');add(gate,'path',{d:`M${p.x-37} ${p.y+5}v-69l74-24v69`,fill:'none',stroke:'#527486','stroke-width':2});add(gate,'path',{d:`M${p.x-32} ${p.y+2}v-54l64-21v54Z`,fill:'url(#copper)',opacity:.9});add(gate,'path',{d:`M${p.x-26} ${p.y-7}l52-17M${p.x-26} ${p.y-18}l52-17M${p.x-26} ${p.y-29}l52-17`,stroke:'#f6d7ac','stroke-width':1,opacity:.55});gate.dataset.x=p.x;gate.dataset.y=p.y;
 }else gate=null;
 trace=add(svg,'g',{'pointer-events':'none'});for(let i=0;i<3;i++)add(trace,'path',{d:'M-5 -2L0 -4L5 -2L0 1Z',fill:'#f6f3eb',stroke:'#446f82','stroke-width':1});
 add(svg,'text',{x:mobile?15:22,y:actualHeight-10,fill:'#a2b1b1','font-size':mobile?9:10,'letter-spacing':3},model.type==='threshold'?'准备 / 完成线 / 外部反馈':'经历 / 当前 / 条件');
 describe();draw(0);}
function draw(dt){blend += (target-blend)*(reduced.matches?1:Math.min(1,dt/230));if(Math.abs(target-blend)<.002)blend=target;
 if(gate){gate.setAttribute('transform',`translate(${blend*13},${-blend*48})`);gate.setAttribute('opacity',String(1-blend*.3));}
 for(const p of parts){if(p.orb){const selected=p.n.id===active;p.orb.setAttribute('r',selected?7:4);p.orb.setAttribute('opacity',selected?'1':p.n.kind==='condition'?'.35':'.7');}else if(p.stroke){const related=[p.edge.from,p.edge.to].includes(active);p.stroke.setAttribute('stroke',blend>.2&&p.edge.kind==='conditional'?'#ae6547':related?'#2e617e':p.edge.kind==='conditional'?'#99adb0':'#6a8a99');p.stroke.setAttribute('stroke-width',related?'3':p.edge.kind==='conditional'?'1.5':'2');p.stroke.setAttribute('opacity',related?'1':'.5');}}
 const idx=model.tour.indexOf(active),node=positions[active];[...trace.children].forEach((p,i)=>{const wave=reduced.matches?0:Math.sin((elapsed/850)+i*.65)*3;p.setAttribute('transform',`translate(${node.x-13+i*12},${node.y-9-wave-i*2})`);p.setAttribute('opacity',String(.85-i*.2));});
}
function tick(now){frame=0;const dt=last?Math.min(now-last,80):16;last=now;if(playing){elapsed+=dt;let index=Math.min(model.tour.length-1,Math.floor(elapsed/3500));if(active!==model.tour[index]){active=model.tour[index];describe();}if(elapsed>=model.tour.length*3500){pause();}}
 draw(dt);if(playing||blend!==target)request();else last=0;}
function request(){if(!frame)frame=requestAnimationFrame(tick);}
play.hidden=false;play.addEventListener('click',()=>{if(playing){pause();return;}if(elapsed>=model.tour.length*3500||elapsed===0){elapsed=0;active=model.tour[0];describe();}playing=true;last=0;updatePlay();request();});
window.addEventListener('resize',()=>{previousWidth=0;build();request();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();},{threshold:.15}).observe(scene);
reduced.addEventListener('change',()=>{pause();if(reduced.matches){blend=target;draw(0);}});
build();if(!reduced.matches&&!document.hidden){playing=true;request();}updatePlay();
window.addEventListener('beforeprint',()=>{pause();document.querySelectorAll('details').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});window.addEventListener('afterprint',()=>document.querySelectorAll('details').forEach(d=>{d.open=d.dataset.wasOpen==='true';}));
})();
