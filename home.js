// =======================
// FORCE LOAD MIDTRANS SDK
// =======================
function loadMidtrans() {
    if (window.snap) {
        console.log("✅ Midtrans Snap ready.");
        return;
    }
    
    console.log("🔄 Memuat ulang SDK Midtrans...");
    const script = document.createElement('script');
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute('data-client-key', 'SB-Mid-client-G2wOVrrTwcffYhkC'); // Ganti dengan Client Key kamu
    script.async = true;
    script.onload = () => console.log("✅ Midtrans Snap loaded successfully!");
    script.onerror = () => console.error("❌ Gagal memuat Midtrans. Cek koneksi/Adblock.");
    document.head.appendChild(script);
}

// Jalankan saat start
loadMidtrans();

// =======================
// DYNAMIC BADGE SYSTEM (BASED ON ROLE)
// =======================
function getUserBadge(role) {
  let badge = "";

  // 1. Badge Admin / Dev (Bawaan)
  if (role === 'admin') {
    badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: bold; height: 16px;">🛡 Dev</span>`;
  }

  // 2. Badge Verified (Bawaan)
  if (role === 'verified') {
    badge += `
      <span class="verified-badge" style="margin-left:5px;">
        <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;">
          <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
          <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>`;
  }
  // 3. Badge Crow (Pake Foto dari Folder Project)
  const crowBadges = {
    'crown1': '../asets/crown1.png', 
    'crown2': '../asets/crown2.png',
    'crown3': '../asets/crown3.png'
  };

  if (crowBadges[role]) {
    badge += `
      <img src="${crowBadges[role]}" 
           style="
             width: 18px; 
             height: 18px; 
             margin-left: 5px; 
             vertical-align: middle; 
             object-fit: contain;
             display: inline-block;
           " 
           alt="${role}">
    `;
  }

  return badge;
}
// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// =======================
// AUDIO PLAYER
// =======================
const audioPlayer = document.getElementById("audio-player");
const savedSong = localStorage.getItem("currentSong");
const savedTime = localStorage.getItem("currentTime");
if (savedSong && audioPlayer) {
  audioPlayer.src = savedSong;
  audioPlayer.currentTime = savedTime ? parseFloat(savedTime) : 0;
  audioPlayer.play();
}
// =======================
// CARDS
// =======================
const karyaCard = document.querySelector(".job-card.karya-card");
const musicCard = document.querySelector(".job-card.music-card");

function CardImages(isDark) {
  if (!karyaCard || !musicCard) return;
  if (isDark) {
    karyaCard.style.setProperty("background-image", "url('../asets/job1.png')", "important");
    musicCard.style.setProperty("background-image", "url('../asets/job.png')", "important");
  } else {
    karyaCard.style.setProperty("background-image", "url('../asets/art.png')", "important");
    musicCard.style.setProperty("background-image", "url('../asets/song.png')", "important");
  }
}
// =======================
// DARK MODE
// =======================
const toggleBtn = document.querySelector(".toggle-dark");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.add("theme-transition");
    const isDark = document.body.classList.toggle("dark");
    CardImages(isDark);
    setTimeout(() => {
      document.body.classList.remove("theme-transition");
    }, 400);
  });
}
const isAutoDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (isAutoDark) document.body.classList.add("dark");
CardImages(isAutoDark);
// =======================
// 3D HOVER TILT
// =======================
document.querySelectorAll(".job-card, .recent-card").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -(y - centerY) / 12;
    const rotateY = (x - centerX) / 12;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
  });
});
// =======================
// SEARCH FILTER
// =======================
const searchInput = document.querySelector(".search input");
const cards = document.querySelectorAll(".job-card, .recent-card");
if (searchInput) {
  searchInput.addEventListener("keyup", function () {
    const value = this.value.toLowerCase();
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(value) ? "flex" : "none";
    });
  });
}
// =======================
// CARD BUTTON REDIRECT
// =======================
const artButton = document.getElementById("artButton");
if (artButton && karyaCard) {
  artButton.addEventListener("click", (e) => {
    e.preventDefault();
    karyaCard.style.setProperty("background-image", "url('../asets/art.png')", "important");
    setTimeout(() => window.location.href = "post.html", 100);
  });
}
const songButton = document.querySelector(".music-card .button");
if (songButton && musicCard) {
  songButton.addEventListener("click", (e) => {
    e.preventDefault();
    musicCard.style.setProperty("background-image", "url('../asets/song.png')", "important");
    setTimeout(() => window.location.href = "music.html", 100);
  });
}
// =======================
// PRELOAD IMAGES
// =======================
function preloadImages(urls, callback) {
  let loaded = 0;
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      loaded++;
      if (loaded === urls.length && callback) callback();
    };
  });
}
preloadImages(['../asets/job1.png', '../asets/job.png', '../asets/art.png', '../asets/song.png'], () => {
  CardImages(document.body.classList.contains("dark"));
});
// =======================
// PROFILE MENU
// =======================
const profile = document.getElementById("userProfile");
const menu = document.getElementById("profileMenu");
if (profile) {
  profile.addEventListener("click", () => {
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  });
}

