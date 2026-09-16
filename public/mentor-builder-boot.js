(()=>{
  const KEY='mls_mentor_code';
  function boot(){
    const dashboard=document.querySelector('[data-testid="mentor-dashboard"]');
    if(!dashboard) return;
    try{
      if(!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY,'CECEKOKOMLS');
    }catch{}
  }
  new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
  boot();
})();
