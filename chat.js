import { createClient } from "https://esm.sh/@supabase/supabase-js";
// ===== Supabase config =====
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Audio Config =====
const sendSound = new Audio('send.mp3');
const receiveSound = new Audio('receive.mp3');


let currentRoomId = 'room-1';
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("chat-input");
const Btn = document.getElementById("send-btn");
const membersEl = document.getElementById("chat-members");
const typingEl = document.getElementById("typing-indicator");

function scrollToBottom() {
  if (messagesEl) {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: 'smooth'
    });
  }
}


// ===== user login =====
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if(sessionError || !session || !session.user){
  showToast("Kamu harus login dulu!");
  window.location.href = "login.html";
}
const currentUser = { id: session.user.id };

// Ambil username dari profile
const { data: myProfile } = await supabase
  .from("profiles")
  .select("username")
  .eq("id", session.user.id)
  .single();
const myUsername = myProfile?.username || session.user.user_metadata.username || session.user.email;
console.log("Identitas saya di chat:", myUsername);

// ===== Channel & Presence (Typing indicator di Header) =====
const channel = supabase.channel('room-1', { config: { presence: { key: myUsername } } });

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  const statusHeader = document.getElementById("status-header");
  const typingHeader = document.getElementById("typing-header");
  
  // Pastikan elemen ada sebelum dijalankan
  if (!statusHeader || !typingHeader) return;

  const typingUsers = [];
  for (const userKey in state) {
    // Cari user lain yang isTyping-nya true
    if (userKey !== myUsername && state[userKey].some(p => p.isTyping)) {
      typingUsers.push(userKey);
    }
  }

  if (typingUsers.length > 0) {
    // Jika ada yang ngetik: Sembunyikan status online, munculkan teks mengetik
    statusHeader.style.display = "none";
    typingHeader.style.display = "inline";
    typingHeader.textContent = `${typingUsers[0]} sedang mengetik...`;
  } else {
    // Jika tidak ada: Munculkan lagi status online/terakhir terlihat
    statusHeader.style.display = "inline";
    typingHeader.style.display = "none";
  }
});

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    // Track awal dengan isTyping false
    await channel.track({ isTyping: false, online_at: new Date().toISOString() });
    console.log("Berhasil join channel & mulai melacak kehadiran.");
  }
});

// ===== Track typing logic =====
let typingTimeout;
let isCurrentlyTyping = false;

inputEl.addEventListener("input", async () => {
  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    // Beritahu database kalau kita lagi ngetik
    await channel.track({ isTyping: true, online_at: new Date().toISOString() });
  }
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    isCurrentlyTyping = false;
    // Beritahu database kalau kita sudah berhenti ngetik
    await channel.track({ isTyping: false, online_at: new Date().toISOString() });
  }, 3000); // Teks mengetik hilang setelah 3 detik berhenti input
});

// ===== Online users =====
async function setUserOnline() {
  await supabase.from("online_users").upsert({
    user_id: currentUser.id,
    username: myUsername,
    last_seen: new Date().toISOString()
  }, { onConflict: ['user_id'] });
}
await setUserOnline();
setInterval(setUserOnline, 30000);

async function updateMembers() {
  const fiveMinutesAgo = new Date(Date.now() - 5*60*1000).toISOString();
  const { data, error } = await supabase
    .from("online_users")
    .select("user_id, username")
    .gt("last_seen", fiveMinutesAgo);
  if(error){ console.error(error); return; }
  const count = data?.length || 0;
  membersEl.innerHTML = `<span class="online-dot"></span> ${count} user${count !== 1 ? "s" : ""} online`;
}
updateMembers();
setInterval(updateMembers, 30000);

