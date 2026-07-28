import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, doc, updateDoc, getDoc, setDoc, runTransaction, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = getApps().find(a => a.name === "dpgnotes") || initializeApp(firebaseConfig, "dpgnotes");
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// =========================================
// SIDEBAR & SWIPE LOGIC
// =========================================
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
const openBtn = document.getElementById("openSidebarBtn");
const closeBtn = document.getElementById("closeSidebarBtn");

function openSidebar() {
  sidebar.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("active");
}

if(openBtn) openBtn.addEventListener("click", openSidebar);
if(closeBtn) closeBtn.addEventListener("click", closeSidebar);
if(overlay) overlay.addEventListener("click", closeSidebar);

let touchstartX = 0;
let touchendX = 0;

function handleGesture() {
  if (touchendX < touchstartX - 50) closeSidebar(); // Swipe Left
  if (touchendX > touchstartX + 50) openSidebar();  // Swipe Right
}

document.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
  touchendX = e.changedTouches[0].screenX;
  handleGesture();
});

// =========================================
// TAB SWITCHING
// =========================================
const tabBtns = document.querySelectorAll(".tab-btn[data-target]");
const tabs = document.querySelectorAll(".dashboard-tab");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // UI Update
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    tabs.forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.target).classList.add("active");
    
    // Close sidebar on mobile after click
    if (window.innerWidth <= 768) closeSidebar();
    
    // Load specific tab data
    if (btn.dataset.target === "notificationTab") {
      loadNotifications();
    }
  });
});

// =========================================
// NOTIFICATIONS ENGINE
// =========================================
async function loadNotifications() {
  const notifList = document.getElementById("notificationList");
  notifList.innerHTML = "<p>Loading notifications...</p>";
  
  if (!currentUser) return;
  
  try {
    const q = query(collection(db, "notifications"), where("email", "==", currentUser.email));
    const snap = await getDocs(q);
    
    // Sort newest first, exclude read notifications
    const docs = [];
    snap.forEach(d => {
      const data = d.data();
      if (!data.isRead) docs.push({ id: d.id, ...data });
    });
    docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    
    if (docs.length === 0) {
      notifList.innerHTML = "<p style='color: var(--text-muted);'>No new notifications.</p>";
      return;
    }
    
    notifList.innerHTML = "";
    docs.forEach(data => {
      let icon = "🔔";
      if (data.type === "like") icon = "❤️";
      if (data.type === "alert") icon = "⚠️";
      if (data.type === "warning") icon = "🚨";
      if (data.type === "success") icon = "✅";
      if (data.type === "milestone") icon = "🎉";
      if (data.type === "system") icon = "🤖";
      
      let timeString = "Just now";
      if (data.createdAt) {
        const millis = data.createdAt.toMillis ? data.createdAt.toMillis() : (data.createdAt.seconds * 1000);
        timeString = new Date(millis).toLocaleString();
      }
      
      const card = document.createElement("div");
      card.id = `notif-${data.id}`;
      card.style.cssText = "background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem;display:flex;gap:1rem;align-items:flex-start;transition:opacity 0.3s;";
      card.innerHTML = `
        <div style="font-size:1.5rem;">${icon}</div>
        <div style="flex:1;">
          <h4 style="margin:0 0 0.25rem 0;color:var(--text-light);">${data.title}</h4>
          <p style="margin:0;color:var(--text-muted);font-size:0.9rem;">${data.message}</p>
          <small style="color:var(--primary-light);opacity:0.8;margin-top:0.5rem;display:block;">${timeString}</small>
        </div>
        <button data-notifid="${data.id}" class="mark-read-btn" style="flex-shrink:0;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#818cf8;padding:4px 10px;border-radius:6px;font-size:0.78rem;cursor:pointer;white-space:nowrap;" title="Mark as read">✓ Read</button>
      `;
      notifList.appendChild(card);
    });
    
    // Mark-as-read handlers
    notifList.querySelectorAll(".mark-read-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const notifId = btn.dataset.notifid;
        btn.disabled = true;
        btn.textContent = "...";
        try {
          await updateDoc(doc(db, "notifications", notifId), { isRead: true });
          const card = document.getElementById(`notif-${notifId}`);
          if (card) {
            card.style.opacity = "0";
            setTimeout(() => card.remove(), 300);
          }
          // Show empty state if no cards left
          setTimeout(() => {
            if (notifList.querySelectorAll("[id^='notif-']").length === 0) {
              notifList.innerHTML = "<p style='color:var(--text-muted);'>No new notifications.</p>";
            }
          }, 350);
        } catch(err) {
          console.error("Mark read failed:", err);
          btn.disabled = false;
          btn.textContent = "✓ Read";
        }
      });
    });
    
  } catch (err) {
    console.error("Failed to load notifications:", err);
    notifList.innerHTML = "<p style='color:#ef4444;'>Failed to load notifications.</p>";
  }
}

// =========================================
// THEME ENGINE
// =========================================

function applyTheme(themeName) {
  document.body.classList.remove("theme-ocean", "theme-sunset", "theme-forest");
  if (themeName && themeName !== "default") {
    document.body.classList.add(`theme-${themeName}`);
  }
  localStorage.setItem("dpgTheme", themeName || "default");
}

// Initial Load Theme
const savedTheme = localStorage.getItem("dpgTheme");
if (savedTheme) applyTheme(savedTheme);

