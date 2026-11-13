(function(){
'use strict';
/* =====================================================================
   إعدادات صاحب المشروع
   ===================================================================== */
const CONFIG = {
  TRIAL_DAYS: 3,      // أيام التجربة المجانية قبل طلب رمز التفعيل (0 = يطلب الرمز من أول مرة)
  BUY_URL: '',        // رابط صفحة الشراء (يظهر زر «اشترِ رمز التفعيل» إذا وُضع)
  BUY_HINT: 'للحصول على رمز التفعيل تواصل مع صاحب التطبيق.',
  SECRET: 'khales::2026::sadad-bi-hikma'  // لا تغيّره بعد بيع أول رمز، وإلا تتوقف الرموز القديمة
};
const VERSION='1.0';

/* ================= أدوات عامة ================= */
const $=id=>document.getElementById(id);
const AR='٠١٢٣٤٥٦٧٨٩', FA='۰۱۲۳۴۵۶۷۸۹';
const KEY='khales_v1';
let LOC='ar-EG';
function toNum(s){ if(s==null) return NaN; s=String(s).replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/[۰-۹]/g,d=>FA.indexOf(d)).replace(/[,،٬\s]/g,'').replace('٫','.'); return s===''?NaN:parseFloat(s); }
function fmt(n){ if(!isFinite(n)) return '—'; const a=Math.abs(n); return new Intl.NumberFormat(LOC,{maximumFractionDigits:a<100?2:0}).format(a<100?n:Math.round(n)); }
const pctf=n=>isFinite(n)?new Intl.NumberFormat(LOC,{maximumFractionDigits:1}).format(n)+'٪':'—';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iso(d){const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
const dateObj=s=>new Date(s+'T12:00:00');
const dFull=s=>dateObj(s).toLocaleDateString(LOC,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const dShort=s=>dateObj(s).toLocaleDateString(LOC,{weekday:'short',day:'numeric',month:'numeric'});
const todayIso=()=>iso(new Date());
function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return iso(d);}
const uid=()=>Math.random().toString(36).slice(2,10);
function niceStep(v){ if(!(v>0)) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<1.5?1:n<3.5?2:n<7.5?5:10)*p; }
function niceMax(v){ if(!(v>0)) return 10; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<=2?2:n<=5?5:10)*p; }
function dayIndex(){const d=new Date();return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);}

const CUR={YER:'ريال يمني',SAR:'ريال سعودي',USD:'دولار أمريكي',EUR:'يورو',AED:'درهم إماراتي',KWD:'دينار كويتي',QAR:'ريال قطري',OMR:'ريال عماني',BHD:'دينار بحريني',EGP:'جنيه مصري',JOD:'دينار أردني',IQD:'دينار عراقي',SDG:'جنيه سوداني',SYP:'ليرة سورية',LBP:'ليرة لبنانية',LYD:'دينار ليبي',TND:'دينار تونسي',DZD:'دينار جزائري',MAD:'درهم مغربي',MRU:'أوقية موريتانية',TRY:'ليرة تركية',GBP:'جنيه إسترليني'};
const curName=c=>CUR[c]||c;
// قيمة تقريبية لعدد الوحدات مقابل الدولار — فقط لمعرفة أي عملة أقوى، فيُسأل دائمًا: ١ من العملة الأقوى = كم من الأضعف
const PER_USD={USD:1,EUR:0.92,GBP:0.78,KWD:0.31,BHD:0.376,OMR:0.385,JOD:0.71,SAR:3.75,AED:3.67,QAR:3.64,TND:3.1,LYD:5.5,MAD:9.9,TRY:34,MRU:40,EGP:48,DZD:132,SDG:600,IQD:1310,YER:1550,SYP:13000,LBP:89500};
function rateQ(c,base){ const inv=(PER_USD[c]||1)>(PER_USD[base]||1); return {inv,txt:inv?`١ ${curName(base)} = كم ${curName(c)}؟`:`١ ${curName(c)} = كم ${curName(base)}؟`}; }
const rateIn=(c,base,v)=>rateQ(c,base).inv?(v>0?1/v:NaN):v;
const rateOut=(c,base,r)=>rateQ(c,base).inv?(r>0?1/r:NaN):r;
const REG={SA:'SAR',YE:'YER',EG:'EGP',AE:'AED',KW:'KWD',QA:'QAR',OM:'OMR',BH:'BHD',JO:'JOD',IQ:'IQD',SD:'SDG',SY:'SYP',LB:'LBP',LY:'LYD',TN:'TND',DZ:'DZD',MA:'MAD',MR:'MRU',TR:'TRY'};
function guessCur(){ try{ for(const l of (navigator.languages||[navigator.language])){ const m=String(l).match(/[-_]([A-Z]{2})\b/i); if(m&&REG[m[1].toUpperCase()]) return REG[m[1].toUpperCase()]; } }catch(e){} return 'USD'; }
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const COLORS=['#0A7A5A','#5A4FC8','#B87A12','#C9472F','#1F7FB8','#8A4FA8','#3E7D2A','#A64B6E'];

/* ================= رمز التفعيل ================= */
const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function cyrb53(str,seed){ let h1=0xdeadbeef^(seed||0),h2=0x41c6ce57^(seed||0); for(let i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);} h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909); return 4294967296*(2097151&h2)+(h1>>>0); }
function normCode(s){ return String(s||'').toUpperCase().replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/[\s\-_]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1'); }
function codeCheck(payload){ let n=cyrb53(CONFIG.SECRET+'|'+payload)%1048576, s=''; for(let i=0;i<4;i++){ s=B32[n%32]+s; n=Math.floor(n/32);} return s; }
function validCode(raw){ const c=normCode(raw); if(c.length!==12) return false; for(const ch of c) if(!B32.includes(ch)) return false; return codeCheck(c.slice(0,8))===c.slice(8); }
const prettyCode=c=>{c=normCode(c);return c.slice(0,4)+'-'+c.slice(4,8)+'-'+c.slice(8);};

/* ================= التخزين ================= */
let ST=null;   // كل شيء
let P=null;    // الحساب الحالي
let S=null;    // بيانات الحساب الحالي
function loadStore(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(ST)); return true; }catch(e){ toast('تعذر الحفظ في ذاكرة الجوال. تأكد أن المساحة غير ممتلئة.'); return false; } }
function newStore(){ return {v:1,firstOpen:new Date().toISOString(),activeId:null,profiles:[],settings:{digits:'ar'},act:null,ui:{}}; }
function normData(d){
  d=d||{}; d.profile=Object.assign({base:'YER',div:1,min:0},d.profile||{});
  d.rates=d.rates||{}; d.creditors=Array.isArray(d.creditors)?d.creditors:[];
  d.creditors.forEach(c=>{c.id=c.id||uid();c.pre=+c.pre||0;c.debts=Array.isArray(c.debts)?c.debts:[];c.debts.forEach(x=>{x.id=x.id||uid();x.amount=+x.amount||0;x.cur=x.cur||d.profile.base;});});
  d.entries=d.entries||{}; d.checks=d.checks||{};
  d.learn=Object.assign({done:{},xp:0,ans:{}},d.learn||{});
  d.tips=Object.assign({fav:[],applied:{}},d.tips||{}); d.days=d.days||{};
  return d;
}
function normStore(s){
  s=Object.assign(newStore(),s||{}); s.settings=Object.assign({digits:'ar'},s.settings||{}); s.ui=s.ui||{};
  s.profiles=(s.profiles||[]).map((p,i)=>({id:p.id||uid(),name:p.name||'حساب '+(i+1),color:p.color||COLORS[i%COLORS.length],createdAt:p.createdAt||new Date().toISOString(),data:normData(p.data)}));
  if(!s.profiles.find(p=>p.id===s.activeId)) s.activeId=s.profiles[0]?s.profiles[0].id:null;
  return s;
}
function setActive(id){ ST.activeId=id; P=ST.profiles.find(p=>p.id===id)||ST.profiles[0]; S=P?P.data:null; }
// نسخة من تطبيق «دفتر السداد» القديم تُستورد كحساب جديد
function fromDafter(d,name){ const data=normData({profile:{base:d.profile&&d.profile.base||'YER',div:d.profile&&d.profile.div||1,min:d.profile&&d.profile.min||0},rates:d.rates,creditors:d.creditors,entries:d.entries,checks:{}}); return {id:uid(),name:name||(d.profile&&d.profile.name)||'حسابي',color:COLORS[ST.profiles.length%COLORS.length],createdAt:new Date().toISOString(),data}; }

/* ================= التفعيل والتجربة ================= */
function trialLeft(){ const start=new Date(ST.firstOpen||Date.now()); return CONFIG.TRIAL_DAYS-Math.floor((Date.now()-start)/864e5); }
const isActive=()=>!!(ST.act&&validCode(ST.act.code));
function needLock(){ return !isActive()&&trialLeft()<=0; }

/* ================= الحسابات ================= */
const rate=c=>c===S.profile.base?1:(+S.rates[c]||0);
// نصيب اليوم = الدخل المشترك ÷ عدد الشركاء + الدخل الجانبي الخاص (لا يُقسم)
const shareOf=(e,div)=>(+e.income||0)/div+(+e.side||0), totalIn=e=>(+e.income||0)+(+e.side||0);
const paidOf=e=>Object.values(e.pay||{}).reduce((a,v)=>a+(+v||0),0);
function totals(d){
  d=d||S; const rt=c=>c===d.profile.base?1:(+d.rates[c]||0);
  const div=Math.max(1,+d.profile.div||1);
  const list=Object.keys(d.entries).sort().map(k=>({date:k,...d.entries[k],paid:paidOf(d.entries[k])}));
  const cred=d.creditors.map(c=>{ const debt=c.debts.reduce((a,x)=>a+x.amount*rt(x.cur),0); const paid=(+c.pre||0)+list.reduce((a,e)=>a+(+((e.pay||{})[c.id])||0),0); return {c,debt,paid,remaining:Math.max(0,debt-paid)}; });
  const debt=cred.reduce((a,x)=>a+x.debt,0), paidAll=cred.reduce((a,x)=>a+x.paid,0), remaining=cred.reduce((a,x)=>a+x.remaining,0);
  const paid=list.reduce((a,e)=>a+e.paid,0), income=list.reduce((a,e)=>a+totalIn(e),0), share=list.reduce((a,e)=>a+shareOf(e,div),0), n=list.length;
  return {div,list,cred,debt,paidAll,remaining,paid,income,share,n,avgPaid:n?paid/n:0,avgShare:n?share/n:0};
}
function streak(list){ if(!list.length) return 0; const set=new Set(list.filter(e=>e.paid>0).map(e=>e.date)); let s=0,cur=dateObj(list[list.length-1].date); while(set.has(iso(cur))){s++;cur.setDate(cur.getDate()-1);} return s; }
function xpOf(T){ let xp=0; T.list.forEach(e=>{xp+=10; if(T.avgPaid>0&&e.paid>=T.avgPaid) xp+=5;}); xp+=Math.floor(streak(T.list)/7)*20; Object.values(S.checks).forEach(c=>{xp+=Object.values(c||{}).filter(Boolean).length*5;}); xp+=S.learn.xp||0; xp+=Object.keys(S.tips.applied).length*5; if(window.__khalesDayXP) xp+=window.__khalesDayXP(); return xp; }