// ===== Badges =====
function getBadge(role) {
  if (!role) return "";
  role = role.toLowerCase().trim();
  if(role==="admin") return `<span class="badge" style="background:#ff4757; font-size:7px; padding:0 4px; border-radius:3px; margin-left:2px; font-weight:600;">🛡 Admin</span>`;
  if(role==="verified") return `<span class="verified-icon" style="margin-left:4px; display:inline-flex; align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const crowBadges = { 'crown1':'crown1.png','crown2':'crown2.png','crown3':'crown3.png' };
  if(crowBadges[role]) return `<img src="${crowBadges[role]}" alt="${role}" style="width:16px;height:16px;margin-left:4px;vertical-align:middle;object-fit:contain;display:inline-block;" onerror="this.style.display='none';">`;
  return "";
}

// ===== Reply system =====
let currentReplyId = null;
function cancelReply(){
  currentReplyId = null;
  inputEl.dataset.replyTo = "";
  const preview = document.getElementById("reply-preview-box");
  if(preview) preview.style.display="none";
}
// Hilangkan 'async' agar proses render sinkron dan urut
function renderMessage(msg) {
  if (document.getElementById(`msg-${msg.id}`)) return;
  
  const msgEl = document.createElement("div");
  msgEl.id = `msg-${msg.id}`;
  msgEl.dataset.userId = msg.user_id;
  msgEl.className = `chat-message ${msg.user_id === currentUser.id ? "self" : "other"}`;
  
  // Ambil avatar dari data profiles yang sudah di-join (lebih cepat & urut)
  const avatarUrl = msg.profiles?.avatar_url || msg.avatar || "profile.png";
  const sticker = msg.sticker_url;
  const reactionList = msg.reactions ? Object.entries(msg.reactions).map(([e, c]) => `<span class="reaction-badge">${e} ${c}</span>`).join("") : "";

  // Logika Swipe Reply (Tetap sama)
  let startX=0, currentX=0, swiping=false;
  msgEl.addEventListener("touchstart",(e)=>{ startX=e.touches[0].clientX; swiping=true; });
  msgEl.addEventListener("touchmove",(e)=>{ if(!swiping) return; currentX=e.touches[0].clientX; let diff=currentX-startX; if(diff>120) diff=120; if(diff<-120) diff=-120; msgEl.style.transform=`translateX(${diff}px)`; });
  msgEl.addEventListener("touchend",()=>{
    let diff=currentX-startX;
    msgEl.style.transform="translateX(0)";
    msgEl.style.transition="transform .2s";
    if(diff<-80){ currentReplyId=msg.id; inputEl.dataset.replyTo=msg.id; const preview=document.getElementById("reply-preview-box"); preview.style.display="flex"; preview.innerHTML=`<span>↩</span><strong>${msg.username}</strong>`; navigator.vibrate?.(40);}
    if(diff>80) cancelReply();
    swiping=false;
  });

  msgEl.innerHTML = `
    <img class="avatar" src="${avatarUrl}" onerror="this.src='profile.png'">
    <div class="content">
      <div class="username">${msg.username}${getBadge(msg.role)}</div>
      ${msg.reply_to_msg ? `<div class="reply-preview" onclick="scrollToMessage('${msg.reply_to_msg.id}')" style="font-size:12px;color:#555;background:#f1f0f0;padding:4px 8px;border-left:3px solid #0088cc;margin-bottom:4px;cursor:pointer;"><strong>${msg.reply_to_msg.username}</strong>: ${msg.reply_to_msg.message.slice(0, 30)}...</div>` : ""}
      <div class="text" style="${msg.message === 'Pesan ini telah dihapus' ? 'font-style:italic;color:#aaa;' : ''}">${sticker ? `<img src="${sticker}" style="width:100px;height:100px;border-radius:12px;">` : msg.message}</div>
      <div class="message-reactions" id="reacts-${msg.id}">${reactionList}</div>
      <div class="timestamp">${new Date(msg.created_at).getHours().toString().padStart(2, '0')}:${new Date(msg.created_at).getMinutes().toString().padStart(2, '0')}</div>
    </div>
  `;
 
  msgEl.addEventListener("click", () => {
    currentReplyId = msg.id;
    inputEl.dataset.replyTo = msg.id;
    inputEl.placeholder = `Balas ke ${msg.username}...`;
    document.getElementById("reply-preview-box").style.display = "block";
    inputEl.focus();
  });

  messagesEl.appendChild(msgEl);
}

async function loadMessages() {
  messagesEl.innerHTML = "";
  // Tambahkan 'profiles(avatar_url)' di dalam select agar data avatar ikut terambil
  const { data, error } = await supabase.from("messages")
    .select(`
      *, 
      reply_to_msg:reply_to(id, username, message),
      profiles:user_id(avatar_url)
    `)
    .eq("room_id", currentRoomId)
    .order("created_at", { ascending: true }); // Pastikan ascending true

  if (error) return console.error(error);
  
  // Gunakan loop biasa agar urutan terjaga
  for (const msg of data) {
    renderMessage(msg);
  }
  
  messagesEl.scrollBehavior = "auto";
  messagesEl.scrollTop = messagesEl.scrollHeight;
  setTimeout(() => messagesEl.style.scrollBehavior = "smooth", 100);
}

// ===== Send message (FIXED) =====
async function Message() {
  const text = inputEl.value.trim();
  if (!text) return;
  const replyTo = inputEl.dataset.replyTo || null;
  
  // Disable button 
  Btn.disabled = true;

  try {
    const { data: profile } = await supabase.from("profiles")
      .select("username, avatar_url, role")
      .eq("id", currentUser.id)
      .single();
    
    const { error } = await supabase.from("messages").insert([{ 
      message: text, 
      user_id: currentUser.id, 
      username: profile?.username || "Guest", 
      avatar: profile?.avatar_url || "profile.png", 
      role: profile?.role || "user", 
      room_id: currentRoomId, 
      reply_to: replyTo 
    }]);

    if (error) throw error;

    // Putar suara kirim
    sendSound.play().catch(e => console.log("Audio play blocked"));

    inputEl.value = "";
    cancelReply();
    
    // Update local storage 
    localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());
    
    // Refresh list di sidebar
    await loadChatHistory(); 
    scrollToBottom();

  } catch (err) { 
    console.error("Gagal kirim pesan:", err);
    showToast("Gagal mengirim pesan");
  } finally {
    Btn.disabled = false;
  }
}
// listener klik
Btn.onclick = Message;
// listener Enter
inputEl.onkeypress = (e) => { if(e.key === "Enter") Message(); };

// ===== Update Realtime new message (FIXED) =====
supabase.channel('messages-channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
    if (payload.new.room_id === currentRoomId) {
      let newMsg = payload.new;

      // --- PERBAIKAN DI SINI ---
      // Karena payload.new tidak bawa data join, kita ambil manual avatar-nya
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", newMsg.user_id)
        .single();
      
      // Masukkan data profile ke object pesan agar renderMessage bisa membacanya
      newMsg.profiles = { avatar_url: profile?.avatar_url || "profile.png" };

      // Efek suara
      if (newMsg.user_id !== currentUser.id) {
        receiveSound.play().catch(e => console.log("Audio play blocked"));
      }

      renderMessage(newMsg); 
      scrollToBottom();
      loadChatHistory();
    }
  }).subscribe();

// ===== Scroll to message =====
window.scrollToMessage = function(id){
  const el=document.getElementById(`msg-${id}`);
  if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); el.style.background="#fff3b0"; setTimeout(()=>el.style.background=el.classList.contains('self')?"rgba(220,248,198,0.9)":"rgba(255,255,255,0.9)",1000); }
  else showToast("Pesan asli sudah terlalu lama atau telah dihapus.");
};

//SIDEBAR SLIDE//
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');
const hamburger = document.querySelector('.hamburger-btn');

hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.style.display = 'none';
});

//SIDEBAR FUNCTION//
async function refreshSidebar() {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", currentUser.id)
    .single();

  if (profile) {
    document.getElementById("side-username").textContent = profile.username;
    const shortId = currentUser.id.split('-').pop().substring(0, 5).toUpperCase();
    document.getElementById("my-unique-id").textContent = "#" + shortId;
    document.getElementById("side-avatar").src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}`;
  }

  // 2. Load Daftar Teman & Pesan Terakhir
  const list = document.getElementById("private-chat-list");
  
  //  ambil daftar user lain dulu
  const { data: friends } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .neq("id", currentUser.id)
    .limit(15);

  if (friends && friends.length > 0) {
    list.innerHTML = "";

    for (const f of friends) {
      // Ambil pesan terakhir
      const roomId = `pv_${[currentUser.id, f.id].sort().join("_")}`;
      
      const { data: lastMsgData } = await supabase
        .from("messages")
        .select("message, created_at, sticker_url")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1);

      let lastMessageText = "Klik untuk kirim pesan";
      if (lastMsgData && lastMsgData.length > 0) {
        const msg = lastMsgData[0];
        if (msg.sticker_url) {
          lastMessageText = "🖼 Mengirim stiker";
        } else if (msg.message === "Pesan ini telah dihapus") {
          lastMessageText = "🚫 Pesan dihapus";
        } else {
          lastMessageText = msg.message.length > 25 ? msg.message.substring(0, 25) + "..." : msg.message;
        }
      }

      const item = document.createElement("div");
      item.style.cssText = "display:flex; align-items:center; padding:12px 15px; border-bottom:1px solid #f9f9f9; cursor:pointer; transition:0.2s;";
      item.innerHTML = `
        <img src="${f.avatar_url || 'https://ui-avatars.com/api/?name='+f.username}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border: 1px solid #eee;">
        <div style="flex:1; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:600; font-size:14px; color:#333;">${f.username}</div>
          </div>
          <div style="font-size:12px; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${lastMessageText}
          </div>
        </div>
      `;

      // Cari bagian ini di dalam refreshSidebar
item.onclick = () => { 
  // Pastikan parameter ketiga (short_id) dikirim jika ada
  bukaChatPribadi(f.id, f.username, f.short_id || ''); 
};

      
      list.appendChild(item);
    }
  } else {
    list.innerHTML = `<p style="text-align:center; font-size:11px; color:#ccc; margin-top:30px;">Belum ada teman.</p>`;
  }
}
// ===== BAGIAN STIKER FINAL =====
const apiKey = "vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08"; 
const stickerMenu = document.getElementById("sticker-menu");
const stickerList = document.getElementById("sticker-list");
const searchInput = document.getElementById("sticker-search-input");
const searchBtn = document.getElementById("sticker-search-btn");