// =======================
// AVATAR MENU
// =======================
const avatar = document.getElementById("avatar");
const avatarMenu = document.getElementById("avatarMenu");
if (avatar) {
  avatar.addEventListener("click", () => {
    avatarMenu.style.display = avatarMenu.style.display === "flex" ? "none" : "flex";
  });
}

// =======================
// SETTINGS MODAL + PROFILE 
// =======================
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");
const newUsernameInput = document.getElementById("newUsername");
const avatarPreview = document.getElementById("avatarPreview");
const avatarUpload = document.getElementById("avatarUpload");
const avatarOptions = document.querySelectorAll("#avatarOptions .avatar-choice");
let selectedAvatar = null;

// buka modal
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
    const usernameEl = document.getElementById("username");
    if (usernameEl) {
      // Hapus teks badge dari string
      const usernameOnly = usernameEl.textContent.replace(/🛡 Admin|Verified/g, "").trim();
      newUsernameInput.value = usernameOnly;
    }
  });
}
// tutup modal
if (closeSettings) {
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });
}

// klik di luar modal-content tutup modal
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.classList.remove("active");
});

// pilih avatar dari pilihan
avatarOptions.forEach(img => {
  img.addEventListener("click", () => {
    selectedAvatar = img.src;
    avatarOptions.forEach(i => i.classList.remove("selected"));
    img.classList.add("selected");
  });
});

// preview upload avatar file
if (avatarUpload && avatarPreview) {
  avatarUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => avatarPreview.src = event.target.result;
    reader.readAsDataURL(file);
  });
}

