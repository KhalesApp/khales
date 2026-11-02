/* =====================================================================
   خالص — قسم الهكبة (مجموعة ادخار دوّارة)
   يحتاج إنترنت. البيانات مشتركة بين الأعضاء عبر Firebase،
   أو عبر خادم تجريبي محلي عند فتح الرابط مع ?mock=1 (للاختبار فقط).
   ===================================================================== */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const K=window.__khalesCore; // أدوات مشتركة من app.js
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>K.fmt(n), toNum=s=>K.toNum(s);
const iso=d=>{const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};
const dObj=s=>new Date(s+'T12:00:00');
const dShort=s=>dObj(s).toLocaleDateString(K.loc(),{weekday:'short',day:'numeric',month:'numeric'});
const dLong=s=>dObj(s).toLocaleDateString(K.loc(),{weekday:'long',day:'numeric',month:'long'});
const today=()=>iso(new Date());
const UNIT={day:['يوم','أيام','يوميًا','يومي'],week:['أسبوع','أسابيع','أسبوعيًا','أسبوعي'],month:['شهر','أشهر','شهريًا','شهري']};
const unitN=(n,u)=>fmt(n)+' '+(n===1?UNIT[u][0]:n===2?(u==='day'?'يومين':u==='week'?'أسبوعين':'شهرين'):n<=10?UNIT[u][1]:UNIT[u][0]);

/* ================= الجدول الزمني ================= */
function addUnit(s,n,u){ const d=dObj(s); if(u==='day') d.setDate(d.getDate()+n); else if(u==='week') d.setDate(d.getDate()+7*n); else { const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); } return iso(d); }
function plan(h){
  const n=(h.order||[]).length||h.slots||0, k=Math.max(1,h.k|0), total=n*k;
  const due=i=>addUnit(h.start,i,h.unit);
  const t=today(); let curIdx=0; while(curIdx<total&&due(curIdx)<=t) curIdx++; // عدد الفترات المستحقة حتى اليوم
  const cycles=[]; for(let c=0;c<n;c++) cycles.push({c,uid:h.order?h.order[c]:null,from:c*k,to:(c+1)*k-1,date:due((c+1)*k-1),amount:h.amount*k*n});
  const curCycle=Math.min(n-1,Math.floor(Math.max(0,curIdx-1)/k));
  const ended=total>0&&t>due(total-1)&&curIdx>=total;
  return {n,k,total,due,curIdx,cycles,curCycle,ended,payout:h.amount*k*n};
}
function coverage(payments,uid){ // الفترات المغطاة لعضو
  const ok=new Set(), pend=new Set();
  payments.filter(p=>p.uid===uid).forEach(p=>{ for(let i=p.from;i<p.from+p.count;i++){ if(p.status==='confirmed') ok.add(i); else if(p.status==='pending') pend.add(i); } });
  return {ok,pend};
}
function memberState(P,payments,uid){
  const {ok,pend}=coverage(payments,uid); let overdue=0, next=null;
  for(let i=0;i<P.total;i++){ if(ok.has(i)||pend.has(i)) continue; if(next===null) next=i; if(i<P.curIdx) overdue++; }
  return {ok,pend,overdue,next,paidCount:ok.size};
}

/* ================= الخادم ================= */
const MOCK=/[?&]mock=1/.test(location.search);
let DB=null, ready=null;
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('load '+src)); document.head.appendChild(s); }); }
function mockBackend(){
  const KEY='khales_mock_db'; let uid=sessionStorage.getItem('mock_uid'); if(!uid){ uid='u'+Math.random().toString(36).slice(2,10); sessionStorage.setItem('mock_uid',uid); }
  const read=()=>{ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } };
  const write=db=>{ localStorage.setItem(KEY,JSON.stringify(db)); fire(); };
  const subs=new Set(); const fire=()=>setTimeout(()=>subs.forEach(f=>f()),0);
  window.addEventListener('storage',e=>{ if(e.key===KEY) fire(); });
  const rid=()=>Math.random().toString(36).slice(2,12);
  const colOf=p=>p.split('/').slice(0,-1).join('/');
  return {uid, kind:'mock',
    getDoc:async p=>{ const d=read()[p]; return d?{...d}:null; },
    setDoc:async (p,data)=>{ const db=read(); db[p]={...data}; write(db); },
    updateDoc:async (p,patch)=>{ const db=read(); if(!db[p]) throw new Error('not-found'); db[p]={...db[p],...patch}; write(db); },
    addDoc:async (c,data)=>{ const id=rid(); const db=read(); db[c+'/'+id]={...data}; write(db); return id; },
    deleteDoc:async p=>{ const db=read(); delete db[p]; write(db); },
    watchDoc:(p,cb)=>{ const f=()=>{ const d=read()[p]; cb(d?{id:p.split('/').pop(),...d}:null); }; subs.add(f); f(); return ()=>subs.delete(f); },
    watchCol:(c,cb)=>{ const f=()=>{ const db=read(); cb(Object.keys(db).filter(k=>colOf(k)===c).map(k=>({id:k.split('/').pop(),...db[k]}))); }; subs.add(f); f(); return ()=>subs.delete(f); }
  };
}
async function firebaseBackend(cfg){
  if(!window.firebase){ await loadScript('vendor/firebase-app-compat.js'); await loadScript('vendor/firebase-auth-compat.js'); await loadScript('vendor/firebase-firestore-compat.js'); }
  let app; try{ app=firebase.app(); }catch(e){ app=firebase.initializeApp(cfg); }
  const auth=firebase.auth(), fs=firebase.firestore();
  try{ await fs.enablePersistence({synchronizeTabs:true}); }catch(e){}
  if(/[?&]fresh=1/.test(location.search)) await auth.setPersistence(firebase.auth.Auth.Persistence.NONE); // للاختبار فقط
  // ينتظر استرجاع الهوية المحفوظة أولًا، ولا ينشئ هوية جديدة إلا إذا لم توجد
  const user=await new Promise((res,rej)=>{ let tried=false; const un=auth.onAuthStateChanged(u=>{ if(u){ un(); res(u); } else if(!tried){ tried=true; auth.signInAnonymously().catch(e=>{ un(); rej(e); }); } }); });
  const col=c=>fs.collection(c), doc=p=>fs.doc(p);
  return {uid:user.uid, kind:'firebase',
    getDoc:async p=>{ const s=await doc(p).get(); return s.exists?s.data():null; },
    setDoc:(p,d)=>doc(p).set(d), updateDoc:(p,d)=>doc(p).update(d),
    addDoc:async (c,d)=>{ const r=await col(c).add(d); return r.id; },
    deleteDoc:p=>doc(p).delete(),
    watchDoc:(p,cb,err)=>doc(p).onSnapshot(s=>cb(s.exists?{id:s.id,...s.data()}:null),err||(()=>cb(null))),
    watchCol:(c,cb,err)=>col(c).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),err||(()=>{}))
  };
}
function backend(){
  if(ready) return ready;
  ready=(async()=>{
    if(MOCK) return DB=mockBackend();
    if(!window.KHALES_FB) throw {code:'noconfig'};
    if(!navigator.onLine) throw {code:'offline'};
    return DB=await firebaseBackend(window.KHALES_FB);
  })().catch(e=>{ ready=null; console.error('hakba backend',e); throw e; });
  return ready;
}