async function fetchStickers(query = "") {
  stickerList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center; width:100%;'>Mencari...</p>";
  const endpoint = query 
    ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=30&rating=g`
    : `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=20&rating=g`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    stickerList.innerHTML = ""; 

    data.data.forEach(sticker => {
      const img = document.createElement("img");
      img.src = sticker.images.fixed_width_small.webp;
      img.style.cssText = "width:75px; height:75px; margin:4px; cursor:pointer; border-radius:8px; background:#eee;";
      img.loading = "lazy";
      img.onclick = () => sendSticker(sticker.images.fixed_width.url);
      stickerList.appendChild(img);
    });
  } catch (err) {
    stickerList.innerHTML = "<p style='font-size:12px; color:red;'>Gagal memuat stiker.</p>";
  }
}
// Fungsi Kirim Stiker ke Supabase
async function sendSticker(url) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", currentUser.id)
      .single();

    const { error } = await supabase.from("messages").insert([{
      message: "",           
      user_id: currentUser.id,
      username: profile?.username || "User",
      avatar: profile?.avatar_url,
      role: profile?.role || "user",
      sticker_url: url,
      room_id: currentRoomId
    }]);

    if (error) throw error;
    stickerMenu.style.display = "none";
  } catch (err) {
    console.error("Gagal kirim stiker:", err.message);
  }
}
//Search-sticker//
searchBtn.onclick = () => fetchStickers(searchInput.value);
searchInput.onkeypress = (e) => { if (e.key === "Enter") fetchStickers(searchInput.value); };
fetchStickers(); 

// Toggle Menu Stiker
document.getElementById("sticker-btn").onclick = () => {
  stickerMenu.style.display = (stickerMenu.style.display === "none" || stickerMenu.style.display === "") ? "flex" : "none";
};
let selectedMessageId = null;

// Fungsi untuk menampilkan menu
function showDeleteMenu(id) {
  selectedMessageId = id;
  const overlay = document.getElementById("delete-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    // Getar halus jika di HP
    if (navigator.vibrate) navigator.vibrate(50);
  }
}
// ===== Sidebar Elements =====
const menuBtn = document.getElementById("menu-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const inputSearchId = document.getElementById("input-search-id");
const btnSearchId = document.getElementById("btn-search-id");
const sideUsername = document.getElementById("side-username");
const sideAvatar = document.getElementById("side-avatar");
const myUniqueId = document.getElementById("my-unique-id");
const privateChatList = document.getElementById("private-chat-list");

// ===== Isi Profil Sidebar =====
async function loadProfile() {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, short_id")
    .eq("id", currentUser.id)
    .single();

  if (profile) {
    sideUsername.textContent = profile.username;
    // Tampilkan short_id dari database
    const myId = profile.short_id || "N/A";
    myUniqueId.textContent = "#" + myId;
    
myUniqueId.style.cursor = "pointer"; // Biar kursor berubah jadi tangan
    myUniqueId.onclick = () => window.copyMyID(myId);
    
    sideAvatar.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}`;
  }
}

