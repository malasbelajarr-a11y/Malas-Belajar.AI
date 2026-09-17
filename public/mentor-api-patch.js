(()=>{
  const originalFetch=window.fetch.bind(window);
  const map={
    '/api/admin/access-codes':'access-codes',
    '/api/admin/mentor-bank/questions':'questions',
    '/api/admin/mentor-bank':'bank',
    '/api/admin/mentor-bank/tryouts':'tryouts',
    '/api/live-classes':'live'
  };
  function rewritten(input){
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    try{
      const u=new URL(raw,window.location.origin); const action=map[u.pathname];
      if(!action)return null;
      u.pathname='/api/mentor-actions'; u.search=`action=${encodeURIComponent(action)}${u.search?`&${u.search.slice(1)}`:''}`;
      return typeof input==='string'?u.pathname+u.search:new Request(u.toString(),input);
    }catch{return null}
  }
  window.fetch=(input,init)=>{const next=rewritten(input);return originalFetch(next||input,init)};
})();