/* ================= رسائل صغيرة ================= */
let toastT;
function toast(t,kind){ const el=$('toast'); el.textContent=t; el.className='toast show'+(kind?' '+kind:''); clearTimeout(toastT); toastT=setTimeout(()=>el.className='toast',2400); }
function flash(t,err){ const m=$('msg'); m.textContent=t; m.className='msg'+(err?' err':''); clearTimeout(flash.t); flash.t=setTimeout(()=>m.textContent='',4500); }
function copyText(txt,btn){ const old=btn.textContent; const ok=()=>{btn.textContent='تم النسخ';setTimeout(()=>btn.textContent=old,1500);};
  const fb=()=>{ const t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); try{document.execCommand('copy');ok();}catch(e){} t.remove(); };
  try{ navigator.clipboard.writeText(txt).then(ok,fb); }catch(e){ fb(); } }

/* ================= إنشاء حساب ================= */
function fillCurSelect(sel,val,exclude){ sel.innerHTML=Object.keys(CUR).filter(c=>!(exclude||[]).includes(c)).map(c=>`<option value="${c}" ${c===val?'selected':''}>${curName(c)}</option>`).join(''); }
let oDebts=[], oRateVals={};
function oRender(){
  const base=$('oBase').value;
  $('oDebts').innerHTML=oDebts.map((d,i)=>`<div class="debtrow"><label class="lbl">وصف (اختياري)<input data-i="${i}" data-k="label" value="${esc(d.label)}" placeholder="مثال: الدفعة الأولى"></label><label>المبلغ<input data-i="${i}" data-k="amount" inputmode="decimal" value="${d.amount>0?fmt(d.amount):''}"></label><label>العملة<select data-i="${i}" data-k="cur">${Object.keys(CUR).map(c=>`<option value="${c}" ${c===(d.cur||base)?'selected':''}>${curName(c)}</option>`).join('')}</select></label>${oDebts.length>1?`<button class="btn sm ghost" type="button" data-rm="${i}">حذف</button>`:'<span></span>'}</div>`).join('');
  $('oDebts').querySelectorAll('[data-k]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{const d=oDebts[+el.dataset.i]; if(el.dataset.k==='amount') d.amount=toNum(el.value); else d[el.dataset.k]=el.value; if(el.dataset.k==='cur'){d.touched=true;oRates();}}));
  $('oDebts').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{oDebts.splice(+b.dataset.rm,1);oRender();});
  oRates();
}
function oRates(){
  const base=$('oBase').value, used=[...new Set(oDebts.map(d=>d.cur||base).filter(c=>c!==base))];
  $('oRates').innerHTML=used.length?'<div class="small muted">أسعار الصرف اليوم</div>'+used.map(c=>`<label>${rateQ(c,base).txt}<input data-r="${c}" inputmode="decimal" value="${oRateVals[c]>0?fmt(rateOut(c,base,oRateVals[c])):''}"></label>`).join(''):'';
  $('oRates').querySelectorAll('[data-r]').forEach(el=>el.addEventListener('input',()=>{oRateVals[el.dataset.r]=rateIn(el.dataset.r,$('oBase').value,toNum(el.value));}));
}
function openSetup(isExtra){
  $('app').hidden=true; $('lock').hidden=true; $('setup').hidden=false; window.scrollTo(0,0);
  $('setupTitle').textContent=isExtra?'حساب جديد':'أهلًا بك في خالص';
  $('setupSub').hidden=!!isExtra; $('setupFeat').hidden=!!isExtra; $('oImportBox').hidden=!!isExtra; $('oCancel').hidden=!(isExtra||appShown); $('oHakbaBox').hidden=!!isExtra;
  $('oName').value=''; $('oCred').value=''; $('oSplit').checked=false; $('oDivWrap').hidden=true; $('oMsg').textContent='';
  fillCurSelect($('oBase'),S?S.profile.base:guessCur());
  oDebts=[{label:'',amount:NaN,cur:$('oBase').value}]; oRateVals={}; oRender();
}
function bindSetup(){
  $('oBase').onchange=()=>{oDebts.forEach(d=>{if(!d.touched) d.cur=$('oBase').value;}); oRender();};
  $('oSplit').onchange=()=>{$('oDivWrap').hidden=!$('oSplit').checked;};
  $('oAddDebt').onclick=()=>{oDebts.push({label:'',amount:NaN,cur:$('oBase').value});oRender();};
  $('oCancel').onclick=()=>{ $('setup').hidden=true; if(P) showApp(); else enterHakba(); };
  $('oHakba').onclick=()=>enterHakba();
  $('oStart').onclick=()=>{
    const base=$('oBase').value, cname=$('oCred').value.trim(), m=$('oMsg');
    const debts=oDebts.filter(d=>d.amount>0).map(d=>({id:uid(),label:(d.label||'').trim(),amount:d.amount,cur:d.cur||base}));
    if(!cname){m.textContent='اكتب اسم الدائن.';return;}
    if(!debts.length){m.textContent='اكتب مبلغ الدين.';return;}
    const rates={}; for(const c of new Set(debts.map(d=>d.cur))){ if(c===base) continue; const r=oRateVals[c]; if(!(r>0)){m.textContent='اكتب سعر صرف '+curName(c)+'.';return;} rates[c]=r; }
    const div=$('oSplit').checked?Math.max(1,toNum($('oDiv').value)||1):1;
    const p={id:uid(),name:$('oName').value.trim()||('حساب '+fmt(ST.profiles.length+1)),color:COLORS[ST.profiles.length%COLORS.length],createdAt:new Date().toISOString(),
      data:normData({profile:{base,div,min:0},rates,creditors:[{id:uid(),name:cname,pre:0,debts}]})};
    ST.profiles.push(p); setActive(p.id); save();
    $('setup').hidden=true; boot(); go('debts'); toast('أهلًا '+p.name+'، بدأت رحلتك إلى خالص');
  };
  $('oImport').onclick=()=>pickFile(applyImport,$('oImpMsg'));
}

/* ================= النسخ الاحتياطي ================= */
let pickCb=null,pickMsg=null;
function pickFile(cb,msgEl){pickCb=cb;pickMsg=msgEl;$('fileIn').value='';$('fileIn').click();}
$('fileIn').addEventListener('change',()=>{
  const f=$('fileIn').files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ const o=JSON.parse(r.result); const parsed=parseBackup(o); if(!parsed) throw 0; pickCb&&pickCb(parsed); }catch(e){ if(pickMsg){pickMsg.className='msg err';pickMsg.textContent='هذا الملف ليس نسخة احتياطية من خالص.';} } };
  r.readAsText(f);
});
function parseBackup(o){
  if(o&&o.app==='khales'&&o.store&&Array.isArray(o.store.profiles)) return {kind:'khales',store:o.store,count:o.store.profiles.length};
  const d=o&&o.app==='dafter'?o.data:o;
  if(d&&Array.isArray(d.creditors)&&typeof d.entries==='object') return {kind:'dafter',data:d,count:1};
  return null;
}
function applyImport(b){
  if(b.kind==='khales'){ const keepAct=ST&&ST.act, keepFirst=ST&&ST.firstOpen; ST=normStore(b.store); if(!ST.act&&keepAct) ST.act=keepAct; if(keepFirst&&(!ST.firstOpen||ST.firstOpen>keepFirst)) ST.firstOpen=keepFirst; }
  else { if(!ST) ST=newStore(); const p=fromDafter(b.data); ST.profiles.push(p); ST.activeId=p.id; }
  setActive(ST.activeId); save(); boot(); toast('تم استرجاع النسخة');
}
function backupBlob(){ return new Blob([JSON.stringify({app:'khales',v:1,exportedAt:new Date().toISOString(),store:ST},null,1)],{type:'application/json'}); }
const backupName=()=>'khales-backup-'+todayIso()+'.json';
function markBackup(){ ST.ui.lastBackup=new Date().toISOString(); save(); renderBackupHint(); }
function doExport(msgEl){
  try{ const url=URL.createObjectURL(backupBlob()); const a=document.createElement('a'); a.href=url; a.download=backupName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
    markBackup(); if(msgEl){msgEl.className='msg';msgEl.textContent='تم حفظ النسخة في التنزيلات. أرسلها لنفسك على واتساب لتبقى آمنة.';} }
  catch(e){ if(msgEl){msgEl.className='msg err';msgEl.textContent='تعذر الحفظ. جرّب زر المشاركة.';} }
}
function canShareFile(){ try{ return !!(navigator.canShare&&navigator.canShare({files:[new File(['x'],'x.json',{type:'application/json'})]})); }catch(e){ return false; } }
async function doShare(){ try{ await navigator.share({files:[new File([backupBlob()],backupName(),{type:'application/json'})],title:'نسخة خالص'}); markBackup(); $('bkMsg').className='msg'; $('bkMsg').textContent='تمت المشاركة.'; }catch(e){ if(e&&e.name==='AbortError') return; doExport($('bkMsg')); } }
function renderBackupHint(){
  const n=ST.profiles.reduce((a,p)=>a+Object.keys(p.data.entries).length,0), last=ST.ui.lastBackup?new Date(ST.ui.lastBackup):null;
  const days=last?Math.floor((Date.now()-last)/864e5):Infinity;
  $('backupHint').hidden=!(n>=3&&days>=7&&ST.ui.backupSnooze!==todayIso());
  $('backupHintText').textContent=last?`آخر نسخة احتياطية قبل ${fmt(days)} يوم. احفظ نسخة جديدة.`:'لم تحفظ نسخة احتياطية بعد. بياناتك في هذا الجوال فقط.';
}

