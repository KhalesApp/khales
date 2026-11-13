/* خالص © KhalesApp — جميع الحقوق محفوظة */
(function(){"use strict";const t=window.__khalesCore,y=t.$,a=t.fmt,g=t.esc,R=()=>t.profile();let $="week",v=0,d="xp";const j=[["xp","النقاط","var(--gold)"],["share","الدخل","var(--em)"],["paid","السداد","var(--gold)"],["exp","المصاريف","var(--coral)"],["goals","الأهداف","var(--ro)"]];function D(n,c,o){const e=new Date().getHours(),i=(t.profileName()||"").split(" ")[0],u=n.filter(p=>!p.done).length,r=(e<12?"صباح الخير":e<17?"يومك سعيد":"مساء الخير")+(i?" يا "+i:"");return u?u===n.length?{mood:e>=21?"sleep":"hi",t:r+". "+(o.cur>1?`أنت على سلسلة ${a(o.cur)} أيام، لا تقطعها اليوم.`:"خطوة صغيرة اليوم تقرّبك من «خالص».")}:{mood:"happy",t:r+`. باقي ${a(u)} ${u===1?"مهمة":"مهام"} ويكتمل يومك.`}:{mood:"cheer",t:r+"! أنهيت كل مهام اليوم. هكذا يطير الأحرار 🎉"}}function H(n){if(n.kind==="day"){const c=[];for(let o=6;o>=0;o--){const e=t.addD(n.from,-o);c.push({from:e,to:e,label:t.dateObj(e).toLocaleDateString(t.loc(),{weekday:"short"})})}return c}return n.buckets}function f(){const n=y("homeRoot");if(!n||!R())return;const c=R(),o=t.levelInfo(),e=t.streaks(),i=t.quests(),u=D(i,o,e),r=t.period($,v),p=t.sumRange(r.from,r.to),b=t.totals(),w=t.badges(),k=H(r),x=i.filter(s=>s.done).length,T=j.filter(s=>s[0]===d)[0],B=k.map(s=>t.sumRange(s.from,s.to)[d]||0),A=(window.LEARN||[]).reduce((s,l)=>s+l.lessons.length,0)+(window.LEARN_BIZ||[]).length,M=Object.keys(c.learn.done).length,S=t.period("month",0),q=t.sumRange(S.from,S.to),m=c.budget.n+c.budget.i+c.budget.l,E=t.period("week",0),h=t.sumRange(E.from,E.to),L=window.Hakba&&window.Hakba.count?window.Hakba.count():0,C=c.lib.filter(s=>s.finishedAt).length;n.innerHTML=`
  <section class="home-hero">
    <div class="hh-top"><div class="mascot" id="homeMascot">${t.hurr(u.mood)}</div><div class="bubble">${g(u.t)}</div></div>
    <div class="lvl-card"><div class="lvl-badge"><b class="num">${a(o.lvl)}</b><small>مستوى</small></div>
      <div class="lvl-body"><div class="row sp"><b>${g(o.title)}</b><span class="num small">${a(o.into)} / ${a(100)}</span></div><div class="lvl-bar"><i style="width:${o.into}%"></i></div>
      <div class="row sp small"><span class="num">⭐ ${a(o.xp)} نقطة</span><span class="num">🔥 ${a(e.cur)} ${e.cur===1?"يوم":"أيام"} متتالية</span></div></div></div>
  </section>

  <section class="card quests"><div class="card-h"><h2>مهام اليوم</h2><span class="tag ${x===i.length?"ok":"warn"} num">${a(x)} / ${a(i.length)}</span></div>
    <div class="q-track"><i style="width:${x/i.length*100}%"></i></div>
    ${i.map(s=>`<button type="button" class="quest ${s.done?"done":""}" data-q="${s.go.join(":")}"><span class="q-tick">${s.done?"✓":""}</span><span class="q-t">${g(s.t)}</span><svg viewBox="0 0 24 24" class="ic xs"><path d="M15 6l-6 6 6 6"/></svg></button>`).join("")}
  </section>

  <section class="card dash"><div class="card-h"><h2>لوحة إنجازاتك</h2></div>
    ${t.pnav(["day","week","month","quarter","year"],$,v,r.label)}
    <div class="tiles">
      <button type="button" class="tile ${d==="xp"?"on":""}" data-m="xp"><span>النقاط</span><b class="num">${a(p.xp)}</b></button>
      <button type="button" class="tile ${d==="share"?"on":""}" data-m="share"><span>${b.div>1?"نصيبك":"الدخل"}</span><b class="num">${a(p.share)}</b></button>
      <button type="button" class="tile ${d==="paid"?"on":""}" data-m="paid"><span>السداد</span><b class="num">${a(p.paid)}</b></button>
      <button type="button" class="tile ${d==="exp"?"on":""}" data-m="exp"><span>المصاريف</span><b class="num">${a(p.exp)}</b></button>
      <button type="button" class="tile ${d==="goals"?"on":""}" data-m="goals"><span>أهداف منجزة</span><b class="num">${a(p.goals)}</b></button>
      <div class="tile static"><span>دروس مكتملة</span><b class="num">${a(p.lessons)}</b></div>
    </div>
    ${k.length?t.barChart({labels:k.map(s=>s.label),series:[{name:T[1],color:T[2],values:B}],h:190}):""}
    <p class="small muted m0 center">اضغط أي بطاقة لترى رسمها${$==="day"?" · آخر ٧ أيام":""}</p>
  </section>

  <section class="card"><div class="card-h"><h2>أقسامك</h2></div>
    <div class="secs">
      <button type="button" class="sec" data-go="money:debt">${t.ring(b.debt?b.pct:0,"var(--em)",b.debt?null:"—")}<b>الدين</b><span class="num">${b.debt?b.remaining>0?"باقٍ "+a(b.remaining):"خالص ✓":"لا دين"}</span></button>
      <button type="button" class="sec" data-go="money:exp">${t.ring(m?q.exp/m*100:0,q.exp>m&&m?"var(--coral)":"var(--gold)",m?null:"—")}<b>خطة الشهر</b><span class="num">${m?a(q.exp)+" / "+a(m):"ضع خطتك"}</span></button>
      <button type="button" class="sec" data-go="day">${t.ring(h.goalsT?h.goals/h.goalsT*100:0,"var(--ro)",h.goalsT?null:"—")}<b>أهداف الأسبوع</b><span class="num">${a(h.goals)} / ${a(h.goalsT)}</span></button>
      <button type="button" class="sec" data-go="learn">${t.ring(A?M/A*100:0,"var(--vi)")}<b>التعلّم</b><span class="num">${a(M)} درس · ${a(C)} كتاب</span></button>
      <button type="button" class="sec" data-go="hakba">${t.ring(L?100:0,"var(--bl)",a(L))}<b>الهكبة</b><span>${L?"هكباتك":"ابدأ هكبة"}</span></button>
    </div>
  </section>

  <section class="card"><div class="card-h"><h2>أوسمتك</h2><span class="small muted num">${a(w.filter(s=>s.on).length)} / ${a(w.length)}</span></div>
    <div class="badges">${w.map(s=>`<button type="button" class="badge ${s.on?"on":""}" data-b="${s.id}">${t.badgeSvg(s.on)}<span>${g(s.name)}</span></button>`).join("")}</div>
  </section>`,t.bindPnav(n,(s,l)=>{s?($=s,v=0):v=Math.min(0,v+l),f()}),n.querySelectorAll("[data-m]").forEach(s=>{s.onclick=()=>{d=s.dataset.m,f()}}),n.querySelectorAll("[data-q],[data-go]").forEach(s=>{s.onclick=()=>{const l=(s.dataset.q||s.dataset.go).split(":");t.go(l[0],l[1])}}),n.querySelectorAll("[data-b]").forEach(s=>{s.onclick=()=>{const l=w.filter(I=>I.id===s.dataset.b)[0];t.toast(l.on?"✓ "+l.name+" — "+l.how:"🔒 "+l.how)}}),y("homeMascot").onclick=()=>{const s=y("homeMascot");s.classList.remove("hop"),s.offsetWidth,s.classList.add("hop")}}t.views.home={open:f,render:f}})();
