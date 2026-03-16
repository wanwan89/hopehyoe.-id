console.log("JS CONNECTED");

// =======================
// DYNAMIC BADGE SYSTEM
// =======================
function getUserBadge(role) {
  let badge = "";
  if (role === 'admin') {
    badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: bold; height: 16px;">🛡 Dev</span>`;
  }
  if (role === 'verified') {
    badge += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  const crowBadges = { 'crown1': 'crown1.png', 'crown2': 'crown2.png', 'crown3': 'crown3.png' };
  if (crowBadges[role]) {
    badge += `<img src="${crowBadges[role]}" style="width: 18px; height: 18px; margin-left: 5px; vertical-align: middle; object-fit: contain; display: inline-block;" alt="${role}">`;
  }
  return badge;
}

// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPostId = null;
let replyTo = null;
let replyToUsername = null;

// =======================
// DOM READY
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  await getUser();
  await loadPostsFromServer(); 
  initSearch();
  initLikeButtons();
  initComments();
  initReplyClick();
  initAuth();
  initRealtime();
  initCloseButtons();
  initPasswordToggle();
  initUsernameUpdateUI();
  loadLikes();
  loadCommentCounts();
});

async function getUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      currentUser = user;
      // Ambil data role dari tabel profiles
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      currentUser.role = profile?.role || 'user';
      
      // Jalankan fungsi proteksi UI
      protectAdminUI();
    }
  } catch (err) {
    console.error("Auth error:", err.message);
    currentUser = null;
  }
}
function protectAdminUI() {
  const adminBtn = document.getElementById('adminPanelBtn');
  if (!adminBtn) return;

  // Jika user tidak login ATAU role bukan admin, hapus tombolnya
  if (!currentUser || currentUser.role !== 'admin') {
    adminBtn.style.display = 'none'; // Sembunyikan
    // Atau lebih aman, hapus dari HTML:
    // adminBtn.remove(); 
  } else {
    adminBtn.style.display = 'flex'; // Tampilkan jika dia admin
  }
}

// =======================
// LIKES & SEARCH
// =======================
function initSearch() {
  const input = document.getElementById("searchCreator");
  const cards = document.querySelectorAll(".card");
  if (!input) return;
  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    cards.forEach(card => {
      const creator = card.dataset.creator?.toLowerCase() || "";
      card.style.display = creator.includes(value) ? "block" : "none";
    });
  });
}

async function loadLikes() {
  document.querySelectorAll(".like-btn").forEach(async btn => {
    const postId = btn.dataset.post;
    const { count } = await supabaseClient.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
    const span = btn.querySelector(".like-count");
    if (span) span.textContent = count ?? 0;
    if (currentUser) {
      const { data } = await supabaseClient.from("likes").select("id").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
      if (data) btn.classList.add("liked");
    }
  });
}

function initLikeButtons() {
  document.querySelectorAll(".like-btn").forEach(btn => {
    // 1. Hapus event listener lama dengan mengganti element-nya (Clone)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // 2. Pasang event listener di element yang baru/bersih
    newBtn.addEventListener("click", async () => {
      if (!currentUser) { openLogin(); return; }
      
      const postId = parseInt(newBtn.dataset.post);
      const span = newBtn.querySelector(".like-count");
      
      // Ambil data like untuk cek apakah sudah dilike user ini
      const { data } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (data) {
        await supabaseClient.from("likes").delete().eq("id", data.id);
        newBtn.classList.remove("liked");
        if (span) span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        await supabaseClient.from("likes").insert({ post_id: postId, user_id: currentUser.id });
        newBtn.classList.add("liked");
        if (span) span.textContent = (parseInt(span.textContent) || 0) + 1;
      }
    });
  });
}

// =======================
// COMMENTS SYSTEM - FIXED
// =======================

// Fungsi untuk load angka jumlah komen di awal
async function loadCommentCounts() {
  document.querySelectorAll(".comment-toggle").forEach(async btn => {
    const postId = btn.dataset.post;
    const { count } = await supabaseClient
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);
    
    const span = btn.querySelector(".comment-count");
    if (span) span.textContent = count ?? 0;
  });
}