/* ================= التنقل ================= */
let cur='debts';
const PAID=['debts','day','tips','learn'];
let appShown=false;
function go(sec){
  if(PAID.includes(sec)){ if(!P){ openSetup(false); return; } if(needLock()){ showLock(); return; } }
  if(sec==='me'&&!P){ /* حسابي يعمل بدون دفتر ديون */ }
  cur=sec; ['debts','hakba','day','tips','learn','me'].forEach(s=>{ $('v-'+s).hidden=s!==sec; });
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.go===sec));
  const tc={debts:'#0A7A5A',hakba:'#1F6FB2',day:'#B83A6E',tips:'#B87A12',learn:'#5A4FC8',me:'#0A7A5A'}[sec]; const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=tc;
  if(sec==='tips') renderTips(); if(sec==='learn') renderLearn(); if(sec==='me') renderMe(); if(sec==='hakba'&&window.Hakba) window.Hakba.open(); if(sec==='day'&&window.Day) window.Day.open();
  if(sec==='debts') renderDebts();
  window.scrollTo({top:0});
}

/* ================= ديوني ================= */
let editing=null, simTouched=false, simScale=null;
function buildPayInputs(){
  const one=S.creditors.length===1;
  $('payInputs').innerHTML=S.creditors.map(c=>`<label>${one?'المبلغ المسدد':'سداد لـ '+esc(c.name)}<input id="fPay_${c.id}" data-pay="${c.id}" inputmode="decimal" placeholder="٠"></label>`).join('');
  $('payInputs').querySelectorAll('[data-pay]').forEach(i=>i.addEventListener('input',updateLive));
  $('bulkCred').innerHTML=S.creditors.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('bulkCredWrap').hidden=one;
}
const sideVal=()=>{ const v=toNum($('fSide').value); return isFinite(v)&&v>0?v:0; };
function formPaid(){let s=0;S.creditors.forEach(c=>{const v=toNum($('fPay_'+c.id).value);if(isFinite(v))s+=v;});return s;}
function updateLive(){
  const div=Math.max(1,+S.profile.div||1), inc=toNum($('fIncome').value), pd=formPaid(), side=sideVal(), sh=(isFinite(inc)?inc:(side?0:NaN))/div+side;
  $('sideWrap').hidden=div<=1;
  $('lShareLbl').textContent=div>1?'نصيبك (÷'+fmt(div)+(side?' + الجانبي':'')+')':'دخلك';
  $('lShare').textContent=isFinite(sh)?fmt(sh):'—';
  $('lRatio').textContent=(isFinite(sh)&&sh)?pctf(pd/sh*100):'—';
  $('lLeft').textContent=isFinite(sh)?fmt(sh-pd):'—';
}
function loadEntry(d){ const e=S.entries[d]; if(!e) return; editing=d; $('fDate').value=d; $('fIncome').value=fmt(e.income); $('fSide').value=+e.side?fmt(e.side):'';
  S.creditors.forEach(c=>{const v=(e.pay||{})[c.id]; $('fPay_'+c.id).value=v?fmt(v):'';});
  $('fNote').value=e.note||''; $('formTitle').textContent='تعديل '+dShort(d); $('delBtn').hidden=false; $('confirmBox').innerHTML=''; updateLive(); }
function resetForm(d){ editing=null; d=d||todayIso(); $('fDate').value=d; $('fIncome').value=''; $('fSide').value=''; $('fNote').value='';
  S.creditors.forEach(c=>{$('fPay_'+c.id).value='';}); $('formTitle').textContent='سجّل يومك'; $('delBtn').hidden=true; $('confirmBox').innerHTML='';
  if(S.entries[d]) loadEntry(d); updateLive(); }
function setCheck(date,key,val){ S.checks[date]=Object.assign({},S.checks[date]||{}); S.checks[date][key]=val; }