// ===== Cari ID Teman =====
btnSearchId.addEventListener("click", async () => {
  const searchInput = inputSearchId.value.trim().toUpperCase(); 
  const cleanId = searchInput.replace('#', ''); 
  
  if (!cleanId) {
    showToast("Masukkan ID (contoh: 0E870)", "info");
    return;
  }

  // 1. Cari user 
  const { data: friend, error } = await supabase
    .from("profiles")
    .select("id, username, short_id")
    .eq("short_id", cleanId)
    .single();

  if (error || !friend) {
    showToast("ID tidak ditemukan!", "error");
    return;
  }

  if (friend.id === currentUser.id) {
    showToast("Ini ID kamu sendiri.", "info");
    return;
  }

  // 2. Buat ID Room Priva
  const ids = [currentUser.id, friend.id].sort();
  currentRoomId = `pv_${ids[0]}_${ids[1]}`;

  // 3. Update Tampilan Header
  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) headerTitle.textContent = `Chat: ${friend.username}`;

  //Bersihkan chat lama & muat pesan baru
  messagesEl.innerHTML = "";
  
  await loadMessages();
  scrollToBottom();

  // 5. Tutup sidebar
  sidebar.classList.remove('open');
  if(overlay) overlay.style.display = 'none';
  
  showToast(`Chat dengan ${friend.username} dibuka`);
});
 