/* ================= الحالة المحلية ================= */
const store=()=>K.store(); // ST العام
function HS(){ const s=store(); s.hakba=Object.assign({me:{name:'',phone:''},list:[],seen:{}},s.hakba||{}); return s.hakba; }
function remember(hid){ const h=HS(); if(!h.list.includes(hid)) h.list.unshift(hid); K.save(); }
function forget(hid){ const h=HS(); h.list=h.list.filter(x=>x!==hid); K.save(); }

/* ================= البيانات الحية ================= */
const live={}; // hid -> {h,members,payments,events,unsubs}
function watch(hid){
  if(live[hid]) return live[hid];
  const L=live[hid]={h:undefined,members:[],payments:[],events:[],unsubs:[]};
  const rer=()=>{ render(); badge(); };
  L.unsubs.push(DB.watchDoc('hakbas/'+hid,d=>{ L.h=d; rer(); }));
  L.unsubs.push(DB.watchCol('hakbas/'+hid+'/members',d=>{ L.members=d; rer(); }));
  L.unsubs.push(DB.watchCol('hakbas/'+hid+'/payments',d=>{ L.payments=d.sort((a,b)=>(b.at||'').localeCompare(a.at||'')); rer(); }));
  L.unsubs.push(DB.watchCol('hakbas/'+hid+'/events',d=>{ L.events=d.sort((a,b)=>(b.at||'').localeCompare(a.at||'')); rer(); }));
  return L;
}
const now=()=>new Date().toISOString();
const nameOf=(L,uid)=>{ const m=L.members.find(x=>x.id===uid); return m?m.name:(L.h&&L.h.ownerUid===uid?L.h.ownerName:'عضو'); };
const isOwner=L=>L.h&&DB&&L.h.ownerUid===DB.uid;
const myMember=L=>DB&&L.members.find(m=>m.id===DB.uid);
function log(hid,text,type){ return DB.addDoc('hakbas/'+hid+'/events',{text,type:type||'info',by:DB.uid,at:now()}).catch(()=>{}); }

/* ================= التنبيهات ================= */
function alertsFor(hid){
  const L=live[hid]; if(!L||!L.h) return [];
  const A=[], P=L.h.order?plan(L.h):null, seen=HS().seen[hid]||'';
  if(isOwner(L)){
    const pm=L.payments.filter(p=>p.status==='pending'); if(pm.length) A.push({k:'warn',t:`${fmt(pm.length)} دفعة تنتظر تأكيدك`,go:'pay'});
    const jm=L.members.filter(m=>m.status==='pending'); if(jm.length) A.push({k:'warn',t:`${fmt(jm.length)} طلب انضمام ينتظر موافقتك`,go:'mem'});
  }
  const me=myMember(L);
  if(me&&me.status==='approved'&&P){
    const st=memberState(P,L.payments,DB.uid);
    if(st.overdue) A.push({k:'bad',t:`عليك ${fmt(st.overdue)} ${st.overdue===1?'دفعة متأخرة':'دفعات متأخرة'} (${fmt(st.overdue*L.h.amount)} ${esc(L.h.cur)})`,go:'pay'});
    L.payments.filter(p=>p.uid===DB.uid&&p.decidedAt&&p.decidedAt>seen).forEach(p=>A.push({k:p.status==='confirmed'?'ok':'bad',t:p.status==='confirmed'?`تم تأكيد دفعتك (${fmt(p.amount)})`:`رُفضت دفعتك (${fmt(p.amount)})${p.reason?': '+esc(p.reason):''}`,go:'pay'}));
    const c=P.cycles.find(c=>c.uid===DB.uid); if(c&&!(L.h.delivered||{})[c.c]){ const days=Math.round((dObj(c.date)-dObj(today()))/864e5); if(days>=0&&days<=7) A.push({k:'ok',t:days===0?'اليوم موعد استلامك للهكبة 🎉':`باقي ${fmt(days)} ${days===1?'يوم':'أيام'} على استلامك للهكبة`}); }
  }
  if(me&&me.status==='pending') A.push({k:'warn',t:'طلب انضمامك ينتظر موافقة المسؤول'});
  return A;
}
function badge(){
  let n=0; HS().list.forEach(hid=>{ n+=alertsFor(hid).filter(a=>a.k!=='ok').length; });
  const b=document.querySelector('.tabbar [data-go=hakba] .bdg'); if(b){ b.textContent=n?fmt(n):''; b.hidden=!n; }
}

