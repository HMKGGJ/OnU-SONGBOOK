import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



const ALLOWED_UIDS = ['b3e72f60-54a2-41fc-8c33-ef681f691ab1','1479722d-fb11-4e0d-9481-5b18fe5ff6a8','67c54451-8c12-45a1-9417-67db91b3feff'];
let currentUser = null;
let songs = [];
let isStreamer = false;
let editingId = null;
let viewMode = 'songs';
let filters = [];
let doneLoading = false;
let currentSortValue = "latest_desc";

document.addEventListener('DOMContentLoaded', async () => {
  const refs = {};
  [
    'total-songs','total-categories','total-artists',
    'toggle-role','add-form-container','add-song-form','song-title','song-artist',
    'song-categories','song-key','song-transpose','song-notes',
    'song-completed','song-recommend','song-bomb','song-inst','song-thumbnail-url',
    'add-submit-button','search-input','add-filter-button',
    'sort-combo','fav-toggle','completed-toggle','bomb-toggle','tag-container',
    'view-songs','view-categories','view-artists',
    'song-grid','filter-bar','tag-modal','modal-title','modal-close','modal-grid',
    'favorites-toggle'
  ].forEach(id => { refs[id] = document.getElementById(id); });



  // ----------- 필터 바/검색/정렬 관련 ----------
  refs['filter-bar'].addEventListener('submit', function(e) {
    e.preventDefault();
    const txt = refs['search-input'].value.trim().toLowerCase();
    if (!txt) return;
    filters.push({ value: txt });
    refs['search-input'].value = '';
    renderActiveFilters();
    render();
  });

  // --- 검색 플로팅 메뉴 토글 ---
  const toggleSearchBtn = document.getElementById('toggle-search-bar-btn');
  const floatingSearchBar = document.getElementById('floating-search-bar');
  let isSearchBarOpen = false;
  
  // 열기/닫기 함수 (애니메이션 class 방식)
  function openSearchBar() {
    // 다른 플로팅 닫기
    closeFloatingBar && closeFloatingBar();
    closeExtraBar && closeExtraBar();
    closeSortBar && closeSortBar();
    isSearchBarOpen = true;
    floatingSearchBar.classList.add('opacity-100', 'scale-x-100', 'pointer-events-auto');
    floatingSearchBar.classList.remove('opacity-0', 'scale-x-0', 'pointer-events-none');
    // 자동 포커스(선택)
    setTimeout(() => {
      document.getElementById('search-input')?.focus();
    }, 80);
  }
  function closeSearchBar() {
    isSearchBarOpen = false;
    floatingSearchBar.classList.remove('opacity-100', 'scale-x-100', 'pointer-events-auto');
    floatingSearchBar.classList.add('opacity-0', 'scale-x-0', 'pointer-events-none');
  }
  
  if (toggleSearchBtn && floatingSearchBar) {
    toggleSearchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isSearchBarOpen) closeSearchBar();
      else openSearchBar();
    });
  }
  
  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (
      isSearchBarOpen &&
      !toggleSearchBtn.contains(e.target) &&
      !floatingSearchBar.contains(e.target)
    ) {
      closeSearchBar();
    }
  });
  
  


  const mypageBtn = document.getElementById('mypage-btn');
  if (mypageBtn) mypageBtn.onclick = () => window.location.href = '/mypage.html';

  // 플로팅 메뉴 토글(필터/정렬/계정)
  const toggleBtn = document.getElementById('toggle-floating-bar-btn');
  const floatingButtons = document.getElementById('floating-filter-buttons');
  let isFloatingBarOpen = false;
  function openFloatingBar() {
    floatingButtons.style.opacity = '1';
    floatingButtons.style.pointerEvents = 'auto';
    floatingButtons.style.transform = 'scaleX(1)';
  }
  function closeFloatingBar() {
    floatingButtons.style.opacity = '0';
    floatingButtons.style.pointerEvents = 'none';
    floatingButtons.style.transform = 'scaleX(0)';
  }
  if (toggleBtn && floatingButtons) {
    toggleBtn.addEventListener('click', () => {
      if (isFloatingBarOpen) { closeFloatingBar(); isFloatingBarOpen = false; }
      else { openFloatingBar(); isFloatingBarOpen = true; }
    });
  }
  [
    'completed-toggle', 'fav-toggle', 'favorites-toggle',
    'toggle-role', 'login-btn', 'logout-btn', 'login-status-btn'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => setTimeout(closeFloatingBar, 60));
  });

  // 계정/모드 플로팅 메뉴 토글
  const loginBarBtn = document.getElementById('toggle-login-bar-btn');
  const floatingExtraButtons = document.getElementById('floating-extra-buttons');
  let isExtraBarOpen = false;
  function openExtraBar() {
    closeFloatingBar();
    closeSortBar();
    isExtraBarOpen = true;
    floatingExtraButtons.classList.add('opacity-100', 'scale-x-100');
    floatingExtraButtons.classList.remove('opacity-0', 'scale-x-0');
    floatingExtraButtons.style.pointerEvents = 'auto';
  }
  function closeExtraBar() {
    isExtraBarOpen = false;
    floatingExtraButtons.classList.remove('opacity-100', 'scale-x-100');
    floatingExtraButtons.classList.add('opacity-0', 'scale-x-0');
    floatingExtraButtons.style.pointerEvents = 'none';
  }
  if (loginBarBtn && floatingExtraButtons) {
    loginBarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isExtraBarOpen) closeExtraBar();
      else openExtraBar();
    });
  }
  ['toggle-role', 'login-btn', 'logout-btn', 'login-status-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => setTimeout(closeExtraBar, 60));
  });
  document.addEventListener('click', (e) => {
    if (isExtraBarOpen && !loginBarBtn.contains(e.target) && !floatingExtraButtons.contains(e.target)) {
      closeExtraBar();
    }
  });

  // 정렬 플로팅 메뉴
  const toggleSortBtn = document.getElementById('toggle-sort-bar-btn');
  const floatingSortButtons = document.getElementById('floating-sort-buttons');
  let isSortBarOpen = false;
  function openSortBar() {
    closeFloatingBar();
    closeExtraBar();
    isSortBarOpen = true;
    floatingSortButtons.classList.remove('opacity-0', 'pointer-events-none', 'scale-x-0');
    floatingSortButtons.classList.add('opacity-100', 'pointer-events-auto', 'scale-x-100');
  }
  function closeSortBar() {
    isSortBarOpen = false;
    floatingSortButtons.classList.remove('opacity-100', 'pointer-events-auto', 'scale-x-100');
    floatingSortButtons.classList.add('opacity-0', 'pointer-events-none', 'scale-x-0');
  }
  if (toggleSortBtn && floatingSortButtons) {
    toggleSortBtn.addEventListener('click', () => {
      if (isSortBarOpen) closeSortBar();
      else openSortBar();
    });
  }
  document.addEventListener('click', (e) => {
    if (isFloatingBarOpen && !toggleBtn.contains(e.target) && !floatingButtons.contains(e.target)) {
      closeFloatingBar();
    }
    if (isSortBarOpen && !toggleSortBtn.contains(e.target) && !floatingSortButtons.contains(e.target)) {
      closeSortBar();
    }
  });

  // 정렬 옵션 클릭 → 적용+닫힘
  const sortCombo = document.getElementById('sort-combo');
  if (sortCombo) {
    sortCombo.value = currentSortValue;
    sortCombo.addEventListener('change', function () {
      currentSortValue = sortCombo.value;
      updateSortFloatingButtonLabel();
      render();
      closeSortBar();
    });
  }

  function updateSortFloatingButtonLabel() {
    const label = document.querySelector('#toggle-sort-bar-btn .sort-selected-label');
    const icon  = document.querySelector('#toggle-sort-bar-btn .sort-icon');
    let labelText = '';
    switch (currentSortValue) {
      case 'latest_desc':      labelText = '최신<br>▼'; break;
      case 'latest_asc':       labelText = '최신<br>▲'; break;
      case 'title_asc':        labelText = '가나다<br>▲'; break;
      case 'title_desc':       labelText = '가나다<br>▼'; break;
      case 'artist_asc':       labelText = '가수<br>▲'; break;
      case 'artist_desc':      labelText = '가수<br>▼'; break;
      case 'proficiency_asc':  labelText = '숙련<br>▲'; break;
      case 'proficiency_desc': labelText = '숙련<br>▼'; break;
      default:                 labelText = '';
    }
    if (labelText) {
      label.innerHTML = labelText;  
      label.style.display = '';
      icon.style.display = 'none';
    } else {
      label.innerHTML = '';
      label.style.display = 'none';
      icon.style.display = '';
    }
  }

  function updateFilterFloatingButtonLabel() {
    const btn   = document.getElementById('toggle-floating-bar-btn');
    const label = btn.querySelector('.filter-selected-label');
    const icon  = btn.querySelector('.filter-icon');
    if (
      !refs['fav-toggle'].classList.contains('active') &&
      !refs['completed-toggle'].classList.contains('active') &&
      !refs['favorites-toggle'].classList.contains('active')
    ) {
      label.textContent = '';
      icon.style.display = '';
      btn.classList.remove('filter-has-selected');
      return;
    }
    if (refs['completed-toggle'].classList.contains('active'))      label.textContent = '완곡';
    else if (refs['fav-toggle'].classList.contains('active'))       label.textContent = '추천';
    else if (refs['favorites-toggle'].classList.contains('active')) label.textContent = '즐겨찾기';
    icon.style.display = 'none';
    btn.classList.add('filter-has-selected');
  }

  function selectSingleFilter(targetId) {
    ['completed-toggle', 'fav-toggle', 'favorites-toggle'].forEach(id => {
      if (refs[id]) refs[id].classList.toggle('active', id === targetId ? !refs[id].classList.contains('active') : false);
    });
    updateFilterFloatingButtonLabel();
    render();
  }

  refs['clear-filter-btn'] = document.getElementById('clear-filter-btn');
  if (refs['clear-filter-btn']) {
    refs['clear-filter-btn'].onclick = () => {
      ['completed-toggle', 'fav-toggle', 'favorites-toggle'].forEach(id => {
        if (refs[id]) refs[id].classList.remove('active');
      });
      updateFilterFloatingButtonLabel();
      render();
    };
  }
  refs['completed-toggle'].onclick = () => selectSingleFilter('completed-toggle');
  refs['fav-toggle'].onclick       = () => selectSingleFilter('fav-toggle');
  refs['favorites-toggle'].onclick = () => selectSingleFilter('favorites-toggle');
  updateFilterFloatingButtonLabel();

  function renderActiveFilters() {
    const container = refs['tag-container'];
    container.innerHTML = '';
    filters.forEach((f, i) => {
      const span = createFilterTag(f.value, () => {
        filters.splice(i, 1);
        renderActiveFilters();
        render();
      });
      container.append(span);
    });
  }

  // ---------- Supabase 인증/유저 -----------
  const loginBtn = document.getElementById('login-btn');
  const editBtn = document.getElementById('toggle-role');
  async function updateLoginBtn() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      loginBtn.textContent = '로그아웃 ←';
      loginBtn.onclick = async () => {
        try {
          await Promise.race([
            supabase.auth.signOut(),
            new Promise(resolve => setTimeout(resolve, 500))
          ]);
        } finally {
          window.location.reload();
        }
      };
    } else {
      loginBtn.textContent = '연동&로그인';
      loginBtn.onclick = () => window.location.href = '/login.html';
    }
  }
  async function updateEditBtn() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user && ALLOWED_UIDS.includes(session.user.id)) {
      editBtn.style.display = 'inline-block';
    } else {
      editBtn.style.display = 'none';
    }
  }
  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
  async function updateCurrentUser() {
    currentUser = await getCurrentUser();
  }

  // ---------- 즐겨찾기 ----------
  async function updateCurrentFavorites() {
    const user = await getCurrentUser();
    if (!user) {
      window.currentFavorites = [];
      return;
    }
    const { data: profile } = await supabase
      .from('user_profile_stats')
      .select('favorites')
      .eq('user_id', user.id)
      .maybeSingle();
    window.currentFavorites = Array.isArray(profile?.favorites) ? profile.favorites : [];
  }

  // ---------- 통계/뷰모드/카운트 -----------
  function updateCounts() {
    refs['total-songs'].textContent = songs.length;
    refs['total-categories'].textContent = [...new Set(songs.flatMap(s => s.categories || []))].length;
    refs['total-artists'].textContent = [...new Set(songs.map(s => s.artist))].length;
  }

  function updateViewButtons() {
    ['songs', 'categories', 'artists'].forEach(mode => {
      const btn = refs['view-' + mode];
      btn.classList.toggle('bg-indigo-600', viewMode === mode);
      btn.classList.toggle('bg-gray-700', viewMode !== mode);
    });
  }

  // ---------- 모달/태그/유틸 ----------
  function openTagModal(tag) {
    refs['modal-title'].textContent = tag;
    refs['modal-grid'].innerHTML = '';
    const list = songs.filter(s =>
      s.artist === tag || (s.categories || []).includes(tag)
    );
    const ul = document.createElement('ul');
    ul.className = 'space-y-2 overflow-y-auto max-h-[80vh] p-1';
    const titleMarqueeMinLength = 16;
    const notesMarqueeMinLength = 16;

    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-4 bg-white/70 backdrop-blur p-3 rounded-lg';

      // 제목 마퀴 조건
      let titleSpan = '';
      if ((s.title || '').length >= titleMarqueeMinLength) {
        titleSpan = `
          <span class="title-marquee flex-[3.2] font-medium" style="overflow:hidden; white-space:nowrap;">
            <span class="marquee-text">${s.title}</span>
          </span>
        `;
      } else {
        titleSpan = `<span class="flex-[3.2] font-medium truncate">${s.title}</span>`;
      }

      // 노트 마퀴 조건
      let notesSpan = '';
      if ((s.notes || '').length >= notesMarqueeMinLength) {
        notesSpan = `
          <span class="notes-marquee flex-[1.6] text-gray-800" style="overflow:hidden; white-space:nowrap;">
            <span class="marquee-text">${s.notes || ''}</span>
          </span>
        `;
      } else {
        notesSpan = `<span class="flex-[1.6] text-gray-800 truncate">${s.notes || ''}</span>`;
      }

      li.innerHTML = `
        ${titleSpan}
        <span class="flex-[1.3] text-gray-600 truncate">${s.artist}</span>
        ${notesSpan}
      `;
      ul.append(li);
    });

    refs['modal-grid'].append(ul);
    refs['tag-modal'].classList.remove('hidden');
  }
  refs['modal-close'].onclick = () => refs['tag-modal'].classList.add('hidden');

  function getYouTubeID(u) {
    if (typeof u !== 'string') return null;
    const m = u.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)/);
    return m ? m[1] : null;
  }
  function thumbnail(u) {
    const id = getYouTubeID(u);
    return id
      ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      : 'https://via.placeholder.com/320x180';
  }

  // ---------- "부분 갱신" 즐겨찾기 토글 함수 ----------
  async function toggleFavorite(songId) {
    const user = await getCurrentUser();
    if (!user) return;
    let fakeFavorites = Array.isArray(window.currentFavorites) ? [...window.currentFavorites] : [];
    const alreadyFav = fakeFavorites.includes(songId);
    if (alreadyFav) {
      fakeFavorites = fakeFavorites.filter(x => x !== songId);
    } else {
      fakeFavorites.push(songId);
    }
    window.currentFavorites = fakeFavorites;
    updateSongCardFavoriteUI(songId, !alreadyFav);

    // 서버에는 백그라운드 반영
    const { data: profile } = await supabase
      .from('user_profile_stats')
      .select('favorites')
      .eq('user_id', user.id)
      .maybeSingle();

    let favs = Array.isArray(profile?.favorites) ? profile.favorites : [];
    if (alreadyFav) {
      favs = favs.filter(x => x !== songId);
    } else {
      favs = [...favs, songId];
    }
    const { error } = await supabase
      .from('user_profile_stats')
      .upsert({ user_id: user.id, favorites: favs }, { onConflict: ['user_id'] });
    if (error) {
      alert('서버 오류! 즐겨찾기 반영 실패');
      await updateCurrentFavorites();
      render();
    }
    await updateCurrentFavorites();
  }

  // 부분 갱신: 해당 song-card2만 즐겨찾기 버튼 갱신
  function updateSongCardFavoriteUI(songId, isFav) {
    const card = refs['song-grid'].querySelector(`.song-card2[data-id="${songId}"]`);
    if (!card) return;
  
    // 1. 기존 버튼 있으면 지움
    let favBtn = card.querySelector('.fav-btn');
    if (favBtn) favBtn.remove();
  
    // 2. 즐겨찾기일 때만 새로 버튼 생성해서 붙임
    if (isFav) {
      favBtn = document.createElement('button');
      favBtn.className = 'fav-btn ml-3 align-middle active';
      favBtn.type = 'button';
      favBtn.setAttribute('aria-label', '즐겨찾기');
      favBtn.style.background = 'transparent'; // 혹시 남는 스타일 방지
      favBtn.innerHTML = '<span class="favorite-icon">✨</span>';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(songId);
      };
      card.querySelector('.song-title').after(favBtn);
    }
  }


  // ---------- 메인 렌더 함수 ----------
  async function render() {
    await updateCurrentUser();
    await updateCurrentFavorites();

    refs['song-grid'].innerHTML = '';
    updateCounts();
    updateViewButtons();

    refs['song-grid'].classList.remove('grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5');
    
    if (viewMode === 'songs') {
      refs['song-grid'].classList.add('grid-cols-1');
      // 아래에 기존 곡카드 append 코드 계속
      // ...
    } else {
      refs['song-grid'].classList.add('grid-cols-3');
      refs['filter-bar'].style.display = 'none';
    
      const items = viewMode === 'categories'
        ? [...new Set(songs.flatMap(s => s.categories || []))]
        : [...new Set(songs.map(s => s.artist))];
    
      refs['song-grid'].innerHTML = '';
    
      items.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'relative aspect-video rounded-2xl overflow-hidden cursor-pointer category-card';
        const song = songs.find(s => viewMode === 'categories'
          ? (s.categories || []).includes(tag)
          : s.artist === tag);
        const src = song ? thumbnail(song.thumbnail_url || song.inst) : '';
        div.innerHTML = `
          <img src="${src}" class="w-full h-full object-cover filter blur-[2px] brightness-[0.6]" />
          <span class="absolute inset-0 flex items-center justify-center text-white text-lg font-semibold bg-black bg-opacity-40">
            ${tag}
          </span>
        `;
        div.onclick = () => openTagModal(tag);
        refs['song-grid'].append(div);
      });
      return;
    }

    refs['filter-bar'].style.display = 'flex';

    const filtered = songs.filter(s => {
      if (refs['fav-toggle'].classList.contains('active') && !s.recommend) return false;
      if (refs['completed-toggle'].classList.contains('active') && !s.completed) return false;
      if (refs['favorites-toggle'].classList.contains('active')) {
        if (!window.currentFavorites || !window.currentFavorites.includes(s.id.toString())) return false;
      }
      return filters.every(f => {
        const v = f.value;
        const inTitle = s.title.toLowerCase().includes(v);
        const inArtist = s.artist.toLowerCase().includes(v);
        const inCategories = (s.categories || []).some(c => c.toLowerCase().includes(v));
        const inNotes = (s.notes || '').toLowerCase().includes(v);
        return inTitle || inArtist || inCategories || inNotes;
      });
    });

    const sortValue = currentSortValue;
    const [mode, order] = sortValue.split('_');
    const dir = order === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (mode) {
        case 'title':
          cmp = a.title.localeCompare(b.title, 'ko');
          break;
        case 'artist':
          cmp = a.artist.localeCompare(b.artist, 'ko');
          break;
        case 'proficiency': {
          const rank = note => {
            if (note && note.includes('익숙')) return 0;
            if (note && note.includes('반숙')) return 2;
            return 1;
          };
          cmp = rank(a.notes) - rank(b.notes);
          break;
        }
        case 'latest':
        default:
          cmp = a.id - b.id;
      }
      return cmp * dir;
    });

    // 템플릿 렌더
    const tpl = document.getElementById('song-card2-template').content;
    filtered.forEach(s => {
      const c = tpl.cloneNode(true);
      const imgSrc = thumbnail(s.thumbnail_url || s.inst);
      c.querySelector('[data-img]').src = imgSrc;
      c.querySelector('[data-title]').textContent = s.title;
      c.querySelector('[data-artist]').textContent = s.artist;
      c.querySelector('[data-note]').textContent = s.notes || '';
      c.querySelector('[data-completed]').style.display = s.completed ? 'inline-flex' : 'none';
      c.querySelector('[data-recommend]').style.display = s.recommend ? 'inline-flex' : 'none';
      c.querySelector('[data-bomb]').style.display = s.bomb ? 'inline-flex' : 'none';

      const t = parseInt(s.transpose);
      const kt = s.key
        ? s.key + (!isNaN(t) && t !== 0 ? (t > 0 ? ' +' + t : ' ' + t) : '')
        : '';
      c.querySelector('[data-key]').textContent = kt;

      c.querySelector('.song-card2').setAttribute('data-id', s.id);

      const catC = c.querySelector('[data-categories]');
      catC.innerHTML = '';
      (s.categories || []).forEach(cat => {
        const span = document.createElement('span');
        span.textContent = cat;
        span.className ='category-tag';
        span.onclick = () => openTagModal(cat);
        catC.append(span);
      });

      const req = c.querySelector('[data-request]');
      const edt = c.querySelector('[data-edit]');
      const del = c.querySelector('[data-delete]');
      const reqDiv = req ? req.parentElement : null;
      const edtDiv = edt ? edt.parentElement : null;
      const delDiv = del ? del.parentElement : null;
      const canEdit = currentUser && ALLOWED_UIDS.includes(currentUser.id);

      if (canEdit && isStreamer) {
        if (edtDiv) edtDiv.style.zIndex = 30;
        if (delDiv) delDiv.style.zIndex = 30;
        if (reqDiv) reqDiv.style.zIndex = 10;
      } else {
        if (edtDiv) edtDiv.style.zIndex = 10;
        if (delDiv) delDiv.style.zIndex = 10;
        if (reqDiv) reqDiv.style.zIndex = 30;
      }

      if (canEdit && isStreamer && req) req.remove();
      if (edt && del) {
        if (canEdit && isStreamer) {
          edt.style.display = 'inline-flex';
          del.style.display = 'inline-flex';
        } else {
          edt.style.display = 'none';
          del.style.display = 'none';
        }
      }

      if (req) {
        req.onclick = () => {
          navigator.clipboard.writeText(`신청 ${s.title}`);
          alert('복사됨!');
        };
      }
      if (edt) {
        edt.onclick = () => {
          editingId = s.id;
          refs['song-title'].value = s.title;
          refs['song-artist'].value = s.artist;
          refs['song-categories'].value = (s.categories || []).join(',');
          refs['song-key'].value = s.key;
          refs['song-transpose'].value = s.transpose;
          refs['song-notes'].value = s.notes;
          refs['song-completed'].checked = s.completed;
          refs['song-recommend'].checked = s.recommend;
          refs['song-bomb'].checked = s.bomb;
          refs['song-inst'].value = s.inst;
          refs['song-thumbnail-url'].value = s.thumbnail_url || '';
          refs['add-submit-button'].textContent = '저장';
          refs['add-form-container'].hidden = false;
        };
      }
      if (del) {
        del.onclick = async () => {
          if (!confirm(`"${s.title}" 삭제할까요?`)) return;
          await supabase.from('onusongdb').delete().eq('id', s.id);
          songs = songs.filter(x => x.id !== s.id);
          render();
        };
      }
      c.querySelector('[data-instlink]').onclick = () => window.open(s.inst, '_blank');

      // 즐겨찾기 버튼 - 부분 갱신 방식
      const titleEl = c.querySelector('[data-title]');
      const isFav = window.currentFavorites && window.currentFavorites.includes(s.id.toString());
      let oldBtn = c.querySelector('.fav-btn');
      if (oldBtn) oldBtn.remove();

      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn ml-3 align-middle' + (isFav ? ' active' : '');
      favBtn.type = 'button';
      favBtn.setAttribute('aria-label', '즐겨찾기');
      favBtn.style.transform = 'translateY(2px)';
      favBtn.innerHTML = '<span class="favorite-icon">✨</span>';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(s.id.toString());
      };
      titleEl.after(favBtn);

      titleEl.style.cursor = 'pointer';
      titleEl.onclick = (e) => {
        e.preventDefault();
        toggleFavorite(s.id.toString());
      };

      refs['song-grid'].append(c);
    });
    if (window.setupFavBtns) setupFavBtns();
  }

  // 데이터 1회만 로드!
  async function loadSongs() {
    const { data, error } = await supabase
      .from('onusongdb')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('불러오기 실패:', error);
      return;
    }
    songs = data;
    doneLoading = true;
    render();
  }

  // ---------- 뷰모드 ----------
  refs['view-songs'].onclick = () => { viewMode = 'songs'; render(); };
  refs['view-categories'].onclick = () => { viewMode = 'categories'; render(); };
  refs['view-artists'].onclick = () => { viewMode = 'artists'; render(); };

  refs['toggle-role'].onclick = async () => {
    if (!isStreamer) {
      sessionStorage.setItem('authorized', 'true');
      isStreamer = true;
    } else {
      isStreamer = false;
      sessionStorage.removeItem('authorized');
    }
    refs['add-form-container'].hidden = !isStreamer;
    render();
  };

  // ---------- 곡 추가/수정 ----------
  refs['add-song-form'].onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: refs['song-title'].value.trim(),
      artist: refs['song-artist'].value.trim(),
      categories: refs['song-categories'].value
        .split(',')
        .map(x => x.trim())
        .filter(Boolean),
      key: refs['song-key'].value.trim(),
      transpose: parseInt(refs['song-transpose'].value) || 0,
      notes: refs['song-notes'].value.trim(),
      completed: refs['song-completed'].checked,
      recommend: refs['song-recommend'].checked,
      bomb: refs['song-bomb'].checked,
      inst: refs['song-inst'].value.trim(),
      thumbnail_url:
        refs['song-thumbnail-url'].value.trim() ||
        thumbnail(refs['song-inst'].value.trim()),
    };
    let error = null;
    if (editingId) {
      payload.id = editingId;
      ({ error } = await supabase.from('onusongdb').upsert([payload], { onConflict: ['id'] }));
    } else {
      ({ error } = await supabase.from('onusongdb').insert([payload]));
    }
    if (error) {
      alert(error.message);
    } else {
      refs['add-song-form'].reset();
      refs['add-submit-button'].textContent = '✨ 추가하기';
      refs['add-form-container'].hidden = true;
      editingId = null;
      await loadSongs();
    }
  };

  // ---------- 모바일 환경 대응 ----------
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    if (refs['song-grid']) {
      refs['song-grid'].classList.remove('sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
      refs['song-grid'].classList.add('grid-cols-1');
    }
    const statSections = document.querySelectorAll('section.grid');
    statSections.forEach(section => {
      section.classList.remove('md:grid-cols-3');
      section.classList.add('grid-cols-1');
    });
  }

  // ---------- 신청 버튼 호버 효과 ----------
  document.body.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('[data-request]');
    if (btn) {
      document.querySelectorAll('.song-card2').forEach(card => {
        card.classList.add('blur-others');
        card.classList.remove('active-request');
      });
      const songCard = btn.closest('.song-card2');
      if (songCard) {
        songCard.classList.remove('blur-others');
        songCard.classList.add('active-request');
      }
    }
  });
  document.body.addEventListener('mouseout', (e) => {
    const btn = e.target.closest('[data-request]');
    if (btn) {
      document.querySelectorAll('.song-card2').forEach(card => {
        card.classList.remove('blur-others', 'active-request');
      });
    }
  });

  // ---------- 데이터 최초 1회 로딩 ----------
  await loadSongs();

  // ---------- 인증 상태/유저 상태 반영 ----------
  supabase.auth.onAuthStateChange(async () => {
    await updateLoginBtn();
    await updateEditBtn();
  });
  await updateLoginBtn();
  await updateEditBtn();
});

// 탭 활성화 시 세션 체크 및 새로고침
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      window.location.reload();
    }, 1500);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      clearTimeout(timeout);
      if (!session && !timedOut) window.location.reload();
    } catch (e) {
      clearTimeout(timeout);
      if (!timedOut) window.location.reload();
    }
  }
});

// ------------------ 유틸리티(필터 태그) ------------------
function createFilterTag(text, onRemove) {
  const filterTag = document.createElement('div');
  filterTag.className = 'filter-tag';
  filterTag.innerHTML = `<span>${text}</span><button type="button">×</button>`;
  filterTag.querySelector('button').addEventListener('click', onRemove);
  return filterTag;
}