// ===== Load Riwayat Chat =====
async function loadChatHistory() {
  const list = document.getElementById("private-chat-list");
  if (!list) return;

  // 1. Ambil pesan terakhir 
  const { data: messages, error } = await supabase
    .from("messages")
    .select("room_id, message, created_at, user_id, username, sticker_url")
    .neq("room_id", "room-1")
    .or(`user_id.eq.${currentUser.id},room_id.ilike.%${currentUser.id}%`)
    .order("created_at", { ascending: false });

  if (error) return console.error("Gagal muat riwayat:", error);

  const latestPerRoom = [];
  const seenRooms = new Set();
  if (messages) {
    messages.forEach(m => {
      if (!seenRooms.has(m.room_id)) {
        seenRooms.add(m.room_id);
        latestPerRoom.push(m);
      }
    });
  }

  list.innerHTML = "";

  // --- Tombol Chat Global ---
  const globalBtn = document.createElement("div");
  globalBtn.style.cssText = "display:flex; align-items:center; padding:12px; border-bottom:2px solid #f0f0f0; cursor:pointer; background:#f9fbff; transition: 0.2s;";
  globalBtn.innerHTML = `
    <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(45deg, #0088cc, #00d2ff); display:flex; align-items:center; justify-content:center; margin-right:12px;">
      <span style="color:white; font-size:18px;">🌍</span>
    </div>
    <div style="flex:1;">
      <strong style="font-size:14px; color:#0088cc;">Chat Global</strong><br>
      <span style="font-size:11px; color:#888;">Kembali ke obrolan umum</span>
    </div>`;
    
  globalBtn.onclick = () => {
    currentRoomId = 'room-1';
    // Kembalikan judul header ke semula
    const headerTitle = document.querySelector(".chat-header h3");
    if (headerTitle) headerTitle.textContent = "Hopegroup Chat";
    
    loadMessages();
    sidebar.classList.remove('open');
    if(overlay) overlay.style.display = 'none';
  };
  list.appendChild(globalBtn);

  // --- Render list riwayat chat private ---
  for (const chat of latestPerRoom) {
    const participants = chat.room_id.replace("pv_", "").split("_");
    const partnerId = participants.find(id => id !== currentUser.id);
    if(!partnerId) continue;

    const lastRead = localStorage.getItem(`last_read_${chat.room_id}`) || new Date(0).toISOString();

    const [partnerRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select("username, avatar_url, short_id").eq("id", partnerId).single(),
      supabase.from("messages").select("id", { count: 'exact' }).eq("room_id", chat.room_id).neq("user_id", currentUser.id).gt("created_at", lastRead)
    ]);

    const partner = partnerRes.data;
    const unreadCount = unreadRes.count || 0;
    const name = partner?.username || "User";
    const avatar = partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    const lastMsg = chat.sticker_url ? "🖼 Stiker" : (chat.message.length > 20 ? chat.message.substring(0,20)+"..." : chat.message);

    const chatEl = document.createElement("div");
    chatEl.style.cssText = "display:flex; align-items:center; padding:12px; border-bottom:1px solid #f5f5f5; cursor:pointer; transition:0.2s;";
    chatEl.innerHTML = `
      <img src="${avatar}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
      <div style="flex:1; overflow:hidden;">
        <div style="display:flex; justify-content:space-between;">
          <strong style="font-size:14px;">${name}</strong>
          <span style="font-size:10px; color:#bbb;">${new Date(chat.created_at).getHours().toString().padStart(2,'0')}:${new Date(chat.created_at).getMinutes().toString().padStart(2,'0')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px; color:#888;">${lastMsg}</div>
          ${unreadCount > 0 ? `<div style="background:#ff4757; color:white; font-size:10px; min-width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">${unreadCount}</div>` : ''}
        </div>
      </div>`;

    chatEl.onclick = async () => {
      currentRoomId = chat.room_id;
      localStorage.setItem(`last_read_${chat.room_id}`, new Date().toISOString());
      
      const headerTitle = document.querySelector(".chat-header h3");
      if(headerTitle) {
        headerTitle.innerHTML = `${name} <span style="font-size:11px; opacity:0.6; font-weight:normal;">#${partner?.short_id || ''}</span>`;
      }
      
      messagesEl.innerHTML = "<p style='text-align:center; color:#ccc; margin-top:20px;'>Memuat pesan...</p>";
      await loadMessages();
      
      sidebar.classList.remove('open');
      if(overlay) overlay.style.display = 'none';
      
      scrollToBottom();
      loadChatHistory();
    };
    list.appendChild(chatEl);
  }
}

