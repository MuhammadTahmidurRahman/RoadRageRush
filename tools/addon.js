/* ===== ADDON: menu, career, rooms (multiplayer), leaderboard ===== */
const LS=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const PF=LS('rrr2')||{pid:(crypto.randomUUID?crypto.randomUUID():''+R()+Date.now()),name:'Rider'+(100+R()*900|0),cash:0,st:0,up:{s:0,n:0,a:0}};
const SV=()=>{try{localStorage.setItem('rrr2',JSON.stringify(PF))}catch(e){}},UP=PF.up;
let MP=0,MODE='quick',AI=1,CD=0,cdn=9,rt=0,ws=null,me='',roomCode='',lobby=null,rem={},lastSend=0,res=null,view='main',err='',MYC=['#ffd60a','#c1121f'];
const ST=[['Rookie Run',.9,4,300],['Street Sweep',.96,3,600],['Highway Havoc',1.02,3,900],['Pro Circuit',1.08,2,1500],['Road Rage Legend',1.14,1,3000]],
UPN={s:['Top Speed',400],n:['Nitro Tank',300],a:['Armor',350]};
const rank=()=>{const z=pos+PZ;return 1+(MP?Object.values(rem):ents.filter(e=>e.r)).filter(e=>e.z>z).length},total=()=>MP?Object.keys(rem).length+1:8;
const fmt=ms=>ms>0?(ms/1000).toFixed(2)+'s':'DNF',esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),$=id=>document.getElementById(id);
const send=o=>{if(ws&&ws.readyState==1)ws.send(JSON.stringify(o))};
function tagN(n,X,y,u){g.font='700 '+Math.max(10,15*u)+'px system-ui';g.textAlign='center';g.textBaseline='bottom';tx(n,X,y)}
function reset(){reset0();if(MP)ents=ents.filter(e=>!e.r);for(const e of ents)if(e.r)e.base*=AI}
function begin(){au();reset();if(eg&&!mute)eg.gain.value=.03;S='play';rt=0;CD=3;cdn=9}
function launch(){res=null;hideUI();begin()}
/* ---- rooms ---- */
function leave(){if(ws){const w=ws;ws=null;try{w.close()}catch(e){}}lobby=null;rem={};MP=0;res=null}
function join(code){leave();code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);if(!code){err='Enter a room code';return showUI()}
 roomCode=code;err='Connecting...';MP=1;MODE='mp';showUI();
 const w=ws=new WebSocket((location.protocol=='https:'?'wss://':'ws://')+location.host+'/ws/'+code+'?n='+encodeURIComponent(PF.name));
 w.onmessage=e=>mpMsg(JSON.parse(e.data));
 w.onclose=()=>{if(ws!==w)return;ws=null;lobby=null;rem={};MP=0;if(S=='play'){S='over';msg='DISCONNECTED';if(eg)eg.gain.value=0}err=err&&err!='Connecting...'?err:'Disconnected';res=null;showUI('mp')};
 w.onerror=()=>{err='Could not connect. Is the Worker deployed?'}}
function mpMsg(m){const t=m.t;
 if(t=='hi'){me=m.i;err=''}
 else if(t=='err')err=m.m;
 else if(t=='room'){lobby=m;if(S!='play')showUI()}
 else if(t=='go'){rem={};const n=lobby.p.length;let ix=0;
  lobby.p.forEach((p,i)=>{const x=(i-(n-1)/2)*.2,c=p.c,col=RC[c%7],jc=JC[(c*3+(c/7|0))%7];
   if(p.i==me){ix=x;MYC=[col,jc]}else rem[p.i]={n:p.n,col,jc,z:PZ,tz:PZ,x,tx:x,v:0,pa:0,ps:1,l:0}});
  res=null;hideUI();begin();px=camx=ix}
 else if(t=='s'){const e=rem[m.i];if(e){e.tz=m.z+m.v*.06;e.tx=m.x;e.v=m.v;e.pa=m.a?.2:0;e.ps=m.y;e.l=m.l}}
 else if(t=='h'){if(S=='play'&&CD<=0){hp-=9*(1-UP.a*.12);px+=m.s*.3;sp=Math.max(0,sp-15);sh=7;beep(2);spark(8,'#f55')}}
 else if(t=='x')delete rem[m.i];
 else if(t=='end'){res={mp:1,r:m.r};if(S=='play'){S='over';msg='RACE OVER';if(eg)eg.gain.value=0}showUI()}}
function mpTick(dt){if(!MP)return;
 for(const id in rem){const e=rem[id];e.tz+=e.v*dt;e.z+=(e.tz-e.z)*Math.min(1,dt*8);e.x+=(e.tx-e.x)*Math.min(1,dt*10)}
 if((lastSend-=dt)<=0){lastSend=.1;send({t:'s',z:pos+PZ,x:+px.toFixed(3),v:sp|0,a:pa>0?1:0,y:ps,l:+pl.toFixed(2)})}}
function mpHit(s,pz){for(const id in rem){const e=rem[id],dz=e.z-pz,dx=(e.x-px)*s;
 if(Math.abs(dz)<18&&dx>.05&&dx<.6){send({t:'h',to:id,s});e.x+=s*.3;score+=25;pop('+25','#fff')}}}