// =========================================
// AUTH STATE & BACKEND HOOKS
// =========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    localStorage.setItem("dpgActiveUserUid", user.uid);
    localStorage.setItem("dpgActiveUserEmail", user.email || "");
    localStorage.setItem("dpgActiveUserName", user.displayName || "");
    localStorage.setItem("dpgActiveUserPhoto", user.photoURL || "");
    
    // Create/Update User Document on Login
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        // First Login! Trigger Welcome Email
        fetch(window.API_BASE_URL + "/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, name: user.displayName })
        }).catch(console.error);

        // Show Legal Consent Modal
        setTimeout(() => {
          if (window.customConfirm) {
            window.customConfirm(
              `By creating a DPGNotes Contributor Account, you agree to our <a href="legal/index.html#privacy" target="_blank" style="color:var(--primary-light);text-decoration:underline;">Privacy Policy</a>, <a href="legal/index.html#terms" target="_blank" style="color:var(--primary-light);text-decoration:underline;">Terms & Conditions</a>, and <a href="legal/index.html#drasa" target="_blank" style="color:var(--primary-light);text-decoration:underline;">DRASA Regulations</a>.`,
              false
            );
          }
        }, 1000);
      }
      
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch(e) { console.error("Login hook failed", e); }
    
    loadProfile();
    loadExplore();
    loadLeaderboard();
    
    // Check for Share Token parameter in dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get('share');
    if (shareToken) {
      (async () => {
        try {
          const res = await fetch(`${window.API_BASE_URL}/api/share/click?token=${shareToken}&openedBy=${currentUser.uid}`);
          const data = await res.json();
          if (res.ok && data.documentData) {
            const d = data.documentData;
            if (d.docId && d.docId.startsWith('legal_')) {
              window.location.href = `legal/index.html#${d.docId.replace('legal_', '')}`;
              return;
            }
            const viewerUrl = `https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(d.pdfUrl)}&title=${encodeURIComponent(d.title)}&category=${encodeURIComponent(d.category)}&discipline=${encodeURIComponent(d.discipline)}&uploader=${encodeURIComponent(d.uploader)}&docid=${encodeURIComponent(d.docId)}&description=${encodeURIComponent(d.description)}&tags=${encodeURIComponent(Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''))}`;
            window.location.href = viewerUrl;
          } else {
            alert("Share link expired or invalid.");
            window.location.href = "dashboard.html";
          }
        } catch (e) {
          console.error("Failed to process share link in dashboard", e);
        }
      })();
    }
    
    // 1. Check Permanent Blocks Directory
    (async () => {
      const blockQ = query(collection(db, "permanent_blocks"), where("block_email", "==", currentUser.email));
      const blockSnap = await getDocs(blockQ);
      if (!blockSnap.empty) {
        const blockData = blockSnap.docs[0].data();
        alert(`Your account has been permanently blocked by the Administrator.\nReason: ${blockData.Reason || "N/A"}`);
        signOut(auth);
        window.location.href = "index.html";
      }
    })();

    // 2. Listen for Account Block
    onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists() && snap.data().isBlocked) {
        alert("Your account has been suspended by an Administrator.");
        signOut(auth);
        window.location.href = "index.html";
      }
    });
    
  } else {
    window.location.href = "index.html";
  }
});

const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    localStorage.removeItem("dpgActiveUserUid");
    localStorage.removeItem("dpgActiveUserEmail");
    localStorage.removeItem("dpgActiveUserName");
    localStorage.removeItem("dpgActiveUserPhoto");
    await signOut(auth);
  });
}