// ===== Listener Realtime untuk Sidebar =====
supabase.channel('sidebar-updates')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    if (payload.new.user_id !== currentUser.id) {
      loadChatHistory(); 
    }
  })
  .subscribe();

// ===== FUNGSI EDIT BIODATA (FIXED) =====

// 1. Fungsi untuk Membuka Modal & Mengambil Data Lama
window.openEditProfile = async () => {
  const modal = document.getElementById('bio-modal');
  if (!modal) return;
  
  // Tampilkan modal dulu supaya user tahu ada proses
  modal.style.display = 'flex';

  // Ambil data profil terbaru dari Supabase agar input otomatis terisi data lama
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("age, gender, zodiac, hobby, occupation")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Gagal ambil data profil:", error);
    return;
  }

  // Isi form dengan data yang sudah ada di database
  if (profile) {
    if(document.getElementById('in-umur')) document.getElementById('in-umur').value = profile.age || "";
    if(document.getElementById('in-gender')) document.getElementById('in-gender').value = profile.gender || "Pria";
    if(document.getElementById('in-zodiak')) document.getElementById('in-zodiak').value = profile.zodiac || "Aries";
    if(document.getElementById('in-hobi')) document.getElementById('in-hobi').value = profile.hobby || "";
    if(document.getElementById('in-kerja')) document.getElementById('in-kerja').value = profile.occupation || "";
  }
};

// 2. Fungsi untuk Menutup Modal
window.closeBioModal = () => {
  const modal = document.getElementById('bio-modal');
  if (modal) modal.style.display = 'none';
};

// 3. Logika Simpan Data (Klik tombol Simpan & Cari)
const saveBtnElement = document.getElementById('btn-save-bio');
if (saveBtnElement) {
  saveBtnElement.onclick = async () => {
    // Ambil nilai dari input
    const ageValue = document.getElementById('in-umur').value;
    const genderValue = document.getElementById('in-gender').value;
    const zodiacValue = document.getElementById('in-zodiak').value;
    const hobbyValue = document.getElementById('in-hobi').value;
    const occupationValue = document.getElementById('in-kerja').value;

    // Loading state
    saveBtnElement.innerText = "Menyimpan...";
    saveBtnElement.disabled = true;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          age: ageValue ? Number(ageValue) : null, 
          gender: genderValue,
          zodiac: zodiacValue,
          hobby: hobbyValue,
          occupation: occupationValue
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      showToast("Biodata berhasil disimpan!", "success");
      window.closeBioModal(); // Tutup modal setelah berhasil
      
    } catch (err) {
      console.error(err);
      showToast("Gagal simpan biodata", "error");
    } finally {
      saveBtnElement.innerText = "Simpan & Cari";
      saveBtnElement.disabled = false;
    }
  };
}


