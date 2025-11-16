// ✅ SUPABASE_URL, SUPABASE_KEY, supabase 선언 부분 모두 삭제!

// 현재 유저 정보 가져오기
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// 즐겨찾기 토글 함수
async function toggleFavorite(songId, btnElem) {
  const user = await getCurrentUser();
  if (!user) {
    alert('로그인 후 이용 가능합니다.');
    return;
  }

  // 내 프로필 stats 불러오기
  const { data: profile, error: selectErr } = await supabase
    .from('user_profile_stats')
    .select('favorites')
    .eq('user_id', user.id)
    .maybeSingle();

  let favorites = Array.isArray(profile?.favorites) ? [...profile.favorites] : [];
  const idx = favorites.indexOf(songId.toString());
  if (idx === -1) {
    favorites.push(songId.toString());
    btnElem.classList.add('active');
  } else {
    favorites.splice(idx, 1);
    btnElem.classList.remove('active');
  }

  let result;
  if (profile) {
    result = await supabase
      .from('user_profile_stats')
      .update({ favorites })
      .eq('user_id', user.id);
  } else {
    result = await supabase
      .from('user_profile_stats')
      .insert([{ user_id: user.id, favorites }]);
  }
  if (result.error) {
    console.error('DB 업데이트 실패:', result.error);
    alert('DB 업데이트 실패: ' + result.error.message);
  }
}

// 즐겨찾기 버튼 이벤트 연결 (카드 렌더 후 호출)
async function setupFavBtns() {
  const user = await getCurrentUser();
  if (!user) return;

  // 프로필 stats 가져와서 내 즐겨찾기 목록 확인
  const { data: profile } = await supabase
    .from('user_profile_stats')
    .select('favorites')
    .eq('user_id', user.id)
    .maybeSingle();

  const favorites = Array.isArray(profile?.favorites) ? profile.favorites : [];

  document.querySelectorAll('[data-fav]').forEach(btn => {
    const songId = btn.closest('.song-card')?.dataset.id;
    if (!songId) return;

    // 초기 상태 표시
    if (favorites.includes(songId)) btn.classList.add('active');
    else btn.classList.remove('active');

    // 클릭시 토글
    btn.onclick = () => toggleFavorite(songId, btn);
  });
}

// ⚠️ 곡카드 렌더 이후 반드시 setupFavBtns() 한 번 실행!
window.setupFavBtns = setupFavBtns;