// =========================================
// PROFILE DATA
// =========================================
function formatBioContent(bioText) {
  if (!bioText) return "No bio provided yet.";
  let html = bioText;

  // Markdown Headers: #, ##, ###
  html = html.replace(/^### (.*$)/gim, '<h3 style="color:var(--primary-light,#818cf8); margin:0.6rem 0 0.3rem 0; font-size:1.1rem;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color:var(--primary-light,#818cf8); margin:0.8rem 0 0.4rem 0; font-size:1.25rem;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color:var(--primary-light,#818cf8); margin:1rem 0 0.5rem 0; font-size:1.4rem;">$1</h1>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italics: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline Code: `code`
  html = html.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.85em;">$1</code>');

  // Markdown Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary-light); text-decoration:underline;">$1</a>');

  // Raw URLs: https://...
  html = html.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" style="color:var(--primary-light); text-decoration:underline;">$2</a>');

  // Bullet Lists: - item
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:1.2rem;">$1</li>');

  // Line breaks
  if (!html.includes('<br') && !html.includes('<p') && !html.includes('<h')) {
    html = html.replace(/\n/g, '<br>');
  }
  return html;
}

async function loadProfile() {
  document.getElementById("profileName").innerText = currentUser.displayName;
  document.getElementById("profileEmail").innerText = currentUser.email;
  
  const avatarEl = document.getElementById("profileAvatar");
  avatarEl.onclick = () => {
    window.location.href = `/profile.html?uid=${currentUser.uid}`;
  };

  if (currentUser.photoURL) {
    avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile">`;
  }
  
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Override with Cloudinary Profile Photo if exists
      if (userData.profilePic) {
        document.getElementById("profileAvatar").innerHTML = `<img src="${userData.profilePic}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }
      
      if (userData.bio) {
        document.getElementById("profileBio").innerHTML = formatBioContent(userData.bio);
        document.getElementById("settingBio").value = userData.bio;
      }
      
      if (userData.theme) {
        document.getElementById("settingTheme").value = userData.theme;
        applyTheme(userData.theme);
      }
      
      const socialLinksContainer = document.getElementById("profileSocialLinks");
      socialLinksContainer.innerHTML = "";
      
      if (userData.linkedin) {
        document.getElementById("settingLinkedin").value = userData.linkedin;
        socialLinksContainer.innerHTML += `<a href="${userData.linkedin}" target="_blank" style="color:#0077b5; font-size:1.5rem; text-decoration:none;" title="LinkedIn">🔗</a>`;
      }
      if (userData.github) {
        document.getElementById("settingGithub").value = userData.github;
        socialLinksContainer.innerHTML += `<a href="${userData.github}" target="_blank" style="color:#fff; font-size:1.5rem; text-decoration:none;" title="GitHub">🐙</a>`;
      }
    }
  } catch(e) { console.error("Error loading user profile", e); }
  
  // Calculate contributions
  const q = query(collection(db, "documents"));
  const snap = await getDocs(q);
  let count = 0;
  let totalLikes = 0;
  
  let totalShares = 0;
  let totalCtr = 0;
  
  const delSelect = document.getElementById("contributorDelDocSelect");
  if (delSelect) {
    delSelect.innerHTML = '<option value="">-- Choose Document --</option>';
  }
  
  window.myDocsCache = []; // Cache to lookup doc titles later
  
  snap.forEach(doc => {
    const data = doc.data();
    if (data.userId === currentUser.uid) {
      count++;
      if (data.likes) totalLikes += data.likes.length;
      if (data.shareCount) totalShares += data.shareCount;
      if (data.ctrCount) totalCtr += data.ctrCount;
      
      window.myDocsCache.push({ id: doc.id, ...data });
      
      if (delSelect) {
        const opt = document.createElement("option");
        opt.value = doc.id;
        opt.innerText = data.title;
        delSelect.appendChild(opt);
      }
    }
  });
  
  document.getElementById("statContributions").innerText = count;
  document.getElementById("statLikes").innerText = totalLikes;
  
  const statShares = document.getElementById("statShares");
  if (statShares) statShares.innerText = totalShares;
  
  const statCtr = document.getElementById("statCtr");
  if (statCtr) statCtr.innerText = totalCtr;
}

// =========================================
// LEADERBOARD
// =========================================
async function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardList) return;
  
  leaderboardList.innerHTML = `<li style="color:var(--text-muted);">Loading Leaderboard...</li>`;
  
  try {
    const q = query(collection(db, "documents"));
    const snap = await getDocs(q);
    
    const userStats = {};
    
    snap.forEach(d => {
      const data = d.data();
      const uid = data.userId;
      if (!uid) return;
      
      if (!userStats[uid]) {
        userStats[uid] = { name: data.userName || "Unknown", likes: 0, uploads: 0 };
      }
      userStats[uid].uploads++;
      if (data.likes) userStats[uid].likes += data.likes.length;
    });
    
    const sortedUsers = Object.entries(userStats)
      .map(([uid, stats]) => ({ uid, ...stats }))
      .sort((a, b) => b.likes - a.likes || b.uploads - a.uploads)
      .slice(0, 3);
      
    if (sortedUsers.length === 0) {
      leaderboardList.innerHTML = `<li style="color:var(--text-muted);">No contributors yet.</li>`;
      return;
    }
    
    leaderboardList.innerHTML = "";
    
    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const badges = ["🥇", "🥈", "🥉"];
      
      // Try to fetch user photo
      let photoHtml = `<div style="width:40px; height:40px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center;">👤</div>`;
      try {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists() && uDoc.data().photoURL) {
          photoHtml = `<img src="${uDoc.data().photoURL}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />`;
        }
      } catch(e) {}
      
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "1rem";
      li.style.padding = "0.8rem 0";
      li.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
      
      li.innerHTML = `
        <div style="font-size:1.5rem;">${badges[i]}</div>
        ${photoHtml}
        <div style="flex-grow:1;">
          <h4 style="margin:0; color:var(--text-light);">${user.name}</h4>
          <span style="font-size:0.85rem; color:var(--text-muted);">${user.likes} Likes • ${user.uploads} Uploads</span>
        </div>
      `;
      leaderboardList.appendChild(li);
    }
  } catch (err) {
    console.error("Leaderboard Error:", err);
    leaderboardList.innerHTML = `<li style="color:#ef4444;">Failed to load leaderboard</li>`;
  }
}

