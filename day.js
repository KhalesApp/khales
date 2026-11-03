/* =====================================================================
   خالص — قسم «يومي»: حصّالة اليوم
   الفكرة: كل يوم حصّالة. نيّتك، وخطواتك الثلاث، وإنجازاتك، وكلمتك عن يومك
   كلها عملات تسقط فيها. الأيام المليئة تصطف على «رف الحصالات».
   ===================================================================== */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const K=window.__khalesCore;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>K.fmt(n);
const iso=d=>{const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};
const dObj=s=>new Date(s+'T12:00:00');
const today=()=>iso(new Date());
const addD=(s,n)=>{const d=dObj(s);d.setDate(d.getDate()+n);return iso(d);};
const uid=()=>Math.random().toString(36).slice(2,9);
const FULL=12; // عدد العملات التي تملأ الحصالة

const PROMPTS=[
'ما أكثر لحظة شعرت فيها بالفخر اليوم؟','ما الشيء الذي تعلمته اليوم ولو كان صغيرًا؟','من الشخص الذي أثّر في يومك، وكيف؟',
'لو أعدت اليوم، ماذا ستفعل بطريقة مختلفة؟','ما الشيء الذي أجّلته اليوم، ولماذا؟','ما الذي أعطاك طاقة اليوم، وما الذي أخذها منك؟',
'ما أصعب شيء واجهته اليوم، وكيف تعاملت معه؟','ما الخطوة الصغيرة التي قرّبتك اليوم من هدفك الكبير؟','ما النعمة التي انتبهت لها اليوم؟',
'ما القرار الذي اتخذته اليوم وتشعر أنه صحيح؟','ما الذي ستشكر نفسك عليه بعد سنة من اليوم؟','اكتب جملة واحدة تلخص يومك.',
'ما الشيء الذي أضعت فيه وقتًا، وكيف تتجنبه غدًا؟','ما الفكرة التي خطرت لك اليوم وتستحق أن تُكتب؟','كيف خدمت شخصًا آخر اليوم؟',
'ما الذي جعلك تبتسم اليوم؟','ما العادة التي التزمت بها اليوم؟','ما الذي تحتاجه غدًا لتكون أفضل من اليوم؟',
'ما الذي أنجزته اليوم ولم يكن في خطتك؟','لو كان اليوم فصلًا في قصة حياتك، ما عنوانه؟','ما الرسالة التي تريد أن تقولها لنفسك صباح الغد؟'];
const MOODS=[['😞','ثقيل'],['😐','عادي'],['🙂','جيد'],['😄','ممتاز'],['🔥','استثنائي']];
const promptOf=d=>PROMPTS[Math.floor(dObj(d)/864e5)%PROMPTS.length];

/* ---------- البيانات ---------- */
const S=()=>K.profile();
function days(){ const s=S(); s.days=s.days||{}; return s.days; }
function day(d){ const D=days(); D[d]=D[d]||{intent:'',tasks:[],extra:[],journal:'',mood:null,tomorrow:'',closed:false}; return D[d]; }
function coins(x){ if(!x) return 0; let c=0; if(x.intent) c+=1; c+=x.tasks.filter(t=>t.done).length*2; c+=(x.extra||[]).length; if((x.journal||'').trim().length>=20) c+=3; else if((x.journal||'').trim()) c+=1; if(x.mood!=null) c+=1; if((x.tomorrow||'').trim()) c+=1; if(x.closed) c+=1; return c; }
function writtenStreak(){ const D=days(); let n=0, d=today(); if(!(D[d]&&coins(D[d])>0)) d=addD(d,-1); while(D[d]&&coins(D[d])>0){ n++; d=addD(d,-1);} return n; }
window.__khalesDayXP=()=>{ const s=K.profile(); if(!s||!s.days) return 0; return Object.values(s.days).reduce((a,x)=>a+coins(x)*2,0); };
function save(){ K.save(); K.refreshHeader(); }

