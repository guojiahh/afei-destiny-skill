(function(){
  'use strict';
  let config=window.WAYFINDER_TEMPLATE||{};
  if(new URLSearchParams(location.search).get('draft')==='1'){
    try{const draft=JSON.parse(localStorage.getItem('wayfinder-template-draft')||'null');if(draft)config={...config,...draft,copy:{...config.copy,...draft.copy},engine:{...config.engine,...draft.engine},assets:{...config.assets,...draft.assets}};}catch(error){console.warn('Cannot read template draft',error);}
  }
  window.WAYFINDER_TEMPLATE=config;
  window[Symbol.for('wayfinder.config')]={lang:config.language==='fr'?'fr':'en',nfbHeader:false};
  document.title=config.pageTitle||'Wayfinder';
  document.documentElement.lang=config.language||'en';
  const description=document.querySelector('meta[name="description"]');if(description)description.content=config.description||'';
  function showError(error){const box=document.getElementById('load-error');if(!box)return;box.hidden=false;document.getElementById('load-error-detail').textContent=String(error.message||error);}
  window.addEventListener('error',event=>{if(event.error&&/WebGL|context|Failed to fetch|Cannot find module/i.test(String(event.error)))showError(event.error);});
  window.addEventListener('unhandledrejection',event=>showError(event.reason||'加载失败'));
  const api={
    config,
    asset(path){const replacement=config.assets&&config.assets[path];return replacement||'./assets/'+path.replace(/^\//,'');},
    async connect(){
      const header=document.querySelector('.template-header');header.hidden=config.header===false;
      if(config.headerLabel){const brand=header.querySelector('.brand');brand.textContent=config.headerLabel;brand.style.width='auto';brand.style.padding='0 18px';}
      const info=document.getElementById('template-info');
      document.getElementById('header-info').addEventListener('click',()=>info.showModal());
      info.querySelector('.dialog-close').addEventListener('click',()=>info.close());
      info.addEventListener('click',event=>{if(event.target===info){const r=info.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)info.close();}});
      document.getElementById('header-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){console.warn(error);}});
      const locale=window.parcelRequire('JAae');
      const stores=window.parcelRequire('G9ej');
      const audio=document.getElementById('header-audio');
      stores.audioState.update(value=>({...value,muted:!!config.muted}));
      stores.audioState.subscribe(value=>{header.classList.toggle('is-muted',value.muted);audio.setAttribute('aria-label',value.muted?'Enable sound':'Mute sound');audio.setAttribute('aria-pressed',String(value.muted));});
      audio.addEventListener('click',()=>stores.audioState.update(value=>({...value,muted:!value.muted})));
      const lang=document.getElementById('header-language');
      locale.language.subscribe(value=>lang.textContent=value==='en'?'FR':'EN');
      lang.addEventListener('click',()=>locale.language.set(locale.language.get()==='en'?'fr':'en'));
      if(config.title){
        const changeTitle=()=>document.querySelectorAll('img').forEach(img=>{if(/title2_(en|fr)\./.test(img.getAttribute('src')||'')){
          const title=document.createElement('span');title.className=img.className+' template-title';title.textContent=config.title;title.setAttribute('role','heading');title.setAttribute('aria-level','1');img.replaceWith(title);
        }});
        const observer=new MutationObserver(changeTitle);observer.observe(document.querySelector('main.content'),{childList:true,subtree:true});changeTitle();
      }
      api.setCopy=copy=>{Object.assign(config.copy||(config.copy={}),copy);locale.localize.update(value=>({...value,...copy}));};
      api.setMuted=muted=>stores.audioState.update(value=>({...value,muted:!!muted}));
      const engine=window[Symbol.for('wayfinder.config')];
      await engine.init();
      api.world=engine.world;api.tags=engine.Tags;api.engine=engine;
      document.dispatchEvent(new CustomEvent('wayfinder-ready',{detail:api}));
    }
  };
  window.WayfinderTemplate=api;
})();
