(() => {
  const styleId="mls-rodi-quiz-style";
  function mount(){
    const root=document.querySelector('[data-testid="rodi-locker"]');
    if(!root||document.getElementById("mls-rodi-mentor-quiz"))return;
    if(!document.querySelector('[data-testid="mentor-dashboard"]')){
      fetch('/api/rodi/module').then(r=>r.json()).then(data=>{
        const qs=(data.questions||[]).filter(q=>String(q.id).startsWith('mentor-')).slice(0,10);
        if(!qs.length)return;
        if(!document.getElementById(styleId)){const s=document.createElement('style');s.id=styleId;s.textContent='#mls-rodi-mentor-quiz{margin-top:28px}.rq-card{border:3px solid #2e1065;border-radius:12px;background:white;padding:16px;margin-top:12px;box-shadow:4px 4px 0 #2e1065}.rq-opt{display:block;width:100%;text-align:left;border:2px solid #ddd6fe;background:#fff;padding:10px;border-radius:8px;margin-top:7px;font-weight:700;cursor:pointer}.rq-opt:hover{background:#fef3c7}.rq-feedback{margin-top:12px;padding:12px;border-radius:9px;background:#fef3c7;border:2px solid #92400e;font-size:12px;line-height:1.6}';document.head.appendChild(s)}
        const sec=document.createElement('section');sec.id='mls-rodi-mentor-quiz';sec.innerHTML='<div class="pixel-card bg-pink-300 p-5"><p class="pixel-label">KUIS SOAL MENTOR</p><h2 class="pixel-title text-2xl text-violet-950">RODI · BENAR / SALAH + PEMBAHASAN</h2><p class="mt-2 text-xs font-bold text-violet-900">Pilih jawaban. Jawaban benar dan pembahasan langsung muncul setelah kamu menjawab.</p></div>';
        qs.forEach((q,i)=>{const card=document.createElement('article');card.className='rq-card';card.innerHTML=`<div style="font-size:11px;font-weight:900;color:#be185d">${q.chapter_label} · SOAL ${i+1}</div><p style="margin-top:8px;font-weight:900;line-height:1.6">${q.prompt}</p><div class="rq-options"></div><div class="rq-feedback" hidden></div>`;const opts=card.querySelector('.rq-options');q.options.forEach((o,j)=>{const b=document.createElement('button');b.className='rq-opt';b.textContent=`${String.fromCharCode(65+j)}. ${o}`;b.onclick=()=>{const f=card.querySelector('.rq-feedback');const ok=j===q.correct_option;f.hidden=false;f.innerHTML=`<strong>${ok?'✓ BENAR':'✕ SALAH'}</strong><br>Jawaban benar: ${String.fromCharCode(65+(q.correct_option??0))}. ${q.answer}<br><br>${(q.steps||[]).map((x,k)=>`${k+1}. ${x}`).join('<br>')}${q.trap_tip?`<br><br><strong>Tip:</strong> ${q.trap_tip}`:''}${q.video_url?`<br><br><a href="${q.video_url}" target="_blank" rel="noreferrer">🎥 Buka video pembahasan</a>`:''}${q.file_url?`<br><a href="${q.file_url}" target="_blank" rel="noreferrer">📄 Buka file pembahasan</a>`:''}`;[...opts.children].forEach(x=>x.disabled=true)};opts.appendChild(b)});sec.appendChild(card)});
        const anchor=root.querySelector('section.mt-8');root.querySelector('.mx-auto.max-w-7xl')?.appendChild(sec);
      }).catch(()=>{});
    }
  }
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setInterval(mount,1000);
})();