/* ================= الواجهة ================= */
let view={page:'list',hid:null,seg:'board'};
function root(){ return $('hakbaRoot'); }
function open(){
  const r=root(); if(!r) return;
  backend().then(()=>{ HS().list.forEach(watch); render(); badge(); }).catch(e=>{
    r.innerHTML=e&&e.code==='noconfig'
      ?`<div class="card center"><h2>قسم الهكبة قيد التجهيز</h2><p class="muted m0">سيتوفر قريبًا في تحديث قادم.</p></div>`
      :`<div class="card center"><h2>الهكبة تحتاج إنترنت</h2><p class="muted m0">اتصل بالإنترنت ثم افتح القسم مرة أخرى. باقي أقسام التطبيق تعمل بدون إنترنت.</p><div class="row center"><button class="btn primary" type="button" id="hkRetry">إعادة المحاولة</button></div></div>`;
    const b=$('hkRetry'); if(b) b.onclick=open;
  });
  if(DB) render();
  else root().innerHTML='<div class="card center muted">جارٍ الاتصال…</div>';
}
function render(){
  if(!DB||!root()||root().closest('[hidden]')) return;
  if(view.page==='detail'&&view.hid) return renderDetail();
  renderList();
}
function hero(){ return `<section class="hero blue-hero"><span class="hero-lbl">الهكبة</span><h2 class="today-title">نظّم هكبتك مع جماعتك، وكل شيء موثّق أمام الجميع</h2><p class="today-body">من دفع، ومن تأخر، ومن دوره، ومتى يستلم. مجانية لكل الأعضاء.</p><div class="row"><button class="btn on-hero solid-bl" type="button" id="hkNew">+ أنشئ هكبة</button><button class="btn on-hero" type="button" id="hkJoinBtn">انضم برابط أو رمز</button></div></section>`; }
function renderList(){
  const H=HS(), cards=H.list.map(hid=>{ const L=watch(hid), h=L.h;
    if(h===undefined) return `<div class="card hk-card muted">جارٍ التحميل…</div>`;
    if(h===null) return `<div class="card hk-card"><b>هكبة غير موجودة</b><span class="small muted">ربما حذفها المسؤول.</span><button class="btn sm ghost" type="button" data-forget="${hid}">إزالة من القائمة</button></div>`;
    const P=h.order?plan(h):null, own=isOwner(L), me=myMember(L), al=alertsFor(hid);
    let line='';
    if(!P) line=`<span class="tag warn">قبل القرعة · ${fmt(L.members.filter(m=>m.status==='approved').length)} عضو</span>`;
    else if(P.ended) line='<span class="tag ok">انتهت</span>';
    else { const c=P.cycles[P.curCycle]; line=`<span class="small muted">الدورة ${fmt(c.c+1)} من ${fmt(P.n)} · يستلم ${esc(nameOf(L,c.uid))} في ${dShort(c.date)}</span>`; }
    return `<button class="card hk-card" type="button" data-open="${hid}"><div class="row" style="justify-content:space-between"><b>${esc(h.name)}</b><span class="tag ${own?'bl':'vi'}">${own?'مسؤول':me&&me.status==='pending'?'بانتظار الموافقة':'عضو'}</span></div><span class="num small">${fmt(h.amount)} ${esc(h.cur)} ${UNIT[h.unit][2]} · الاستلام ${fmt(h.amount*h.k*(P?P.n:h.slots))} ${esc(h.cur)} كل ${unitN(h.k,h.unit)}</span>${line}${al.length?`<span class="hk-alert ${al[0].k}">${al[0].t}${al.length>1?' · +'+fmt(al.length-1):''}</span>`:''}</button>`; }).join('');
  root().innerHTML=hero()+`<section class="card"><div class="card-h"><h2>هكباتي</h2><span class="small muted num">${fmt(H.list.length)}</span></div>${H.list.length?`<div class="hk-list">${cards}</div>`:`<div class="empty">لا توجد هكبات بعد. أنشئ هكبة وأرسل رابطها لجماعتك، أو انضم بالرابط الذي وصلك.</div>`}</section>`+tipCard()+`<div class="row center"><button class="btn sm ghost" type="button" id="hkClaim">مسؤول هكبة وغيّرت جوالك؟ استعد الإدارة</button></div>`;
  $('hkClaim').onclick=openClaim;
  $('hkNew').onclick=openCreate; $('hkJoinBtn').onclick=()=>openJoinAsk();
  root().querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ view={page:'detail',hid:b.dataset.open,seg:'board'}; render(); window.scrollTo({top:0}); });
  root().querySelectorAll('[data-forget]').forEach(b=>b.onclick=()=>{ forget(b.dataset.forget); render(); });
}
function tipCard(){
  const T=window.HAKBA_TIPS||[]; if(!T.length) return '';
  const t=T[Math.floor(Date.now()/864e5)%T.length];
  return `<section class="card hk-tip"><span class="tag bl">نصيحة الهكبة اليوم</span><h3 class="m0">${esc(t[0])}</h3><p class="m0">${esc(t[1])}</p><p class="small muted m0">في «خالص» دفتر ديون كامل، و١٢٠ نصيحة، ومسار تعلّم «من الهكبة إلى مشروع».</p><div class="row"><button class="btn sm" type="button" id="hkGoLearn">تعلّم كيف تحوّل هكبتك لمشروع</button></div></section>`;
}
document.addEventListener('click',e=>{ if(e.target&&e.target.id==='hkGoLearn') K.go('learn'); });

/* ---------- إنشاء ---------- */
function meFields(){ const me=HS().me; return `<label>اسمك كما يظهر للأعضاء<input id="hkMyName" value="${esc(me.name)}" placeholder="مثال: أبو محمد"></label><label>رقم واتساب (اختياري، مع رمز الدولة)<input id="hkMyPhone" dir="ltr" inputmode="tel" value="${esc(me.phone)}" placeholder="9677xxxxxxxx"></label>`; }
function readMe(){ const name=$('hkMyName').value.trim(), phone=$('hkMyPhone').value.replace(/[^\d]/g,''); if(!name) return null; HS().me={name,phone}; K.save(); return {name,phone}; }
function openCreate(){
  const cur=K.baseCur?K.baseCur():'YER';
  K.sheet('هكبة جديدة',`<div class="step">
    <label>اسم الهكبة<input id="hkName" placeholder="مثال: هكبة الحارة، هكبة العمل"></label>
    <div class="grid2"><label>مبلغ الدفعة الواحدة<input id="hkAmt" inputmode="decimal" placeholder="١٠٠٠"></label><label>العملة<select id="hkCur">${K.curOptions(cur)}</select></label></div>
    <div class="grid2"><label>كل عضو يدفع<select id="hkUnit"><option value="day">يوميًا</option><option value="week">أسبوعيًا</option><option value="month">شهريًا</option></select></label><label id="hkKLbl">الصرف لشخص كل كم يوم؟<input id="hkK" inputmode="numeric" value="١٠"></label></div>
    <div class="grid2"><label>عدد الأعضاء المتوقع<input id="hkSlots" inputmode="numeric" value="١٠"></label><label>تاريخ أول دفعة<input id="hkStart" type="date" value="${today()}"></label></div>
    <div class="hk-sum num" id="hkSum"></div>
    ${meFields()}
    <label class="check-line"><input type="checkbox" id="hkOwnerIn" checked> أنا أيضًا مشترك في الهكبة وأدفع مثل الأعضاء</label>
    <div class="row"><button class="btn primary bl" type="button" id="hkCreate">أنشئ الهكبة</button><span class="msg err" id="hkMsg"></span></div></div>`);
  const sum=()=>{ const a=toNum($('hkAmt').value), k=Math.max(1,toNum($('hkK').value)|0), n=Math.max(2,toNum($('hkSlots').value)|0), u=$('hkUnit').value, c=$('hkCur').selectedOptions[0].text;
    $('hkKLbl').firstChild.textContent=`الصرف لشخص كل كم ${UNIT[u][0]}؟`;
    $('hkSum').innerHTML=a>0?`كل عضو يدفع <b>${fmt(a)}</b> ${UNIT[u][2]}، فيستلم صاحب الدور <b>${fmt(a*k*n)} ${c}</b> كل ${unitN(k,u)}. المدة الكاملة ${unitN(k*n,u)} (${fmt(n)} دورات)، وكل عضو يدفع في المجموع ${fmt(a*k*n)}.`:'اكتب المبلغ لترى الحساب.'; };
  ['hkAmt','hkK','hkSlots','hkUnit','hkCur'].forEach(id=>$(id).addEventListener('input',sum)); $('hkUnit').addEventListener('change',sum); sum();
  $('hkCreate').onclick=async()=>{
    const m=$('hkMsg'), name=$('hkName').value.trim(), a=toNum($('hkAmt').value), k=toNum($('hkK').value)|0, n=toNum($('hkSlots').value)|0;
    if(!name) return m.textContent='اكتب اسم الهكبة.'; if(!(a>0)) return m.textContent='اكتب مبلغ الدفعة.'; if(!(k>=1)) return m.textContent='اكتب كل كم فترة يتم الصرف.'; if(!(n>=2)) return m.textContent='عدد الأعضاء لا يقل عن ٢.';
    const me=readMe(); if(!me) return m.textContent='اكتب اسمك.';
    $('hkCreate').disabled=true; m.className='msg'; m.textContent='جارٍ الإنشاء…';
    try{
      const h={name,amount:a,cur:$('hkCur').selectedOptions[0].text,unit:$('hkUnit').value,k,slots:n,start:$('hkStart').value||today(),ownerUid:DB.uid,ownerName:me.name,ownerPhone:me.phone,order:null,drawAt:null,delivered:{},createdAt:now()};
      const hid=await DB.addDoc('hakbas',h);
      const key=(Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,8)).toUpperCase();
      await DB.setDoc('hakbas/'+hid+'/private/key',{key});
      if($('hkOwnerIn').checked) await DB.setDoc('hakbas/'+hid+'/members/'+DB.uid,{name:me.name,phone:me.phone,status:'approved',joinedAt:now()});
      await log(hid,`${me.name} أنشأ الهكبة «${name}»`,'create');
      remember(hid); watch(hid);
      K.sheet('تم إنشاء الهكبة ✓',`<div class="step"><p class="m0">أرسل رابط الدعوة لجماعتك. كل من يفتحه يطلب الانضمام، وأنت توافق عليه.</p>${inviteBox(hid,h)}
        <div class="card warn-card"><b>احفظ رمز استعادة الإدارة</b><p class="small m0">إذا غيّرت جوالك أو مسحت بيانات المتصفح، هذا الرمز يرجّع لك صلاحية المسؤول. لا ترسله لأحد.</p><div class="code-box num" dir="ltr">${key}</div><div class="row"><button class="btn sm" type="button" id="hkCopyKey">نسخ الرمز</button></div></div>
        <div class="row"><button class="btn primary bl" type="button" id="hkGoNew">افتح الهكبة</button></div></div>`);
      bindInvite(hid,h); $('hkCopyKey').onclick=e=>K.copy(key,e.currentTarget);
      $('hkGoNew').onclick=()=>{ K.closeSheet(); view={page:'detail',hid,seg:'board'}; render(); };
      render();
    }catch(e){ $('hkCreate').disabled=false; m.className='msg err'; m.textContent='تعذر الإنشاء. تأكد من الإنترنت وحاول مرة أخرى.'; console.error(e); }
  };
}
const inviteLink=hid=>location.origin+location.pathname+'#join='+hid;
function inviteText(hid,h){ return `انضم لهكبة «${h.name}» في تطبيق خالص:\n${fmt(h.amount)} ${h.cur} ${UNIT[h.unit][2]}، والصرف كل ${unitN(h.k,h.unit)}.\nافتح الرابط واطلب الانضمام:\n${inviteLink(hid)}`; }
function inviteBox(hid){ return `<div class="code-box small" dir="ltr">${esc(inviteLink(hid))}</div><div class="row"><a class="btn wa" id="hkWa" target="_blank" rel="noopener">إرسال على واتساب</a><button class="btn sm" type="button" id="hkCopyLink">نسخ الرابط</button><span class="small muted">رمز الهكبة: <b class="num" dir="ltr">${esc(hid)}</b></span></div>`; }
function bindInvite(hid,h){ $('hkWa').href='https://wa.me/?text='+encodeURIComponent(inviteText(hid,h)); $('hkCopyLink').onclick=e=>K.copy(inviteText(hid,h),e.currentTarget); }