// Fungsi untuk update angka jumlah komen setelah ada input baru
async function updateCommentCount(postId) {
  const cleanId = parseInt(postId);
  if (isNaN(cleanId)) return;

  const { count } = await supabaseClient
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", cleanId);

  const btn = document.querySelector(`.comment-toggle[data-post="${postId}"]`);
  if (btn) {
    const span = btn.querySelector(".comment-count");
    if (span) span.textContent = count ?? 0;
  }
}

function initComments() {
  const modal = document.getElementById("commentModal");
  if (!modal) return;
  
  const originalInput = modal.querySelector(".comment-input");
  const list = modal.querySelector(".comment-list");

  // ANTI DOUBLE: Reset listener dengan Clone
  const input = originalInput.cloneNode(true);
  originalInput.parentNode.replaceChild(input, originalInput);

  // 1. Tombol Buka Modal
  document.querySelectorAll(".comment-toggle").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async () => {
      if (!currentUser) { openLogin(); return; }
      currentPostId = parseInt(newBtn.dataset.post);
      modal.classList.add("active");
      list.innerHTML = "<li>Loading...</li>";

      const { data, error } = await supabaseClient
        .from("comments")
        .select("*, profiles(username, avatar_url, role)")
        .eq("post_id", currentPostId)
        .order("created_at", { ascending: true });

      if (error) return list.innerHTML = "<li>Gagal muat komentar.</li>";
      list.innerHTML = data.length === 0 ? "<li style='text-align:center; padding:20px; color:#888;'>Belum ada komentar.</li>" : "";

      const parents = data.filter(c => c.parent_id === null);
      parents.forEach(comment => {
        let div = createComment(comment, false);
        list.appendChild(div);
        let rc = document.createElement("div");
        rc.classList.add("replies-container");
        div.after(rc);
        renderReplies(comment.id, rc, data);
        refreshToggleReplies(comment.id);
      });
    });
  });

  // 2. Event Enter (Cukup SATU blok saja)
  input.addEventListener("keydown", async e => {
    if (e.key !== "Enter" || input.value.trim() === "") return;
    
    const text = input.value.trim();
    const cleanPostId = currentPostId;

    const { data: profile } = await supabaseClient.from("profiles").select("username, avatar_url").eq("id", currentUser.id).single();
    
    const savedReplyTo = replyTo;
    const savedReplyUsername = replyToUsername;

    input.value = "";
    input.placeholder = "Mengirim...";
    replyTo = null;
    replyToUsername = null;

    const { error } = await supabaseClient.from("comments").insert({
      post_id: cleanPostId,
      user_id: currentUser.id,
      content: text,
      parent_id: savedReplyTo ? parseInt(savedReplyTo) : null,
      reply_to_username: savedReplyUsername || null,
      username: profile?.username,
      avatar: profile?.avatar_url
    });

    input.placeholder = "Tulis komentar...";
    if (error) {
      alert("Gagal: " + error.message);
    } else {
      updateCommentCount(cleanPostId);
    }
  });
} // AKHIR DARI FUNGSI (Hanya satu penutup di sini)

function renderReplies(parentId, container, all) {
  const children = all.filter(c => c.parent_id === parentId);
  if (!children.length) return;
  container.style.display = "none";
  children.forEach(child => {
    const div = createComment(child, true);
    container.appendChild(div);
    let rc = document.createElement("div");
    rc.classList.add("replies-container");
    container.appendChild(rc);
    renderReplies(child.id, rc, all);
  });
}

function createComment(comment, isReply = false) {
  const div = document.createElement("div");
  div.classList.add("comment-item");
  if (isReply) div.classList.add("reply");
  const p = comment.profiles;
  div.innerHTML = `
    <div class="comment-left"><img class="comment-avatar" src="${p?.avatar_url || 'https://via.placeholder.com/40'}" /></div>
    <div class="comment-right">
      <div class="comment-header">
        <span class="comment-username">${p?.username || 'User'} ${getUserBadge(p?.role)}</span>
        ${comment.reply_to_username ? `<span class="reply-tag">@${comment.reply_to_username}</span>` : ""}
      </div>
      <div class="comment-text">${comment.content}</div>
      <div class="comment-actions"><span class="reply-btn" data-id="${comment.id}">Reply</span></div>
    </div>`;
  return div;
}