function renderHeader(T){
  if(!P){ $('whoAv').textContent='+'; $('whoAv').style.background='var(--em)'; $('whoName').textContent='ابدأ دفتر ديونك'; $('xp').textContent=fmt(0); $('lvl').textContent=fmt(1); $('xpbar').style.width='0%'; $('trialBanner').hidden=true; return; }
  T=T||totals(); $('whoAv').textContent=(P.name||'؟').trim().charAt(0); $('whoAv').style.background=P.color; $('whoName').textContent=P.name;
  const xp=xpOf(T), lvl=Math.floor(xp/100)+1; $('xp').textContent=fmt(xp); $('lvl').textContent=fmt(lvl); $('xpbar').style.width=(xp%100)+'%';
  // تجربة
  const tl=trialLeft(); $('trialBanner').hidden=isActive()||tl<=0;
  if(!isActive()&&tl>0) $('trialText').textContent=`أنت في التجربة المجانية. باقي ${fmt(tl)} ${tl===1?'يوم':'أيام'}.`;
}
function renderDebts(){
  const T=totals(), base=S.profile.base;
  renderHeader(T);
  $('baseUnit').textContent=curName(base);
  $('remaining').textContent=fmt(T.remaining); $('paidTotal').textContent=fmt(T.paidAll); $('debtTotal').textContent=fmt(T.debt);
  const p=T.debt?Math.min(100,T.paidAll/T.debt*100):0;
  $('ringPct').textContent=new Intl.NumberFormat(LOC,{maximumFractionDigits:p<10?1:0}).format(p)+'٪';
  $('ringVal').style.strokeDasharray=(314.16*p/100)+' 314.16';
  const MS=[10,25,50,75,100];
  $('milestones').innerHTML=MS.map((m,i)=>{ const on=p>=m; const prev=i?MS[i-1]:0; const fill=Math.max(0,Math.min(1,(p-prev)/(m-prev)));
    return (i?`<div class="ms-line"><i style="width:${fill*100}%"></i></div>`:'')+`<div class="ms ${on?'on':''} ${m===100?'last':''}"><i>${on?'✓':''}</i>${m===100?'خالص':fmt(m)+'٪'}</div>`; }).join('');
  if(T.debt&&T.remaining<=0){ $('finishDate').textContent='الحمد لله، صرت خالصًا'; $('pacePill').innerHTML='<span>مبروك! انتقل إلى درس «بعد خالص» في التعلّم</span>'; }
  else if(T.avgPaid>0){ const days=Math.ceil(T.remaining/T.avgPaid), months=days/30; $('finishDate').textContent=dFull(addDays(days));
    $('pacePill').innerHTML=`<span>بعد ${fmt(days)} يوم تقريبًا (~${new Intl.NumberFormat(LOC,{maximumFractionDigits:1}).format(months)} شهر) بمتوسط ${fmt(T.avgPaid)} يوميًا</span>`; }
  else { $('finishDate').textContent='سجّل أيامك ليظهر الموعد'; $('pacePill').innerHTML=''; }

  // KPIs
  const best=T.list.reduce((a,e)=>(!a||totalIn(e)>totalIn(a))?e:a,null), sp=T.div>1;
  const k=[['أيام مسجلة',fmt(T.n)],['أيام سداد متتالية',fmt(streak(T.list))],['مجموع الدخل',fmt(T.income)],[sp?'نصيبك من الدخل':'صافي دخلك المسجل',fmt(T.share)],
    ['مجموع ما سددته',fmt(T.paid)],['نسبة السداد من '+(sp?'نصيبك':'دخلك'),pctf(T.share?T.paid/T.share*100:NaN)],[sp?'متوسط نصيبك اليومي':'متوسط دخلك اليومي',fmt(T.avgShare)],['متوسط سدادك اليومي',fmt(T.avgPaid)],
    ['يبقى لك بعد السداد',fmt(T.share-T.paid)],['أعلى دخل',best?fmt(totalIn(best))+' <span class="small muted">('+dShort(best.date)+')</span>':'—']];
  $('kpis').innerHTML=k.map(([a,b])=>`<div class="kpi"><span>${a}</span><b>${b}</b></div>`).join('');
  // per creditor
  $('credSumBox').hidden=T.cred.length<2;
  $('credSum').innerHTML=T.cred.map(x=>{const q=x.debt?Math.min(100,x.paid/x.debt*100):0;return `<div class="line"><div class="row" style="justify-content:space-between"><b>${esc(x.c.name)}</b><span class="small muted num">بقي ${fmt(x.remaining)} من ${fmt(x.debt)}</span></div><div class="pbar"><i style="width:${q}%"></i></div></div>`;}).join('');
  // currency mix
  const byCur={}; S.creditors.forEach(c=>c.debts.forEach(x=>{byCur[x.cur]=(byCur[x.cur]||0)+x.amount*rate(x.cur);}));
  const cols=['var(--em)','var(--gold)','var(--vi)','var(--coral)','var(--share)'], tot=Object.values(byCur).reduce((a,b)=>a+b,0)||1, keys=Object.keys(byCur);
  $('mix').innerHTML=keys.map((k,i)=>`<span style="width:${byCur[k]/tot*100}%;background:${cols[i%cols.length]}"></span>`).join('');
  $('mixLegend').innerHTML=keys.map((k,i)=>`<span><i class="dot" style="background:${cols[i%cols.length]}"></i>${curName(k)} ${fmt(byCur[k])} (${pctf(byCur[k]/tot*100)})</span>`).join('');

  renderChecks(); renderInsights(T); renderCharts(T); renderLog(T); renderSim(T); updateLive(); renderBackupHint();
}
const CHECKS=()=>[["logged","سجّلت دخل اليوم وسدادي"],["paidMin",S.profile.min>0?`سددت ${fmt(S.profile.min)} على الأقل`:"سددت مبلغًا اليوم ولو قليلًا"],["read","قرأت نصيحة اليوم"],["learn","أكملت درسًا في التعلّم"],["noWaste","يوم بلا مصروف غير ضروري"]];
function renderChecks(){
  const t=todayIso(), c=S.checks[t]||{};
  $('chk').innerHTML=CHECKS().map(([id,txt])=>`<label class="${c[id]?'done':''}"><input type="checkbox" data-c="${id}" ${c[id]?'checked':''}><span>${esc(txt)}</span></label>`).join('');
  $('chk').querySelectorAll('input').forEach(i=>i.onchange=()=>{ setCheck(t,i.dataset.c,i.checked); save(); if(i.checked) toast('+٥ نقاط','xp'); renderDebts(); });
}
function renderInsights(T){
  const L=[], who=T.div>1?'نصيبك':'دخلك';
  if(!T.n){ $('insights').innerHTML='<li><span class="tag warn">ابدأ</span><span>سجّل أيامك وتظهر هنا ملاحظات عن دخلك وسدادك.</span></li>'; return; }
  const ratio=T.share?T.paid/T.share*100:0;
  L.push([ratio>=30?'ok':'warn',ratio>=30?'ممتاز':'انتبه',`تسدد ${pctf(ratio)} من ${who}. ${ratio>=30?'هذه نسبة قوية، حافظ عليها.':'لو رفعتها تدريجيًا نحو ٣٠٪ تصبح خالصًا أسرع بكثير.'}`]);
  const sum=Array(7).fill(0),cnt=Array(7).fill(0); T.list.forEach(e=>{const d=dateObj(e.date).getDay();sum[d]+=shareOf(e,T.div);cnt[d]++;});
  let bi=-1,wi=-1,bv=-1,wv=Infinity; sum.forEach((s,i)=>{if(!cnt[i])return;const a=s/cnt[i];if(a>bv){bv=a;bi=i}if(a<wv){wv=a;wi=i}});
  if(T.n>=7&&bi>=0&&bi!==wi) L.push(['ok','أقوى يوم',`يوم ${DAYS[bi]} أعلى دخلًا عندك (${fmt(bv)} بالمتوسط)، و${DAYS[wi]} الأضعف (${fmt(wv)}). زِد السداد في ${DAYS[bi]}.`]);
  const avgInc=T.share/T.n, low=T.list.filter(e=>shareOf(e,T.div)<avgInc*0.75);
  if(low.length) L.push(['warn','أيام ضعيفة',`${fmt(low.length)} يوم كان دخلها أقل من ٧٥٪ من متوسطك. اكتب في الملاحظة سبب كل يوم ضعيف لتعرف ما يتكرر.`]);
  const heavy=T.list.filter(e=>shareOf(e,T.div)>0&&e.paid>shareOf(e,T.div)*0.6);
  if(heavy.length) L.push(['bad','ضغط على نفسك',`${fmt(heavy.length)} يوم سددت فيه أكثر من ٦٠٪ من ${who}. جيد للدين، لكن انتبه ألا يتركك بلا مصروف.`]);
  if(S.profile.min>0){ const under=T.list.filter(e=>e.paid<S.profile.min).length; if(under) L.push(['warn','هدفك اليومي',`${fmt(under)} يوم سددت فيه أقل من هدفك (${fmt(S.profile.min)}).`]); }
  let fx=0; S.creditors.forEach(c=>c.debts.forEach(x=>{if(x.cur!==S.profile.base) fx+=x.amount*rate(x.cur);}));
  const fxp=T.debt?fx/T.debt*100:0;
  if(fxp>25) L.push(['warn','سعر الصرف',`${pctf(fxp)} من دينك بعملة أجنبية. لو ضعفت عملتك يزيد الدين. اتفق مع الدائن على سعر ثابت أو سدد هذا الجزء أولًا، وحدّث السعر في «الدائنون».`]);
  const open=T.cred.filter(x=>x.remaining>0);
  if(open.length>1){ const sm=open.reduce((a,b)=>a.remaining<b.remaining?a:b); L.push(['ok','كرة الثلج',`أصغر دين متبقٍ عند ${esc(sm.c.name)} (${fmt(sm.remaining)}). إغلاقه أولًا يعطيك دفعة معنوية، ثم حوّل مبلغه للدين التالي.`]); }
  if(T.remaining>0&&T.avgPaid>0){ const st=niceStep(T.avgPaid/3), plus=T.avgPaid+st, d1=Math.ceil(T.remaining/T.avgPaid), d2=Math.ceil(T.remaining/plus);
    if(d1-d2>0) L.push(['ok','فكرة سريعة',`لو زدت ${fmt(st)} فقط يوميًا (${fmt(plus)} بدل ${fmt(T.avgPaid)}) تصبح خالصًا قبل موعدك بـ ${fmt(d1-d2)} يوم.`]); }
  $('insights').innerHTML=L.map(([c,t,x])=>`<li><span class="tag ${c}">${t}</span><span>${x}</span></li>`).join('');
}
function renderCharts(T){
  const data=T.list.slice(-31); $('legShare').textContent=T.div>1?'نصيبك من الدخل':'الدخل';
  if(!data.length){ $('chartDaily').innerHTML='<div class="empty">لا توجد أيام مسجلة بعد. سجّل أول يوم من الأعلى.</div>'; $('chartWeek').innerHTML='<div class="empty">يظهر بعد تسجيل عدة أيام.</div>'; return; }
  const W=900,H=280,L=64,R=12,Tp=14,B=46, iw=W-L-R, ih=H-Tp-B;
  const max=niceMax(Math.max(...data.map(e=>Math.max(shareOf(e,T.div),e.paid))));
  const step=iw/Math.max(data.length,7), bw=Math.max(3,Math.min(18,step*0.36)); let g='';
  for(let i=0;i<=4;i++){const v=max*i/4,yy=Tp+ih-ih*i/4; g+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="12" fill="var(--muted)">${fmt(v)}</text>`;}
  data.forEach((e,i)=>{ const cx=W-R-step*(i+0.5), sh=shareOf(e,T.div)/max*ih, pd=e.paid/max*ih;
    g+=`<rect x="${cx}" y="${Tp+ih-sh}" width="${bw}" height="${sh}" rx="3" fill="var(--share)"><title>${dShort(e.date)}: ${fmt(shareOf(e,T.div))}</title></rect>`;
    g+=`<rect x="${cx-bw}" y="${Tp+ih-pd}" width="${bw}" height="${pd}" rx="3" fill="var(--em)"><title>${dShort(e.date)}: سددت ${fmt(e.paid)}</title></rect>`;
    if(data.length<=16||i%2===0) g+=`<text x="${cx}" y="${H-B+18}" text-anchor="middle" font-size="12" fill="var(--muted)">${fmt(dateObj(e.date).getDate())}</text>`; });
  g+=`<text x="${W-R}" y="${H-6}" text-anchor="end" font-size="12" fill="var(--muted)">اليوم من الشهر · الأحدث على اليسار</text>`;
  $('chartDaily').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="الدخل والسداد اليومي" style="min-width:600px">${g}</svg>`;
  const sum=Array(7).fill(0),cnt=Array(7).fill(0); T.list.forEach(e=>{const d=dateObj(e.date).getDay();sum[d]+=shareOf(e,T.div);cnt[d]++;});
  const avg=sum.map((s,i)=>cnt[i]?s/cnt[i]:0), top=Math.max(...avg), mx=niceMax(top);
  const W2=460,H2=250,L2=78,R2=62,rowH=(H2-20)/7; let h='';
  avg.forEach((v,i)=>{const yy=10+i*rowH, w=v/mx*(W2-L2-R2);
    h+=`<text x="${W2-4}" y="${yy+rowH/2+4}" text-anchor="end" font-size="13" fill="var(--ink)">${DAYS[i]}</text>`;
    h+=`<rect x="${W2-L2-w}" y="${yy+5}" width="${w}" height="${rowH-10}" rx="5" fill="${v===top&&v>0?'var(--gold)':'var(--share)'}"/>`;
    h+=`<text x="${W2-L2-w-6}" y="${yy+rowH/2+4}" text-anchor="end" font-size="12" fill="var(--muted)">${cnt[i]?fmt(v):'—'}</text>`;});
  $('chartWeek').innerHTML=`<svg viewBox="0 0 ${W2} ${H2}" role="img" aria-label="متوسط الدخل حسب اليوم" style="min-width:320px">${h}</svg>`;
}
function renderLog(T){
  if(!T.n){ $('logBox').innerHTML='<div class="empty">السجل فارغ. أول يوم تحفظه يظهر هنا.</div>'; return; }
  const multi=S.creditors.length>1, sp=T.div>1;
  const rows=[...T.list].reverse().map(e=>{const sh=shareOf(e,T.div); const det=multi?S.creditors.filter(c=>+(e.pay||{})[c.id]).map(c=>esc(c.name)+': '+fmt(e.pay[c.id])).join('، '):'';
    return `<tr data-d="${e.date}"><td>${dShort(e.date)}</td><td class="num">${fmt(e.income)}${+e.side?`<div class="small muted">+ جانبي ${fmt(e.side)}</div>`:''}</td>${sp?`<td class="num">${fmt(sh)}</td>`:''}<td class="num"><b>${fmt(e.paid)}</b>${det?`<div class="small muted">${det}</div>`:''}</td><td class="num">${pctf(sh?e.paid/sh*100:NaN)}</td><td class="small muted">${esc(e.note||'')}</td></tr>`;}).join('');
  $('logBox').innerHTML=`<table><thead><tr><th>اليوم</th><th>الدخل</th>${sp?'<th>نصيبك</th>':''}<th>المسدد</th><th>النسبة</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>المجموع</th><th class="num">${fmt(T.income)}</th>${sp?`<th class="num">${fmt(T.share)}</th>`:''}<th class="num">${fmt(T.paid)}</th><th class="num">${pctf(T.share?T.paid/T.share*100:NaN)}</th><th></th></tr></tfoot></table>`;
  $('logBox').querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{ loadEntry(tr.dataset.d); $('dayForm').scrollIntoView({behavior:'smooth',block:'start'}); });
}
function renderSim(T){
  const ref=T.avgPaid>0?T.avgPaid:(S.profile.min>0?S.profile.min:Math.max(1,T.remaining/180)), st=niceStep(ref/6);
  if(!simScale||simScale!==st){ simScale=st; const p=$('simPay'), l=$('simLump'); p.min=0; p.max=st*40; p.step=st; l.min=0; l.max=st*300; l.step=st*10; if(!simTouched){ p.value=Math.round(ref/st)*st; l.value=0; } }
  const Pv=+$('simPay').value, Lm=+$('simLump').value, base=curName(S.profile.base);
  $('simPayLbl').textContent=fmt(Pv)+' '+base; $('simLumpLbl').textContent=fmt(Lm)+' '+base;
  if(T.remaining<=0||Pv+Lm<=0){ ['simDays','simDate','simDiff'].forEach(id=>$(id).textContent='—'); $('simNote').textContent=''; return; }
  const days=Math.ceil(T.remaining/(Pv+Lm/30)); $('simDays').textContent=fmt(days)+' يوم'; $('simDate').textContent=dShort(addDays(days));
  if(T.avgPaid>0){ const diff=Math.ceil(T.remaining/T.avgPaid)-days; $('simDiff').textContent=diff>0?'أسرع بـ '+fmt(diff)+' يوم':diff<0?'أبطأ بـ '+fmt(-diff)+' يوم':'نفس المدة'; $('simDiff').style.color=diff>0?'var(--em)':diff<0?'var(--coral)':''; }
  else { $('simDiff').textContent='—'; $('simDiff').style.color=''; }
  $('simNote').textContent=T.avgShare?`يعني تسدد حوالي ${pctf(Pv/T.avgShare*100)} من متوسط ${T.div>1?'نصيبك':'دخلك'} اليومي (${fmt(T.avgShare)}).`:'';
}
/* محرر الدائنين */
let draft=null;
function openCreds(){ draft=JSON.parse(JSON.stringify({rates:S.rates,creditors:S.creditors})); renderCreds(); }
function renderCreds(){
  const base=S.profile.base; $('ratesHint').textContent='عملة الحساب: '+curName(base)+'. اكتب سعر الصرف اليوم كما تسمعه في السوق.';
  const curs=Object.keys(draft.rates);
  $('curList').innerHTML=curs.length?curs.map(c=>`<div class="row"><label style="flex:1">${rateQ(c,base).txt}<input data-rate="${c}" inputmode="decimal" value="${draft.rates[c]>0?fmt(rateOut(c,base,draft.rates[c])):''}"></label><button class="btn sm ghost" type="button" data-rmcur="${c}">حذف</button></div>`).join(''):'<div class="small muted">لا توجد عملات أخرى.</div>';
  fillCurSelect($('addCurSel'),null,[base,...curs]);
  const allCur=[base,...curs];
  $('credList').innerHTML=draft.creditors.map((c,ci)=>`<div class="cred">
    <div class="grid2"><label>اسم الدائن<input data-cn="${ci}" value="${esc(c.name)}"></label><label>مسدد له قبل استخدام التطبيق<input data-cpre="${ci}" inputmode="decimal" value="${c.pre?fmt(c.pre):''}"></label></div>
    ${c.debts.map((d,di)=>`<div class="debtrow"><label class="lbl">وصف<input data-dl="${ci}:${di}" value="${esc(d.label||'')}"></label><label>المبلغ<input data-da="${ci}:${di}" inputmode="decimal" value="${fmt(d.amount)}"></label><label>العملة<select data-dc="${ci}:${di}">${allCur.map(x=>`<option value="${x}" ${x===d.cur?'selected':''}>${curName(x)}</option>`).join('')}</select></label><button class="btn sm ghost" type="button" data-drm="${ci}:${di}">حذف</button></div>`).join('')}
    <div class="row"><button class="btn sm" type="button" data-dadd="${ci}">+ مبلغ</button>${draft.creditors.length>1?`<button class="btn sm danger" type="button" data-crm="${ci}">حذف الدائن</button>`:''}</div></div>`).join('');
  const box=$('s-creds'), q=(sel,fn,ev='input')=>box.querySelectorAll(sel).forEach(el=>el.addEventListener(ev,()=>fn(el))), ij=s=>s.split(':').map(Number);
  q('[data-rate]',el=>{draft.rates[el.dataset.rate]=rateIn(el.dataset.rate,base,toNum(el.value));});
  q('[data-cn]',el=>{draft.creditors[+el.dataset.cn].name=el.value;});
  q('[data-cpre]',el=>{draft.creditors[+el.dataset.cpre].pre=toNum(el.value)||0;});
  q('[data-dl]',el=>{const[a,b]=ij(el.dataset.dl);draft.creditors[a].debts[b].label=el.value;});
  q('[data-da]',el=>{const[a,b]=ij(el.dataset.da);draft.creditors[a].debts[b].amount=toNum(el.value);});
  q('[data-dc]',el=>{const[a,b]=ij(el.dataset.dc);draft.creditors[a].debts[b].cur=el.value;},'change');
  box.querySelectorAll('[data-drm]').forEach(b=>b.onclick=()=>{const[a,c]=ij(b.dataset.drm);draft.creditors[a].debts.splice(c,1);renderCreds();});
  box.querySelectorAll('[data-dadd]').forEach(b=>b.onclick=()=>{draft.creditors[+b.dataset.dadd].debts.push({id:uid(),label:'',amount:NaN,cur:base});renderCreds();});
  box.querySelectorAll('[data-crm]').forEach(b=>b.onclick=()=>{const c=draft.creditors[+b.dataset.crm];
    if(Object.values(S.entries).some(e=>+(e.pay||{})[c.id])){$('debtMsg').className='msg err';$('debtMsg').textContent='لا يمكن حذف دائن له دفعات مسجلة. احذف دفعاته من السجل أولًا.';return;}
    draft.creditors.splice(+b.dataset.crm,1);renderCreds();});
  box.querySelectorAll('[data-rmcur]').forEach(b=>b.onclick=()=>{const c=b.dataset.rmcur;
    if(draft.creditors.some(x=>x.debts.some(d=>d.cur===c))){$('debtMsg').className='msg err';$('debtMsg').textContent='هذه العملة مستخدمة في دين. غيّر عملة الدين أولًا.';return;}
    delete draft.rates[c];renderCreds();});
}
function parseLine(line){
  const t=line.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/[۰-۹]/g,d=>FA.indexOf(d));
  const dm=t.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})/); if(!dm) return null;
  const nb=t.slice(0,dm.index).match(/\d[\d,٬]*/g), na=t.slice(dm.index+dm[0].length).match(/\d[\d,٬]*/g); if(!na) return null;
  const day=+dm[1], mon=+dm[2]; if(mon<1||mon>12||day<1||day>31) return null;
  const z=n=>String(n).padStart(2,'0'), clean=s=>+s.replace(/[,٬]/g,'');
  return {date:`${dm[3]}-${z(mon)}-${z(day)}`,paid:nb?clean(nb[0]):0,income:clean(na[na.length-1])};
}
function bindDebts(){
  $('fIncome').addEventListener('input',updateLive); $('fSide').addEventListener('input',updateLive);
  $('fDate').addEventListener('change',()=>{const d=$('fDate').value; if(S.entries[d]) loadEntry(d); else { editing=null; $('delBtn').hidden=true; $('formTitle').textContent='سجّل يومك'; }});
  $('saveBtn').onclick=()=>{
    const d=$('fDate').value, inc=toNum($('fIncome').value);
    if(!d){flash('اختر التاريخ.',true);return;}
    if(!isFinite(inc)||inc<0){flash('اكتب دخل اليوم بالأرقام (اكتب ٠ لو ما في دخل).',true);return;}
    const pay={}; for(const c of S.creditors){ const v=toNum($('fPay_'+c.id).value); if(isFinite(v)&&v<0){flash('المبلغ المسدد لا يكون سالبًا.',true);return;} if(isFinite(v)&&v>0) pay[c.id]=v; }
    const isNew=!S.entries[d];
    S.entries[d]={income:inc,pay,note:$('fNote').value.trim(),updatedAt:new Date().toISOString()}; const sd=sideVal(); if(sd&&S.profile.div>1) S.entries[d].side=sd;
    if(d===todayIso()){ setCheck(d,'logged',true); const pd=paidOf(S.entries[d]); if(pd>0&&(!S.profile.min||pd>=S.profile.min)) setCheck(d,'paidMin',true); }
    if(save()){ flash((isNew?'تم حفظ يوم ':'تم تعديل يوم ')+dShort(d)); if(isNew) toast('+١٠ نقاط','xp'); editing=d; $('delBtn').hidden=false; $('formTitle').textContent='تعديل '+dShort(d); renderDebts(); }
  };
  $('clearBtn').onclick=()=>{ const t=todayIso(); if(S.entries[t]){ let d=new Date(); while(S.entries[iso(d)]) d.setDate(d.getDate()+1); resetForm(iso(d)); } else resetForm(t); $('fIncome').focus(); };
  $('delBtn').onclick=()=>{ if(!editing) return;
    $('confirmBox').innerHTML=`<div class="confirm">تحذف يوم ${dShort(editing)} نهائيًا؟ <button class="btn sm danger" id="yesDel" type="button">نعم، احذف</button><button class="btn sm" id="noDel" type="button">تراجع</button></div>`;
    $('noDel').onclick=()=>$('confirmBox').innerHTML='';
    $('yesDel').onclick=()=>{ delete S.entries[editing]; save(); flash('تم الحذف'); resetForm(); renderDebts(); }; };
  $('bulkBtn').onclick=()=>{
    const lines=$('bulk').value.split(/\n/).map(s=>s.trim()).filter(Boolean), cid=$('bulkCred').value||S.creditors[0].id; let ok=0; const bad=[];
    lines.forEach((l,i)=>{ const r=parseLine(l); if(!r){bad.push(i+1);return;} const prev=S.entries[r.date]||{pay:{},note:''}; const pay=Object.assign({},prev.pay||{}); if(r.paid>0) pay[cid]=r.paid; else delete pay[cid];
      S.entries[r.date]={income:r.income,pay,note:prev.note||'',updatedAt:new Date().toISOString()}; if(prev.side) S.entries[r.date].side=prev.side; ok++; });
    if(!ok){$('bulkMsg').textContent='لم أفهم أي سطر. تأكد أن التاريخ مكتوب مثل ١/١١/٢٠٢٦.';return;}
    save(); renderDebts(); $('bulkMsg').textContent=`تم حفظ ${fmt(ok)} يوم`+(bad.length?`، ولم أفهم السطر رقم ${bad.map(fmt).join('، ')}`:''); if(!bad.length) $('bulk').value='';
  };
  document.querySelectorAll('#debtSeg button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#debtSeg button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));
    ['overview','charts','sim','log','creds'].forEach(s=>$('s-'+s).hidden=s!==b.dataset.seg);
    if(b.dataset.seg==='creds') openCreds();
  });
  $('simPay').oninput=()=>{simTouched=true;renderSim(totals());};
  $('simLump').oninput=()=>{simTouched=true;renderSim(totals());};
  $('addCurBtn').onclick=()=>{const c=$('addCurSel').value; if(c&&!(c in draft.rates)){draft.rates[c]=NaN;renderCreds();}};
  $('addCredBtn').onclick=()=>{draft.creditors.push({id:uid(),name:'',pre:0,debts:[{id:uid(),label:'',amount:NaN,cur:S.profile.base}]});renderCreds();};
  $('saveDebts').onclick=()=>{
    const m=$('debtMsg'); m.className='msg err';
    for(const c of draft.creditors){ if(!String(c.name).trim()){m.textContent='اكتب اسم كل دائن.';return;} c.name=c.name.trim(); c.debts=c.debts.filter(d=>d.amount>0); if(!c.debts.length){m.textContent='الدائن '+c.name+' بدون مبلغ دين.';return;} }
    for(const c of draft.creditors) for(const d of c.debts) if(d.cur!==S.profile.base&&!(draft.rates[d.cur]>0)){m.textContent='اكتب سعر صرف '+curName(d.cur)+'.';return;}
    for(const k of Object.keys(draft.rates)) if(!(draft.rates[k]>0)) delete draft.rates[k];
    S.rates=draft.rates; S.creditors=draft.creditors; save(); buildPayInputs(); resetForm($('fDate').value); openCreds(); renderDebts(); m.className='msg'; m.textContent='تم الحفظ.';
  };
}