/* ---------- انضمام ---------- */
function openJoinAsk(){
  K.sheet('انضم لهكبة',`<div class="step"><label>الصق رابط الدعوة أو رمز الهكبة<input id="hkJoinIn" dir="ltr" placeholder="https://…#join=… أو الرمز"></label><div class="row"><button class="btn primary bl" type="button" id="hkJoinGo">التالي</button><span class="msg err" id="hkJMsg"></span></div></div>`);
  $('hkJoinGo').onclick=()=>{ const v=$('hkJoinIn').value.trim(), m=v.match(/join=([A-Za-z0-9_-]+)/), id=m?m[1]:v.replace(/[^A-Za-z0-9_-]/g,''); if(!id) return $('hkJMsg').textContent='الرابط أو الرمز غير صحيح.'; openJoin(id); };
}
async function openJoin(hid){
  try{ await backend(); }catch(e){ K.toast(e&&e.code==='noconfig'?'قسم الهكبة قيد التجهيز':'الانضمام يحتاج إنترنت'); return; }
  K.sheet('انضم لهكبة','<div class="muted">جارٍ التحميل…</div>');
  let h=null; try{ h=await DB.getDoc('hakbas/'+hid); }catch(e){}
  if(!h){ K.sheet('انضم لهكبة','<div class="empty">لم أجد هذه الهكبة. تأكد من الرابط، أو اطلب من المسؤول رابطًا جديدًا.</div>'); return; }
  const mine=await DB.getDoc('hakbas/'+hid+'/members/'+DB.uid).catch(()=>null);
  if(mine||h.ownerUid===DB.uid){ remember(hid); watch(hid); K.closeSheet(); view={page:'detail',hid,seg:'board'}; K.go('hakba'); return; }
  const P=h.order?plan(h):null;
  K.sheet('انضم لهكبة',`<div class="step"><div class="hk-join-card"><b>${esc(h.name)}</b><span class="num">${fmt(h.amount)} ${esc(h.cur)} ${UNIT[h.unit][2]} · الصرف كل ${unitN(h.k,h.unit)}</span><span class="small muted">المسؤول: ${esc(h.ownerName)} · تبدأ ${dShort(h.start)}</span></div>
    ${P?'<div class="empty">هذه الهكبة أُجريت قرعتها وبدأت، فلا يمكن الانضمام لها الآن.</div>':meFields()+'<div class="row"><button class="btn primary bl" type="button" id="hkReq">اطلب الانضمام</button><span class="msg err" id="hkRMsg"></span></div>'}</div>`);
  if(P) return;
  $('hkReq').onclick=async()=>{ const me=readMe(); if(!me) return $('hkRMsg').textContent='اكتب اسمك.'; $('hkReq').disabled=true;
    try{ await DB.setDoc('hakbas/'+hid+'/members/'+DB.uid,{name:me.name,phone:me.phone,status:'pending',joinedAt:now()}); await log(hid,`${me.name} طلب الانضمام`,'join');
      remember(hid); watch(hid); K.closeSheet(); view={page:'detail',hid,seg:'board'}; K.go('hakba'); K.toast('تم إرسال طلبك للمسؤول');
      if(h.ownerPhone) setTimeout(()=>K.sheet('أخبر المسؤول',`<p class="m0">أرسل للمسؤول رسالة ليوافق على طلبك بسرعة.</p><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${h.ownerPhone}?text=${encodeURIComponent('السلام عليكم، طلبت الانضمام لهكبة «'+h.name+'» في تطبيق خالص باسم '+me.name+'. أرجو الموافقة.')}">إرسال على واتساب</a>`),400);
    }catch(e){ $('hkReq').disabled=false; $('hkRMsg').textContent='تعذر الإرسال. تأكد من الإنترنت.'; }
  };
}