function refreshToggleReplies(parentId) {
  const parent = document.querySelector(`.reply-btn[data-id="${parentId}"]`)?.closest(".comment-item");
  if (!parent) return;
  const container = parent.nextElementSibling;
  if (!container || !container.classList.contains("replies-container")) return;
  const count = container.querySelectorAll(':scope > .comment-item').length;
  let btn = parent.querySelector(".toggle-replies");
  if (count > 0) {
    if (!btn) {
      btn = document.createElement("div");
      btn.className = "toggle-replies";
      btn.style.cssText = "cursor:pointer; font-size:12px; color:#aaa; margin-left:50px; margin-top:5px;";
      parent.appendChild(btn);
      btn.onclick = () => {
        const hide = container.style.display !== "none";
        container.style.display = hide ? "none" : "block";
        btn.textContent = hide ? `Show ${count} replies` : "Hide replies";
      };
    }
    btn.textContent = container.style.display === "none" ? `Show ${count} replies` : "Hide replies";
  } else if (btn) btn.remove();
}

function initReplyClick() {
  document.addEventListener("click", e => {
    if (e.target.classList.contains("reply-btn")) {
      replyTo = e.target.dataset.id;
      const item = e.target.closest(".comment-item");
      replyToUsername = item.querySelector(".comment-username").childNodes[0].textContent.trim();
      const input = document.querySelector(".comment-input");
      if (input) { input.placeholder = "Reply to @" + replyToUsername; input.focus(); }
    }
  });
}

function initRealtime() {
  supabaseClient.channel("comments-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
    if (payload.new.post_id != currentPostId) return;
    const { data: profile } = await supabaseClient.from("profiles").select("username, avatar_url, role").eq("id", payload.new.user_id).single();
    payload.new.profiles = profile;
    const isReply = !!payload.new.parent_id;
    const div = createComment(payload.new, isReply);
    if (isReply) {
      const parent = document.querySelector(`.reply-btn[data-id="${payload.new.parent_id}"]`)?.closest(".comment-item");
      if (parent) {
        let container = parent.nextElementSibling;
        if (!container.classList.contains("replies-container")) {
            container = document.createElement("div");
            container.className = "replies-container";
            parent.after(container);
        }
        container.prepend(div);
        refreshToggleReplies(payload.new.parent_id);
      }
    } else {
      document.querySelector(".comment-list")?.appendChild(div);
    }
    updateCommentCount(payload.new.post_id);
  }).subscribe();
}

// =======================
// AUTH & UI
// =======================
function initAuth() {
  const form = document.querySelector(".form");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"], input[type="text"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    location.reload();
  });
}

function openLogin() { const p = document.getElementById("loginPopup"); if (p) p.style.display = "flex"; }

function initCloseButtons() {
  const modal = document.getElementById("commentModal");
  modal?.querySelector(".comment-close")?.addEventListener("click", (e) => { e.stopPropagation(); modal.classList.remove("active"); });
  document.querySelector(".close-login")?.addEventListener("click", () => { document.getElementById("loginPopup").style.display = "none"; });
}

function initPasswordToggle() {
  const t = document.getElementById("togglePassword");
  const i = document.querySelector('#passwordGroup input[type="password"]');
  if (t && i) t.onclick = () => i.type = i.type === "password" ? "text" : "password";
}

function initUsernameUpdateUI() {
  const btn = document.getElementById("updateUsernameBtn");
  const input = document.getElementById("usernameInput");
  if (btn && input) btn.onclick = async () => {
    const val = input.value.trim();
    if (!val || !currentUser) return;
    const { error } = await supabaseClient.auth.updateUser({ data: { username: val } });
    if (error) return alert(error.message);
    await supabaseClient.from("comments").update({ username: val }).eq("user_id", currentUser.id);
    alert("Username Updated!");
    location.reload();
  };
}

