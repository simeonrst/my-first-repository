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
  const categoryInput = $('#category');

  const STORAGE_KEY = 'apphub.v1.apps';
  const CATEGORY_KEY = 'apphub.v1.categories';
  let apps = load();

  //Category storage
  function loadCategories() {
  try { return JSON.parse(localStorage.getItem(CATEGORY_KEY)) || ["General", "Work", "Social", "Tools"]; }
  catch { return ["General", "Work", "Social", "Tools"]; }
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

let categories = loadCategories();

// Ensure favorite and pinned properties exist

  apps = apps.map(a => ({
  ...a,
  favorite: a.favorite ?? false,
  pinned: a.pinned ?? false
}));

apps.forEach(a => console.log(a.name, a.favorite, a.pinned));
render();

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

  function render(filter='') {
    grid.innerHTML = '';

    const filteredApps = apps
      .map((a,i) => ({...a, i}))
      .filter(a => a.name.toLowerCase().includes(filter) || a.url.toLowerCase().includes(filter));

    if(filteredApps.length === 0){
      empty.style.display = 'block';
      countTag.textContent = `${apps.length} ${apps.length===1?'app':'apps'}`;
      return;
    }

    empty.style.display = 'none';

    // Group apps by category
    const grouped = {};
    filteredApps.forEach(app => {
      const cat = app.category || 'General';
      if(!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(app);
    });

    //  Render each category vertically
for (const category in grouped) {
  const categoryWrapper = document.createElement('div');
  categoryWrapper.className = 'category-column';

  const header = document.createElement('div');
  header.className = 'category-header';
  header.textContent = category;
  categoryWrapper.appendChild(header);

  // Separate pinned and unpinned
  const pinnedApps = grouped[category].filter(a => a.pinned);
  const unpinnedApps = grouped[category].filter(a => !a.pinned);

  // Render pinned first
  pinnedApps.forEach(app => {
    const c = card(app);
    categoryWrapper.appendChild(c);
  });

  // Add a divider if pinned exists
  if (pinnedApps.length > 0 && unpinnedApps.length > 0) {
    const divider = document.createElement('hr');
    divider.className = 'pinned-divider';
    categoryWrapper.appendChild(divider);
  }

  // Then render unpinned
  unpinnedApps.forEach(app => {
    const c = card(app);
    categoryWrapper.appendChild(c);
  });

  grid.appendChild(categoryWrapper);
}

    countTag.textContent = `${apps.length} ${apps.length===1?'app':'apps'}`;
  }

  function card(app){
    const c = document.createElement('div');
    c.className = 'card';
    c.draggable = true;
    c.dataset.index = (app.i ?? app.originalIndex ?? 0);

    c.innerHTML = `
  <div class="app-top">
    <img alt="" src="${faviconFor(app.url, app.icon)}" onerror="this.style.visibility='hidden'" />
    <div style="min-width:0">
      <div class="app-name">${escapeHtml(app.name)}</div>
      <div class="app-url" title="${app.url}">${escapeHtml(app.url)}</div>
    </div>
    <button class="pin-btn" title="Pin to Category">${app.pinned ? "📌" : "📍"}</button>
  </div>
  <div class="actions">
    <button class="btn secondary" data-open>Open</button>
    <button class="btn" data-edit>Edit</button>
    <button class="fav-btn" title="Toggle Favorite">${app.favorite ? "⭐" : "☆"}</button>
  </div>
 `;

    // ⭐ Favorite toggle
    c.querySelector('.fav-btn').addEventListener('click', e => {
        e.stopPropagation();
        const index = app.i ?? app.originalIndex;
        apps[index].favorite = !apps[index].favorite;
        save();
        render(search.value.trim().toLowerCase()); // refresh the main view
    });

    // 📌 Pin toggle
c.querySelector('.pin-btn').addEventListener('click', e => {
  e.stopPropagation();
  const index = app.i ?? app.originalIndex;
  apps[index].pinned = !apps[index].pinned;
  save();
  render(search.value.trim().toLowerCase()); // re-render to reorder
});

    // Existing open + edit
    c.querySelector('[data-open]').addEventListener('click', e=>{
        e.stopPropagation();
        window.open(app.url, '_blank', 'noopener');
    });
    c.querySelector('[data-edit]').addEventListener('click', e=>{
        e.stopPropagation();
        openEditor(app.i ?? app.originalIndex);
    });
    return c;
}
    // Drag and drop
  function syncOrderFromDOM(){
    const indices = [...grid.querySelectorAll('.card')].map(el=> Number(el.dataset.index));
    const newOrder = indices.map(i=> apps[i]);
    if(newOrder.length === apps.length){ apps = newOrder; save(); render(search.value.trim().toLowerCase()); }
  }

  function populateCategorySelect() {
  categoryInput.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryInput.appendChild(opt);
  });
}

  function openEditor(index=null){
  populateCategorySelect(); // Refresh categories before opening editor

    editingIndex = index;
    if(index===null){
      modalTitle.textContent = 'Add App';
      nameInput.value = '';
      urlInput.value = '';
      iconInput.value = '';
      categoryInput.value = 'General';
      deleteBtn.style.display = 'none';
    } else {
      modalTitle.textContent = 'Edit App';
      const a = apps[index];
      nameInput.value = a.name;
      urlInput.value = a.url;
      iconInput.value = a.icon || '';
      categoryInput.value = a.category || 'General';
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
  icon: iconInput.value.trim() || null,
  category: categoryInput.value.trim() || "General",
  favorite: apps[editingIndex]?.favorite || false,
  pinned: apps[editingIndex]?.pinned || false // NEW
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

  // Add Category button
const addCategoryBtn = document.createElement("button");
addCategoryBtn.textContent = "+ Add Category";
addCategoryBtn.className = "btn secondary";

// Delete Category button
const deleteCategoryBtn = document.createElement("button");
deleteCategoryBtn.textContent = "🗑 Delete Category";
deleteCategoryBtn.className = "btn danger";

// Put them together inside a wrapper so they sit side by side
const categoryActions = document.createElement("div");
categoryActions.style.display = "flex";
categoryActions.style.gap = "8px"; // space between buttons
categoryActions.appendChild(addCategoryBtn);
categoryActions.appendChild(deleteCategoryBtn);

// Add a class for CSS styling
categoryActions.classList.add("category-actions");

// Make the parent of the dropdown a flex container
categoryInput.parentNode.style.display = "flex";
categoryInput.parentNode.style.alignItems = "center";
categoryInput.parentNode.style.gap = "8px"; // space between dropdown and buttons

// Append the buttons wrapper
categoryInput.parentNode.appendChild(categoryActions);

// Add category logic
addCategoryBtn.addEventListener("click", () => {
  const newCat = prompt("Enter new category name:");
  if (newCat && !categories.includes(newCat)) {
    categories.push(newCat);
    saveCategories(categories);
    populateCategorySelect();
    categoryInput.value = newCat;
  }
});

// Delete category logic
deleteCategoryBtn.addEventListener("click", () => {
  const catToDelete = categoryInput.value;
  if (catToDelete === "General") {
    alert("You cannot delete the default 'General' category.");
    return;
  }

  if (confirm(`Delete category "${catToDelete}"? Apps in this category will be moved to 'General'.`)) {
    categories = categories.filter(c => c !== catToDelete);
    saveCategories(categories);

    apps.forEach(a => {
      if (a.category === catToDelete) {
        a.category = "General";
      }
    });
    save();

    populateCategorySelect();
    categoryInput.value = "General";
    render();
  }
});

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(apps,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-apps.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Favorites button
const favoritesBtn = document.getElementById('favoritesBtn');
const returnBtn = document.getElementById('returnBtn');

// Show favorites
favoritesBtn.addEventListener('click', () => {
  renderFavorites();
  returnBtn.style.display = 'inline-block'; // show return button
});

// Return to full list
returnBtn.addEventListener('click', () => {
  render(search.value.trim().toLowerCase());
  returnBtn.style.display = 'none';
});

function renderFavorites() {
  grid.innerHTML = '';

  // map apps with originalIndex for event listeners
  const favs = apps
    .map((a, i) => ({ ...a, originalIndex: i }))
    .filter(a => a.favorite);

  favs.forEach(app => grid.appendChild(card(app))); // use card(app) for each

  empty.style.display = favs.length ? 'none' : 'block';
  countTag.textContent = `${favs.length} favorite${favs.length === 1 ? '' : 's'}`;

  returnBtn.style.display = 'inline-block'; // show return button
}


  importFile.addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      if(!Array.isArray(parsed)) throw new Error('Invalid format');
      apps = parsed.filter(a => a && typeof a.name==='string' && typeof a.url==='string')
                   .map(a=>({name:a.name,url:a.url,icon:a.icon||null,category:a.category||'General'}));
      save();
      render(search.value.trim().toLowerCase());
    }catch(err){ alert('Could not import this file. Make sure it is a valid JSON export.'); }
    finally{ importFile.value = ''; }
  });

    // Seed with a couple of examples if empty
  if(apps.length===0){
    apps = [
      { name:'Google', url:'https://google.com', icon:null, category:'Work' },
      { name:'GitHub', url:'https://github.com', icon:null, category:'Tools' }
    ];
    save();
  }

  render();

  const menuBtn = document.getElementById('menuBtn');
const sidebarExpand = document.querySelector('.sidebar-expand');
const header = document.querySelector('header');
const mainContent = document.querySelector('main');
const footer = document.querySelector('.footer');

menuBtn.addEventListener('click', () => {
  sidebarExpand.classList.toggle('active');
  header.classList.toggle('shifted');
  mainContent.classList.toggle('shifted');
  footer.classList.toggle('shifted');
});
})();

// THEME TOGGLE
const themeToggle = document.getElementById("themeToggle");

// Load theme from localStorage or default to light
let currentTheme = localStorage.getItem("theme") || "light";
document.body.classList.add(currentTheme);
themeToggle.textContent = currentTheme === "dark" ? "🌙" : "☀️";

themeToggle.addEventListener("click", () => {
  // Add animation
  themeToggle.classList.add("animate");

  setTimeout(() => {
    themeToggle.classList.remove("animate");

    // Switch theme
    document.body.classList.remove(currentTheme);
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.body.classList.add(currentTheme);

    // Save preference
    localStorage.setItem("theme", currentTheme);

    // Update button icon
    themeToggle.textContent = currentTheme === "dark" ? "🌙" : "☀️";
  }, 400); // Match CSS duration
});