/* ---------- تفاصيل الهكبة ---------- */
function renderDetail(){
  const hid=view.hid, L=watch(hid), h=L.h;
  if(h===undefined){ root().innerHTML='<div class="card center muted">جارٍ التحميل…</div>'; return; }
  if(h===null){ root().innerHTML=`<div class="card center"><b>الهكبة غير موجودة</b><div class="row center"><button class="btn" type="button" id="hkBack">رجوع</button></div></div>`; $('hkBack').onclick=back; return; }
  const own=isOwner(L), me=myMember(L), P=h.order?plan(h):null, al=alertsFor(hid);
  HS().seen[hid]=now(); K.save();
  const approved=L.members.filter(m=>m.status==='approved');
  const segs=[['board','اللوحة'],['pay','الدفعات'],['mem','الأعضاء'],['log','السجل']].concat(own?[['set','الإدارة']]:[]);
  if(!segs.find(s=>s[0]===view.seg)) view.seg='board';
  let status=!P?'قبل القرعة':P.ended?'انتهت':`الدورة ${fmt(P.curCycle+1)} من ${fmt(P.n)}`;
  root().innerHTML=`<div class="row"><button class="btn sm ghost" type="button" id="hkBack">→ هكباتي</button></div>
  <section class="hero blue-hero"><div class="row" style="justify-content:space-between"><span class="hero-lbl">${own?'أنت المسؤول':'المسؤول: '+esc(h.ownerName)}</span><span class="tag light">${status}</span></div>
    <h2 class="today-title">${esc(h.name)}</h2>
    <div class="hk-stats num"><div><b>${fmt(h.amount)}</b><span>${esc(h.cur)} ${UNIT[h.unit][2]}</span></div><div><b>${fmt(h.amount*h.k*(P?P.n:h.slots))}</b><span>يستلمها صاحب الدور</span></div><div><b>${unitN(h.k,h.unit)}</b><span>كل دورة</span></div></div>
    ${P&&!P.ended?(()=>{const c=P.cycles[P.curCycle];return `<div class="hk-next"><span>الاستلام القادم</span><b>${esc(nameOf(L,c.uid))}${c.uid===DB.uid?' (أنت)':''} · ${dLong(c.date)}</b></div>`;})():''}
  </section>
  ${al.length?`<div class="hk-alerts">${al.map(a=>`<button class="hk-alert ${a.k}" type="button" ${a.go?`data-seg="${a.go}"`:''}>${a.t}</button>`).join('')}</div>`:''}
  <section class="card"><div class="seg" role="tablist">${segs.map(([k,v])=>`<button role="tab" type="button" data-seg="${k}" aria-selected="${k===view.seg}">${v}${k==='pay'&&own&&L.payments.some(p=>p.status==='pending')?' •':''}${k==='mem'&&own&&L.members.some(m=>m.status==='pending')?' •':''}</button>`).join('')}</div><div class="panel" id="hkPanel"></div></section>`;
  $('hkBack').onclick=back;
  root().querySelectorAll('[data-seg]').forEach(b=>b.onclick=()=>{ view.seg=b.dataset.seg; render(); });
  const pn=$('hkPanel');
  ({board:segBoard,pay:segPay,mem:segMem,log:segLog,set:segSet})[view.seg](pn,L,hid,P,own,me);
}
function back(){ view={page:'list',hid:null,seg:'board'}; render(); }

function segBoard(pn,L,hid,P,own,me){
  const h=L.h, approved=L.members.filter(m=>m.status==='approved');
  if(!P){
    pn.innerHTML=`<div class="hk-wait"><b>الهكبة تجمع أعضاءها الآن</b><span class="muted small">${fmt(approved.length)} عضو مؤكد من ${fmt(h.slots)} متوقع. بعد اكتمال الأعضاء يجري المسؤول القرعة، ويظهر ترتيب الاستلام للجميع.</span></div>
      <div class="hk-members">${approved.map(m=>`<span class="hk-chip">${esc(m.name)}${m.id===h.ownerUid?' ★':''}</span>`).join('')||'<span class="muted small">لا أعضاء بعد</span>'}</div>
      ${own?`<div class="card hk-inv"><h3 class="m0">ادعُ الأعضاء</h3>${inviteBox(hid)}</div><div class="row"><button class="btn primary bl lg" type="button" id="hkDraw" ${approved.length<2?'disabled':''}>🎲 ابدأ القرعة (${fmt(approved.length)} عضو)</button></div><p class="small muted m0">القرعة تُجرى مرة واحدة فقط، ونتيجتها تُحفظ ولا تتغير. تأكد من اكتمال الأعضاء قبلها.</p>`
        :me&&me.status==='pending'?'<div class="empty">طلبك ينتظر موافقة المسؤول.</div>':''}`;
    if(own){ bindInvite(hid,h); const d=$('hkDraw'); if(d) d.onclick=()=>drawConfirm(L,hid,approved); }
    return;
  }
  const t=today(), cur=P.cycles[P.curCycle];
  // حالتي
  let mine='';
  if(me&&me.status==='approved'){
    const st=memberState(P,L.payments,DB.uid), myC=P.cycles.find(c=>c.uid===DB.uid);
    mine=`<div class="hk-me"><div><span class="small muted">دفعاتي المؤكدة</span><b class="num">${fmt(st.paidCount)} / ${fmt(P.total)}</b></div><div><span class="small muted">${st.overdue?'متأخر علي':'المستحق القادم'}</span><b class="num ${st.overdue?'bad-t':''}">${st.overdue?fmt(st.overdue*h.amount)+' '+esc(h.cur):st.next!==null?dShort(P.due(st.next)):'—'}</b></div><div><span class="small muted">موعد استلامي</span><b class="num">${myC?dShort(myC.date):'—'}</b></div></div>
      ${st.next!==null?`<div class="row"><button class="btn primary bl" type="button" id="hkPayNow">دفعت مبلغ الفترة</button></div>`:'<div class="tag ok">أكملت كل دفعاتك ✓</div>'}`;
  }
  // شبكة الدورة الحالية
  const grid=approved.map(m=>{ const {ok,pend}=coverage(L.payments,m.id); const cells=[]; for(let i=cur.from;i<=cur.to;i++){ const cls=ok.has(i)?'ok':pend.has(i)?'pend':i<P.curIdx?'late':'up'; cells.push(`<i class="${cls}" title="${dShort(P.due(i))}"></i>`); }
    return `<div class="hk-row"><span class="hk-nm">${esc(m.name)}${m.id===DB.uid?' (أنت)':''}</span><span class="hk-cells">${cells.join('')}</span></div>`; }).join('');
  const order=P.cycles.map(c=>{ const done=!!(h.delivered||{})[c.c], isCur=c.c===P.curCycle&&!P.ended;
    return `<li class="${done?'done':isCur?'cur':''}"><span class="hk-n num">${fmt(c.c+1)}</span><span class="hk-on">${esc(nameOf(L,c.uid))}${c.uid===DB.uid?' (أنت)':''}</span><span class="num small">${dShort(c.date)}</span><span class="num small">${fmt(c.amount)}</span><span class="small">${done?'✓ استلم':isCur?'الحالية':''}</span></li>`; }).join('');
  pn.innerHTML=mine+`<div><h3>دفعات الدورة الحالية</h3><p class="small muted m0">من ${dShort(P.due(cur.from))} إلى ${dShort(cur.date)} · يستلم ${esc(nameOf(L,cur.uid))}</p><div class="hk-grid">${grid}</div>
    <div class="legend"><span><i class="dot" style="background:var(--em)"></i>مؤكدة</span><span><i class="dot" style="background:var(--gold)"></i>تنتظر التأكيد</span><span><i class="dot" style="background:var(--coral)"></i>متأخرة</span><span><i class="dot" style="background:var(--line)"></i>قادمة</span></div></div>
    <div><h3>ترتيب الاستلام (نتيجة القرعة)</h3><p class="small muted m0">أُجريت القرعة ${h.drawAt?dShort(h.drawAt.slice(0,10)):''} ولا يمكن تغييرها.</p><ol class="hk-order">${order}</ol></div>`;
  const pb=$('hkPayNow'); if(pb) pb.onclick=()=>openPay(L,hid,P);
  if(!HS().seen['draw:'+hid]&&h.order){ HS().seen['draw:'+hid]=1; K.save(); if(!own) showDraw(h.order.map(u=>nameOf(L,u)),null); }
}
function drawConfirm(L,hid,approved){
  K.sheet('ابدأ القرعة',`<div class="step"><p class="m0">ستُجرى القرعة بين <b>${fmt(approved.length)}</b> عضو، ويتحدد ترتيب الاستلام للجميع. <b>لا يمكن إعادتها أو تغييرها بعد ذلك.</b></p><div class="hk-members">${approved.map(m=>`<span class="hk-chip">${esc(m.name)}</span>`).join('')}</div><div class="row"><button class="btn primary bl" type="button" id="hkDrawGo">نعم، ابدأ القرعة</button><button class="btn" type="button" id="hkDrawNo">ليس الآن</button></div></div>`);
  $('hkDrawNo').onclick=K.closeSheet;
  $('hkDrawGo').onclick=async()=>{
    $('hkDrawGo').disabled=true;
    const ids=approved.map(m=>m.id), a=new Uint32Array(ids.length); crypto.getRandomValues(a);
    for(let i=ids.length-1;i>0;i--){ const j=a[i]%(i+1); [ids[i],ids[j]]=[ids[j],ids[i]]; }
    try{ await DB.updateDoc('hakbas/'+hid,{order:ids,slots:ids.length,drawAt:now()});
      await log(hid,`تمت القرعة: ${ids.map((u,i)=>fmt(i+1)+'. '+nameOf(L,u)).join('، ')}`,'draw');
      HS().seen['draw:'+hid]=1; K.save(); showDraw(ids.map(u=>nameOf(L,u)),hid);
    }catch(e){ $('hkDrawGo').disabled=false; K.toast('تعذرت القرعة. تأكد من الإنترنت.'); }
  };
}
function showDraw(names,hid){
  K.sheet('نتيجة القرعة 🎲',`<div class="hk-draw" id="hkDrawBox"></div><div class="row center"><button class="btn primary bl" type="button" id="hkDrawOk" hidden>تم</button></div>`);
  const box=$('hkDrawBox'); let i=0;
  const step=()=>{ if(i>=names.length){ $('hkDrawOk').hidden=false; return; } let n=0; const el=document.createElement('div'); el.className='hk-draw-row'; el.innerHTML=`<span class="hk-n num">${fmt(i+1)}</span><b></b>`; box.appendChild(el); const b=el.querySelector('b');
    const spin=setInterval(()=>{ b.textContent=names[Math.floor(Math.random()*names.length)]; if(++n>8){ clearInterval(spin); b.textContent=names[i]; el.classList.add('done'); i++; setTimeout(step,250); } },70); };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ names.forEach((nm,k)=>{ box.insertAdjacentHTML('beforeend',`<div class="hk-draw-row done"><span class="hk-n num">${fmt(k+1)}</span><b>${esc(nm)}</b></div>`); }); $('hkDrawOk').hidden=false; } else step();
  $('hkDrawOk').onclick=K.closeSheet;
}

