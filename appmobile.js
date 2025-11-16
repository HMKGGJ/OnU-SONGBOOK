import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// [보안 수정 1] 허용된 관리자 UID 목록 추가 (PC 버전과 동일)
const ALLOWED_UIDS = [
  'b3e72f60-54a2-41fc-8c33-ef681f691ab1',
  '1479722d-fb11-4e0d-9481-5b18fe5ff6a8',
  '67c54451-8c12-45a1-9417-67db91b3feff'
];

document.addEventListener('DOMContentLoaded', () => {
  // 1. 모바일 환경이면 sm 반응형을 강제로 고정
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const grid = document.getElementById('song-grid');
    if (grid) {
      grid.classList.remove('sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
      grid.classList.add('grid-cols-1');
    }
    const statSections = document.querySelectorAll('section.grid');
    statSections.forEach(section => {
      section.classList.remove('md:grid-cols-3');
      section.classList.add('grid-cols-1');
    });
  }
  
  // [보안 수정 2] 기존 비밀번호 해시(PW_HASHES) 삭제됨

  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon   = document.getElementById('theme-icon');
  function updateTheme() {
    if (document.documentElement.classList.toggle('dark')) themeIcon.textContent = '☀️';
    else themeIcon.textContent = '🌙';
  }
  if (themeToggle) themeToggle.onclick = updateTheme;
  // updateTheme(); // 필요 시 주석 해제

  let songs = [];
  let isStreamer  = sessionStorage.getItem('authorized') === 'true';
  let editingId   = null;
  let viewMode    = 'songs';
  let filters     = [];
  let doneLoading = false;

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
    'filter-form'
  ].forEach(id => { refs[id] = document.getElementById(id); });

  if(refs['sort-combo']) refs['sort-combo'].addEventListener('change', render);

  // 모바일 보기 버튼
  const viewMobileBtn = document.getElementById('view-mobile');
  if (viewMobileBtn) {
    viewMobileBtn.addEventListener('click', () => {
      window.location.href = 'mobile.html';
    });
  }
  
  const grid = refs['song-grid'];
  const tpl  = document.getElementById('song-card-template').content;

  function unique(field) { return [...new Set(songs.flatMap(s=>s[field]||[]))]; }
  function uniqueArtist() { return [...new Set(songs.map(s=>s.artist))]; }

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

  function updateCounts() {
    if(refs['total-songs']) refs['total-songs'].textContent      = songs.length;
    if(refs['total-categories']) refs['total-categories'].textContent = unique('categories').length;
    if(refs['total-artists']) refs['total-artists'].textContent    = uniqueArtist().length;
  }

  function renderActiveFilters() {
    const container = refs['tag-container'];
    if(!container) return;
    container.innerHTML = '';
    filters.forEach((f,i) => {
      const span = createFilterTag(f.value, () => {
        filters.splice(i,1);
        renderActiveFilters();
        render();
      });
      container.append(span);
    });
    if (refs['search-input']) {
        if (filters.length > 0) {
            refs['search-input'].classList.add('active');
        } else {
            refs['search-input'].classList.remove('active');
        }
    }
  }

  if(refs['filter-form']) {
      refs['filter-form'].onsubmit = e => {
        e.preventDefault();
        const txt = refs['search-input'].value.trim().toLowerCase();
        if (!txt) return;
        filters = [{ value: txt }];
        refs['search-input'].value = '';
        renderActiveFilters();
        render();
      };
  }

  if(refs['fav-toggle']) {
      refs['fav-toggle'].onclick = () => {
        refs['fav-toggle'].classList.toggle('bg-yellow-700');
        render();
      };
  }
  if(refs['completed-toggle']) {
      refs['completed-toggle'].onclick = () => {
        refs['completed-toggle'].classList.toggle('bg-green-700');
        render();
      };
  }

  function updateViewButtons() {
    ['songs','categories','artists'].forEach(mode => {
      const btn = refs['view-'+mode];
      if(btn) {
          btn.classList.toggle('bg-indigo-600', viewMode===mode);
          btn.classList.toggle('bg-gray-700', viewMode!==mode);
      }
    });
  }

  function openTagModal(tag) {
    refs['modal-title'].textContent = tag;
    refs['modal-grid'].innerHTML = '';
    const list = songs.filter(s =>
      s.artist===tag || (s.categories||[]).includes(tag)
    );
    const ul = document.createElement('ul');
    ul.className = 'space-y-2 overflow-y-auto max-h-[80vh] p-4';
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-4 bg-white/70 backdrop-blur p-3 rounded-lg';
      li.innerHTML = `
        <span class="flex-1 font-medium truncate">${s.title}</span>
        <span class="flex-1 text-gray-600 truncate">${s.artist}</span>
        <span class="flex-1 text-gray-700 truncate">${(s.categories||[]).join(', ')}</span>
        <span class="flex-1 text-gray-800 truncate">${s.notes||''}</span>
      `;
      li.onclick = ()=> openTagModal(tag);
      ul.append(li);
    });
    refs['modal-grid'].append(ul);
    refs['tag-modal'].classList.remove('hidden');
  }
  if(refs['modal-close']) refs['modal-close'].onclick = ()=> refs['tag-modal'].classList.add('hidden');

  function render() {
    if(!grid) return;
    grid.innerHTML = '';
    updateCounts();
    updateViewButtons();

    if (viewMode!=='songs') {
      if(refs['filter-bar']) refs['filter-bar'].style.display = 'none';
      const items = viewMode==='categories' ? unique('categories') : uniqueArtist();
      items.forEach(tag => {
        const div = document.createElement('div');
        const song = songs.find(s => viewMode==='categories'
          ? (s.categories||[]).includes(tag) : s.artist===tag
        );
        const src = song ? thumbnail(song.thumbnail_url || song.inst) : '';
        div.className = 'relative aspect-video rounded-2xl overflow-hidden cursor-pointer category-card';
        div.innerHTML = `
          <img src="${src}"
               class="w-full h-full object-cover filter blur-[2px] brightness-[0.6]" />
          <span class="absolute inset-0 flex items-center justify-center text-white text-lg font-semibold bg-black bg-opacity-40">
            ${tag}
          </span>`;
        div.onclick = () => {
          filters = [{ value: tag.toLowerCase() }];
          renderActiveFilters();
          viewMode = 'songs';
          render();
        };
        grid.append(div);
      });
      return;
    }

    if(refs['filter-bar']) refs['filter-bar'].style.display = 'flex';
    
    const filtered = songs.filter(s => {
      if (refs['fav-toggle'] && refs['fav-toggle'].classList.contains('bg-yellow-700') && !s.recommend) {
        return false;
      }
      if (refs['completed-toggle'] && refs['completed-toggle'].classList.contains('bg-green-700') && !s.completed) {
        return false;
      }
    
      return filters.every(f => {
        const v = f.value;
        const inTitle      = s.title.toLowerCase().includes(v);
        const inArtist     = s.artist.toLowerCase().includes(v);
        const inCategories = (s.categories || []).some(c => c.toLowerCase().includes(v));
        const inNotes      = (s.notes   || '').toLowerCase().includes(v);
        return inTitle || inArtist || inCategories || inNotes;
      });
    });

    const sortValue = refs['sort-combo'] ? refs['sort-combo'].value : 'latest_desc';
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
            if (note && note.includes('익숙'))  return 0;
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

    filtered.forEach(s => {
      const c = tpl.cloneNode(true);

      const imgSrc = thumbnail(s.thumbnail_url || s.inst);
      c.querySelector('[data-img]').src = imgSrc;
      c.querySelector('[data-title]').textContent      = s.title;
      c.querySelector('[data-artist]').textContent     = s.artist;

      const noteElem = c.querySelector('[data-note]');
      noteElem.innerHTML = '';
      if (s.notes) {
        const span = document.createElement('span');
        span.className = 'category-tag';
        span.textContent = s.notes;
        noteElem.appendChild(span);
      }
      
      c.querySelector('[data-completed]').style.display= s.completed   ? 'inline-flex' : 'none';
      c.querySelector('[data-recommend]').style.display= s.recommend   ? 'inline-flex' : 'none';
      c.querySelector('[data-bomb]').style.display     = s.bomb        ? 'inline-flex' : 'none';

      const t  = parseInt(s.transpose);
      const kt = s.key
        ? s.key + (!isNaN(t) && t !== 0 ? (t > 0 ? ' +' + t : ' ' + t) : '')
        : '';
      c.querySelector('[data-key]').textContent = kt;

      c.querySelector('.song-card').setAttribute('data-id', s.id);

      const catC = c.querySelector('[data-categories]');
      catC.innerHTML = '';
      (s.categories || []).forEach(cat => {
        const span = document.createElement('span');
        span.textContent = cat;
        span.className = 'category-tag';
        span.onclick = (e) => {
          e.stopPropagation();
          filters = [{ value: cat.toLowerCase() }];
          renderActiveFilters();
          render();
        };
        catC.append(span);
      });

      const req = c.querySelector('[data-request]');
      const edt = c.querySelector('[data-edit]');
      const del = c.querySelector('[data-delete]');
      
      const reqDiv = req ? req.parentElement : null;
      const edtDiv = edt ? edt.parentElement : null;
      const delDiv = del ? del.parentElement : null;
      
      if (isStreamer) {
        if (edtDiv) edtDiv.style.zIndex = 30;
        if (delDiv) delDiv.style.zIndex = 30;
        if (reqDiv) reqDiv.style.zIndex = 10;
      } else {
        if (edtDiv) edtDiv.style.zIndex = 10;
        if (delDiv) delDiv.style.zIndex = 10;
        if (reqDiv) reqDiv.style.zIndex = 30;
      }
      
      if (isStreamer && req) req.remove();
      if (edt && del) {
        if (isStreamer) {
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
          // alert('복사됨!');
        };
      }
      
      if (edt) {
        edt.onclick = () => {
          editingId = s.id;
          refs['song-title'].value      = s.title;
          refs['song-artist'].value     = s.artist;
          refs['song-categories'].value = (s.categories || []).join(',');
          refs['song-key'].value        = s.key;
          refs['song-transpose'].value  = s.transpose;
          refs['song-notes'].value      = s.notes;
          refs['song-completed'].checked= s.completed;
          refs['song-recommend'].checked= s.recommend;
          refs['song-bomb'].checked     = s.bomb;
          refs['song-inst'].value       = s.inst;
          refs['song-thumbnail-url'].value = s.thumbnail_url || '';
          refs['add-submit-button'].textContent   = '저장';
          refs['add-form-container'].hidden       = false;
        };
      }
      if (del) {
        del.onclick = async () => {
          if (!confirm(`"${s.title}" 삭제할까요?`)) return;
          await supabaseClient.from('onusongdb').delete().eq('id', s.id);
          songs = songs.filter(x => x.id !== s.id);
          render();
        };
      }

      c.querySelector('[data-instlink]').onclick = () => window.open(s.inst, '_blank');

      grid.append(c);
    });
  }

  async function loadSongs() {
    const { data, error } = await supabaseClient
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

  if(refs['view-songs']) refs['view-songs'].onclick      = ()=> { viewMode='songs'; render(); };
  if(refs['view-categories']) refs['view-categories'].onclick = ()=> { viewMode='categories'; render(); };
  if(refs['view-artists']) refs['view-artists'].onclick    = ()=> { viewMode='artists'; render(); };

  // [보안 수정 3] 스트리머 모드 토글 로직 변경 (UID 체크 방식)
  if(refs['toggle-role']) {
      refs['toggle-role'].onclick = async () => {
        // 1. 현재 유저 정보 가져오기
        const { data: { user } } = await supabaseClient.auth.getUser();

        // 2. 로그인 상태 확인
        if (!user) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }

        // 3. 권한(UID) 확인
        if (!ALLOWED_UIDS.includes(user.id)) {
            alert('관리자 권한이 없습니다.');
            return;
        }

        // 4. 권한이 맞으면 모드 토글
        if (!isStreamer) {
            sessionStorage.setItem('authorized', 'true');
            isStreamer = true;
            alert('관리자(스트리머) 모드로 전환되었습니다.');
        } else {
            isStreamer = false;
            sessionStorage.removeItem('authorized');
            alert('관리자 모드가 해제되었습니다.');
        }

        // UI 갱신
        if(refs['add-form-container']) refs['add-form-container'].hidden = !isStreamer;
        render();
      };
  }

  if(refs['add-song-form']) {
      refs['add-song-form'].onsubmit = async e => {
        e.preventDefault();
      
        const payload = {
          title:      refs['song-title'].value.trim(),
          artist:     refs['song-artist'].value.trim(),
          categories: refs['song-categories'].value.split(',').map(x=>x.trim()).filter(Boolean),
          key:        refs['song-key'].value.trim(),
          transpose:  parseInt(refs['song-transpose'].value)||0,
          notes:      refs['song-notes'].value.trim(),
          completed:  refs['song-completed'].checked,
          recommend:  refs['song-recommend'].checked,
          bomb:       refs['song-bomb'].checked,
          inst:       refs['song-inst'].value.trim(),
          thumbnail_url: refs['song-thumbnail-url'].value.trim() || thumbnail(refs['song-inst'].value.trim())
        };
      
        let error = null;
        if (editingId) {
          // 수정
          payload.id = editingId;
          ({ error } = await supabaseClient
            .from('onusongdb')
            .upsert([ payload ], { onConflict: ['id'] }));
        } else {
          // 추가
          ({ error } = await supabaseClient
            .from('onusongdb')
            .insert([ payload ]));
        }
      
        if (error) {
          alert(error.message);
        } else {
          refs['add-song-form'].reset();
          refs['add-submit-button'].textContent = '✨ 추가하기';
          refs['add-form-container'].hidden = true;
          editingId = null;
          loadSongs();
        }
      };
  }

  loadSongs();
  
  // ------------- 신청 버튼 Hover시 blur 처리 -------------
  document.body.addEventListener('mouseover', function(e) {
    const btn = e.target.closest('[data-request]');
    if (btn) {
      document.querySelectorAll('.song-card').forEach(card => {
        card.classList.add('blur-others');
        card.classList.remove('active-request');
      });
      const songCard = btn.closest('.song-card');
      if (songCard) {
        songCard.classList.remove('blur-others');
        songCard.classList.add('active-request');
      }
    }
  });
  document.body.addEventListener('mouseout', function(e) {
    const btn = e.target.closest('[data-request]');
    if (btn) {
      document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('blur-others', 'active-request');
      });
    }
  });

});

// 유틸리티(필터 태그)
function createFilterTag(text, onRemove) {
  const filterTag = document.createElement('div');
  filterTag.className = 'filter-tag';
  filterTag.innerHTML = `<span>${text}</span><button type="button">×</button>`;
  filterTag.querySelector('button').addEventListener('click', onRemove);
  return filterTag;
}