/* ---------- الحصالة ---------- */
function jarSVG(c,big){
  const lvl=Math.min(1,c/FULL), H=big?150:56, W=big?120:46, top=big?28:11, inner=H-top-6, fillH=Math.round(inner*lvl);
  const n=Math.min(c,big?FULL:6), coinsSvg=[];
  for(let i=0;i<n&&big;i++){ const row=Math.floor(i/4), col=i%4; coinsSvg.push(`<circle cx="${26+col*22+(row%2?11:0)}" cy="${H-16-row*15}" r="8" class="coin"/>`); }
  return `<svg viewBox="0 0 ${W} ${H}" class="jar${big?' big':''}" aria-hidden="true">
    <defs><clipPath id="jc${big?'B':''}${c}"><rect x="${W*.12}" y="${top}" width="${W*.76}" height="${H-top-3}" rx="${big?18:7}"/></clipPath></defs>
    <rect x="${W*.12}" y="${top}" width="${W*.76}" height="${H-top-3}" rx="${big?18:7}" class="jar-glass"/>
    <g clip-path="url(#jc${big?'B':''}${c})"><rect x="0" y="${H-3-fillH}" width="${W}" height="${fillH}" class="jar-fill"/>${coinsSvg.join('')}</g>
    <rect x="${W*.28}" y="${top-(big?12:5)}" width="${W*.44}" height="${big?12:5}" rx="${big?4:2}" class="jar-lid"/>
    <rect x="${W*.4}" y="${top-(big?9:4)}" width="${W*.2}" height="${big?3:1.5}" rx="1" class="jar-slot"/>
  </svg>`;
}
function dropCoin(n){
  const j=document.querySelector('.day-jar'); if(!j||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for(let i=0;i<(n||1);i++){ const c=document.createElement('span'); c.className='coin-drop'; c.style.animationDelay=(i*120)+'ms'; j.appendChild(c); setTimeout(()=>c.remove(),900+i*120); }
}
function refreshJar(d){ const x=day(d), c=coins(x), j=document.querySelector('.day-jar'); if(!j) return;
  j.querySelector('svg').outerHTML=jarSVG(c,true); j.querySelector('.jar-count').innerHTML=`${fmt(c)}<small>/${fmt(FULL)}</small>`;
  const sh=document.querySelector('.shelf'); if(sh){ sh.innerHTML=shelf(); sh.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{ viewDate=b.dataset.day===today()?null:b.dataset.day; render(); window.scrollTo({top:0,behavior:'smooth'}); }); } }
function earn(n,msg){ if(n>0){ dropCoin(n); K.toast(msg||('+'+fmt(n)+' في حصّالة اليوم'),'xp'); } }