/* ================= النصائح ================= */
const CATS={income:'زيادة الدخل',p:'خطة السداد',s:'المصاريف',c:'التعامل مع الدائن',m:'العقلية',h:'الهكبة'};
let ALL_TIPS=null, tipFilter='all', tipShown=12;
function tipsList(){ if(ALL_TIPS) return ALL_TIPS; const A=window.ARTICLES||[], T=window.TIPS||[], cats=window.ARTICLE_CATS||''; const out=[];
  const n=Math.max(A.length,T.length); for(let i=0;i<n;i++){ if(T[i]) out.push({id:'t'+i,cat:'income',title:T[i][0],body:T[i][1]}); if(A[i]) out.push({id:'a'+i,cat:cats[i]||'p',title:A[i][0],body:A[i][1]}); }
  (window.HAKBA_TIPS||[]).forEach((t,i)=>out.push({id:'h'+i,cat:'h',title:t[0],body:t[1]}));
  return ALL_TIPS=out; }
function todayTip(){ const L=tipsList(); return L[dayIndex()%L.length]; }
function renderTips(){
  const L=tipsList(), t=todayTip(), fav=new Set(S.tips.fav);
  $('todayTipCat').textContent=CATS[t.cat]; $('todayTipTitle').textContent=t.title; $('todayTipBody').textContent=t.body;
  $('todayFav').textContent=fav.has(t.id)?'محفوظة ✓':'حفظ'; $('todayFav').classList.toggle('on',fav.has(t.id));
  const ap=!!S.tips.applied[t.id]; $('todayApply').textContent=ap?'طبّقتها ✓':'طبّقتها +٥'; $('todayApply').disabled=ap;
  const cats=[['all','الكل'],['income',CATS.income],['p',CATS.p],['s',CATS.s],['c',CATS.c],['m',CATS.m],['h',CATS.h],['fav','المحفوظة']];
  $('tipChips').innerHTML=cats.map(([k,v])=>`<button type="button" role="tab" data-f="${k}" aria-selected="${k===tipFilter}">${v}${k==='fav'&&fav.size?' ('+fmt(fav.size)+')':''}</button>`).join('');
  $('tipChips').querySelectorAll('button').forEach(b=>b.onclick=()=>{tipFilter=b.dataset.f;tipShown=12;renderTips();});
  const list=L.filter(x=>tipFilter==='all'||(tipFilter==='fav'?fav.has(x.id):x.cat===tipFilter));
  $('tipsCount').textContent=`طبّقت ${fmt(Object.keys(S.tips.applied).length)} من ${fmt(L.length)}`;
  if(!list.length){ $('tipGrid').innerHTML=`<div class="empty" style="grid-column:1/-1">${tipFilter==='fav'?'لم تحفظ أي نصيحة بعد. اقلب أي بطاقة واضغط «حفظ».':'لا توجد نصائح هنا.'}</div>`; $('tipMore').hidden=true; return; }
  $('tipGrid').innerHTML=list.slice(0,tipShown).map(x=>{ const i=L.indexOf(x)+1, f=fav.has(x.id), a=!!S.tips.applied[x.id];
    return `<div class="flip" role="button" tabindex="0" data-id="${x.id}" aria-label="${esc(x.title)}"><div class="flip-in">
      <div class="face front">${f?'<span class="fav-mark">★</span>':''}<span class="tag ${x.cat==='income'?'gold':x.cat==='m'?'vi':x.cat==='c'?'bad':x.cat==='h'?'bl':'ok'}">${CATS[x.cat]}</span><h3>${esc(x.title)}</h3><span class="hint">${a?'✓ طبّقتها · ':''}اضغط للقراءة</span><span class="f-num num">${fmt(i)}</span></div>
      <div class="face back"><b>${esc(x.title)}</b><p>${esc(x.body)}</p><div class="row"><button class="mini ${f?'on':''}" type="button" data-act="fav">${f?'محفوظة':'حفظ'}</button><button class="mini ${a?'on':''}" type="button" data-act="apply" ${a?'disabled':''}>${a?'طبّقتها ✓':'طبّقتها +٥'}</button><button class="mini" type="button" data-act="copy">نسخ</button></div></div>
    </div></div>`; }).join('');
  $('tipMore').hidden=list.length<=tipShown;
  $('tipGrid').querySelectorAll('.flip').forEach(el=>{
    const flip=()=>{ el.classList.toggle('flipped'); if(el.classList.contains('flipped')) markRead(); };
    el.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(b){ e.stopPropagation(); tipAction(el.dataset.id,b.dataset.act,b); return; } flip(); });
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); } });
  });
}
function markRead(){ const t=todayIso(); if(!(S.checks[t]||{}).read){ setCheck(t,'read',true); save(); toast('+٥ نقاط · قرأت نصيحة اليوم','xp'); renderHeader(); } }
function tipAction(id,act,btn){
  const x=tipsList().find(t=>t.id===id); if(!x) return;
  if(act==='copy'){ copyText(x.title+'\n'+x.body+'\n\n— من تطبيق خالص',btn); return; }
  if(act==='fav'){ const i=S.tips.fav.indexOf(id); if(i>=0) S.tips.fav.splice(i,1); else { S.tips.fav.push(id); toast('حُفظت في «المحفوظة»'); } }
  if(act==='apply'&&!S.tips.applied[id]){ S.tips.applied[id]=todayIso(); toast('+٥ نقاط · أحسنت','xp'); }
  save(); renderTips(); renderHeader();
  const el=$('tipGrid').querySelector(`[data-id="${id}"]`); if(el) el.classList.add('flipped');
}
function bindTips(){
  $('tipMore').onclick=()=>{tipShown+=12;renderTips();};
  $('todayCopy').onclick=e=>{ const t=todayTip(); copyText(t.title+'\n'+t.body+'\n\n— من تطبيق خالص',e.currentTarget); markRead(); };
  $('todayFav').onclick=()=>tipAction(todayTip().id,'fav');
  $('todayApply').onclick=()=>{ tipAction(todayTip().id,'apply'); markRead(); };
}