/* ---------- الدفع ---------- */
function openPay(L,hid,P,forUid){
  const h=L.h, uid=forUid||DB.uid, st=memberState(P,L.payments,uid); if(st.next===null) return K.toast('كل الدفعات مسددة');
  const left=P.total-st.next, byOwner=!!forUid||isOwner(L); // المسؤول يسجّل دفعته مؤكدة مباشرة
  K.sheet(forUid?'تسجيل دفعة لـ '+nameOf(L,uid):'دفعت مبلغ الفترة',`<div class="step">
    <p class="m0">${st.overdue?`<b class="bad-t">${byOwner?'عليه':'عليك'} ${fmt(st.overdue)} ${st.overdue===1?'دفعة متأخرة':'دفعات متأخرة'}.</b> `:''}أول دفعة غير مسددة موعدها ${dShort(P.due(st.next))}.</p>
    <label>كم دفعة ${byOwner?'استلمت منه':'دفعت'}؟<input id="hkCnt" inputmode="numeric" value="${fmt(Math.max(1,Math.min(left,st.overdue||1)))}"></label>
    <div class="hk-sum num" id="hkPaySum"></div>
    <label>ملاحظة (اختياري): رقم الحوالة، أو «سلّمتها باليد»<input id="hkNote"></label>
    <div class="row"><button class="btn primary bl" type="button" id="hkPaySend">${byOwner?'تسجيل وتأكيد':'إرسال للمسؤول'}</button><span class="msg err" id="hkPMsg"></span></div></div>`);
  const cnt=()=>Math.max(1,Math.min(left,toNum($('hkCnt').value)|0));
  const upd=()=>{ const c=cnt(); $('hkPaySum').innerHTML=`المبلغ: <b>${fmt(c*h.amount)} ${esc(h.cur)}</b> · يغطي من ${dShort(P.due(st.next))} إلى ${dShort(P.due(st.next+c-1))}`; };
  $('hkCnt').addEventListener('input',upd); upd();
  $('hkPaySend').onclick=async()=>{ const c=cnt(); $('hkPaySend').disabled=true;
    const p={uid,from:st.next,count:c,amount:c*h.amount,note:$('hkNote').value.trim(),status:byOwner?'confirmed':'pending',by:DB.uid,at:now()};
    if(byOwner) p.decidedAt=now();
    try{ await DB.addDoc('hakbas/'+hid+'/payments',p);
      await log(hid,byOwner?`سجّل المسؤول دفعة ${fmt(p.amount)} من ${nameOf(L,uid)}`:`${nameOf(L,uid)} أبلغ أنه دفع ${fmt(p.amount)} (${fmt(c)} ${c===1?'دفعة':'دفعات'})`,'pay');
      if(byOwner){ K.closeSheet(); K.toast('تم تسجيل الدفعة'); return; }
      K.sheet('تم الإرسال ✓',`<p class="m0">دفعتك الآن <b>تنتظر تأكيد المسؤول</b>، وستراها مؤكدة هنا حين يوافق.</p>${h.ownerPhone?`<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${h.ownerPhone}?text=${encodeURIComponent(`السلام عليكم، دفعت ${fmt(p.amount)} ${h.cur} لهكبة «${h.name}»${p.note?' ('+p.note+')':''}. أرجو التأكيد في تطبيق خالص.`)}">أخبر المسؤول على واتساب</a>`:''}`);
    }catch(e){ $('hkPaySend').disabled=false; $('hkPMsg').textContent='تعذر الإرسال. تأكد من الإنترنت.'; }
  };
}
function segPay(pn,L,hid,P,own){
  const h=L.h, list=own?L.payments:L.payments.filter(p=>p.uid===DB.uid);
  const pend=list.filter(p=>p.status==='pending'), rest=list.filter(p=>p.status!=='pending');
  const row=p=>`<div class="hk-pay ${p.status}"><div class="hk-pay-t"><b>${esc(nameOf(L,p.uid))}${p.uid===DB.uid?' (أنت)':''}</b><span class="num">${fmt(p.amount)} ${esc(h.cur)}</span></div>
    <span class="small muted num">${P?`يغطي ${dShort(P.due(p.from))}${p.count>1?' ← '+dShort(P.due(p.from+p.count-1)):''} · `:''}أُرسلت ${new Date(p.at).toLocaleString(K.loc(),{day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit'})}</span>
    ${p.note?`<span class="small">ملاحظة: ${esc(p.note)}</span>`:''}
    <span class="tag ${p.status==='confirmed'?'ok':p.status==='rejected'?'bad':'warn'}">${p.status==='confirmed'?'مؤكدة ✓':p.status==='rejected'?'مرفوضة'+(p.reason?': '+esc(p.reason):''):'تنتظر التأكيد'}</span>
    ${own&&p.status==='pending'?`<div class="row"><button class="btn sm primary" type="button" data-ok="${p.id}">تأكيد الاستلام</button><button class="btn sm danger" type="button" data-no="${p.id}">رفض</button></div>`:''}
    ${!own&&p.status==='pending'&&p.uid===DB.uid?`<div class="row"><button class="btn sm ghost" type="button" data-cancel="${p.id}">إلغاء</button></div>`:''}</div>`;
  pn.innerHTML=(P&&own?`<div class="row"><button class="btn sm" type="button" id="hkCash">+ تسجيل دفعة استلمتها يدويًا</button></div>`:'')
    +(pend.length?`<div><h3>تنتظر ${own?'تأكيدك':'التأكيد'}</h3><div class="hk-pays">${pend.map(row).join('')}</div></div>`:'')
    +`<div><h3>${own?'كل الدفعات':'دفعاتي'}</h3>${rest.length?`<div class="hk-pays">${rest.map(row).join('')}</div>`:'<div class="empty">لا دفعات بعد.</div>'}</div>`;
  const c=$('hkCash'); if(c) c.onclick=()=>{ const ap=L.members.filter(m=>m.status==='approved');
    K.sheet('لمن الدفعة؟',`<div class="profiles">${ap.map(m=>`<button class="prof" type="button" data-for="${m.id}" style="font:inherit;color:inherit;cursor:pointer;text-align:right"><span class="p-txt"><b>${esc(m.name)}</b><span class="num">${fmt(memberState(P,L.payments,m.id).paidCount)} / ${fmt(P.total)} مؤكدة</span></span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-for]').forEach(b=>b.onclick=()=>openPay(L,hid,P,b.dataset.for)); };
  pn.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{ b.disabled=true; const p=L.payments.find(x=>x.id===b.dataset.ok);
    try{ await DB.updateDoc('hakbas/'+hid+'/payments/'+p.id,{status:'confirmed',decidedAt:now()}); await log(hid,`أكّد المسؤول دفعة ${nameOf(L,p.uid)} (${fmt(p.amount)})`,'confirm'); K.toast('تم التأكيد'); }catch(e){ b.disabled=false; K.toast('تعذر التأكيد'); } });
  pn.querySelectorAll('[data-no]').forEach(b=>b.onclick=()=>{ const p=L.payments.find(x=>x.id===b.dataset.no);
    K.sheet('رفض الدفعة',`<div class="step"><p class="m0">دفعة ${esc(nameOf(L,p.uid))} بمبلغ ${fmt(p.amount)}.</p><label>سبب الرفض (يراه العضو)<input id="hkWhy" placeholder="مثال: المبلغ لم يصلني، أو ناقص"></label><div class="row"><button class="btn danger" type="button" id="hkRej">رفض الدفعة</button></div></div>`);
    $('hkRej').onclick=async()=>{ const why=$('hkWhy').value.trim(); try{ await DB.updateDoc('hakbas/'+hid+'/payments/'+p.id,{status:'rejected',reason:why,decidedAt:now()}); await log(hid,`رفض المسؤول دفعة ${nameOf(L,p.uid)} (${fmt(p.amount)})${why?': '+why:''}`,'reject'); K.closeSheet(); K.toast('تم الرفض'); }catch(e){ K.toast('تعذر الرفض'); } }; });
  pn.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{ try{ await DB.deleteDoc('hakbas/'+hid+'/payments/'+b.dataset.cancel); await log(hid,`${nameOf(L,DB.uid)} ألغى دفعة لم تُؤكد`,'cancel'); }catch(e){ K.toast('تعذر الإلغاء'); } });
}
function segMem(pn,L,hid,P,own){
  const h=L.h, pend=L.members.filter(m=>m.status==='pending'), ap=L.members.filter(m=>m.status==='approved');
  const remind=m=>m.phone?`https://wa.me/${m.phone}?text=${encodeURIComponent(`السلام عليكم ${m.name}، تذكير بدفعة هكبة «${h.name}»: ${fmt(h.amount)} ${h.cur} ${UNIT[h.unit][2]}. يمكنك الإبلاغ عن الدفع من تطبيق خالص.`)}`:'';
  pn.innerHTML=(own&&pend.length?`<div><h3>طلبات انضمام</h3><div class="hk-pays">${pend.map(m=>`<div class="hk-pay pending"><div class="hk-pay-t"><b>${esc(m.name)}</b>${m.phone?`<span class="small num" dir="ltr">${esc(m.phone)}</span>`:''}</div><div class="row"><button class="btn sm primary" type="button" data-acc="${m.id}" ${P?'disabled':''}>قبول</button><button class="btn sm danger" type="button" data-rm="${m.id}">رفض</button></div></div>`).join('')}</div></div>`:'')
    +`<div><h3>الأعضاء (${fmt(ap.length)})</h3><div class="hk-pays">${ap.map(m=>{ const st=P?memberState(P,L.payments,m.id):null;
      return `<div class="hk-pay"><div class="hk-pay-t"><b>${esc(m.name)}${m.id===h.ownerUid?' ★ المسؤول':''}${m.id===DB.uid?' (أنت)':''}</b>${st?`<span class="tag ${st.overdue?'bad':'ok'}">${st.overdue?'متأخر '+fmt(st.overdue):'منتظم'}</span>`:''}</div>
      ${st?`<span class="small muted num">دفع ${fmt(st.paidCount)} من ${fmt(P.total)}${st.pend.size?' · '+fmt(st.pend.size)+' تنتظر التأكيد':''}</span>`:''}
      ${own&&m.id!==DB.uid?`<div class="row">${remind(m)?`<a class="btn sm wa" target="_blank" rel="noopener" href="${remind(m)}">تذكير واتساب</a>`:''}${!P?`<button class="btn sm danger" type="button" data-rm="${m.id}">إزالة</button>`:''}</div>`:''}</div>`; }).join('')||'<div class="empty">لا أعضاء بعد.</div>'}</div></div>`
    +(!own&&!P&&myMember(L)?`<div class="row"><button class="btn sm danger" type="button" id="hkLeave">الخروج من الهكبة</button></div>`:'');
  pn.querySelectorAll('[data-acc]').forEach(b=>b.onclick=async()=>{ const m=L.members.find(x=>x.id===b.dataset.acc); try{ await DB.updateDoc('hakbas/'+hid+'/members/'+m.id,{status:'approved'}); await log(hid,`قبل المسؤول ${m.name} في الهكبة`,'accept'); }catch(e){ K.toast('تعذر القبول'); } });
  pn.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{ const m=L.members.find(x=>x.id===b.dataset.rm); try{ await DB.deleteDoc('hakbas/'+hid+'/members/'+m.id); await log(hid,`أزال المسؤول ${m.name}`,'remove'); }catch(e){ K.toast('تعذرت الإزالة'); } });
  const lv=$('hkLeave'); if(lv) lv.onclick=async()=>{ try{ await log(hid,`${nameOf(L,DB.uid)} خرج من الهكبة`,'leave'); await DB.deleteDoc('hakbas/'+hid+'/members/'+DB.uid); forget(hid); back(); }catch(e){ K.toast('تعذر الخروج'); } };
}
function segLog(pn,L){
  pn.innerHTML=L.events.length?`<ul class="hk-log">${L.events.map(e=>`<li class="${e.type}"><span>${esc(e.text)}</span><span class="small muted num">${new Date(e.at).toLocaleString(K.loc(),{weekday:'short',day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit'})}</span></li>`).join('')}</ul><p class="small muted m0">السجل يراه كل الأعضاء ولا يمكن حذف أي سطر منه.</p>`:'<div class="empty">لا أحداث بعد.</div>';
}
function segSet(pn,L,hid,P){
  const h=L.h;
  pn.innerHTML=`<div class="card hk-inv"><h3 class="m0">رابط الدعوة</h3>${inviteBox(hid)}</div>
    ${P?`<div><h3>تسليم الهكبة</h3><p class="small muted m0">بعد أن تسلّم المبلغ لصاحب الدور، علّمه هنا ليظهر للجميع.</p><div class="hk-pays">${P.cycles.map(c=>{ const d=(h.delivered||{})[c.c]; return `<div class="hk-pay ${d?'confirmed':''}"><div class="hk-pay-t"><b>${fmt(c.c+1)}. ${esc(nameOf(L,c.uid))}</b><span class="num small">${dShort(c.date)} · ${fmt(c.amount)}</span></div>${d?`<span class="tag ok">سُلّمت ${dShort(d.slice(0,10))}</span>`:`<div class="row"><button class="btn sm" type="button" data-dl="${c.c}">تم التسليم</button></div>`}</div>`; }).join('')}</div></div>`:''}
    <div class="card warn-card"><h3 class="m0">رمز استعادة الإدارة</h3><p class="small m0">احتفظ به في مكان آمن. يرجّع لك صلاحية المسؤول من أي جوال.</p><div class="row"><button class="btn sm" type="button" id="hkShowKey">إظهار الرمز</button></div><div id="hkKeyBox"></div></div>
    ${!P?`<div class="row"><button class="btn sm danger" type="button" id="hkDel">حذف الهكبة</button></div><div id="hkDelC"></div>`:''}`;
  bindInvite(hid,h);
  pn.querySelectorAll('[data-dl]').forEach(b=>b.onclick=async()=>{ const c=+b.dataset.dl, d=Object.assign({},h.delivered||{}); d[c]=now();
    try{ await DB.updateDoc('hakbas/'+hid,{delivered:d}); await log(hid,`سلّم المسؤول الهكبة لـ ${nameOf(L,P.cycles[c].uid)} (${fmt(P.cycles[c].amount)})`,'deliver'); }catch(e){ K.toast('تعذر الحفظ'); } });
  $('hkShowKey').onclick=async()=>{ try{ const k=await DB.getDoc('hakbas/'+hid+'/private/key'); $('hkKeyBox').innerHTML=`<div class="code-box num" dir="ltr">${esc(k&&k.key||'—')}</div>`; }catch(e){ K.toast('تعذر جلب الرمز'); } };
  const del=$('hkDel'); if(del) del.onclick=()=>{ $('hkDelC').innerHTML=`<div class="confirm">تحذف الهكبة لكل الأعضاء؟ <button class="btn sm danger" type="button" id="hkDelY">نعم، احذف</button><button class="btn sm" type="button" id="hkDelN">تراجع</button></div>`;
    $('hkDelN').onclick=()=>$('hkDelC').innerHTML=''; $('hkDelY').onclick=async()=>{ try{ await DB.deleteDoc('hakbas/'+hid); forget(hid); back(); K.toast('تم حذف الهكبة'); }catch(e){ K.toast('تعذر الحذف'); } }; };
}

/* ---------- استعادة الإدارة ---------- */
async function claimOwner(hid,key){
  await backend();
  await DB.setDoc('hakbas/'+hid+'/claims/'+DB.uid,{key:key.trim().toUpperCase(),at:now()});
  const me=HS().me;
  await DB.updateDoc('hakbas/'+hid,{ownerUid:DB.uid,ownerName:me.name||'المسؤول'});
  await log(hid,`استعاد المسؤول صلاحية الإدارة من جهاز جديد`,'claim');
  remember(hid); watch(hid);
}
function openClaim(){
  K.sheet('استعادة إدارة هكبة',`<div class="step"><p class="small muted m0">إذا كنت مسؤول هكبة وغيّرت جوالك، أدخل رمز الهكبة ورمز الاستعادة الذي حفظته عند إنشائها.</p><label>رمز الهكبة أو رابطها<input id="hkCId" dir="ltr"></label><label>رمز الاستعادة<input id="hkCKey" dir="ltr" class="code-in"></label>${meFields()}<div class="row"><button class="btn primary bl" type="button" id="hkCGo">استعادة</button><span class="msg err" id="hkCMsg"></span></div></div>`);
  $('hkCGo').onclick=async()=>{ const v=$('hkCId').value.trim(), m=v.match(/join=([A-Za-z0-9_-]+)/), hid=m?m[1]:v; if(!readMe()) return $('hkCMsg').textContent='اكتب اسمك.';
    try{ await claimOwner(hid,$('hkCKey').value); K.closeSheet(); view={page:'detail',hid,seg:'board'}; render(); K.toast('رجعت لك صلاحية المسؤول'); }catch(e){ $('hkCMsg').textContent='الرمز غير صحيح أو لا يوجد إنترنت.'; } };
}

/* ================= الربط مع التطبيق ================= */
function checkHash(){ const m=location.hash.match(/join=([A-Za-z0-9_-]+)/); if(m){ const id=m[1]; history.replaceState(null,'',location.pathname+location.search); K.go('hakba'); setTimeout(()=>openJoin(id),50); return true; } return false; }
window.addEventListener('hashchange',checkHash);
window.Hakba={open,render,badge,checkHash,openClaim,plan,memberState,addUnit,
  warm(){ if(HS().list.length&&(window.KHALES_FB||MOCK)&&navigator.onLine) backend().then(()=>{ HS().list.forEach(watch); badge(); }).catch(()=>{}); }};
})();