/* ---------- الواجهة ---------- */
let viewDate=null;
function greet(){ const h=new Date().getHours(); return h<12?'صباح الخير':h<17?'يومك سعيد':'مساء الخير'; }
function render(){
  const root=$('dayRoot'); if(!root||!S()) return;
  const d=viewDate||today(), isToday=d===today(), x=day(d), c=coins(x), st=writtenStreak(), name=(K.profileName()||'').split(' ')[0];
  const dl=dObj(d).toLocaleDateString(K.loc(),{weekday:'long',day:'numeric',month:'long'});
  root.innerHTML=`
  <section class="hero rose-hero day-hero">
    <div class="day-top">
      <div class="day-jar">${jarSVG(c,true)}<span class="jar-count num">${fmt(c)}<small>/${fmt(FULL)}</small></span></div>
      <div class="day-head">
        <span class="hero-lbl">${isToday?esc(greet())+(name?'، '+esc(name):''):'صفحة '+esc(dl)}</span>
        <h2 class="today-title">${isToday?'حصّالة يومك':esc(dl)}</h2>
        <p class="today-body small">${c>=FULL?'امتلأت حصّالتك اليوم. يوم يستحق أن يُحكى ✨':c?'كل خطوة تكتبها عملة. املأها قبل نهاية اليوم.':'ابدأ بنيّة واحدة، وشاهد الحصّالة تمتلئ.'}</p>
        <div class="row"><span class="tag light">🔥 ${fmt(st)} ${st===1?'يوم':'أيام'} متتالية</span>${!isToday?`<button class="btn sm on-hero" type="button" id="dyToday">رجوع لليوم</button>`:''}</div>
      </div>
    </div>
  </section>

  <section class="card day-intent">
    <span class="day-step">١</span>
    <div><h3 class="m0">نيّة اليوم</h3><p class="small muted m0">شيء واحد لو أنجزته، يكون يومك ناجحًا.</p></div>
    <input id="dyIntent" class="intent-in" value="${esc(x.intent)}" placeholder="مثال: أنهي تصميم صفحة المنتج" maxlength="120">
  </section>

  <section class="card">
    <div class="card-h"><div class="row"><span class="day-step">٢</span><h3 class="m0">ثلاث خطوات فقط</h3></div><span class="small muted">كل خطوة تنجزها = عملتان</span></div>
    <div class="steps3">${[0,1,2].map(i=>{ const t=x.tasks[i]; return t?`<div class="step3 ${t.done?'done':''}"><button class="tick" type="button" data-tick="${t.id}" aria-label="${t.done?'إلغاء الإنجاز':'تم'}">${t.done?'✓':''}</button><span class="st-t">${esc(t.t)}</span>${!t.done&&isToday?`<button class="icon-btn" type="button" data-later="${t.id}" title="أجّلها لبكرة">↩︎</button>`:''}<button class="icon-btn" type="button" data-deltask="${t.id}" aria-label="حذف">×</button></div>`
      :`<div class="step3 empty-step"><span class="tick ghost"></span><input data-newtask="${i}" placeholder="${['الخطوة الأهم…','الخطوة الثانية…','الخطوة الثالثة…'][i]}" maxlength="100"></div>`; }).join('')}</div>
  </section>

  <section class="card">
    <div class="card-h"><div class="row"><span class="day-step">٣</span><h3 class="m0">أنجزت شيئًا ما كان في الخطة؟</h3></div><span class="small muted">عملة لكل إنجاز</span></div>
    <div class="extras">${(x.extra||[]).map((e,i)=>`<span class="extra-chip">⭐ ${esc(e.t)} <button type="button" data-delx="${i}" aria-label="حذف">×</button></span>`).join('')}</div>
    <div class="row"><input id="dyExtra" placeholder="مثال: ساعدت زميلي، قرأت ١٠ صفحات، رتّبت المحل" maxlength="100" style="flex:1"><button class="btn sm rose" type="button" id="dyExtraAdd">أضف</button></div>
  </section>

  <section class="card day-journal">
    <div class="card-h"><div class="row"><span class="day-step">٤</span><h3 class="m0">دفتر اليوم</h3></div><span class="small muted">٣ عملات لكلمة صادقة</span></div>
    <div class="prompt">«${esc(promptOf(d))}»</div>
    <textarea id="dyJournal" placeholder="اكتب بحرية… لا أحد يقرأها غيرك.">${esc(x.journal)}</textarea>
    <div><span class="small muted">كيف كان يومك؟</span><div class="moods">${MOODS.map((m,i)=>`<button type="button" class="mood ${x.mood===i?'on':''}" data-mood="${i}"><span>${m[0]}</span><small>${m[1]}</small></button>`).join('')}</div></div>
    <label>كلمة لنفسك بكرة<input id="dyTmr" value="${esc(x.tomorrow)}" placeholder="مثال: ابدأ بالأصعب قبل الظهر" maxlength="140"></label>
    <div class="row"><button class="btn rose" type="button" id="dyClose">${x.closed?'عرض بطاقة يومك':'اختم يومك'}</button><span class="small muted" id="dySaved"></span></div>
  </section>

  <section class="card">
    <div class="card-h"><h3 class="m0">رف الحصالات</h3><span class="small muted num">${weekLine()}</span></div>
    <div class="shelf">${shelf()}</div>
    <p class="small muted m0">اضغط أي حصّالة لتفتح صفحة ذلك اليوم.</p>
  </section>`;
  bind(d,x);
}
function weekLine(){ let t=0,j=0; for(let i=0;i<7;i++){ const x=days()[addD(today(),-i)]; if(!x) continue; t+=x.tasks.filter(k=>k.done).length+(x.extra||[]).length; if((x.journal||'').trim()) j++; } return `هذا الأسبوع: ${fmt(t)} إنجاز · ${fmt(j)} صفحة`; }
function shelf(){ const out=[]; for(let i=13;i>=0;i--){ const d=addD(today(),-i), x=days()[d], c=coins(x), wd=dObj(d).toLocaleDateString(K.loc(),{weekday:'short'}); out.push(`<button type="button" class="shelf-jar ${d===(viewDate||today())?'on':''} ${c>=FULL?'full':''}" data-day="${d}" title="${d}">${jarSVG(c,false)}<small>${i===0?'اليوم':esc(wd)}</small></button>`); } return out.join(''); }
let saveT;
function bind(d,x){
  const root=$('dayRoot');
  const later=()=>{ clearTimeout(saveT); $('dySaved').textContent='يُحفظ…'; saveT=setTimeout(()=>{ save(); $('dySaved').textContent='محفوظ ✓'; },500); };
  const t=$('dyToday'); if(t) t.onclick=()=>{ viewDate=null; render(); };
  $('dyIntent').onchange=()=>{ const had=!!x.intent; x.intent=$('dyIntent').value.trim(); save(); refreshJar(d); if(!had&&x.intent) earn(1,'نيّة واضحة · +١'); };
  // تُضاف الخطوة بزر Enter أو عند الخروج من الخانة، مرة واحدة فقط
  const addTask=(inp,refocus)=>{ const v=inp.value.trim(); if(!v||x.tasks.length>=3) return; inp.value=''; x.tasks.push({id:uid(),t:v,done:false}); save(); render(); if(refocus){ const n=$('dayRoot').querySelector('[data-newtask]'); if(n) n.focus(); } };
  root.querySelectorAll('[data-newtask]').forEach(inp=>{ inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addTask(inp,true); } }); inp.addEventListener('blur',e=>addTask(inp,!!(e.relatedTarget&&e.relatedTarget.dataset&&'newtask' in e.relatedTarget.dataset))); });
  root.querySelectorAll('[data-tick]').forEach(b=>b.onclick=()=>{ const k=x.tasks.find(q=>q.id===b.dataset.tick); k.done=!k.done; k.at=k.done?new Date().toISOString():null; save();
    if(k.done){ const all=x.tasks.length===3&&x.tasks.every(q=>q.done); render(); earn(2,all?'أنجزت خطواتك الثلاث! 🎉':'+٢ في الحصّالة'); } else render(); });
  root.querySelectorAll('[data-later]').forEach(b=>b.onclick=()=>{ const i=x.tasks.findIndex(q=>q.id===b.dataset.later); const tm=day(addD(d,1)); if(tm.tasks.length>=3){ K.toast('خطوات بكرة مكتملة (٣)'); return; } const [k]=x.tasks.splice(i,1); tm.tasks.push({id:uid(),t:k.t,done:false}); save(); render(); K.toast('انتقلت لبكرة'); });
  root.querySelectorAll('[data-deltask]').forEach(b=>b.onclick=()=>{ x.tasks=x.tasks.filter(q=>q.id!==b.dataset.deltask); save(); render(); });
  const addX=()=>{ const v=$('dyExtra').value.trim(); if(!v) return; x.extra=x.extra||[]; x.extra.push({t:v,at:new Date().toISOString()}); save(); render(); earn(1,'⭐ إنجاز إضافي · +١'); };
  $('dyExtraAdd').onclick=addX; $('dyExtra').addEventListener('keydown',e=>{ if(e.key==='Enter') addX(); });
  root.querySelectorAll('[data-delx]').forEach(b=>b.onclick=()=>{ x.extra.splice(+b.dataset.delx,1); save(); render(); });
  let jBefore=coins(x);
  $('dyJournal').addEventListener('input',()=>{ x.journal=$('dyJournal').value; later(); });
  $('dyJournal').addEventListener('blur',()=>{ const n=coins(x); if(n>jBefore){ save(); refreshJar(d); earn(n-jBefore,'كلمة صادقة · +'+fmt(n-jBefore)); } jBefore=n; });
  root.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{ const first=x.mood==null; x.mood=+b.dataset.mood; save(); root.querySelectorAll('[data-mood]').forEach(m=>m.classList.toggle('on',m===b)); refreshJar(d); if(first) earn(1); });
  $('dyTmr').onchange=()=>{ const first=!x.tomorrow; x.tomorrow=$('dyTmr').value.trim(); save(); refreshJar(d); if(first&&x.tomorrow) earn(1); };
  $('dyClose').onclick=()=>{ x.journal=$('dyJournal').value; x.tomorrow=$('dyTmr').value.trim(); x.intent=$('dyIntent').value.trim(); if(!x.closed){ x.closed=true; save(); earn(1,'ختمت يومك · +١'); } else save(); card(d,x); render(); };
  root.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{ viewDate=b.dataset.day===today()?null:b.dataset.day; render(); window.scrollTo({top:0,behavior:'smooth'}); });
}
function cardText(d,x){
  const dl=dObj(d).toLocaleDateString(K.loc(),{weekday:'long',day:'numeric',month:'long'}), done=x.tasks.filter(t=>t.done), m=x.mood!=null?MOODS[x.mood]:null;
  return [`📒 يومي — ${dl}`, x.intent?`🎯 نيّتي: ${x.intent}`:'', done.length?`✅ أنجزت: ${done.map(t=>t.t).join('، ')}`:'', (x.extra||[]).length?`⭐ وأيضًا: ${x.extra.map(e=>e.t).join('، ')}`:'', m?`${m[0]} يومي كان ${m[1]}`:'', x.tomorrow?`✉️ لنفسي بكرة: ${x.tomorrow}`:'', `🪙 ${coins(x)} عملة في حصّالة اليوم`, '', '— من تطبيق خالص'].filter((l,i,a)=>l||i===a.length-2).join('\n');
}
function card(d,x){
  const done=x.tasks.filter(t=>t.done), m=x.mood!=null?MOODS[x.mood]:null, c=coins(x);
  K.sheet('بطاقة يومك',`<div class="day-card">
    <div class="dc-jar">${jarSVG(c,true)}</div>
    <div class="dc-body"><b class="dc-date">${esc(dObj(d).toLocaleDateString(K.loc(),{weekday:'long',day:'numeric',month:'long'}))}</b>
    ${x.intent?`<div>🎯 ${esc(x.intent)}</div>`:''}
    ${done.length?`<div>✅ ${done.map(t=>esc(t.t)).join(' · ')}</div>`:''}
    ${(x.extra||[]).length?`<div>⭐ ${x.extra.map(e=>esc(e.t)).join(' · ')}</div>`:''}
    ${m?`<div>${m[0]} يوم ${m[1]}</div>`:''}
    ${x.tomorrow?`<div class="dc-tmr">«${esc(x.tomorrow)}»</div>`:''}
    <div class="num small">🪙 ${fmt(c)} عملة · 🔥 ${fmt(writtenStreak())} أيام متتالية</div></div></div>
    <p class="small muted m0">${c>=FULL?'يوم كامل. هذا هو الشخص الذي تريد أن تكونه.':'كل يوم تكتب فيه تبني نسخة أقوى منك. أراك بكرة.'}</p>
    <div class="row"><button class="btn rose" type="button" id="dcCopy">نسخ البطاقة</button></div>`);
  $('dcCopy').onclick=e=>K.copy(cardText(d,x),e.currentTarget);
}
window.Day={render,open(){ viewDate=null; render(); }};
})();