// ===== Toast Notifikasi =====
function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toast-container") || (() => {
    const newContainer = document.createElement("div");
    newContainer.id = "toast-container";
    document.body.appendChild(newContainer);
    return newContainer;
  })();
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function tampilkanDoiCard(doi) {
    const modal = document.getElementById('doi-card-modal');
    if (!doi || !modal) return;
    
    // Sesuaikan ID dengan yang ada di HTML kamu
    document.getElementById('doi-photo').src = doi.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doi.username)}`;
    document.getElementById('doi-name-age').innerText = `${doi.username}, ${doi.age || '?'}`;
    
    // Di HTML kamu pakai ID "doi-zodiac", bukan "doi-zodiac-text"
    const zodiacEl = document.getElementById('doi-zodiac');
    if (zodiacEl) zodiacEl.innerText = doi.zodiac || 'Rahasia';
    
    const jobEl = document.getElementById('doi-job');
    if (jobEl) jobEl.innerText = doi.occupation || 'Professional';
    
    const hobbyEl = document.getElementById('doi-hobby');
    if (hobbyEl) hobbyEl.innerText = doi.hobby || '-';
    
    // Ganti jadi bukaChatPribadi (sesuai nama fungsi yang kamu punya)
    document.getElementById('btn-gas-chat').onclick = () => {
        bukaChatPribadi(doi.id, doi.username, doi.short_id || '');
        tutupDoiCard();
    };
    modal.style.display = 'flex';
}

function tutupDoiCard() {
    const modal = document.getElementById('doi-card-modal');
    if (modal) modal.style.display = 'none';
}
window.tutupDoiCard = tutupDoiCard;


const btnCariDoiActual = document.getElementById('btn-sidebar-search');

if (btnCariDoiActual) {
    btnCariDoiActual.onclick = async () => {
        // 1. Ambil data profil saya dulu untuk cek gender
        const { data: myProfile } = await supabase.from("profiles").select("gender").eq("id", currentUser.id).maybeSingle();
        
        if (!myProfile?.gender) {
            showToast("Setel GENDER kamu dulu di Edit Biodata!", "error");
            window.openEditProfile(); 
            return;
        }

        // 2. Tutup Sidebar
        sidebar.classList.remove('open');
        if(overlay) overlay.style.display = 'none';

        // 3. Tampilkan Overlay "Mencari..." (Biar menantang!)
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'searching-overlay';
        loadingOverlay.innerHTML = `
            <div class="radar"></div>
            <div class="searching-text">MENCARI PASANGAN...</div>
            <div style="font-size:10px; margin-top:10px; opacity:0.6;">Menghubungkan ke server HopeTalk...</div>
        `;
        document.body.appendChild(loadingOverlay);

        const lawanJenis = myProfile.gender === "Pria" ? "Wanita" : "Pria";

        // 4. Kasih delay 2.5 detik biar kerasa nyarinya
        setTimeout(async () => {
            const { data: users } = await supabase.from("profiles")
                .select("*")
                .neq("id", currentUser.id)
                .eq("gender", lawanJenis);

            // Hapus loading overlay
            loadingOverlay.remove();

            if (!users || users.length === 0) {
                return showToast(`Waduh, belum ada ${lawanJenis} yang online.`, "info");
            }

            // Pilih random dan munculkan kartu
            const doi = users[Math.floor(Math.random() * users.length)];
            tampilkanDoiCard(doi);
            
            // Tambahkan getaran kalau di HP biar makin mantap
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
        }, 2500); // <-- Angka 2500 (2.5 detik) ini bisa kamu lamain lagi kalau kurang menantang
    };
}

async function bukaChatPribadi(partnerId, partnerName, partnerShortId = '') {
  const ids = [currentUser.id, partnerId].sort();
  currentRoomId = `pv_${ids[0]}_${ids[1]}`;

  // UPDATE HEADER (Nama Partner & ID)
  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) {
    headerTitle.innerHTML = `${partnerName} <span style="font-size:10px; opacity:0.5;">#${partnerShortId}</span>`;
  }

  // UPDATE STATUS (Sedang Online / Terakhir Online)
  updateHeaderStatus(); 

  messagesEl.innerHTML = "<p style='text-align:center; color:#ccc; margin-top:20px;'>Memuat pesan...</p>";
  
  await loadMessages();
  
  // Tutup Sidebar & Overlay
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
  
  scrollToBottom();

  // Simpan status waktu baca terakhir
  localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());
  
  // Refresh sidebar untuk update unread count
  loadChatHistory(); 
}

