(()=>{
  const originalFetch=window.fetch.bind(window);
  const map={
    '/api/admin/access-codes':'access-codes',
    '/api/admin/mentor-bank/questions':'questions',
    '/api/admin/mentor-bank':'bank',
    '/api/admin/mentor-bank/tryouts':'tryouts',
    '/api/live-classes':'live'
  };
  const CACHE='mls_mentor_bank_cache_v2';
  function readCache(){try{return JSON.parse(localStorage.getItem(CACHE)||'{"questions":[],"tryouts":[],"lives":[]}')}catch{return {questions:[],tryouts:[],lives:[]}}}
  function writeCache(x){try{localStorage.setItem(CACHE,JSON.stringify(x))}catch{}}
  function rewritten(input){
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    try{
      const u=new URL(raw,window.location.origin); const action=map[u.pathname];
      if(!action)return null;
      u.pathname='/api/mentor-actions'; u.search=`action=${encodeURIComponent(action)}${u.search?`&${u.search.slice(1)}`:''}`;
      return typeof input==='string'?u.pathname+u.search:new Request(u.toString(),input);
    }catch{return null}
  }
  window.fetch=async(input,init)=>{
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    let action=''; try{action=map[new URL(raw,window.location.origin).pathname]||''}catch{}
    const next=rewritten(input);
    if(!next)return originalFetch(input,init);
    try{
      const response=await originalFetch(next,init);
      if(response.ok){
        try{
          const data=await response.clone().json(); const cache=readCache();
          if(action==='questions'&&data?.id){cache.questions=[data,...cache.questions.filter(x=>x.id!==data.id)];writeCache(cache)}
          if(action==='tryouts'&&data?.id){cache.tryouts=[data,...cache.tryouts.filter(x=>x.id!==data.id)];writeCache(cache)}
          if(action==='live'&&data?.id){cache.lives=[data,...cache.lives.filter(x=>x.id!==data.id)];writeCache(cache)}
          if(action==='bank'&&Array.isArray(data?.questions)){cache.questions=data.questions;cache.tryouts=data.tryouts||[];writeCache(cache)}
          if(action==='live'&&Array.isArray(data)){cache.lives=data;writeCache(cache)}
        }catch{}
      }
      if((!response.ok)&&action==='bank'){
        const cache=readCache(); if(cache.questions.length||cache.tryouts.length){return new Response(JSON.stringify({subtests:[],questions:cache.questions,tryouts:cache.tryouts}),{status:200,headers:{'Content-Type':'application/json'}})}
      }
      return response;
    }catch(error){
      if(action==='bank'){
        const cache=readCache(); if(cache.questions.length||cache.tryouts.length)return new Response(JSON.stringify({subtests:[],questions:cache.questions,tryouts:cache.tryouts}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      throw error;
    }
  };
})();
