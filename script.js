(function(){
  const $ = sel => document.querySelector(sel);
  const grid = $('#grid');
  const empty = $('#empty');
  const countTag = $('#countTag');
  const search = $('#search');
  const dialog = $('#appDialog');
  const form = $('#appForm');
  const addBtn = $('#addBtn');
  const closeDialog = $('#closeDialog');
  const deleteBtn = $('#deleteBtn');
  const exportBtn = $('#exportBtn');
  const importFile = $('#importFile');
  const nameInput = $('#name');
  const urlInput = $('#url');
  const iconInput = $('#icon');
  const modalTitle = $('#modalTitle');

  const STORAGE_KEY = 'apphub.v1.apps';
  let apps = load();
  let editingIndex = null;

  function load(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch{ return []; }
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(apps)); }

  function faviconFor(url, custom){
    if(custom) return custom;
    try{
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?sz=64&domain=${u.origin}`;
    }catch{ return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%2314182a"/><text x="50%" y="54%" font-size="36" text-anchor="middle" fill="%239ca3af">⚙️</text></svg>'; }
  }

  function render(filter=''){
    grid.innerHTML = '';
    const list = apps
      .map((a,i)=>({...a, i}))
      .filter(a => a.name.toLowerCase().includes(filter) || a.url.toLowerCase().includes(filter));

    list.forEach(app => grid.appendChild(card(app)));
    empty.style.display = list.length ? 'none' : 'block';
    countTag.textContent = `${apps.length} ${apps.length===1?'app':'apps'}`;
  }

  function card(app){
    const c = document.createElement('div');
    c.className = 'card';
    c.draggable = true;
    c.dataset.index = app.i;

    c.innerHTML = `
      <div class="app-top">
        <img alt="" src="${faviconFor(app.url, app.icon)}" onerror="this.style.visibility='hidden'" />
        <div style="min-width:0">
          <div class="app-name">${escapeHtml(app.name)}</div>
          <div class="app-url" title="${app.url}">${escapeHtml(app.url)}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn secondary" data-open>Open</button>
        <button class="btn" data-edit>Edit</button>
      </div>`;

    c.querySelector('[data-open]').addEventListener('click', e=>{
      e.stopPropagation();
      window.open(app.url, '_blank', 'noopener');
    });
    c.querySelector('[data-edit]').addEventListener('click', e=>{
      e.stopPropagation();
      openEditor(app.i);
    });


    // Drag & drop reordering
    c.addEventListener('dragstart', e=>{ c.classList.add('dragging'); e.dataTransfer.setData('text/plain', app.i); });
    c.addEventListener('dragend', ()=> c.classList.remove('dragging'));
    c.addEventListener('dragover', e=>{ e.preventDefault(); const dragging = document.querySelector('.card.dragging'); if(!dragging||dragging===c) return; const rect=c.getBoundingClientRect(); const after = (e.clientY-rect.top) > rect.height/2; grid.insertBefore(dragging, after? c.nextSibling : c); });
    c.addEventListener('drop', ()=>{ syncOrderFromDOM(); });

    // Click opens too
    c.addEventListener('click', ()=> window.open(app.url,'_blank','noopener'));

    return c;
  }

  function syncOrderFromDOM(){
    const indices = [...grid.children].map(el=> Number(el.dataset.index));
    const newOrder = indices.map(i=> apps[i]);
    if(newOrder.length === apps.length){ apps = newOrder; save(); render(search.value.trim().toLowerCase()); }
  }

  function openEditor(index=null){
    editingIndex = index;
    if(index===null){
      modalTitle.textContent = 'Add App';
      nameInput.value = '';
      urlInput.value = '';
      iconInput.value = '';
      deleteBtn.style.display = 'none';
    } else {
      modalTitle.textContent = 'Edit App';
      const a = apps[index];
      nameInput.value = a.name; urlInput.value = a.url; iconInput.value = a.icon || '';
      deleteBtn.style.display = 'inline-block';

    }
    dialog.showModal();
    setTimeout(()=> nameInput.focus(), 50);
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }

  // Events
  addBtn.addEventListener('click', ()=> openEditor(null));
  closeDialog.addEventListener('click', ()=> dialog.close());

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = {
      name: nameInput.value.trim(),
      url: urlInput.value.trim(),
      icon: iconInput.value.trim() || null
    };
    if(!data.name || !data.url) return;
    try{ new URL(data.url); }catch{ alert('Please enter a valid URL starting with http(s)://'); return; }
    if(editingIndex===null){ apps.push(data); }
    else{ apps[editingIndex] = data; }
    save();
    dialog.close();
    render(search.value.trim().toLowerCase());
  });

  deleteBtn.addEventListener('click', ()=>{
    if(editingIndex===null) return;
    if(confirm('Delete this app?')){
      apps.splice(editingIndex,1); save(); dialog.close(); render(search.value.trim().toLowerCase());
    }
  });

  search.addEventListener('input', ()=> render(search.value.trim().toLowerCase()));

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(apps,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-apps.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importFile.addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      if(!Array.isArray(parsed)) throw new Error('Invalid format');
      apps = parsed.filter(a => a && typeof a.name==='string' && typeof a.url==='string').map(a=>({name:a.name,url:a.url,icon:a.icon||null}));
      save();
      render(search.value.trim().toLowerCase());
    }catch(err){ alert('Could not import this file. Make sure it is a valid JSON export.'); }
    finally{ importFile.value = ''; }
  });

  // Seed with a couple of examples if empty
  if(apps.length===0){
    apps = [
      { name:'Google', url:'https://google.com', icon:null },
      { name:'GitHub', url:'https://github.com', icon:null }
    ];
    save();
  }

  render();
})();
