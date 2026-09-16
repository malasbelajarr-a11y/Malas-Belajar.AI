(()=>{
const HIDE_TABS=['tryout','explanations','questions'];
function exact(e,v){return(e.textContent||'').trim().toLowerCase()===v}
function run(){const d=document.querySelector('[data-testid="mentor-dashboard"]');if(!d)return;
HIDE_TABS.forEach(n=>{const b=d.querySelector(`[data-testid="mentor-tab-${n}"]`);if(b)b.style.display='none'});
['buat kode sekali pakai','konten mentor','penjelasan mentor','buat penjelasan','kelola tryout','buat tryout sekali pakai','tryout','penjelasan','questions'].forEach(v=>{Array.from(d.querySelectorAll('*')).filter(e=>exact(e,v)&&!e.closest('#mls-mentor-builder')).forEach(e=>{const s=e.closest('section');if(s)s.style.display='none'})});
}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});run();setInterval(run,1000);
})();