// save profile (username + avatar)
if (saveSettings) {
  saveSettings.addEventListener("click", async () => {
    try {
      const s = {};
      const newUsername = newUsernameInput.value.trim();
      
      // Ambil user yang sedang aktif
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan.");

      // Logika Upload File Avatar
      if (avatarUpload.files[0]) {
        const file = avatarUpload.files[0];
        const fileName = `avatars/${user.id}_${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        s.avatar_url = publicData.publicUrl;
      } else if (selectedAvatar) {
        s.avatar_url = selectedAvatar;
      }

      if (newUsername) s.username = newUsername;

       // 1. Update (Database)
      const { error: dbError } = await supabase
        .from("profiles")
        .update(s)
        .eq("id", user.id);
      if (dbError) throw dbError;

      // 2. Update Metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { 
          username: s.username || user.user_metadata.username,
          avatar_url: s.avatar_url || user.user_metadata.avatar_url
        }
      });
      if (authUpdateError) throw authUpdateError;

      // 3. Update DOM Secara Langsung 
      const usernameEl = document.getElementById("username");
      const avatarEl = document.getElementById("avatar");

      if (s.username && usernameEl) {
        // Ambil role terbaru untuk mempertahankan badge
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        usernameEl.innerHTML = `${s.username} ${getUserBadge(profile?.role)}`;
      }

      if (s.avatar_url && avatarEl) {
        avatarEl.src = s.avatar_url + "?t=" + Date.now();
      }

      // Tutup modal dan beri notifikasi
      settingsModal.classList.remove("active");
      showToast("Profil diperbarui secara instan!", "success");

    } catch (err) {
      console.error("Gagal update:", err.message);
      showToast("Gagal update profil: " + err.message, "error");
    }
  });
}

function showToast(message, type="info"){
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "show " + type;

  setTimeout(()=>{
    toast.classList.remove("show");
  },3000);
}
async function checkPopup() {
  console.log("Checking pop-up status...");
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data || data.popup_active !== true) {
    console.log("Pop-up is inactive or error occurred.");
    return;
  }

  const popup = document.getElementById('ad-popup');
  const desc = document.getElementById('popup-desc');
  const img = document.getElementById('popup-img');

  if (desc) desc.textContent = data.popup_text;
  
  if (img) {
    if (data.popup_image) {
      img.src = data.popup_image;
      img.style.display = 'block';
    } else {
      img.style.display = 'none'; // Sembunyikan jika tidak ada gambar di DB
    }
  }
  
  if (popup) {
    popup.style.display = 'flex'; // Pakai flex karena container utama pakai justify/align center
    console.log("Pop-up displayed successfully!");
  }
}
  
// =======================
// LOGIN / LOGOUT & PROFILE (VERSI UPDATE)
// =======================
async function loadUser() {
  const { data: { user } } = await supabase.auth.getUser();
  const buyBtn = document.getElementById('buyVerified'); 
  const usernameEl = document.getElementById("username");
  const avatarEl = document.getElementById("avatar");

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, role, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile) {
      if (usernameEl) {
        usernameEl.innerHTML = `${profile.username || user.email.split("@")[0]} ${getUserBadge(profile.role)}`;
      }
      
      // 2. Update Foto Profil
      if (avatarEl && profile.avatar_url) {
        avatarEl.src = profile.avatar_url + "?t=" + Date.now();
      }

      // 3. Ganti Warna 
      if (buyBtn) {
        buyBtn.style.display = 'inline-flex'; 
        
        if (profile.role === 'verified' || profile.role === 'admin') {
          // WARNA BIRU (Sudah Beli)
          buyBtn.style.background = "linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)";
          buyBtn.style.boxShadow = "0 4px 10px rgba(58, 123, 213, 0.3)";
        } else {
          // WARNA ORANYE ASLI (Belum Beli)
          buyBtn.style.background = "linear-gradient(90deg, #FF512F 0%, #DD2476 100%)";
          buyBtn.style.boxShadow = "0 4px 10px rgba(221, 36, 118, 0.3)";
        }
      }
    }
  }
}
// ==========================================
// TOMBOL PRO + LOGIKA SEMBUNYIKAN LIVECHAT
// ==========================================
const buyBtnElement = document.getElementById('buyVerified');
const bSheet = document.getElementById('vip-bottom-sheet');
const bOverlay = document.querySelector('.sheet-overlay');

if (buyBtnElement && bSheet) {
    buyBtnElement.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        bSheet.style.display = 'flex';
        
        // --- SEMBUNYIKAN LIVECHAT AGAR TIDAK TUTUPI TOMBOL BELI ---
        if (window.LiveChatWidget) {
            window.LiveChatWidget.call('hide_widget');
        }

        setTimeout(() => {
            bSheet.classList.add('active');
        }, 10);
    };
}

// Tutup menu jika klik area gelap
if (bOverlay) {
    bOverlay.onclick = () => {
        bSheet.classList.remove('active');
        
        // --- MUNCULKAN KEMBALI LIVECHAT SAAT MENU TUTUP ---
        if (window.LiveChatWidget) {
            window.LiveChatWidget.call('maximize_widget'); 
        }

        setTimeout(() => {
            bSheet.style.display = 'none';
        }, 400);
    };
}

// Inisialisasi aplikasi secara berurutan
const initApp = async () => {
  try {
    await loadUser();
    await updateAuthMenu();
    await checkPopup();
  } catch (err) {
    console.error(err);
  }
};

initApp();

// BUTTON LOGOUT (TOMBOL MERAH AKTIF)

async function handleLogout(e) {
  e.preventDefault(); 
  
  const confirmLogout = confirm("Apakah kamu yakin ingin keluar?");
  if (!confirmLogout) return;

  try {
    console.log("Proses Logout...");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    localStorage.clear();
    sessionStorage.clear();

    alert("Berhasil keluar!");
    
    // Balik ke halaman login
    window.location.href = "index.html"; 
  } catch (err) {
    console.error("Gagal Logout:", err.message);
    alert("Gagal keluar: " + err.message);
  }
}

// INSTANT LOGOUT (TANPA NOTIFIKASI & KONFIRMASI)
document.addEventListener('click', async (e) => {
  if (e.target && e.target.textContent.toLowerCase().includes('logout')) {
    e.preventDefault();

    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();

      window.location.href = "index.html"; 
      
    } catch (err) {
      window.location.href = "index.html";
    }
  }
});
async function updateAuthMenu() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    logoutBtn.textContent = "Logout";
  } else {
    logoutBtn.textContent = "Login";
  }
}
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // logout
    await supabase.auth.signOut();
    window.location.href = "index.html";
  } else {
    // login
    window.location.href = "login.html";
  }
});
// ==========================================
// LOGIKA BELI DENGAN EFEK PARTIKEL & LOADING
// ==========================================
document.querySelectorAll('.buy-now-btn').forEach(button => {
    button.onclick = async (e) => {
        const btn = e.target;

        // 1. EFEK PARTIKEL KEREN (MELEDAK DARI KURSOR)
        createParticles(e.clientX, e.clientY);
        
        // 2. EFEK LOADING PADA TOMBOL (TAMBAHKAN CLASS CSS)
        btn.classList.add('btn-loading');

        const card = btn.closest('.product-card');
        const price = card.getAttribute('data-price');
        const role = card.getAttribute('data-role');
        const name = card.querySelector('.p-name').innerText;

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            btn.classList.remove('btn-loading');
            return alert("Silakan login dulu!");
        }

        try {
            const response = await fetch('https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-premium', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}` 
                },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    amount: parseInt(price),
                    item_name: name,
                    role_target: role
                })
            });

            if (!response.ok) throw new Error('Gagal menghubungi server pembayaran');

            const { token } = await response.json();

            // MATIKAN LOADING SAAT POPUP MIDTRANS MUNCUL
            btn.classList.remove('btn-loading');

            if (window.snap) {
                window.snap.pay(token, {
                    onSuccess: (result) => { alert("Pembayaran Berhasil!"); location.reload(); },
                    onPending: (result) => { alert("Menunggu pembayaran..."); },
                    onError: (result) => { alert("Pembayaran gagal!"); }
                });
            } else {
                loadMidtrans();
                alert("Menyiapkan koneksi aman, silakan klik lagi.");
            }

        } catch (err) {
            console.error("Error:", err);
            btn.classList.remove('btn-loading');
            alert("Terjadi kesalahan koneksi ke pembayaran.");
        }
    };
});

// FUNGSI PEMBANTU UNTUK PARTIKEL
function createParticles(x, y) {
  const colors = ['#f09f33', '#00d2ff', '#4ade80', '#ff758c', '#ffffff'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.position = 'fixed';
    p.style.pointerEvents = 'none';
    p.style.borderRadius = '50%';
    p.style.zIndex = '10001';
    
    document.body.appendChild(p);
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const destinationX = Math.cos(angle) * velocity;
    const destinationY = Math.sin(angle) * velocity;

    p.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 }
    ], {
      duration: 600 + Math.random() * 400,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      fill: 'forwards'
    });

    setTimeout(() => p.remove(), 1000);
  }
}
