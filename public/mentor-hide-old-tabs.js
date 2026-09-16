(()=>{
const LEGACY=['students','codes','map','wacawaci','live'],HIDE=['tryout','explanations','questions',...LEGACY];
function exact(e,v){return(e.textContent||'').trim().toLowerCase()===v}
function hideSectionByText(root,names){Array.from(root.querySelectorAll('*')).forEach(e=>{if(!names.includes((e.textContent||'').trim().toLowerCase()))return;const s=e.closest('section');if(s&&!s.closest('#mls-mentor-builder'))s.style.display='none'})}
function run(){const d=document.querySelector('[data-testid="mentor-dashboard"]');if(!d)return;
HIDE.forEach(n=>{const b=d.querySelector(`[data-testid="mentor-tab-${n}"]`);if(b)b.style.display='none'});
const bs=Array.from(d.querySelectorAll('button')).filter(b=>LEGACY.includes((b.textContent||'').trim().toLowerCase()));if(bs.length>=LEGACY.length){let n=bs[0];for(let i=0;i<6&&n&&n!==d;i++,n=n.parentElement){if(LEGACY.every(x=>(n.textContent||'').toLowerCase().includes(x))){n.style.display='none';break}}}
['buat kode sekali pakai','konten mentor','penjelasan mentor','buat penjelasan','kelola tryout','buat tryout sekali pakai','tryout','penjelasan','questions'].forEach(v=>{Array.from(d.querySelectorAll('*')).filter(e=>exact(e,v)&&!e.closest('#mls-mentor-builder')).forEach(e=>{const s=e.closest('section');if(s)s.style.display='none'})});
}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});run();setInterval(run,1000);
})();