// =========================================
// EXPLORE TAB (Cards with Like/Share)
// =========================================
async function loadExplore() {
  const exploreGrid = document.getElementById("exploreGrid");
  exploreGrid.innerHTML = "<p>Loading resources...</p>";
  
  // Fetch users cache for social links
  let usersCache = {};
  try {
    const uSnap = await getDocs(collection(db, "users"));
    uSnap.forEach(uDoc => { usersCache[uDoc.id] = uDoc.data(); });
  } catch(e) {}
  
  const snap = await getDocs(query(collection(db, "documents")));
  
  let docsArray = [];
  snap.forEach(doc => {
    docsArray.push({ id: doc.id, ...doc.data() });
  });
  
  const sortVal = document.getElementById("exploreSort") ? document.getElementById("exploreSort").value : "newest";
  
  docsArray.sort((a, b) => {
    if (sortVal === "oldest") {
      return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
    } else if (sortVal === "likes") {
      return (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0);
    } else if (sortVal === "shares") {
      return (b.shareCount || 0) - (a.shareCount || 0);
    } else {
      // newest
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    }
  });
  
  // Apply search filter
  const searchInput = document.getElementById("exploreSearch");
  const queryStr = searchInput ? searchInput.value.toLowerCase().trim() : "";
  if (queryStr) {
    docsArray = docsArray.filter(d =>
      (d.title || "").toLowerCase().includes(queryStr) ||
      (d.description || "").toLowerCase().includes(queryStr) ||
      (d.category || "").toLowerCase().includes(queryStr) ||
      (d.discipline || "").toLowerCase().includes(queryStr) ||
      (d.tags || []).join(" ").toLowerCase().includes(queryStr)
    );
  }

  exploreGrid.innerHTML = "";
  if (docsArray.length === 0) {
    exploreGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;'>No resources found matching your search.</p>";
    return;
  }
  docsArray.forEach(data => {
    const docId = data.id;
    const likes = data.likes || [];
    const hasLiked = likes.includes(currentUser.uid);
    
    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="card-top">
        <span class="category">${data.category}</span>
        <span class="discipline">${data.discipline}</span>
      </div>
      <h3>${data.title}</h3>
      <div class="card-author">
        ${usersCache && usersCache[data.userId] && usersCache[data.userId].profilePic 
          ? `<img src="${usersCache[data.userId].profilePic}" class="author-avatar" alt="Avatar" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${data.userId}'">` 
          : (usersCache && usersCache[data.userId] && usersCache[data.userId].photoURL ? `<img src="${usersCache[data.userId].photoURL}" class="author-avatar" alt="Avatar" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${data.userId}'">` : `<div class="author-avatar-fallback" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${data.userId}'">${(data.userName || "C").charAt(0).toUpperCase()}</div>`)
        }
        <span class="author-name" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${data.userId}'">By ${data.userName || "Contributor"}</span>
        <div class="author-socials">
          ${usersCache[data.userId] && usersCache[data.userId].linkedin ? `<a href="${usersCache[data.userId].linkedin}" target="_blank" title="LinkedIn">🔗</a>` : ""}
          ${usersCache[data.userId] && usersCache[data.userId].github ? `<a href="${usersCache[data.userId].github}" target="_blank" title="GitHub">🐙</a>` : ""}
        </div>
      </div>
      <p class="card-desc">${data.description}</p>
      <div class="tags">
        ${(data.tags || []).map(t => `<span>#${t}</span>`).join("")}
      </div>
      <a href="https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(data.documentId)}" target="_blank" class="open-btn">Open PDF</a>
      
      <div class="card-actions">
        <button class="action-btn like-action ${hasLiked ? 'liked' : ''}" data-id="${docId}" data-owner="${data.userId}" data-title="${data.title}">
          ${hasLiked ? '❤️ Liked' : '🤍 Like'} (${likes.length})
        </button>
        <button class="action-btn share-action share-btn" onclick="handleDashboardShare(event, '${docId}', '${data.title.replace(/'/g, "\\'")}', '${data.category}', '${data.discipline}', '${data.userName.replace(/'/g, "\\'")}', '${data.pdfUrl}', '${data.description ? data.description.replace(/'/g, "\\'") : ""}', '${(data.tags || []).join(", ")}')">
          🔗 Share
        </button>
      </div>
    `;
    
    exploreGrid.appendChild(card);
  });
  
  attachEngagementListeners();
}

// =========================================
// UPLOAD LOGIC
// =========================================
const uploadForm = document.getElementById("uploadForm");
if(uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser) return alert("Please login first");
    
    const submitBtn = uploadForm.querySelector("button[type='submit']");
    submitBtn.innerText = "Uploading...";
    submitBtn.disabled = true;

    try {
      // 2. FILE UPLOAD (PDF)
      let finalPdfUrl = document.getElementById("pdfUrl").value.trim();
      const pdfFile = document.getElementById("pdfFile").files[0];
      
      if (pdfFile) {
        // ILovePDF free tier limit is 250MB
        if (pdfFile.size > 262144000) {
          throw new Error("File size exceeds 250MB limit. Please provide a direct link instead.");
        }
        
        // INTERCEPT > 10MB (Cloudinary Free Tier Raw Limit)
        if (pdfFile.size > 10 * 1024 * 1024) {
          document.getElementById("compressionModal").style.display = "flex";
          submitBtn.innerText = "Upload Document";
          submitBtn.disabled = false;
          
          // Wait for user to interact with modal
          return new Promise((resolve, reject) => {
            document.getElementById("cancelCompressBtn").onclick = () => {
              document.getElementById("compressionModal").style.display = "none";
              reject(new Error("Compression cancelled by user."));
            };
            
            document.getElementById("startCompressBtn").onclick = async () => {
              const actionsDiv = document.getElementById("compressActions");
              const progressDiv = document.getElementById("compressProgressContainer");
              const progressStatus = document.getElementById("compressProgressStatus");
              const progressPercent = document.getElementById("compressProgressPercent");
              const progressBar = document.getElementById("compressProgressBar");
              
              actionsDiv.style.display = "none";
              progressDiv.style.display = "block";
              
              const updateProgress = (pct, status) => {
                progressBar.style.width = pct + "%";
                progressPercent.innerText = pct + "%";
                progressStatus.innerText = status;
              };
              
              updateProgress(0, "Preparing file...");
              
              try {
                const quality = document.querySelector('input[name="compressQuality"]:checked').value;
                const formData = new FormData();
                formData.append("pdfFile", pdfFile);
                formData.append("quality", quality);
                
                const xhr = new XMLHttpRequest();
                xhr.open("POST", window.API_BASE_URL + "/api/compress");
                
                // Track Upload Progress (first 50% of overall progress)
                xhr.upload.addEventListener("progress", (e) => {
                  if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 50);
                    updateProgress(pct, `Uploading to server (${(e.loaded / (1024*1024)).toFixed(1)}MB / ${(e.total / (1024*1024)).toFixed(1)}MB)...`);
                  }
                });
                
                let processInterval;
                // Once upload completes, process state kicks in
                xhr.upload.addEventListener("load", () => {
                  let currentPct = 50;
                  updateProgress(currentPct, "Upload complete. Connecting to ILovePDF API...");
                  processInterval = setInterval(() => {
                    if (currentPct < 95) {
                      currentPct += 1;
                      let statusMsg = "Compressing document...";
                      if (currentPct > 65) statusMsg = "Optimizing PDF structure...";
                      if (currentPct > 80) statusMsg = "Generating compressed download...";
                      updateProgress(currentPct, statusMsg);
                    }
                  }, 250);
                });
                
                xhr.responseType = "blob";
                
                xhr.onload = () => {
                  clearInterval(processInterval);
                  if (xhr.status >= 200 && xhr.status < 300) {
                    updateProgress(100, "Compression complete! Downloading...");
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = url;
                    a.download = pdfFile.name.replace(".pdf", "_compressed.pdf");
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    setTimeout(() => {
                      alert("Compression successful! The compressed PDF has been downloaded. Please upload the new compressed file.");
                      document.getElementById("compressionModal").style.display = "none";
                      actionsDiv.style.display = "flex";
                      progressDiv.style.display = "none";
                      reject(new Error("Please upload the newly downloaded compressed file."));
                    }, 500);
                  } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                      alert("Compression failed: " + reader.result);
                      actionsDiv.style.display = "flex";
                      progressDiv.style.display = "none";
                      reject(new Error(reader.result));
                    };
                    reader.readAsText(xhr.response);
                  }
                };
                
                xhr.onerror = () => {
                  clearInterval(processInterval);
                  alert("Network error occurred during compression.");
                  actionsDiv.style.display = "flex";
                  progressDiv.style.display = "none";
                  reject(new Error("Network error"));
                };
                
                xhr.send(formData);
                
              } catch (e) {
                alert(e.message);
                actionsDiv.style.display = "flex";
                progressDiv.style.display = "none";
                reject(e);
              }
            };
          });
        }
        
        const formData = new FormData();
        formData.append("pdfFile", pdfFile);
        
        const res = await fetch(window.API_BASE_URL + "/api/upload", {
          method: "POST",
          body: formData
        });
        
        if(!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        finalPdfUrl = data.pdfUrl;
      }
      
      if (!finalPdfUrl) throw new Error("Please provide a PDF link or file.");

      const title = document.getElementById("title").value;
      const docData = {
        category: document.getElementById("category").value,
        discipline: document.getElementById("discipline").value,
        title: title,
        description: document.getElementById("description").value,
        tags: document.getElementById("tags").value.split(",").map(t => t.trim()).filter(t => t !== ""),
        documentId: document.getElementById("documentId").value,
        pdfUrl: finalPdfUrl,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        createdAt: serverTimestamp(),
        likes: []
      };

      await addDoc(collection(db, "documents"), docData);
      
      // LOG UPLOAD ACTIVITY
      try {
        await addDoc(collection(db, "activity_logs"), {
          userId: currentUser.uid,
          name: currentUser.displayName || currentUser.email,
          action: "UPLOAD",
          details: `Uploaded resource: ${docData.title}`,
          timestamp: serverTimestamp()
        });
      } catch(e) {}
      
      // Calculate Follower & First Contribution Logic
      try {
        const qDocs = query(collection(db, "documents"));
        const snapDocs = await getDocs(qDocs);
        
        const followerSet = new Set();
        let userDocCount = 0;
        
        snapDocs.forEach(d => {
          const data = d.data();
          if (data.userId === currentUser.uid) {
            userDocCount++; // Will include the new one since we just added it, or wait, it might not fetch immediately, but that's fine.
            if (data.likes && Array.isArray(data.likes)) {
              data.likes.forEach(uid => followerSet.add(uid));
            }
          }
        });
        
        // Exclude self from followers
        followerSet.delete(currentUser.uid);
        
        // 1. Thank You Email (Standard)
        fetch(window.API_BASE_URL + "/api/upload/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email, title: title })
        }).catch(console.error);
        
        // 2. First Contribution Check
        // If userDocCount === 1, it's their first time! (Since we just added one, if they had 0 before, it's 1 now).
        if (userDocCount === 1) {
          fetch(window.API_BASE_URL + "/api/email/first-contribution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentUser.email, title: title })
          }).catch(console.error);
        }
        
        // 3. New Resource Alert for Followers
        if (followerSet.size > 0) {
          // Fetch follower emails from 'users' collection
          const followerEmails = [];
          for (let uid of followerSet) {
             const uDoc = await getDoc(doc(db, "users", uid));
             if (uDoc.exists() && uDoc.data().email) {
               followerEmails.push(uDoc.data().email);
             }
          }
          if (followerEmails.length > 0) {
            fetch(window.API_BASE_URL + "/api/email/new-resource", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                followerEmails, 
                authorName: currentUser.displayName, 
                resourceTitle: title
              })
            }).catch(console.error);
          }
        }
      } catch(e) {
        console.error("Follower notification failed", e);
      }

      alert("Resource Uploaded Successfully!");
      uploadForm.reset();
      loadProfile();
      loadExplore();
      
      // Switch back to Explore Tab
      document.querySelector('.tab-btn[data-target="exploreTab"]').click();
      
    } catch(err) {
      console.error(err);
      alert("Upload Failed: " + err.message);
    } finally {
      submitBtn.innerText = "Upload Document";
      submitBtn.disabled = false;
    }
  });
}

// =========================================
// CONTRIBUTOR DELETE LOGIC
// =========================================
const contributorDeleteForm = document.getElementById("contributorDeleteForm");
if (contributorDeleteForm) {
  contributorDeleteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const docId = document.getElementById("contributorDelDocSelect").value;
    const reasonInput = document.getElementById("contributorDelReason").value.trim();
    if (!docId) return;
    
    const docItem = window.myDocsCache.find(d => d.id === docId);
    if (!docItem) return;
    
    if (window.customConfirm) {
      const confirmDelete = await window.customConfirm(
        `Are you sure you want to delete "${docItem.title}"? This will permanently delete the resource under our <a href="legal/index.html#retention" target="_blank" style="color:var(--primary-light);text-decoration:underline;">Data Retention Policy</a>.`,
        { title: "Delete Document?", isDanger: true }
      );
      if (!confirmDelete) return;
    }
    
    let reason = reasonInput;
    if (reason.length > 0 && (reason.length < 50 || reason.length > 150)) {
      alert("Custom reason must be between 50 and 150 characters.");
      return;
    }
    
    if (!reason) {
      reason = "The author has decided to remove this document from the platform. We apologize for any inconvenience caused.";
    }
    
    try {
      // 1. Send Notification request to Backend FIRST (so backend can read 'likes' array before it's deleted)
      await fetch(window.API_BASE_URL + "/api/email/contributor-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          docId: docId, 
          docTitle: docItem.title, 
          contributorName: currentUser.displayName || currentUser.email,
          reason: reason,
          likerUids: docItem.likes || []
        })
      });
      
      // 2. Delete from Firestore
      await deleteDoc(doc(db, "documents", docId));
      
      alert("Document successfully deleted. Admins and likers have been notified.");
      contributorDeleteForm.reset();
      loadProfile(); // Refresh list
      loadExplore();
    } catch (err) {
      console.error(err);
      alert("Failed to delete document: " + err.message);
    }
  });
}

// =========================================
// SETTINGS LOGIC
// =========================================
const settingsForm = document.getElementById("settingsForm");
if(settingsForm) {
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser) return;
    
    const submitBtn = settingsForm.querySelector("button[type='submit']");
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;
    
    try {
      const bio = document.getElementById("settingBio").value;
      const linkedin = document.getElementById("settingLinkedin").value.trim();
      const github = document.getElementById("settingGithub").value.trim();
      const theme = document.getElementById("settingTheme").value;
      const photoFile = document.getElementById("settingPhoto").files[0];
      const bannerInput = document.getElementById("settingBanner");
      const bannerFile = bannerInput ? bannerInput.files[0] : null;

      // Apply theme immediately
      applyTheme(theme);
      
      let profileUrl = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append("pdfFile", photoFile); // API expects pdfFile key
        
        const res = await fetch(window.API_BASE_URL + "/api/upload?type=profile", {
          method: "POST",
          body: formData
        });
        
        if(res.ok) {
          const data = await res.json();
          profileUrl = data.pdfUrl;
        } else {
          alert("Profile photo upload failed.");
        }
      }

      let bannerUrl = null;
      if (bannerFile) {
        const formData = new FormData();
        formData.append("pdfFile", bannerFile);
        const res = await fetch(window.API_BASE_URL + "/api/upload?type=profile", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          bannerUrl = data.pdfUrl;
        } else {
          alert("Header banner photo upload failed.");
        }
      }

      const updateData = { bio, linkedin, github, theme };
      if (profileUrl) {
        updateData.profilePic = profileUrl;
      }
      if (bannerUrl) {
        updateData.bannerPic = bannerUrl;
      }

      // Update Firestore securely by merging
      // Check for first setting update
      const isFirstUpdate = !localStorage.getItem("firstSettingUpdateDone");
      await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
      
      if (isFirstUpdate) {
        localStorage.setItem("firstSettingUpdateDone", "true");
        if (window.customConfirm) {
          window.customConfirm(
            `Your data must be uploaded to DPGNotes Server. <a href="legal/index.html#privacy" target="_blank" style="color:var(--primary-light);text-decoration:underline;">Learn More</a>`,
            false
          );
        } else {
          alert("Your data must be uploaded to DPGNotes Server.");
        }
      } else {
        alert("Settings saved!");
      }
      loadProfile();
    } catch(err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      submitBtn.innerText = "Save Changes";
      submitBtn.disabled = false;
    }
  });
}

// Account Deletion Logic
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    
    const confirm1 = await window.customConfirm("Are you absolutely sure you want to delete your account? This will permanently delete your profile and ALL your uploaded documents from DPGNotes. This action CANNOT be undone.", { title: "Delete Account?", isDanger: true });
    if (!confirm1) return;
    
    const confirm2 = await window.customConfirm("Click confirm to permanently delete your account and all files. This is your final warning.", { title: "Final Warning", isDanger: true, confirmText: "Delete Permanently" });
    if (!confirm2) {
      alert("Account deletion cancelled.");
      return;
    }
    
    deleteAccountBtn.innerText = "Deleting Account...";
    deleteAccountBtn.disabled = true;
    
    try {
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch(window.API_BASE_URL + "/api/contributor/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Your account and all associated documents have been successfully deleted. Thank you for your contributions.");
        await signOut(auth);
        window.location.href = "index.html";
      } else {
        throw new Error(data.error || "Server deletion failed");
      }
    } catch (err) {
      console.error("Self deletion failed:", err);
      alert("Failed to delete account. You may need to log out and log back in to refresh your credentials before trying again.");
      deleteAccountBtn.innerText = "Delete My Account";
      deleteAccountBtn.disabled = false;
    }
  });
}

// =========================================
// ENGAGEMENT (Like & Share)
// =========================================
function attachEngagementListeners() {
  document.querySelectorAll(".like-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const docId = btn.dataset.id;
      const title = btn.dataset.title;
      // Optimistic UI update could go here, but for simplicity we rely on backend response
      btn.innerText = "⏳...";
      let newlyUseful = false;
      let newLikesCount = 0;
      let shareCount = 0;
      
      try {
        const docRef = doc(db, "documents", docId);
        
        await runTransaction(db, async (t) => {
          const docSnap = await t.get(docRef);
          if (!docSnap.exists()) throw "Document missing!";
          
          let currentLikes = docSnap.data().likes || [];
          shareCount = docSnap.data().shareCount || 0;
          const usefulResourceEmailed = docSnap.data().usefulResourceEmailed || false;
          
          if (currentLikes.includes(currentUser.uid)) {
            // Unlike
            currentLikes = currentLikes.filter(id => id !== currentUser.uid);
            t.update(docRef, { likes: currentLikes });
          } else {
            // Like
            currentLikes.push(currentUser.uid);
            
            const updates = { likes: currentLikes };
            if ((currentLikes.length >= 15 || shareCount >= 5) && !usefulResourceEmailed) {
              updates.usefulResourceEmailed = true;
              newlyUseful = true;
            }
            t.update(docRef, updates);
          }
          newLikesCount = currentLikes.length;
        });
        
        // Notify Owner via Backend if it was a Like (not unlike)
        if (btn.innerText.includes("🤍")) {
           // We need to fetch owner info to send emails
           const ownerDoc = await getDoc(doc(db, "users", btn.dataset.owner));
           if (ownerDoc.exists() && ownerDoc.data().email) {
             const ownerEmail = ownerDoc.data().email;
             const ownerName = ownerDoc.data().name;
             
             // 1. Basic Like Email
             fetch(window.API_BASE_URL + "/api/email/like-notification", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ email: ownerEmail, resourceTitle: title, likerName: currentUser.displayName })
             }).catch(e => console.error("Email API failed:", e));
             
             // Create in-app notification
             addDoc(collection(db, "notifications"), {
               email: ownerEmail,
               type: "like",
               title: "New Like! ❤️",
               message: `${currentUser.displayName || "Someone"} liked your resource "${title}"`,
               createdAt: serverTimestamp()
             }).catch(e => console.error(e));
             
             // 2. 30+ / 70+ Likes Milestone Check
             const qOwner = query(collection(db, "documents"));
             const snapOwner = await getDocs(qOwner);
             let totalLikes = 0;
             snapOwner.forEach(d => {
               if (d.data().userId === btn.dataset.owner && d.data().likes) {
                 totalLikes += d.data().likes.length;
               }
             });
             
             if (totalLikes === 30) {
                 fetch(window.API_BASE_URL + "/api/email/thirty-likes", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ email: ownerEmail, name: ownerName })
                 }).catch(e => console.error(e));
                 
                 addDoc(collection(db, "notifications"), {
                   email: ownerEmail,
                   type: "milestone",
                   title: "🎉 Milestone Reached!",
                   message: "Your resources have reached 30 total likes! Keep up the great work.",
                   createdAt: serverTimestamp()
                 }).catch(e => console.error(e));
             }
             
             if (totalLikes === 70) {
                 fetch(window.API_BASE_URL + "/api/email/seventy-likes", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ email: ownerEmail, name: ownerName })
                 }).catch(e => console.error(e));
                 
                 addDoc(collection(db, "notifications"), {
                   email: ownerEmail,
                   type: "milestone",
                   title: "🏆 Elite Milestone Reached!",
                   message: "Your resources have reached 70 total likes! You are an elite contributor.",
                   createdAt: serverTimestamp()
                 }).catch(e => console.error(e));
             }

             // 3. Useful Resource Upload Honour Check
             if (newlyUseful) {
                 fetch(window.API_BASE_URL + "/api/email/useful-resource-honour", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ 
                     email: ownerEmail, 
                     name: ownerName, 
                     resourceTitle: title, 
                     likesCount: newLikesCount, 
                     sharesCount: shareCount 
                   })
                 }).catch(e => console.error(e));
                 
                 addDoc(collection(db, "notifications"), {
                   email: ownerEmail,
                   type: "milestone",
                   title: "🌟 Highly Useful Resource!",
                   message: `Your resource "${title}" has been declared highly useful by the community!`,
                   createdAt: serverTimestamp()
                 }).catch(e => console.error(e));
             }
           }
        }

        loadExplore(); // Reload grid to show updated likes
        loadProfile(); // Update total likes
      } catch (err) {
        alert("Failed to like resource");
        loadExplore();
      }
    });
  });

  window.handleDashboardShare = async function(event, docId, title, category, discipline, uploader, pdfUrl, description, tags) {
    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "⏳ Generating...";
    
    try {
      const res = await fetch(window.API_BASE_URL + "/api/share/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          docId, 
          title, 
          category, 
          discipline, 
          uploader, 
          pdfUrl, 
          description, 
          tags,
          originalUrl: window.location.origin + "/dashboard.html?share=",
          uploaderUid: currentUser.uid
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");
      
      const shareUrl = data.shareUrl;
      let shared = false;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Check out ${title} on DPGNotes`,
            url: shareUrl
          });
          shared = true;
        } catch(err) { 
          console.error("Share failed", err); 
          if (err.name === 'AbortError') {
            shared = true;
          }
        }
      } 
      
      if (!shared) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Smart Link copied to clipboard!");
        shared = true;
      }
      
      btn.innerText = "✅ Shared";
      
      // Track share
      if (shared && currentUser) {
        try {
          await runTransaction(db, async (t) => {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await t.get(userRef);
            let currentShares = 0;
            if (userSnap.exists()) {
              currentShares = userSnap.data().shares || 0;
            }
            currentShares++;
            t.set(userRef, { shares: currentShares }, { merge: true });
            
            // Email milestones
            if (currentShares === 10) {
              fetch(window.API_BASE_URL + "/api/email/ten-shares-generation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: currentUser.email, name: currentUser.displayName })
              }).catch(e => console.error(e));
              
              addDoc(collection(db, "notifications"), {
                email: currentUser.email,
                type: "milestone",
                title: "📣 Word Spreader!",
                message: "You've generated 10 share links! Thank you for sharing.",
                createdAt: serverTimestamp()
              }).catch(e => console.error(e));
            }
            
            if (currentShares === 15) {
              fetch(window.API_BASE_URL + "/api/email/fifteen-shares", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: currentUser.email, name: currentUser.displayName })
              }).catch(e => console.error(e));
              
              addDoc(collection(db, "notifications"), {
                email: currentUser.email,
                type: "milestone",
                title: "🎉 Super Sharer!",
                message: "You've shared 15 resources! Thanks for spreading the word.",
                createdAt: serverTimestamp()
              }).catch(e => console.error(e));
            }
          });
        } catch (err) {
          console.error("Share tracking failed", err);
        }
      }
      
      // Useful Resource check on Share
      if (shared) {
        (async () => {
          try {
            const docSnap = await getDoc(doc(db, "documents", docId));
            if (docSnap.exists()) {
              const dData = docSnap.data();
              const lCount = dData.likes ? dData.likes.length : 0;
              const sCount = dData.shareCount || 0;
              const usefulEmailed = dData.usefulResourceEmailed || false;
              
              if ((lCount >= 15 || sCount >= 5) && !usefulEmailed) {
                await updateDoc(doc(db, "documents", docId), { usefulResourceEmailed: true });
                
                const ownerDoc = await getDoc(doc(db, "users", dData.userId));
                if (ownerDoc.exists() && ownerDoc.data().email) {
                  fetch(window.API_BASE_URL + "/api/email/useful-resource-honour", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      email: ownerDoc.data().email, 
                      name: ownerDoc.data().name, 
                      resourceTitle: dData.title, 
                      likesCount: lCount, 
                      sharesCount: sCount 
                    })
                  }).catch(e => console.error(e));
                  
                  addDoc(collection(db, "notifications"), {
                    email: ownerDoc.data().email,
                    type: "milestone",
                    title: "🌟 Highly Useful Resource!",
                    message: `Your resource "${dData.title}" has been declared highly useful by the community!`,
                    createdAt: serverTimestamp()
                  }).catch(e => console.error(e));
                }
              }
            }
          } catch(e) { console.error("Useful resource check on share failed", e); }
        })();
      }
    } catch (e) {
      alert("Failed to share resource: " + e.message);
      btn.innerText = originalText;
    }
    setTimeout(() => btn.innerText = originalText, 3000);
  };
}

// Live Search for Explore Tab
const exploreSearchInput = document.getElementById('exploreSearch');
if (exploreSearchInput) {
  exploreSearchInput.addEventListener('input', () => {
    loadExplore();
  });
}

const exploreSortSelect = document.getElementById('exploreSort');
if (exploreSortSelect) {
  exploreSortSelect.addEventListener('change', () => {
    loadExplore();
  });
}
