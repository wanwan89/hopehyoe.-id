import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ================= SUPABASE CONFIG =================
const _supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const _supabase = createClient(_supabaseUrl, _supabaseKey);

// ================= SELECT ELEMENTS =================
const playlistGrid = document.getElementById("playlistGrid");
const audio = document.getElementById("audio-player");
const miniPlayer = document.getElementById("miniPlayer");
const miniCover = document.getElementById("mini-cover");
const miniTitle = document.getElementById("mini-title");
const miniArtist = document.getElementById("mini-artist");
const playBtn = document.getElementById("play-btn");
const progress = document.getElementById("progress");
const progressContainer = document.getElementById("progress-container");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

// POPUP ELEMENTS
const popup = document.getElementById("singerPopup");
const popupCover = document.getElementById("popup-cover");
const popupName = document.getElementById("popup-name");
const popupBio = document.getElementById("popup-bio");
const closeBtn = document.getElementById("closePopup");

// SIDEBAR ELEMENTS
const openSidebar = document.getElementById('openSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// STATE
let allSongs = []; 
let currentSongsList = []; // Untuk handle list saat difilter/search
let currentSongIndex = -1;

// ================= 1. AMBIL DATA DARI SUPABASE =================
async function loadMusicLibrary() {
  const { data, error } = await _supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Gagal muat musik:", error.message);
    return;
  }

  allSongs = data;
  renderPlaylist(allSongs);
}

// ================= 2. RENDER PLAYLIST KE HTML =================
function renderPlaylist(songs) {
  if (!playlistGrid) return;
  playlistGrid.innerHTML = ""; 
  currentSongsList = songs; // Sync untuk auto-next
  
  songs.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.dataset.index = index;

    // KONTEN DIBAWAH INI HARUS ADA AGAR MUSIK MUNCUL
    card.innerHTML = `
      <img src="${song.cover_url}">
      <div class="playlist-info">
        <h3>${song.title}</h3>
        <p class="artist-name">${song.artist}</p>
      </div>
    `;

    card.addEventListener("click", e => {
      // Logika titik tiga dihapus, langsung putar lagu
      currentSongIndex = index;
      playSong(song);
    });

    playlistGrid.appendChild(card);
  });
}

// ================= 3. FUNGSI PLAY & PLAYER =================
function playSong(song) {
  if (!miniPlayer || !audio) return;
  
  miniPlayer.style.display = "flex";
  
  audio.src = song.audio_src.startsWith('http') ? song.audio_src : `songs/${song.audio_src}`;
  audio.play();

  if (miniCover) miniCover.src = song.cover_url;
  if (miniTitle) miniTitle.textContent = song.title;
  if (miniArtist) miniArtist.textContent = song.artist;

  // Background Efek
  document.body.style.background = `linear-gradient(to bottom, rgba(13, 17, 23, 0.9), #0d1117), url('${song.cover_url}') center/cover no-repeat`;

  // Highlight Card Aktif
  document.querySelectorAll('.playlist-card').forEach((card, idx) => {
    card.style.borderColor = (idx === currentSongIndex) ? "#1f3cff" : "#30363d";
  });
}

// AUTO NEXT LOGIC
if (audio) {
  audio.addEventListener("ended", () => {
    currentSongIndex++;
    if (currentSongIndex < currentSongsList.length) {
      playSong(currentSongsList[currentSongIndex]);
    } else {
      currentSongIndex = 0; // Looping ke awal
      playSong(currentSongsList[0]);
    }
  });

  audio.addEventListener("play", () => { if(playBtn) playBtn.textContent = "pause"; });
  audio.addEventListener("pause", () => { if(playBtn) playBtn.textContent = "play_arrow"; });

  audio.addEventListener("timeupdate", () => {
    if(audio.duration && progress){
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${percent}%`;
      if(currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if(durationEl) durationEl.textContent = formatTime(audio.duration);
    }
  });
}

if (playBtn) {
  playBtn.addEventListener("click", () => audio.paused ? audio.play() : audio.pause());
}

function formatTime(time) {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

if (progressContainer) {
  progressContainer.addEventListener("click", e => {
    audio.currentTime = (e.offsetX / progressContainer.clientWidth) * audio.duration;
  });
}

// ================= 4. POPUP SINGER =================
function showSingerPopup(song) {
  if (!popup) return;
  if (popupCover) popupCover.src = song.cover_url;
  if (popupName) popupName.textContent = song.artist;
  if (popupBio) popupBio.textContent = song.bio || "Bio tidak tersedia untuk artis ini.";
  popup.classList.add("active");
}

if (closeBtn) closeBtn.addEventListener("click", () => popup.classList.remove("active"));
if (popup) {
  popup.addEventListener("click", e => { if(e.target === popup) popup.classList.remove("active"); });
}

// ================= 5. FILTER & SEARCH =================
document.querySelectorAll(".category-tabs button").forEach(tab => {
  tab.addEventListener("click", () => {
    const activeTab = document.querySelector(".category-tabs .active");
    if(activeTab) activeTab.classList.remove("active");
    tab.classList.add("active");

    const cat = tab.getAttribute("data-cat");
    const filtered = (cat === "all") ? allSongs : allSongs.filter(s => s.category === cat);
    renderPlaylist(filtered);
  });
});

const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const query = e.target.value.toLowerCase();
    const filtered = allSongs.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.artist.toLowerCase().includes(query)
    );
    renderPlaylist(filtered);
  });
}

// ================= 6. SIDEBAR LOGIC =================
function toggleSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }
}

if (openSidebar) openSidebar.addEventListener('click', toggleSidebar);
if (closeSidebar) closeSidebar.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if (!link.href.includes('adminmusic.html')) {
            e.preventDefault();
            toggleSidebar();
            
            // Effect Shuffle untuk menu Viral/Trend
            const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
            renderPlaylist(shuffled);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// RUN
loadMusicLibrary();

// ================= 7. ROLE-BASED ACCESS CONTROL (RBAC) =================
async function checkAdminAccess() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (!adminPanelBtn) return;

    // Pastikan tombol sembunyi dulu setiap kali fungsi dijalankan
    adminPanelBtn.style.setProperty('display', 'none', 'important');

    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();

    // Jika tidak ada session atau error, biarkan tetap sembunyi
    if (sessionError || !session) {
        console.log("User belum login.");
        return;
    }

    // Ambil role dari tabel profiles
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error("Gagal mengambil profil:", profileError.message);
        return;
    }

    // Tampilkan HANYA jika role tepat
    if (profile && profile.role === 'admin') {
        adminPanelBtn.style.setProperty('display', 'block', 'important');
        console.log("Admin terverifikasi.");
    } else {
        console.log("User bukan admin, akses ditolak.");
    }
}

// Tambahkan pemanggilan fungsi ini di bagian RUN
// ================= RUN & INITIALIZE =================
async function initApp() {
    // 1. Muat library musik (untuk semua user)
    await loadMusicLibrary();
    
    // 2. Cek akses admin saat pertama kali load
    await checkAdminAccess();

    // 3. Pantau perubahan status login (Login/Logout/Session Expired)
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event Terdeteksi:", event);
        checkAdminAccess(); 
    });
}

// Jalankan aplikasi
initApp();
