(async () => {
  const get = id => document.getElementById(id);
  const stage = get('workbench'), panel = get('window'), body = get('window-body');
  const menu = get('start-menu'), launcher = get('launcher'), running = get('running');
  const library = get('library'), sections = new Map([...library.querySelectorAll('.pane')].map(p => [p.id,p]));
  let camera = window.benchCamera;
  document.body.classList.add('ready');
  try {
    const {createWorkbench}=await import('./bench-world.js');
    camera=createWorkbench(stage);
    window.benchCamera=camera;
  } catch (error) {
    console.info('静止表示を使用します。',error);
  }
  if (!camera) return;
  document.body.classList.add('ready');
  camera.refresh();
  let active = '', minimized = '', returnTo, category = 'all', worksScroll = 0;
  let sound = false, audio, wallpaper;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { wallpaper=window.initWallpaper?.(get('wallpaper')); } catch(e){console.warn('壁紙の静止画を表示します。',e)}
  function setMotion(value){
    paused=value;camera.setPaused(value);wallpaper?.setPaused(value);
    get('motion').textContent=value?'動きを再開':'動きを止める';
    get('motion').setAttribute('aria-pressed',String(value));
  }
  setMotion(paused);
  reduced.addEventListener('change',e=>setMotion(e.matches));
  function updateWallpaper(){wallpaper?.setVisible(!document.hidden && !active)}
  document.addEventListener('visibilitychange',updateWallpaper);
  function tone(){
    if(!sound)return;
    try{
      audio??=new AudioContext();audio.resume().catch(()=>{});
      const osc=audio.createOscillator(), gain=audio.createGain(), t=audio.currentTime;
      osc.type='triangle';osc.frequency.setValueAtTime(620,t);osc.frequency.exponentialRampToValueAtTime(380,t+.045);
      gain.gain.setValueAtTime(.045,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.06);
      osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.065);
    }catch{sound=false;get('volume').setAttribute('aria-pressed','false')}
  }
  get('volume').addEventListener('click',()=>{
    sound=!sound;get('volume').setAttribute('aria-pressed',String(sound));get('volume').title=sound?'操作音を消す':'操作音を鳴らす';tone();
  });
  function setMenu(open,focusFirst=false){
    menu.hidden=!open;launcher.setAttribute('aria-expanded',String(open));
    if(open && focusFirst)menu.querySelector('a').focus();
  }
  launcher.onclick=()=>setMenu(menu.hidden,true);
  document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!launcher.contains(e.target))setMenu(false)});
  get('motion').onclick=()=>{setMotion(!paused);setMenu(false);launcher.focus()};
  const clockFormat=new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function tick(){const date=new Date();get('clock').textContent=clockFormat.format(date);get('clock').dateTime=date.toISOString();get('clock').title=date.toLocaleDateString('ja-JP',{dateStyle:'full'})}
  tick();setInterval(tick,15000);
  navigator.getBattery?.().then(b=>{
    const update=()=>{get('battery').textContent=Math.round(b.level*100)+'%';get('battery').title=b.charging?'バッテリー・充電中':'バッテリー残量';get('battery').hidden=false};
    b.addEventListener('levelchange',update);b.addEventListener('chargingchange',update);update();
  }).catch(()=>{});
  function focusScreen(on){
    camera.setFocus(on);
    const label=on?'机の全景に戻る':'画面を拡大';
    get('zoom').setAttribute('aria-label',label);get('zoom').title=label;
  }
  function setFilter(value){
    category=value;let n=0;
    const term=get('work-search').value.trim().normalize('NFKC').toLocaleLowerCase();
    sections.get('works').querySelectorAll('[data-tags]').forEach(a=>{
      const title=a.querySelector('strong').textContent.normalize('NFKC').toLocaleLowerCase();
      a.hidden=(value!=='all'&&!a.dataset.tags.split(' ').includes(value))||!title.includes(term);
      if(!a.hidden)n++;
    });
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.filter===value)));
    get('result-count').textContent=n+' 件';
    get('empty-results').hidden=n!==0;
  }
  get('work-search').addEventListener('input',()=>setFilter(category));
  const home=stage.querySelector('.desktop-home');
  let repositoryRequest;
  async function refreshRepositories(){
    const pane=sections.get('github');
    const list=pane.querySelector('.repo-list');
    const snapshot=new Map([...list.children].map(row=>[row.querySelector('h3 a').href,row]));
    const result=await fetch('https://api.github.com/users/NakakouTV/repos?type=owner&per_page=100&sort=updated',{signal:AbortSignal.timeout(5000)});
    if(!result.ok)return;
    const repos=await result.json();
    if(!Array.isArray(repos))return;
    const rows=[];
    for(const repo of repos){
      if(repo.private||repo.fork||repo.owner?.login?.toLowerCase()!=='nakakoutv'||!/^[\w.-]+$/.test(repo.name))continue;
      const url='https://github.com/NakakouTV/'+repo.name;
      let row=snapshot.get(url);
      if(!row){
        row=document.createElement('article');row.className='repo';
        const lang=document.createElement('small'), heading=document.createElement('h3'), anchor=document.createElement('a');
        anchor.href=url;anchor.target='_blank';anchor.rel='noopener';anchor.textContent=repo.name+' ↗';
        heading.append(anchor);row.append(lang,heading,document.createElement('p'));
      }
      row.querySelector('small').textContent=repo.language||'';
      if(repo.description && !snapshot.has(url))row.querySelector('p').textContent=repo.description;
      rows.push(row);
    }
    if(rows.length){
      list.replaceChildren(...rows);
      const stamp=pane.querySelector('.archive-end small');
      stamp.textContent='リポジトリ一覧はGitHubから取得 · 資料リンク '+stamp.textContent;
    }
  }
  function render(key,focusTitle=true){
    const next=sections.get(key);
    if(active==='works') worksScroll=body.scrollTop;
    if(active)library.append(sections.get(active));
    active=next?key:'';
    home.inert=Boolean(active);
    if(next){
      if(key==='github')repositoryRequest??=refreshRepositories().catch(()=>{});
      minimized='';focusScreen(true);body.replaceChildren(next);panel.hidden=false;
      get('window-title').textContent=next.dataset.title;
      running.hidden=false;running.textContent=next.dataset.title;
      body.scrollTop=key==='works'?worksScroll:0;
      if(focusTitle)get('window-title').focus({preventScroll:true});
    }else{
      panel.hidden=true;running.hidden=!minimized;
      if(!minimized)focusScreen(false);
      if(focusTitle && returnTo?.isConnected && !returnTo.closest('#library'))returnTo.focus({preventScroll:true});
    }
    updateWallpaper();setMenu(false);
  }
  function navigate(key,focusTitle=true){
    if(location.hash!=='#'+key)history.pushState(null,'','#'+key);
    render(key,focusTitle);
  }
  function route(){
    const hash=location.hash.slice(1),key=hash==='code'?'github':hash==='library'?'works':hash || document.body.dataset.entry;
    minimized='';render(key,false);
  }
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
  document.addEventListener('click',e=>{
    const filter=e.target.closest('[data-filter]');if(filter){setFilter(filter.dataset.filter);return}
    const a=e.target.closest('a[href^="#"]');
    if(!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)return;
    const key=a.hash==='#library'?'works':a.hash.slice(1);
    if(!sections.has(key))return;
    e.preventDefault();if(!active)returnTo=a;tone();navigate(key);
  });
  get('close-window').onclick=()=>{minimized='';tone();navigate('desk')};
  get('minimize').onclick=()=>{
    minimized=active;running.textContent=sections.get(active).dataset.title;tone();navigate('desk',false);running.focus();
  };
  const bar=panel.querySelector('.window-bar');
  let displacement={x:0,y:0},grab;
  const resetWindow=()=>{
    displacement={x:0,y:0};panel.style.translate='';panel.classList.remove('maximized');
    get('maximize').setAttribute('aria-pressed','false');get('maximize').setAttribute('aria-label','最大化');
  };
  function maximize(){
    const state=panel.classList.toggle('maximized');
    panel.style.translate=state?'':displacement.x+'px '+displacement.y+'px';
    get('maximize').setAttribute('aria-pressed',String(state));
    get('maximize').setAttribute('aria-label',state?'元のサイズに戻す':'最大化');
  }
  get('maximize').onclick=maximize;
  bar.ondblclick=e=>{if(!e.target.closest('button')&&get('maximize').offsetWidth)maximize()};
  bar.onpointerdown=e=>{
    if(!e.isPrimary||e.button!==0||e.target.closest('button')||panel.classList.contains('maximized')||!get('maximize').offsetWidth)return;
    grab={x:e.clientX,y:e.clientY,rect:panel.getBoundingClientRect(),origin:{...displacement}};
    bar.setPointerCapture(e.pointerId);
  };
  bar.onpointermove=e=>{
    if(!grab)return;
    const dx=Math.max(-grab.rect.left,Math.min(innerWidth-grab.rect.right,e.clientX-grab.x));
    const dy=Math.max(-grab.rect.top,Math.min(stage.querySelector('.taskbar').getBoundingClientRect().top-grab.rect.bottom,e.clientY-grab.y));
    displacement={x:grab.origin.x+dx,y:grab.origin.y+dy};
    panel.style.translate=displacement.x+'px '+displacement.y+'px';
  };
  bar.onlostpointercapture=()=>{grab=null};
  window.addEventListener('resize',resetWindow);
  running.onclick=()=>{if(minimized)navigate(minimized);else if(active)get('minimize').click()};
  get('enter').onclick=()=>{focusScreen(true);launcher.focus({preventScroll:true})};
  get('zoom').onclick=()=>{
    if(active || minimized){minimized='';navigate('desk');focusScreen(false)}
    else focusScreen(!camera.focused);
    tone();
  };
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(!get('boot').hidden){endBoot();return}
    if(!menu.hidden){setMenu(false);launcher.focus();return}
    if(active.startsWith('work-')||active==='archive')navigate('works');
    else if(active || minimized){minimized='';navigate('desk')}
    else if(camera.focused)focusScreen(false);
  });
  const featuredIds=['516590726','PkOeKdcEXws','1030515703','pwBZAH-Vdl8'];
  const tileMap=new Map([...sections.get('works').querySelectorAll('.work-tile')].map(a=>[a.hash.slice(6),a]));
  let featureIndex=0;
  get('next-feature').onclick=()=>{
    featureIndex=(featureIndex+1)%featuredIds.length;const tile=tileMap.get(featuredIds[featureIndex]);if(!tile)return;
    const anchor=get('featured');anchor.href=tile.hash;
    anchor.querySelector('img').src=tile.querySelector('img').src;
    anchor.querySelector('small').textContent=tile.dataset.tags.split(' ')[0];
    anchor.querySelector('strong').textContent=tile.querySelector('strong').textContent;
    tone();
  };
  let bootDone=false;
  function endBoot(){
    if(bootDone)return;bootDone=true;get('boot').hidden=true;
    get('display').inert=false;get('enter').inert=false;
    try{sessionStorage.setItem('nkt-boot','1')}catch{}
  }
  function boot(){
    let seen=false;try{seen=!!sessionStorage.getItem('nkt-boot')}catch{}
    if(seen || location.hash || document.body.dataset.entry){endBoot();return}
    const el=get('boot');el.hidden=false;get('display').inert=true;get('enter').inert=true;
    const started=performance.now(), status=get('boot-state'),bar=get('progress');
    get('skip-boot').onclick=endBoot;
    const assets=[get('machine'),new Image()];
    assets[1].src='assets/wallpaper.webp';
    bar.max=assets.length;
    Promise.all(assets.map(img=>img.decode().catch(()=>{}).then(()=>{
      bar.value+=1;status.textContent=bar.value===bar.max?'画面を開いています':'素材を読み込み中';
    }))).then(()=>setTimeout(endBoot,Math.max(0,(paused?0:780)-(performance.now()-started))));
    setTimeout(endBoot,3500);
  }
  route();boot();
  get('machine').addEventListener('error',()=>focusScreen(true));
})();