async function updateHeaderStatus() {
  const headerStatusEl = document.getElementById("status-header"); 
  if (!headerStatusEl) return;
  
  // 1. Logika untuk Chat Global (room-1)
  if (currentRoomId === 'room-1') {
    const fiveMinutesAgo = new Date(Date.now() - 5*60*1000).toISOString();
    
    // Ambil data user lain yang sedang online
    const { data, error } = await supabase
      .from("online_users")
      .select("username")
      .gt("last_seen", fiveMinutesAgo)
      .neq("user_id", currentUser.id) // Jangan hitung diri sendiri
      .limit(1);

    if(!error) {
      // Hitung total semua yang online
      const { count } = await supabase
        .from("online_users")
        .select("user_id", { count: 'exact', head: true })
        .gt("last_seen", fiveMinutesAgo);

      const totalOnline = count || 0;

      if (totalOnline <= 1 && data.length === 0) {
        // Jika hanya ada kamu sendirian
        headerStatusEl.innerHTML = `<span style="opacity:0.8;">Hanya kamu yang online</span>`;
      } else if (totalOnline === 2 && data.length > 0) {
        // TAMPILKAN NAMA JIKA ADA 1 ORANG LAIN (Total 2 termasuk kamu)
        headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${data[0].username} sedang online`;
      } else {
        // TAMPILKAN JUMLAH JIKA LEBIH DARI 2 ORANG
        headerStatusEl.innerHTML = `<span class="online-dot" style="background:#fff; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${totalOnline} users online`;
      }
    }
    return;
  }

  // 2. Logika untuk Chat Pribadi (PC)
  const participants = currentRoomId.replace("pv_", "").split("_");
  const partnerId = participants.find(id => id !== currentUser.id);

  if (partnerId) {
    const { data: partnerStatus } = await supabase
      .from("online_users")
      .select("last_seen")
      .eq("user_id", partnerId)
      .maybeSingle();

    if (!partnerStatus) {
      headerStatusEl.innerHTML = `<span style="opacity:0.6;">Offline</span>`;
      return;
    }

    const lastSeenDate = new Date(partnerStatus.last_seen);
    const isOnline = (new Date() - lastSeenDate) < 5 * 60 * 1000;

    if (isOnline) {
      headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:8px; height:8px; display:inline-block; border-radius:50%; margin-right:4px;"></span> Sedang online`;
    } else {
      const jam = lastSeenDate.getHours().toString().padStart(2, '0');
      const menit = lastSeenDate.getMinutes().toString().padStart(2, '0');
      headerStatusEl.innerHTML = `<span style="opacity:0.8;">Terakhir terlihat ${jam}:${menit}</span>`;
    }
  }
}

// ===== Inisialisasi Akhir =====
async function init() {
  try {
    await loadProfile();
    await loadChatHistory();
    await loadMessages();
    
    // Panggil status awal
    updateHeaderStatus();
    // Jalankan interval update
    setInterval(updateHeaderStatus, 30000); 

    scrollToBottom(); 
  } catch (err) {
    console.error("Gagal inisialisasi:", err);
  }
}

init();
// Taro di paling bawah history.js
window.closeBioModal = () => {
  const modal = document.getElementById('bio-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};
window.copyMyID = (id) => {
  navigator.clipboard.writeText(id).then(() => {
    showToast("ID berhasil disalin: #" + id, "success");
    
    // Efek visual biar user tau kalau sudah diklik
    const idEl = document.getElementById("my-unique-id");
    idEl.style.color = "#00d2ff";
    setTimeout(() => idEl.style.color = "", 500);
    
    if (navigator.vibrate) navigator.vibrate(50); // Getar halus
  }).catch(err => {
    showToast("Gagal menyalin ID", "error");
  });
};
