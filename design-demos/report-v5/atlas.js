(() => {
'use strict';
const NS='http://www.w3.org/2000/svg';
const profiles=JSON.parse(document.getElementById('report-data').textContent).profiles;
const svg=document.getElementById('sea'),map=document.getElementById('map'),play=document.getElementById('play'),playText=document.getElementById('play-text'),status=document.getElementById('status'),insight=document.getElementById('insight'),picker=document.getElementById('case-select');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),asset=document.getElementById('boat-data').textContent.trim();
let profile,nodes=[],currentIndex=0,selected=0,points=[],dims={w:0,h:0,mobile:false},trip=null,frame=0,resizeFrame=0,toastTimer=0;
const make=(tag,attrs={},text)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;return el;};

// The content decides node count. Geometry arranges those nodes without adding events.
function geometry(w,h,mobile){
 const past=profile.history.length,branches=profile.choices.length,result=[];
 if(mobile){
  const manyChoices=branches>3,choiceSpace=manyChoices?branches*78+40:branches?167:80;
  const nowY=h-choiceSpace,nowX=w*(manyChoices?.35:.51),firstY=46;
  for(let i=0;i<past;i++){const y=past===1?Math.max(46,nowY-115):firstY+i*(nowY-80-firstY)/(past-1);result.push({x:w*(i%2?.71:.27),y});}
  result.push({x:nowX,y:nowY});
  for(let i=0;i<branches;i++)result.push(manyChoices?{x:w*.65,y:nowY+85+i*78}:{x:w*(branches===1?.51:branches===2?.26+i*.48:.16+i*.34),y:h-63});
 }else{
  const start=past===1?.22:.10,nowX=past>3?.60:.56;
  for(let i=0;i<past;i++)result.push({x:w*(past===1?start:start+(nowX-start)*i/past),y:h*(i%2?.31:.69)});
  result.push({x:w*nowX,y:h*.48});
  for(let i=0;i<branches;i++){const y=branches===1?.48:branches===2?.27+i*.43:.16+i*.66/(branches-1);result.push({x:w*(branches===3&&i===1?.86:.82),y:h*y});}
 }
 return result;
}
function curve(a,b,mobile){return mobile?`M${a.x},${a.y} C${a.x},${a.y+(b.y-a.y)*.6} ${b.x},${b.y-(b.y-a.y)*.58} ${b.x},${b.y}`:`M${a.x},${a.y} C${a.x+(b.x-a.x)*.5},${a.y} ${b.x-(b.x-a.x)*.5},${b.y} ${b.x},${b.y}`;}
function background(root,w,h,mobile){
const defs=make('defs');const gradient=make('radialGradient',{id:'water',cx:'52%',cy:'49%',r:'65%'});gradient.append(make('stop',{offset:'0%','stop-color':'#deeeec'}),make('stop',{offset:'68%','stop-color':'#e8f0ed'}),make('stop',{offset:'100%','stop-color':'#f8f7f2'}));defs.append(gradient);root.append(defs,make('rect',{width:w,height:h,fill:'url(#water)'}));
const land=make('g',{'aria-hidden':'true',fill:'#f4f2e8',stroke:'#dce3d9','stroke-width':1});
if(mobile){land.append(make('path',{d:`M0,0 H${w*.28} C${w*.40},${h*.06} ${w*.17},${h*.09} ${w*.08},${h*.23} C${w*.03},${h*.27} 0,${h*.26} 0,${h*.3} Z`}),make('path',{d:`M${w},${h*.28} C${w*.76},${h*.30} ${w*.93},${h*.48} ${w*.80},${h*.58} S${w*.84},${h*.70} ${w},${h*.68}Z`}));}
else{land.append(make('path',{d:`M0,0 H${w*.22} C${w*.24},${h*.08} ${w*.18},${h*.18} ${w*.11},${h*.19} S${w*.03},${h*.30} 0,${h*.36}Z`}),make('path',{d:`M${w*.59},${h} C${w*.63},${h*.84} ${w*.53},${h*.88} ${w*.61},${h*.71} S${w*.75},${h*.86} ${w*.76},${h}Z`}));}
root.append(land);
}