function showNotification(m, t = "success") {
  const n = document.createElement("div");
  n.className = `toast-notification ${t}`;
  n.textContent = m;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add("show"), 50);
  setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 500); }, 3000);
}
async function loadPostsFromServer() {
  const gallery = document.getElementById("mainGallery");
  if (!gallery) return;

  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Gagal load post:", error.message);
    return;
  }

  gallery.innerHTML = ""; 

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.creator = post.creator_id; // Sesuaikan dengan kolom creator_id

    card.innerHTML = `
      <div class="slider">
        <img src="${post.image_url || 'karya.png'}" class="active">
      </div>
      <div class="overlay">
        <h2 class="name">${post.name || post.creator_id} <span class="verified">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
              <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </h2>
        <p class="bio">${post.bio || ''}</p> <div class="stats">
          <div>⭐ ${post.rating || '5.0'}</div>
          <div>${post.date_day || ''}</div> <div>${post.date_year || ''}</div> </div>
        <div class="actions action-icons">
          <a href="linda.html?creator=${post.creator_id}" class="primary">Detail kreator</a>
          
          <button class="icon-btn like-btn" data-post="${post.id}">
            <svg viewBox="0 0 24 24" class="icon heart">
              <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
            </svg>
            <span class="like-count">0</span>
          </button>

          <button class="icon-btn comment-toggle" data-post="${post.id}">
            <svg viewBox="0 0 24 24" class="icon comment-icon">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
            </svg>
            <span class="comment-count">0</span>
          </button>
        </div>
      </div>
    `;
    gallery.appendChild(card);
  });

  // Re-inisialisasi agar fungsi klik berjalan
  initLikeButtons();
  initComments();
  loadLikes();
  loadCommentCounts();
}
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.getElementById('mobileMenuBtn');

// --- 1. LOGIKA NAVIGASI ---
navItems.forEach(item => {
  item.addEventListener('click', async function(e) {
    // CEK DISINI: Jika yang diklik adalah Admin Panel, jangan dicegah pindah halamannya!
    if (this.id === 'adminPanelBtn') {
        return; // Biarkan browser menjalankan href="admin.html" secara normal
    }

    // Jika bukan admin panel, jalankan sistem kategori seperti biasa
    e.preventDefault();
    e.stopPropagation();

    // Pindah Titik Biru
    navItems.forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');

    // Ambil nama kategori
    const selectedCategory = this.getAttribute('data-category');

    // Panggil fungsi kategori
    fetchPosts(selectedCategory);
  });
});

// Fungsi untuk mengambil data berdasarkan kategori
async function fetchPosts(category = 'all') {
  const gallery = document.getElementById('mainGallery');
  gallery.innerHTML = '<p style="color:white; text-align:center;">Memuat...</p>';

  try {
    let query = supabase.from('posts').select('*'); // Ganti 'posts' sesuai nama tabelmu

    // Jika bukan 'all', tambahkan filter kategori
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Bersihkan galeri dan tampilkan data baru
    gallery.innerHTML = '';
    if (data.length === 0) {
      gallery.innerHTML = '<p style="color:gray; text-align:center;">Tidak ada postingan di kategori ini.</p>';
      return;
    }

    data.forEach(post => {
      // Gunakan fungsi render card yang sudah kamu buat sebelumnya
      // Contoh sederhana:
      const card = `
        <div class="card">
          <img src="${post.image_url}" alt="${post.username}">
          <div class="card-info">
            <h3>${post.username} <span class="verify-icon">check</span></h3>
            <p>${post.description}</p>
          </div>
        </div>
      `;
      gallery.innerHTML += card;
    });

  } catch (err) {
    console.error("Gagal memuat data:", err.message);
  }
}

// Panggil pertama kali saat halaman dibuka
fetchPosts('all');

  // --- 2. BUKA/TUTUP SIDEBAR VIA TOMBOL GARIS 3 ---
  if (menuBtn) {
    menuBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // Penting agar tidak langsung dianggap klik luar
      sidebar.classList.toggle('active');
    });
  }

  // --- 3. KLIK LUAR UNTUK TUTUP (Hanya jika klik di luar sidebar) ---
  document.addEventListener('click', (e) => {
    // Jika yang diklik BUKAN sidebar dan BUKAN tombol menu, baru kita tutup
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('active');
    }
  });
});