/* ================= التعلّم ================= */
const LESSONS=()=>(window.LEARN||[]).flatMap(u=>u.lessons.map(l=>({...l,unit:u})));
function renderLearn(){
  const U=window.LEARN||[], all=LESSONS(), done=S.learn.done; let firstOpen=null;
  const nDone=all.filter(l=>done[l.id]).length;
  const ans=Object.values(S.learn.ans), right=ans.filter(Boolean).length;
  $('lDone').textContent=fmt(nDone)+'/'+fmt(all.length); $('lXp').textContent=fmt(S.learn.xp||0); $('lAcc').textContent=ans.length?pctf(right/ans.length*100):'—';
  $('lBar').style.width=(all.length?nDone/all.length*100:0)+'%';
  const offs=['0px','-56px','-84px','-56px','0px','56px','84px','56px'];
  let idx=0, prevDone=true;
  $('path').innerHTML=U.map((u,ui)=>{ const uDone=u.lessons.filter(l=>done[l.id]).length, uLocked=!prevDone&&!u.lessons.some(l=>done[l.id]);
    const nodes=u.lessons.map(l=>{ const isDone=!!done[l.id]; const open=isDone||prevDone; let cls=isDone?'done':open?'cur':'locked'; if(cls==='cur'){ if(firstOpen) cls='cur'; else firstOpen=l.id; }
      prevDone=isDone; const dx=offs[idx++%offs.length];
      const icon=cls==='done'?'<svg viewBox="0 0 24 24" class="ic"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':cls==='locked'?'<svg viewBox="0 0 24 24" class="ic"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>':'<svg viewBox="0 0 24 24" class="ic"><path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/></svg>';
      return `<button class="node ${cls}" type="button" data-l="${l.id}" style="--dx:${dx}" ${cls==='locked'?'aria-disabled="true"':''}><span class="bub">${icon}</span><span>${esc(l.title)}</span></button>`; }).join('');
    return `<div class="unit"><div class="unit-h ${uLocked?'locked':''}"><span class="u-n num">${fmt(ui+1)}</span><div><h3>${esc(u.title)}</h3><p>${esc(u.sub)}</p></div><span class="u-p num">${fmt(uDone)}/${fmt(u.lessons.length)}</span></div><div class="nodes">${nodes}</div></div>`;
  }).join('');
  $('path').querySelectorAll('.node').forEach(b=>b.onclick=()=>{ if(b.classList.contains('locked')){ toast('أكمل الدرس الذي قبله أولًا'); return; } openLesson(b.dataset.l); });
}
function openSheet(title,html){ $('sheetTitle').textContent=title; $('sheetBody').innerHTML=html; $('sheet').hidden=false; document.body.style.overflow='hidden'; }
function closeSheet(){ $('sheet').hidden=true; document.body.style.overflow=''; }
function openLesson(id){
  const l=LESSONS().find(x=>x.id===id); if(!l) return;
  openSheet(l.title,`<span class="tag vi">${esc(l.unit.title)}</span><div class="lesson-body">${esc(l.body)}</div><div class="row"><button class="btn primary" type="button" id="startQuiz" style="background:var(--vi);border-color:var(--vi);color:#fff">ابدأ الاختبار (${fmt(l.q.length)} أسئلة)</button>${S.learn.done[id]?'<span class="tag vi">مكتمل ✓</span>':''}</div>`);
  $('startQuiz').onclick=()=>runQuiz(l,0,0);
}
function runQuiz(l,i,score){
  const q=l.q[i];
  const prog=l.q.map((_,k)=>`<i class="${k<=i?'on':''}"></i>`).join('');
  $('sheetBody').innerHTML=`<div class="q-card"><div class="q-prog">${prog}</div><div class="q-t">${esc(q.t)}</div>${q.o.map((o,k)=>`<button class="opt" type="button" data-k="${k}">${esc(o)}</button>`).join('')}<div id="qx"></div></div>`;
  $('sheetBody').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    const k=+b.dataset.k, ok=k===q.a, key=l.id+':'+i, first=!(key in S.learn.ans);
    $('sheetBody').querySelectorAll('.opt').forEach(x=>{ x.disabled=true; if(+x.dataset.k===q.a) x.classList.add('right'); });
    if(!ok) b.classList.add('wrong');
    if(first){ S.learn.ans[key]=ok; if(ok){ S.learn.xp=(S.learn.xp||0)+10; } save(); }
    if(ok&&first) toast('+١٠ نقاط','xp');
    const last=i===l.q.length-1;
    $('qx').innerHTML=`<div class="explain ${ok?'right':'wrong'}"><b>${ok?'إجابة صحيحة.':'ليست هذه.'}</b> ${esc(q.x)}</div><div class="row" style="margin-top:10px"><button class="btn primary" type="button" id="qNext" style="background:var(--vi);border-color:var(--vi);color:#fff">${last?'إنهاء الدرس':'السؤال التالي'}</button></div>`;
    $('qNext').onclick=()=>last?finishLesson(l,score+(ok?1:0)):runQuiz(l,i+1,score+(ok?1:0));
  });
}
function finishLesson(l,score){
  const firstTime=!S.learn.done[l.id];
  if(firstTime){ S.learn.done[l.id]=todayIso(); S.learn.xp=(S.learn.xp||0)+20; setCheck(todayIso(),'learn',true); save(); }
  const all=LESSONS(), next=all[all.findIndex(x=>x.id===l.id)+1];
  $('sheetTitle').textContent='أحسنت!';
  $('sheetBody').innerHTML=`<div class="celebrate"><div class="big num">${fmt(score)}/${fmt(l.q.length)}</div><div>أكملت درس «${esc(l.title)}»${firstTime?' وكسبت +٢٠ نقطة إضافية':''}.</div></div><div class="row center">${next?`<button class="btn primary" type="button" id="nextLesson" style="background:var(--vi);border-color:var(--vi);color:#fff">الدرس التالي: ${esc(next.title)}</button>`:''}<button class="btn" type="button" id="backPath">العودة للمسار</button></div>`;
  if(firstTime) toast('+٢٠ نقطة · درس مكتمل','xp');
  if(next) $('nextLesson').onclick=()=>{ renderLearn(); openLesson(next.id); };
  $('backPath').onclick=()=>{ closeSheet(); renderLearn(); };
  renderLearn(); renderHeader();
}