function setSelected(index){selected=index;svg.querySelectorAll('.port').forEach((g,i)=>{g.classList.toggle('selected',i===index);g.setAttribute('aria-pressed',String(i===index));});for(let i=currentIndex+1;i<nodes.length;i++){const path=document.getElementById('route-'+i);path.setAttribute('stroke',i===index?'#ad623d':'#809b9f');path.setAttribute('stroke-width',i===index?3:2);}}
function explain(index){const n=nodes[index];document.getElementById('insight-age').textContent=n.age||'时间未定位';document.getElementById('insight-title').textContent=n.title;document.getElementById('insight-body').textContent=n.body;document.getElementById('insight-condition').textContent=n.condition||'';document.getElementById('insight-source').textContent=[n.source,n.status].filter(Boolean).join(' · ');insight.hidden=false;}
function boatAt(p){const size=dims.mobile?88:118;document.getElementById('boat').setAttribute('transform',`translate(${p.x-size*.50},${p.y-size*.81})`);}
function park(index){boatAt(points[index]);document.getElementById('trail').setAttribute('d','');}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;trip=null;play.dataset.state='idle';playText.textContent='播放航程';}
function activate(index){stop();setSelected(index);explain(index);if(index>currentIndex)start('future',index);else{park(index);status.textContent='已选择'+nodes[index].label;}}
function draw(force=false){
 const w=map.clientWidth,mobile=w<730||profile.history.length>5||profile.choices.length>3;
 const extraHistory=Math.max(0,profile.history.length-3),extraChoices=Math.max(0,profile.choices.length-3);
 const tall=mobile&&(extraHistory>0||extraChoices>0||w>=730);
 map.classList.toggle('tall-map',tall);map.style.setProperty('--atlas-height',(395+extraHistory*74+(extraChoices?profile.choices.length*78-90:0))+'px');
 const h=map.clientHeight;if(!force&&w===dims.w&&h===dims.h)return;
 const focused=document.activeElement?.getAttribute('data-node'),wasRunning=!!trip;stop();dims={w,h,mobile};points=geometry(w,h,mobile);svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);background(svg,w,h,mobile);
 const roads=make('g',{fill:'none','stroke-linecap':'round','aria-hidden':'true'});
 for(let i=0;i<currentIndex;i++)roads.append(make('path',{id:'past-'+i,d:curve(points[i],points[i+1],mobile),stroke:'#345d6b','stroke-width':mobile?3.5:4.5}));
 for(let i=currentIndex+1;i<nodes.length;i++)roads.append(make('path',{id:'route-'+i,d:curve(points[currentIndex],points[i],mobile),stroke:'#809b9f','stroke-width':2,'stroke-dasharray':'3 9'}));
 roads.append(make('path',{id:'trail',d:'',stroke:'#ad623d','stroke-width':mobile?4:5}));svg.append(roads);
 points.forEach((p,i)=>{
  const n=nodes[i],isNow=i===currentIndex,isFuture=i>currentIndex,g=make('g',{class:'port',role:'button',tabindex:0,'data-node':n.id,'aria-label':(n.age||'时间未定位')+'，'+n.label,'aria-controls':'insight','aria-pressed':String(i===selected)});
  g.append(make('circle',{cx:p.x,cy:p.y,r:24,fill:'transparent'}),make('circle',{class:'focus-ring',cx:p.x,cy:p.y,r:22,fill:'none',stroke:'#ad623d','stroke-width':2}));
  if(isNow)g.append(make('ellipse',{cx:p.x,cy:p.y+2,rx:mobile?37:46,ry:mobile?12:15,fill:'#a1beb7',opacity:.18}),make('ellipse',{cx:p.x,cy:p.y+2,rx:mobile?43:55,ry:mobile?17:21,fill:'none',stroke:'#88aaa6','stroke-width':1,opacity:.3}));
  else g.append(make('circle',{class:'dot',cx:p.x,cy:p.y,r:isFuture?5:5.5,fill:isFuture?'#f8f7f2':'#345d6b',stroke:'#345d6b','stroke-width':2}));
  let lx=p.x,ly=p.y+(isNow?(mobile?33:39):i<currentIndex&&i%2?-26:32),anchor='middle';
  if(mobile&&i<currentIndex){lx=p.x+(i%2?16:-16);ly=p.y+5;anchor=i%2?'start':'end';}
  if(mobile&&isFuture&&profile.choices.length>3){lx=p.x+16;ly=p.y+5;anchor='start';}
  if(isNow)g.append(make('rect',{x:p.x-31,y:ly-20,width:62,height:29,rx:14.5,fill:'#fffaf2'}));
  g.append(make('text',{x:lx,y:ly,'text-anchor':anchor,fill:isNow?'#9a4d2e':'#345461','font-size':isNow?15:mobile?14:17,'font-weight':isNow?600:500,'font-family':'-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif'},n.label));
  g.addEventListener('click',()=>activate(i));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(i);}});svg.append(g);
 });
 const boat=make('g',{id:'boat','aria-hidden':'true','pointer-events':'none'}),size=mobile?88:118;boat.append(make('image',{href:asset,width:size,height:size}));svg.append(boat);setSelected(selected);park(selected);
 if(focused){const target=[...svg.querySelectorAll('.port')].find(el=>el.dataset.node===focused);target?.focus({preventScroll:true});}
 if(wasRunning)status.textContent='布局已调整，已停泊在'+nodes[selected].label+'。可重新播放。';
}
function start(mode,target=currentIndex){
 stop();status.textContent=mode==='history'?'正在回看航程。':'正在预演'+nodes[target].label+'。';if(mode==='history')insight.hidden=true;
 const segments=mode==='history'?profile.history.map((_,i)=>({id:'past-'+i,to:i+1})):[{id:'route-'+target,to:target}];
 if(reduced.matches||segments.length===0){setSelected(target);park(target);status.textContent='已抵达'+nodes[target].label+(reduced.matches?'，已遵循减少动态效果设置。':'。');return;}
 if(mode==='history'){setSelected(0);park(0);}else park(currentIndex);
 trip={mode,target,segments,index:0,elapsed:0,last:0,paused:false,arrived:false};play.dataset.state='playing';playText.textContent='暂停';frame=requestAnimationFrame(tick);
}
function tick(time){
 if(!trip||trip.paused)return;if(!trip.last)trip.last=time;trip.elapsed+=Math.min(time-trip.last,70);trip.last=time;
 const seg=trip.segments[trip.index],path=document.getElementById(seg.id),duration=trip.mode==='history'?1450:1700,ratio=Math.min(1,trip.elapsed/duration),t=ratio*ratio*(3-2*ratio),length=path.getTotalLength(),p=path.getPointAtLength(length*t);boatAt(p);
 const trail=document.getElementById('trail');trail.setAttribute('d',path.getAttribute('d'));trail.setAttribute('stroke-dasharray',`${length} ${length}`);trail.setAttribute('stroke-dashoffset',String(length*(1-t)));
 if(ratio===1&&!trip.arrived){trip.arrived=true;setSelected(seg.to);status.textContent='抵达'+nodes[seg.to].label;}
 if(trip.elapsed>=duration+(trip.mode==='history'?350:0)){trip.index++;if(trip.index>=trip.segments.length){const target=trip.target;stop();setSelected(target);park(target);status.textContent=target===currentIndex?'已走到现在。下一程，由你继续选择。':'已完成'+nodes[target].label+'的示例预演。';return;}trip.elapsed=0;trip.last=time;trip.arrived=false;}
 frame=requestAnimationFrame(tick);
}
function pause(){if(!trip||trip.paused)return;trip.paused=true;cancelAnimationFrame(frame);frame=0;play.dataset.state='paused';playText.textContent='继续';status.textContent='航程已暂停。';}
function switchProfile(id){
 const next=profiles.find(p=>p.id===id);if(!next)return;stop();profile=next;nodes=[...profile.history,profile.current,...profile.choices];currentIndex=profile.history.length;selected=currentIndex;insight.hidden=true;
 for(const part of ['age','title','body','condition','source'])document.getElementById('insight-'+part).textContent='';
 document.getElementById('tagline').textContent=profile.tagline;document.title=profile.name+'的下一程 · 人生海图';
 document.querySelector('.chart').setAttribute('aria-label',profile.name+'的虚构航线：'+nodes.map(n=>n.label).join('，')+'。');
 document.querySelector('.hint').textContent=profile.choices.length?'实线是来路，虚线是选择。点选可查看。':'先看清现在，下一程待补充。点选可查看。';
 const report=document.getElementById('visual-report');report.setAttribute('aria-label',profile.name+'的图文解读');
 window.ReportDetails.render(report,profile,id=>{const index=nodes.findIndex(n=>n.id===id);if(index<0)return;activate(index);const target=svg.querySelectorAll('.port')[index];target.focus({preventScroll:true});target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});});
 draw(true);status.textContent='已切换至'+profile.name+'的虚构案例，共'+nodes.length+'个节点。';
}
profiles.forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.name+'（虚构） · '+(p.topic||'人生海图');picker.append(option);});
picker.addEventListener('change',()=>switchProfile(picker.value));
play.addEventListener('click',()=>{if(!trip){start('history');return;}if(trip.paused){trip.paused=false;trip.last=0;status.textContent='航程继续。';play.dataset.state='playing';playText.textContent='暂停';frame=requestAnimationFrame(tick);}else pause();});
document.getElementById('close-insight').addEventListener('click',()=>{stop();insight.hidden=true;setSelected(currentIndex);park(currentIndex);svg.querySelectorAll('.port')[currentIndex].focus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});reduced.addEventListener('change',()=>{if(reduced.matches&&trip){const end=trip.target;stop();setSelected(end);park(end);status.textContent='已直接抵达'+nodes[end].label;}});
function toast(message){clearTimeout(toastTimer);document.getElementById('toast').textContent=message;toastTimer=setTimeout(()=>document.getElementById('toast').textContent='',4500);}
function exportSvg(){
 const width=dims.mobile?780:1440,scale=width/dims.w,chartHeight=dims.h*scale,top=180,height=chartHeight+top+150,root=make('svg',{xmlns:NS,width,height,viewBox:`0 0 ${width} ${height}`});root.append(make('rect',{width,height,fill:'#f8f7f2'}));
 const text=(x,y,value,size,fill='#243e49')=>root.append(make('text',{x,y,'font-size':size,fill,'font-family':'PingFang SC, Microsoft YaHei, sans-serif','text-anchor':'middle'},value));text(width/2,62,'人生海图 · '+profile.name+' · 虚构示例',19,'#61757a');text(width/2,123,'你的下一程',45);text(width/2,160,profile.tagline,22,'#61757a');
 const chart=svg.cloneNode(true);chart.setAttribute('x','0');chart.setAttribute('y',String(top));chart.setAttribute('width',String(width));chart.setAttribute('height',String(chartHeight));chart.querySelectorAll('.focus-ring').forEach(e=>e.remove());chart.querySelectorAll('.port.selected text').forEach(e=>e.setAttribute('fill','#9a4d2e'));chart.querySelectorAll('.port.selected .dot').forEach(e=>{e.setAttribute('fill','#ad623d');e.setAttribute('stroke','#ad623d');});chart.querySelectorAll('.port').forEach(e=>{e.removeAttribute('tabindex');e.removeAttribute('role');});root.append(chart);text(width/2,height-90,'实线是示例来路，虚线是有条件的选择。',19,'#61757a');text(width/2,height-49,'人物与航线均为虚构。位置、距离不代表分数或概率。',17,'#61757a');return new XMLSerializer().serializeToString(root);
}
const save=document.getElementById('save');save.addEventListener('click',async()=>{
 stop();park(selected);const snapshot={id:profile.id,name:profile.name,svg:exportSvg()};save.disabled=true;save.textContent='正在生成…';let url;
 try{url=URL.createObjectURL(new Blob([snapshot.svg],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.drawImage(img,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG unavailable');const png=URL.createObjectURL(blob),link=document.createElement('a');link.href=png;link.download='life-atlas-'+snapshot.id+'-fictional.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(png),30000);toast(snapshot.name+'的海图已生成，可以保存为图片。');}
 catch(error){toast('图片暂未生成，请使用浏览器截图保存。');}
 finally{if(url)URL.revokeObjectURL(url);save.disabled=false;save.textContent='保存海图 ↗';}
});
switchProfile(profiles[0].id);new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>draw());}).observe(map);
document.querySelector('.skip').addEventListener('click',()=>document.getElementById('report').open=true);
let reportWasOpen=false;window.addEventListener('beforeprint',()=>{reportWasOpen=document.getElementById('report').open;document.getElementById('report').open=true;});window.addEventListener('afterprint',()=>document.getElementById('report').open=reportWasOpen);
})();