/* ---- race end: leaderboard, career rewards ---- */
function done(ms,rk){if(ms>0)lbSend(ms);
 if(MP){send({t:'f',ms:Math.round(ms)});res={wait:1};setTimeout(showUI,700);return}
 if(MODE=='career'){const stg=PF.st,s=ST[stg],ok=ms>0&&rk<=s[2];let gain=ko*60+(ms>0?Math.max(0,9-rk)*40:0);
  if(ok){gain+=s[3];if(stg<ST.length-1)PF.st++;else PF.champ=1}PF.cash+=gain|0;SV();res={career:1,ok,g:gain|0,rk,stg}}
 else res={ms,rk};
 setTimeout(showUI,900)}
function lbSend(ms){fetch('/api/score',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:PF.pid,name:PF.name,ms:Math.round(ms)})}).catch(()=>{})}
function loadLB(){fetch('/api/lb').then(r=>r.json()).then(d=>{const el=$('lb');if(el)el.innerHTML=d.length?'<ol>'+d.map(r=>`<li>${esc(r.name)} <b>${fmt(r.best_ms)}</b> <small>${r.races} races</small></li>`).join('')+'</ol>':'No times yet. Be the first!'}).catch(()=>{const el=$('lb');if(el)el.textContent='Leaderboard offline'})}
/* ---- menus ---- */
const U=document.createElement('div');U.id='ui';document.body.appendChild(U);
const hideUI=()=>{U.style.display='none'};
function showUI(v){if(v)view=v;U.style.display='block';
 const B=(a,t,d='')=>`<button data-a="${a}" data-v="${d}">${t}</button>`,nb=`<input id=nm maxlength=12 value="${esc(PF.name)}" placeholder="Your name">`;let h='';
 if(res&&S=='over'){
  if(res.wait)h='<h3>Finished!</h3><p>Waiting for the other riders (max 25s)...</p>';
  else if(res.mp)h=`<h3>Race results</h3><ol>${res.r.map(r=>`<li${r.i==me?' class=me':''}>${esc(r.n)} <b>${fmt(r.ms)}</b></li>`).join('')}</ol>`+B('back','Back to lobby')+B('leave','Leave room');
  else if(res.career)h=`<h3>${res.ok?'STAGE CLEARED!':'Stage failed'}</h3><p>Finished #${res.rk||'-'} (needed top ${ST[res.stg][2]}) &middot; earned $${res.g}</p>`+B('view','Continue','career');
  else h=`<h3>${res.ms>0?'Finished #'+res.rk+' &middot; '+fmt(res.ms):'Busted!'}</h3>`+B('quick','Race again')+B('view','Menu','main')}
 else if(MP&&lobby){const host=lobby.h==me;
  h=`<h3>Room <span class=code>${esc(roomCode)}</span></h3><p>Share this code with friends &middot; ${lobby.p.length}/10 riders</p><ul>${lobby.p.map(p=>`<li${p.i==me?' class=me':''}>${esc(p.n)}${p.i==lobby.h?' (host)':''}</li>`).join('')}</ul>`+(host?B('go','START RACE'):'<p>Waiting for the host to start...</p>')+B('leave','Leave room')}
 else if(view=='career'){const s=ST[PF.st];
  h=`<h3>Career &middot; Stage ${PF.st+1}/${ST.length}${PF.champ?' &#127942;':''}</h3><p><b>${s[0]}</b>: finish top ${s[2]} &middot; reward $${s[3]}</p><p>Cash: $${PF.cash}</p>`+
  Object.keys(UPN).map(k=>{const L=UP[k],c=UPN[k][1]*(L+1);return L>=5?`<p>${UPN[k][0]}: MAX</p>`:B('buy',`${UPN[k][0]} L${L} &rarr; L${L+1} ($${c})`,k)}).join('')+B('career','START STAGE')+B('view','Back','main')}
 else if(view=='lb')h='<h3>Global leaderboard</h3><p>Fastest finish times</p><div id=lb>Loading...</div>'+B('view','Back','main');
 else if(view=='mp')h=`<h3>Multiplayer &middot; up to 10 riders</h3>${nb}<input id=rc maxlength=6 placeholder="ROOM CODE" style="text-transform:uppercase">`+B('join','Join room')+B('create','Create new room')+B('view','Back','main');
 else h=`<h3>Pick a mode</h3>${nb}`+B('quick','Quick Race')+B('view','Career','career')+B('view','Multiplayer','mp')+B('view','Leaderboard','lb')+'<p class=hint>Arrows/A-D steer &middot; Z/X punch &middot; Shift nitro &middot; S brake</p>';
 U.innerHTML=`<div class=card>${h}${err?`<p class=err>${esc(err)}</p>`:''}</div>`;
 if(!res&&!(MP&&lobby)&&view=='lb')loadLB()}
U.onclick=e=>{const b=e.target.closest('button');if(b)act(b.dataset.a,b.dataset.v)};
function act(a,v){const nm=$('nm');if(nm){const n=nm.value.trim().replace(/[^\w \-]/g,'').slice(0,12);if(n){PF.name=n;SV()}}err='';
 if(a=='view'){view=v;res=null}
 else if(a=='quick'){MODE='quick';MP=0;AI=1;launch()}
 else if(a=='career'){MODE='career';MP=0;AI=ST[PF.st][1];launch()}
 else if(a=='buy'){const c=UPN[v][1]*(UP[v]+1);if(UP[v]<5&&PF.cash>=c){PF.cash-=c;UP[v]++;SV()}}
 else if(a=='create')join(Array.from({length:4},()=>'ABCDEFGHJKMNPQRSTUVWXYZ'[R()*23|0]).join(''));
 else if(a=='join')join($('rc').value);
 else if(a=='go')send({t:'go'});
 else if(a=='back')res=null;
 else if(a=='leave'){leave();view='mp'}
 if(U.style.display!='none'&&a!='go')showUI()}
showUI('main');