/* ================= حسابي ================= */
function profSummary(p){ const T=totals(p.data); return T.debt?`بقي ${fmt(T.remaining)} ${curName(p.data.profile.base)} · ${fmt(T.n)} يوم مسجل`:'بدون دين'; }
function renderMe(){
  $('profiles').innerHTML=ST.profiles.map(p=>`<div class="prof ${p.id===ST.activeId?'on':''}"><span class="av" style="background:${p.color}">${esc((p.name||'؟').trim().charAt(0))}</span><div class="p-txt"><b>${esc(p.name)}</b><span class="num">${profSummary(p)}</span></div>
    ${p.id===ST.activeId?'<span class="tag ok">الحالي</span>':`<button class="btn sm" type="button" data-open="${p.id}">فتح</button>`}<button class="icon-btn" type="button" data-del="${p.id}" aria-label="حذف ${esc(p.name)}"><svg viewBox="0 0 24 24" class="ic xs"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button></div>`).join('');
  $('profiles').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.open));
  $('profiles').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const p=ST.profiles.find(x=>x.id===b.dataset.del);
    $('profConfirm').innerHTML=`<div class="confirm">تحذف حساب «${esc(p.name)}» وكل بياناته من هذا الجوال؟ <button class="btn sm danger" type="button" id="yesDelP">نعم، احذف</button><button class="btn sm" type="button" id="noDelP">تراجع</button></div>`;
    $('noDelP').onclick=()=>$('profConfirm').innerHTML='';
    $('yesDelP').onclick=()=>{ ST.profiles=ST.profiles.filter(x=>x.id!==p.id); $('profConfirm').innerHTML='';
      if(!ST.profiles.length){ ST.activeId=null; P=S=null; save(); openSetup(false); return; }
      if(ST.activeId===p.id) setActive(ST.profiles[0].id); save(); boot(); go('me'); toast('تم حذف الحساب'); };
  });
  $('meSettings').hidden=!P;
  if(P){ $('sName').value=P.name||''; $('sDiv').value=fmt(S.profile.div||1); $('sMin').value=S.profile.min?fmt(S.profile.min):''; }
  $('sDigits').value=ST.settings.digits;
  // التفعيل
  const tl=trialLeft();
  $('actBox').innerHTML=isActive()?`<div class="row"><span class="tag ok">مفعّل ✓</span><span class="small muted num" dir="ltr">${esc(prettyCode(ST.act.code))}</span></div>`
    :`<div class="row"><span class="tag warn">${tl>0?'تجربة مجانية: باقي '+fmt(tl)+' '+(tl===1?'يوم':'أيام'):'غير مفعّل'}</span></div><label>رمز التفعيل<input id="meCode" dir="ltr" class="code-in" placeholder="XXXX-XXXX-XXXX" autocomplete="off"></label><div class="row"><button class="btn primary sm" type="button" id="meCodeBtn">تفعيل</button><span class="msg" id="meCodeMsg"></span></div>`;
  if(!isActive()) $('meCodeBtn').onclick=()=>tryActivate($('meCode').value,$('meCodeMsg'));
  $('shareBtn').hidden=!canShareFile();
}
function switchProfile(id){ setActive(id); save(); closeSheet(); boot(); toast('انتقلت إلى حساب '+P.name); }
function tryActivate(raw,msgEl){
  if(validCode(raw)){ ST.act={code:normCode(raw),at:new Date().toISOString()}; save(); msgEl.className='msg'; msgEl.textContent='تم التفعيل. شكرًا لك!'; toast('تم تفعيل خالص ✓');
    setTimeout(()=>{ if(!$('lock').hidden){ $('lock').hidden=true; showApp(); } else renderMe(); renderHeader(); },700); return true; }
  msgEl.className='msg err'; msgEl.textContent='الرمز غير صحيح. تأكد من كتابته كما وصلك.'; return false;
}
function bindMe(){
  $('addProfile').onclick=()=>openSetup(!!P);
  $('saveSettings').onclick=()=>{ P.name=$('sName').value.trim()||P.name; S.profile.div=Math.max(1,toNum($('sDiv').value)||1); S.profile.min=Math.max(0,toNum($('sMin').value)||0); save(); renderAll(); $('setMsg').textContent='تم الحفظ.'; setTimeout(()=>$('setMsg').textContent='',3000); };
  $('sDigits').onchange=()=>{ ST.settings.digits=$('sDigits').value; LOC=ST.settings.digits==='en'?'ar-EG-u-nu-latn':'ar-EG'; save(); simScale=null; boot(); go('me'); };
  $('exportBtn').onclick=()=>doExport($('bkMsg'));
  $('shareBtn').onclick=doShare;
  $('importBtn').onclick=()=>pickFile(b=>{
    $('importConfirm').innerHTML=b.kind==='khales'
      ?`<div class="confirm">استرجاع النسخة يستبدل كل الحسابات الحالية بما في النسخة (${fmt(b.count)} حساب). متأكد؟ <button class="btn sm danger" type="button" id="yesImp">نعم، استرجع</button><button class="btn sm" type="button" id="noImp">تراجع</button></div>`
      :`<div class="confirm" style="background:var(--em-soft);color:var(--ink)">هذه نسخة من «دفتر السداد». ستُضاف كحساب جديد بجانب حساباتك. <button class="btn sm primary" type="button" id="yesImp">أضفها</button><button class="btn sm" type="button" id="noImp">تراجع</button></div>`;
    $('noImp').onclick=()=>$('importConfirm').innerHTML='';
    $('yesImp').onclick=()=>{ $('importConfirm').innerHTML=''; applyImport(b); go('me'); };
  },$('bkMsg'));
  $('resetBtn').onclick=()=>{
    $('resetConfirm').innerHTML=`<div class="confirm">يحذف كل الحسابات من هذا الجوال ولا يمكن التراجع. <button class="btn sm danger" type="button" id="yesReset">نعم، امسح</button><button class="btn sm" type="button" id="noReset">تراجع</button></div>`;
    $('noReset').onclick=()=>$('resetConfirm').innerHTML='';
    $('yesReset').onclick=()=>{ const keep={firstOpen:ST.firstOpen,act:ST.act,hakba:ST.hakba}; ST=Object.assign(newStore(),keep); save(); location.reload(); };
  };
  // تبديل سريع من الشريط العلوي
  $('whoChip').onclick=()=>{
    if(!P){ openSetup(false); return; }
    openSheet('الحسابات',`<div class="profiles">${ST.profiles.map(p=>`<button class="prof ${p.id===ST.activeId?'on':''}" type="button" data-sw="${p.id}" style="font:inherit;color:inherit;cursor:pointer;text-align:right"><span class="av" style="background:${p.color}">${esc((p.name||'؟').trim().charAt(0))}</span><span class="p-txt"><b>${esc(p.name)}</b><span class="num">${profSummary(p)}</span></span>${p.id===ST.activeId?'<span class="tag ok">الحالي</span>':''}</button>`).join('')}</div><div class="row"><button class="btn primary sm" type="button" id="swNew">+ حساب جديد</button></div>`);
    $('sheetBody').querySelectorAll('[data-sw]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.sw));
    $('swNew').onclick=()=>{ closeSheet(); openSetup(true); };
  };
}

/* ================= آراء العملاء ================= */
const FB_KINDS=[['idea','💡 اقتراح'],['bug','🐞 مشكلة'],['praise','❤️ رأي']];
let fbRating=0, fbKind='idea';
function renderFeedback(){
  $('fbStars').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="${n===fbRating}" aria-label="${fmt(n)} من ٥" data-star="${n}" class="${n<=fbRating?'on':''}">★</button>`).join('');
  $('fbStars').querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>{ fbRating=+b.dataset.star; renderFeedback(); });
  $('fbKind').innerHTML=FB_KINDS.map(([k,v])=>`<button type="button" role="tab" data-k="${k}" aria-selected="${k===fbKind}">${v}</button>`).join('');
  $('fbKind').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ fbKind=b.dataset.k; renderFeedback(); });
}
function fbPayload(){ return {rating:fbRating||null,kind:fbKind,text:$('fbText').value.trim().slice(0,1500),contact:$('fbContact').value.trim().slice(0,80),app:VERSION,profiles:ST.profiles.length,days:ST.profiles.reduce((a,p)=>a+Object.keys(p.data.entries).length,0),lang:navigator.language||''}; }
async function flushFeedback(){
  const q=ST.ui.fbQueue||[]; if(!q.length||!navigator.onLine||!window.Hakba||!window.KHALES_FB) return;
  while(q.length){ try{ await window.Hakba.sendFeedback(q[0]); q.shift(); save(); }catch(e){ break; } }
}
function bindFeedback(){
  renderFeedback();
  $('fbSend').onclick=async()=>{
    const m=$('fbMsg'); if(!fbRating&&!$('fbText').value.trim()){ m.className='msg err'; m.textContent='اختر تقييمًا أو اكتب رأيك.'; return; }
    const fb=fbPayload(); $('fbSend').disabled=true; m.className='msg'; m.textContent='جارٍ الإرسال…';
    let sent=false; try{ if(navigator.onLine&&window.Hakba&&window.KHALES_FB){ await window.Hakba.sendFeedback(fb); sent=true; } }catch(e){}
    if(!sent){ ST.ui.fbQueue=(ST.ui.fbQueue||[]).concat([fb]); }
    ST.ui.fbSent=(ST.ui.fbSent||0)+1; ST.ui.fbAsked=true; save();
    m.textContent=sent?'وصلنا رأيك، شكرًا لك! 🌱':'حُفظ رأيك، وسيُرسل تلقائيًا عند الاتصال بالإنترنت.';
    $('fbText').value=''; fbRating=0; renderFeedback(); $('fbSend').disabled=false; $('fbHint').hidden=true;
  };
  $('fbHintGo').onclick=()=>{ ST.ui.fbAsked=true; save(); $('fbHint').hidden=true; go('me'); setTimeout(()=>$('fbCard').scrollIntoView({behavior:'smooth',block:'start'}),100); };
  $('fbHintNo').onclick=()=>{ ST.ui.fbSnooze=new Date().toISOString(); save(); $('fbHint').hidden=true; };
}
function renderFbHint(){
  const days=ST.profiles.reduce((a,p)=>a+Object.keys(p.data.entries).length,0), sn=ST.ui.fbSnooze?(Date.now()-new Date(ST.ui.fbSnooze))/864e5:99;
  $('fbHint').hidden=!(days>=7&&!ST.ui.fbAsked&&sn>=5);
}

/* ================= التثبيت ================= */
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});
window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true;toast('تم تثبيت خالص');});
$('installBtn').onclick=async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); try{await deferredPrompt.userChoice;}catch(e){} deferredPrompt=null; $('installBtn').hidden=true; };
function iosCheck(){ const ios=/iphone|ipad|ipod/i.test(navigator.userAgent), standalone=window.navigator.standalone||matchMedia('(display-mode: standalone)').matches; $('iosHint').hidden=!(ios&&!standalone&&!ST.ui.iosDismissed); }

/* ================= التشغيل ================= */
let bound=false;
function bindAll(){
  if(bound) return; bound=true;
  bindDebts(); bindTips(); bindMe(); bindFeedback();
  document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('meBtn').onclick=()=>go('me');
  $('sheetClose').onclick=closeSheet; $('sheetBack').onclick=closeSheet;
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('sheet').hidden) closeSheet(); });
  $('backupNow').onclick=()=>{ if(canShareFile()) doShare(); else doExport(null); };
  $('backupLater').onclick=()=>{ST.ui.backupSnooze=todayIso();save();renderBackupHint();};
  $('iosClose').onclick=()=>{ST.ui.iosDismissed=true;save();$('iosHint').hidden=true;};
  $('trialAct').onclick=()=>go('me');
}
function renderAll(){ renderFbHint(); flushFeedback(); if(P) renderDebts(); else renderHeader(); if(cur==='hakba'&&window.Hakba) window.Hakba.render(); if(!P) return; if(cur==='tips') renderTips(); if(cur==='learn') renderLearn(); if(cur==='me') renderMe(); }
function showApp(){
  if(needLock()){ showLock(); return; }
  $('setup').hidden=true; $('lock').hidden=true; $('app').hidden=false; appShown=true; bindAll(); if(PAID.includes(cur)) go(cur); else renderAll(); iosCheck();
  if(window.Hakba) window.Hakba.warm();
}
// الدخول لقسم الهكبة (مجاني) بدون دفتر ديون أو بعد انتهاء التجربة
function enterHakba(){ $('setup').hidden=true; $('lock').hidden=true; $('app').hidden=false; appShown=true; bindAll(); renderHeader(); go('hakba'); iosCheck(); }
function showLock(){
  window.scrollTo(0,0); $('app').hidden=true; $('setup').hidden=true; $('lock').hidden=false;
  $('buyLink').hidden=!CONFIG.BUY_URL; if(CONFIG.BUY_URL) $('buyLink').href=CONFIG.BUY_URL; $('buyHint').textContent=CONFIG.BUY_URL?'':CONFIG.BUY_HINT;
  $('lockSub').textContent=CONFIG.TRIAL_DAYS>0?'انتهت فترة التجربة المجانية. أدخل رمز التفعيل لتكمل، وبياناتك كلها محفوظة كما هي.':'أدخل رمز التفعيل الذي وصلك بعد الشراء.';
}
function boot(){
  LOC=ST.settings.digits==='en'?'ar-EG-u-nu-latn':'ar-EG';
  const joining=/join=/.test(location.hash), hk=((ST.hakba||{}).list||[]).length>0;
  if(!ST.profiles.length){ P=S=null;
    if(joining||hk){ enterHakba(); if(joining&&window.Hakba) window.Hakba.checkHash(); return; }
    if(needLock()) showLock(); else openSetup(false); return; }
  setActive(ST.activeId); simScale=null; simTouched=false; editing=null;
  buildPayInputs(); resetForm(); $('setup').hidden=true;
  if(joining){ enterHakba(); if(window.Hakba) window.Hakba.checkHash(); return; }
  if(needLock()){ showLock(); return; }
  showApp();
  if(navigator.storage&&navigator.storage.persist){ navigator.storage.persist().then(p=>{ $('storeInfo').textContent=p?'التخزين في هذا الجوال محمي من المسح التلقائي.':'المتصفح قد يمسح البيانات إذا امتلأت الذاكرة، لذلك احفظ نسخة احتياطية بانتظام.'; }).catch(()=>{}); }
}
$('codeBtn').onclick=()=>tryActivate($('codeIn').value,$('codeMsg'));
$('codeIn').addEventListener('keydown',e=>{ if(e.key==='Enter') $('codeBtn').click(); });
$('lockExport').onclick=()=>doExport(null);
$('lockHakba').onclick=()=>enterHakba();
bindSetup();

ST=normStore(loadStore()); if(!loadStore()) save();
// أدوات مشتركة لقسم الهكبة
window.__khalesCore={fmt,toNum,loc:()=>LOC,store:()=>ST,save,go,sheet:openSheet,closeSheet,toast,copy:copyText,
  curOptions:sel=>Object.keys(CUR).map(c=>`<option value="${c}" ${c===sel?'selected':''}>${curName(c)}</option>`).join(''),
  baseCur:()=>S?S.profile.base:guessCur(), profile:()=>S, profileName:()=>P?P.name:'', refreshHeader:()=>renderHeader()};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0); // بعد تحميل hakba.js

if('serviceWorker' in navigator){
  let waitingSW=null, reloading=false;
  const offer=w=>{ waitingSW=w; const b=$('updBanner'); if(b) b.hidden=false; };
  $('updBtn').onclick=()=>{ $('updBtn').disabled=true; $('updBtn').textContent='جارٍ التحديث…'; if(waitingSW) waitingSW.postMessage('skip'); else location.reload(); };

  // يعيد التحميل فقط عندما يضغط المستخدم «حدّث الآن» (وليس عند أول تثبيت، حتى لا يضيع رابط الدعوة)
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(reloading||!waitingSW) return; reloading=true; location.reload(); });
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').then(reg=>{
    if(reg.waiting&&navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{ const nw=reg.installing; if(!nw) return; nw.addEventListener('statechange',()=>{ if(nw.state==='installed'&&navigator.serviceWorker.controller) offer(nw); }); });
    // يتحقق من وجود تحديث كلما رجع المستخدم للتطبيق
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&navigator.onLine) reg.update().catch(()=>{}); });
  }).catch(()=>{}); });
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S&&!$('app').hidden){ if(needLock()&&PAID.includes(cur)) showLock(); else renderAll(); } });
// للاختبار من أداة المالك فقط
window.__khales={validCode,codeCheck,version:VERSION};
})();
