import { getAuth, onAuthStateChanged, signOut, updatePassword, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, doc, updateDoc, getDoc, setDoc, runTransaction, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

// Prevent duplicate execution of dashboard module
if (window._dpgDashboardScriptLoaded) {
  console.warn("dashboard.js already loaded, preventing duplicate bindings.");
}
window._dpgDashboardScriptLoaded = true;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

window.toggleResourcePasswordUI = function() {
  const vis = document.getElementById("resourceVisibility")?.value;
  const grp = document.getElementById("resourcePasswordGroup");
  const pw = document.getElementById("resourcePassword");
  if (grp) {
    grp.style.display = vis === "private" ? "block" : "none";
  }
  if (pw && vis !== "private") {
    pw.value = "";
  }
};

window.toggleResourcePasswordVisibility = function(iconEl) {
  const pw = document.getElementById("resourcePassword");
  if (!pw) return;
  if (pw.type === "password") {
    pw.type = "text";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-line");
      iconEl.classList.add("ri-eye-off-line");
    }
  } else {
    pw.type = "password";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-off-line");
      iconEl.classList.add("ri-eye-line");
    }
  }
};

window.toggleModalResourcePasswordUI = function() {
  const vis = document.getElementById("modalVisibility")?.value;
  const grp = document.getElementById("modalPasswordGroup");
  const badge = document.getElementById("modalVisBadge");
  const isPriv = vis === "private";
  if (grp) grp.style.display = isPriv ? "block" : "none";
  if (badge) {
    badge.textContent = isPriv ? "Private" : "Public";
    badge.style.background = isPriv ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)";
    badge.style.color = isPriv ? "#f87171" : "#34d399";
    badge.style.borderColor = isPriv ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)";
  }
};

window.toggleModalPasswordVisibility = function(iconEl) {
  const pw = document.getElementById("modalResourcePassword");
  if (!pw) return;
  if (pw.type === "password") {
    pw.type = "text";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-line");
      iconEl.classList.add("ri-eye-off-line");
    }
  } else {
    pw.type = "password";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-off-line");
      iconEl.classList.add("ri-eye-line");
    }
  }
};

window.toggleVaultNewPasswordEye = function(iconEl) {
  const inp = document.getElementById("vaultNewPasswordInput");
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-line");
      iconEl.classList.add("ri-eye-off-line");
    }
  } else {
    inp.type = "password";
    if (iconEl) {
      iconEl.classList.remove("ri-eye-off-line");
      iconEl.classList.add("ri-eye-line");
    }
  }
};

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

// Check for authToken in URL parameters (from email verification link)
let customAuthTokenPromise = null;
const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get("authToken");
if (authToken) {
  const statusTxt = document.getElementById("authStatusText");
  const subTxt = document.getElementById("authSubText");
  if (statusTxt) statusTxt.innerText = "Authenticating Contributor...";
  if (subTxt) subTxt.innerText = "Verifying email token and activating contributor session...";
  customAuthTokenPromise = (async function() {
    try {
      await signInWithCustomToken(auth, authToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("authToken");
      window.history.replaceState({}, document.title, url.toString());
    } catch (tokErr) {
      console.warn("Failed to sign in with verification custom token:", tokErr);
    }
  })();
}

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
  btn.addEventListener("click", (e) => {
    // Check if profile setup is required
    if (window.dpgProfileIncomplete && btn.dataset.target !== "settingsTab" && !btn.classList.contains("logout-btn")) {
      e.preventDefault();
      e.stopPropagation();
      alert("Please select your User Type and enter your Student / Employee ID in the Settings tab to activate your Contributor Dashboard features.");
      const settingsBtn = document.querySelector('.tab-btn[data-target="settingsTab"]');
      if (settingsBtn) {
        tabBtns.forEach(b => b.classList.remove("active"));
        settingsBtn.classList.add("active");
        tabs.forEach(t => t.classList.remove("active"));
        const st = document.getElementById("settingsTab");
        if (st) st.classList.add("active");
      }
      return;
    }

    // UI Update
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    tabs.forEach(t => t.classList.remove("active"));
    const targetTab = document.getElementById(btn.dataset.target);
    if (targetTab) targetTab.classList.add("active");
    
    // Close sidebar on mobile after click
    if (window.innerWidth <= 768) closeSidebar();
    
    // Load specific tab data
    if (btn.dataset.target === "notificationTab") {
      loadNotifications();
    } else if (btn.dataset.target === "manageResourcesTab") {
      loadContributorManageResources();
    } else if (btn.dataset.target === "passwordVaultTab") {
      loadPasswordVaultData();
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
  if (customAuthTokenPromise) {
    try {
      await customAuthTokenPromise;
    } catch(e) {}
    customAuthTokenPromise = null;
    user = auth.currentUser;
  }

  if (user) {
    // Strict Contributor Verification Gate: NEVER allow unverified sessions in dashboard
    if (!user.emailVerified) {
      console.warn("Unverified session detected in dashboard. Signing out.");
      await signOut(auth);
      window.location.href = "index.html?unverified=1";
      return;
    }

    currentUser = user;
    localStorage.setItem("dpgActiveUserUid", user.uid);
    localStorage.setItem("dpgActiveUserEmail", user.email || "");
    localStorage.setItem("dpgActiveUserName", user.displayName || "");
    localStorage.setItem("dpgActiveUserPhoto", user.photoURL || "");

    // Reveal Dashboard UI & dismiss security overlay
    const overlay = document.getElementById("authCheckOverlay");
    if (overlay) overlay.style.display = "none";
    if (sidebar) sidebar.style.display = "";
    const mainEl = document.getElementById("dashboardMain");
    if (mainEl) mainEl.style.display = "";
    
    // Check for active referrer code
    const refCode = sessionStorage.getItem('dpgReferrerCode') || localStorage.getItem('dpgReferrerCode');
    if (refCode) {
      try {
        await fetch(window.API_BASE_URL + '/api/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referrerCode: refCode, newUserId: user.uid, newUserEmail: user.email })
        });
        sessionStorage.removeItem('dpgReferrerCode');
        localStorage.removeItem('dpgReferrerCode');
      } catch(e) { console.error("Referrer accept log failed", e); }
    }

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
    currentUser = null;
    const statusTxt = document.getElementById("authStatusText");
    const subTxt = document.getElementById("authSubText");
    if (statusTxt) {
      statusTxt.innerText = "Access Denied";
      statusTxt.style.color = "#ef4444";
    }
    if (subTxt) {
      subTxt.innerText = "No active contributor session found. Redirecting to Sign In...";
    }
    setTimeout(() => {
      window.location.href = "index.html?action=signin";
    }, 1200);
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
  document.getElementById("profileName").innerText = currentUser.displayName || "Contributor";
  document.getElementById("profileEmail").innerText = currentUser.email || "";
  
  const avatarEl = document.getElementById("profileAvatar");
  avatarEl.onclick = () => {
    window.location.href = `/profile.html?uid=${currentUser.uid}`;
  };

  if (currentUser.photoURL) {
    avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile">`;
  }

  // Pre-fill email and name from auth
  const settingNameEl = document.getElementById("settingName");
  const settingEmailEl = document.getElementById("settingEmail");
  if (settingNameEl && !settingNameEl.value) settingNameEl.value = currentUser.displayName || "";
  if (settingEmailEl) settingEmailEl.value = currentUser.email || "";
  
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    let userData = {};
    if (userDoc.exists()) {
      userData = userDoc.data();
      
      if (userData.name && settingNameEl) settingNameEl.value = userData.name;
      if (userData.email && settingEmailEl) settingEmailEl.value = userData.email;
      
      const settingUserType = document.getElementById("settingUserType");
      if (settingUserType && userData.userType) {
        settingUserType.value = userData.userType;
      }
      
      const settingStudentId = document.getElementById("settingStudentId");
      if (settingStudentId && (userData.studentIdOrEmployeeId || userData.studentId)) {
        settingStudentId.value = userData.studentIdOrEmployeeId || userData.studentId;
      }

      const settingContact = document.getElementById("settingContact");
      if (settingContact && userData.contactNumber) {
        settingContact.value = userData.contactNumber;
      }

      // Update ID label
      const lblId = document.getElementById("lblSettingId");
      if (lblId) {
        lblId.innerText = (userData.userType === "Teacher") ? "Employee ID / Teacher ID*" : "Student ID / Roll No*";
      }

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

      const twoFactorEl = document.getElementById("settingTwoFactorEnabled");
      if (twoFactorEl) {
        twoFactorEl.checked = userData.twoFactorEnabled !== false;
      }
    }

    // Profile completion validation: User Type and Student/Employee ID are mandatory
    const isProfileIncomplete = !userData.userType || !(userData.studentIdOrEmployeeId || userData.studentId);
    window.dpgProfileIncomplete = isProfileIncomplete;

    const alertEl = document.getElementById("profileIncompleteAlert");
    if (alertEl) alertEl.style.display = isProfileIncomplete ? "block" : "none";

    const urlParams = new URLSearchParams(window.location.search);
    const isVerifiedLanding = urlParams.get("verified") === "1" || window.location.hash === "#settings";

    // Dynamic verified banner in settings when landing after email verification
    let verifiedBanner = document.getElementById("profileVerifiedBanner");
    if (isVerifiedLanding && !verifiedBanner) {
      const st = document.getElementById("settingsTab");
      if (st) {
        verifiedBanner = document.createElement("div");
        verifiedBanner.id = "profileVerifiedBanner";
        verifiedBanner.style.cssText = "background:rgba(16, 185, 129, 0.15); border:1px solid #10b981; border-radius:10px; padding:15px; margin-bottom:1.5rem; color:#a7f3d0;";
        verifiedBanner.innerHTML = `
          <div style="font-weight:700; font-size:1rem; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
            <i class="ri-checkbox-circle-fill" style="font-size:1.3rem; color:#10b981;"></i> Contributor Email Successfully Verified!
          </div>
          <p style="margin:0; font-size:0.88rem; color:#f1f5f9;">
            ${isProfileIncomplete 
              ? 'Welcome to DPGNotes! Please select your <strong>User Type (Student or Teacher)</strong> and provide your <strong>Student / Employee ID</strong> below to activate your account and unlock all dashboard features.' 
              : 'Welcome to the DPGNotes Contributor Network! Your email is verified and your account is active. Complete your academic bio and settings below, or start publishing and sharing study materials!'}
          </p>`;
        const formEl = document.getElementById("settingsForm");
        if (formEl) st.insertBefore(verifiedBanner, formEl);
      }
    }

    if (isProfileIncomplete || urlParams.get("tab") === "settingsTab" || isVerifiedLanding) {
      const settingsTabBtn = document.querySelector('.tab-btn[data-target="settingsTab"]');
      if (settingsTabBtn) {
        document.querySelectorAll(".tab-btn[data-target]").forEach(b => b.classList.remove("active"));
        settingsTabBtn.classList.add("active");
        document.querySelectorAll(".dashboard-tab").forEach(t => t.classList.remove("active"));
        const st = document.getElementById("settingsTab");
        if (st) st.classList.add("active");
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
let isLeaderboardLoading = false;
async function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardList || isLeaderboardLoading) return;
  isLeaderboardLoading = true;
  
  try {
    const q = query(collection(db, "documents"));
    const snap = await getDocs(q);
    
    const userStats = {};
    
    snap.forEach(d => {
      const data = d.data();
      const uid = data.userId || data.uploaderUid || data.userEmail || data.userName;
      if (!uid) return;
      
      const key = String(uid).trim().toLowerCase();
      if (!userStats[key]) {
        userStats[key] = { uid: data.userId || uid, name: data.userName || "Unknown", likes: 0, uploads: 0 };
      }
      userStats[key].uploads++;
      if (data.likes && Array.isArray(data.likes)) userStats[key].likes += data.likes.length;
    });
    
    const sortedUsers = Object.values(userStats)
      .sort((a, b) => b.likes - a.likes || b.uploads - a.uploads)
      .slice(0, 3);
      
    if (sortedUsers.length === 0) {
      leaderboardList.innerHTML = `<li style="color:var(--text-muted);">No contributors yet.</li>`;
      return;
    }
    
    // Fetch photos upfront in parallel
    const userDocs = await Promise.all(
      sortedUsers.map(u => getDoc(doc(db, "users", u.uid)).catch(() => null))
    );
    
    const badges = ["🥇", "🥈", "🥉"];
    let htmlContent = "";
    
    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const uDoc = userDocs[i];
      let photoHtml = `<div style="width:40px; height:40px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center;">👤</div>`;
      if (uDoc && uDoc.exists && uDoc.exists() && (uDoc.data().photoURL || uDoc.data().profilePic)) {
        const pic = uDoc.data().profilePic || uDoc.data().photoURL;
        photoHtml = `<img src="${pic}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />`;
      }
      
      htmlContent += `
        <li style="display:flex; align-items:center; gap:1rem; padding:0.8rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:1.5rem;">${badges[i]}</div>
          ${photoHtml}
          <div style="flex-grow:1;">
            <h4 style="margin:0; color:var(--text-light);">${user.name}</h4>
            <span style="font-size:0.85rem; color:var(--text-muted);">${user.likes} Likes • ${user.uploads} Uploads</span>
          </div>
        </li>
      `;
    }
    
    // Atomic Single DOM Replacement
    leaderboardList.innerHTML = htmlContent;

  } catch (err) {
    console.error("Leaderboard Error:", err);
    leaderboardList.innerHTML = `<li style="color:#ef4444;">Failed to load leaderboard</li>`;
  } finally {
    isLeaderboardLoading = false;
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
    const d = doc.data();
    const isOwner = !!(currentUser && (
      (d.userId && d.userId === currentUser.uid) ||
      (d.uploaderId && d.uploaderId === currentUser.uid) ||
      (d.uploaderUid && d.uploaderUid === currentUser.uid) ||
      (d.uploaderEmail && currentUser.email && d.uploaderEmail.toLowerCase() === currentUser.email.toLowerCase())
    ));
    const isApproved = d.status === "approved" || d.isApproved === true;
    const isPrivate = d.visibility === "private" || d.isPasswordProtected === true || d.isPublic === false;

    // Strict Rule: Current Contributor sees their own resources (both Public and Private).
    // Other Contributors: Show Public resources ONLY (!isPrivate && isApproved).
    if (isOwner) {
      docsArray.push({ id: doc.id, ...d });
    } else if (!isPrivate && isApproved) {
      docsArray.push({ id: doc.id, ...d });
    }
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
    const hasLiked = currentUser ? likes.includes(currentUser.uid) : false;
    const isApproved = data.status === "approved" || data.isApproved === true;
    const isPrivate = data.visibility === "private" || data.isPasswordProtected === true || data.isPublic === false;
    
    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="card-top">
        <span class="category">${escapeHtml(data.category || 'General')}</span>
        <span class="discipline">${escapeHtml(data.discipline || 'General')}</span>
      </div>
      ${(!isApproved || isPrivate) ? `
      <div style="display:flex; gap:6px; margin: 4px 0 8px 0; flex-wrap:wrap;">
        ${!isApproved ? `<span style="background:rgba(245,158,11,0.22); color:#fbbf24; border:1px solid rgba(245,158,11,0.4); padding:2px 8px; border-radius:10px; font-size:0.68rem; font-weight:700;"><i class="ri-time-line"></i> Pending Admin Approval</span>` : ''}
        ${isPrivate ? `<span style="background:rgba(239,68,68,0.22); color:#f87171; border:1px solid rgba(239,68,68,0.4); padding:2px 8px; border-radius:10px; font-size:0.68rem; font-weight:700;"><i class="ri-lock-2-line"></i> Private (Encrypted)</span>` : ''}
      </div>` : ''}
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
      <a href="https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceID=${data.id}&pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(data.documentId)}&description=${encodeURIComponent(data.description || '')}&tags=${encodeURIComponent((data.tags || []).join(', '))}" target="_blank" class="open-btn">Open PDF</a>
      
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
let isResourceUploading = false;
const uploadForm = document.getElementById("uploadForm");
if(uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser) return alert("Please login first");
    if(isResourceUploading) return;
    isResourceUploading = true;
    
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
                    a.setAttribute('data-bypass-redirect', 'true');
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => window.URL.revokeObjectURL(url), 40000);
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
      const visibilityVal = document.getElementById("resourceVisibility")?.value || "public";
      const isPrivate = visibilityVal === "private";

      let passwordHash = "";
      if (isPrivate) {
        const rawPw = document.getElementById("resourcePassword")?.value.trim() || "";
        if (!rawPw || rawPw.length < 4) {
          throw new Error("Private resources require an access password of at least 4 characters.");
        }
        // Compute SHA-256 hash of password
        const msgBuffer = new TextEncoder().encode(rawPw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const docData = {
        category: document.getElementById("category").value,
        discipline: document.getElementById("discipline").value,
        title: title,
        description: document.getElementById("description").value,
        tags: document.getElementById("tags").value.split(",").map(t => t.trim()).filter(t => t !== ""),
        documentId: document.getElementById("documentId").value,
        trackId: Math.floor(10000000 + Math.random() * 90000000).toString(),
        pdfUrl: finalPdfUrl,
        userId: currentUser.uid,
        userName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Contributor'),
        uploaderEmail: currentUser.email || "",
        uploaderId: currentUser.uid,
        visibility: isPrivate ? "private" : "public",
        isPublic: !isPrivate,
        isPasswordProtected: isPrivate,
        password: isPrivate ? rawPw : "",
        passwordHash: isPrivate ? passwordHash : "",
        status: "pending", // Strict: requires Admin Approval before appearing in Home & Search
        isApproved: false,
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
          details: `Uploaded resource: ${docData.title} (${isPrivate ? 'Private' : 'Public'}, Pending Approval)`,
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
            userDocCount++;
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
        if (userDocCount === 1) {
          fetch(window.API_BASE_URL + "/api/email/first-contribution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentUser.email, title: title })
          }).catch(console.error);
        }
        
        // 3. New Resource Alert for Followers
        if (followerSet.size > 0) {
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
        console.error("Follower notification notice:", e);
      }

      // Accurate DOM Success Message reflecting Admin Approval requirement
      const uploadSuccessHtml = `Resource <strong>"${title}"</strong> submitted successfully! 🎓<br><br>
      • Status: <span style="color:#f59e0b;font-weight:700;">⏳ Pending Administrator Review</span><br>
      • Access Control: <strong>${isPrivate ? '🔒 Private (Password Protected)' : '🌐 Public'}</strong><br><br>
      To maintain academic quality, your document requires Administrator approval before it appears publicly in Explore, Home page, and Search Results.<br><br>
      You can review and manage your resource in the <strong>"Manage Resources"</strong> tab.`;

      if (window.customAlert) {
        await window.customAlert(uploadSuccessHtml, { title: "Resource Submitted for Approval 📄" });
      } else {
        alert(`Resource "${title}" submitted successfully!\n\nStatus: Pending Administrator Review\nAccess: ${isPrivate ? 'Private (Password Protected)' : 'Public'}\n\nYour resource will appear publicly once approved by an Administrator.`);
      }

      uploadForm.reset();
      const pwGroup = document.getElementById("resourcePasswordGroup");
      if (pwGroup) pwGroup.style.display = "none";

      loadProfile();
      loadExplore();
      loadContributorManageResources();
      
      // Switch to Manage Resources tab so contributor sees their submitted resource and status
      const manageBtn = document.querySelector('.tab-btn[data-target="manageResourcesTab"]');
      if (manageBtn) {
        manageBtn.click();
      }
      
    } catch(err) {
      console.error(err);
      alert("Upload Failed: " + err.message);
    } finally {
      submitBtn.innerText = "Upload Document";
      submitBtn.disabled = false;
      isResourceUploading = false;
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
const settingUserTypeEl = document.getElementById("settingUserType");
if (settingUserTypeEl) {
  settingUserTypeEl.addEventListener("change", () => {
    const lbl = document.getElementById("lblSettingId");
    if (lbl) {
      lbl.innerText = (settingUserTypeEl.value === "Teacher") ? "Employee ID / Teacher ID*" : "Student ID / Roll No*";
    }
  });
}

if(settingsForm) {
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser) return;
    
    const submitBtn = settingsForm.querySelector("button[type='submit']");
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;
    
    try {
      const name = document.getElementById("settingName")?.value.trim() || currentUser.displayName || "";
      const userType = document.getElementById("settingUserType")?.value || "";
      const studentIdOrEmployeeId = document.getElementById("settingStudentId")?.value.trim() || "";
      const contactNumber = document.getElementById("settingContact")?.value.trim() || "";

      if (!userType) {
        alert("Please select your User Type (Student or Teacher).");
        submitBtn.innerText = "Save Changes";
        submitBtn.disabled = false;
        return;
      }
      if (!studentIdOrEmployeeId) {
        alert("Please enter your Student ID or Employee ID.");
        submitBtn.innerText = "Save Changes";
        submitBtn.disabled = false;
        return;
      }

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

      const updateData = { 
        bio, 
        linkedin, 
        github, 
        theme, 
        name, 
        userType, 
        studentIdOrEmployeeId, 
        contactNumber 
      };
      if (profileUrl) {
        updateData.profilePic = profileUrl;
      }
      if (bannerUrl) {
        updateData.bannerPic = bannerUrl;
      }

      // Two-Factor Authentication preference
      const twoFactorCheckbox = document.getElementById("settingTwoFactorEnabled");
      const twoFactorEnabled = twoFactorCheckbox ? twoFactorCheckbox.checked : true;
      updateData.twoFactorEnabled = twoFactorEnabled;

      // Password setup / update for existing & new users
      const newPassword = document.getElementById("settingNewPassword")?.value || "";
      const confirmPassword = document.getElementById("settingConfirmPassword")?.value || "";
      if (newPassword) {
        if (newPassword.length < 6) {
          alert("New password must be at least 6 characters.");
          submitBtn.innerText = "Save Changes";
          submitBtn.disabled = false;
          return;
        }
        if (newPassword !== confirmPassword) {
          alert("New password and confirm password do not match.");
          submitBtn.innerText = "Save Changes";
          submitBtn.disabled = false;
          return;
        }

        // Store encrypted / SHA-256 hash in Firestore
        const msgUint8 = new TextEncoder().encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        updateData.passwordHash = hashHex;

        // Also update / set Firebase Auth user password
        try {
          await updatePassword(currentUser, newPassword);
          console.log("Firebase Auth password successfully updated/set.");
        } catch(pwErr) {
          console.warn("Direct updatePassword error (may require re-authentication):", pwErr);
        }

        // Clear password fields
        const np = document.getElementById("settingNewPassword");
        const cp = document.getElementById("settingConfirmPassword");
        if (np) np.value = "";
        if (cp) cp.value = "";
      }

      // Update Firestore securely by merging
      // Check for first setting update
      const isFirstUpdate = !localStorage.getItem("firstSettingUpdateDone");
      await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
      
      window.dpgProfileIncomplete = false;
      const verifiedBanner = document.getElementById("profileVerifiedBanner");
      if (verifiedBanner) verifiedBanner.remove();

      if (isFirstUpdate) {
        localStorage.setItem("firstSettingUpdateDone", "true");
        if (window.customConfirm) {
          window.customConfirm(
            `🎉 Contributor Profile Completed! All dashboard tabs and publishing features are now unlocked.<br><a href="legal/index.html#privacy" target="_blank" style="color:var(--primary-light);text-decoration:underline;">Learn More</a>`,
            false
          );
        } else {
          alert("🎉 Contributor Profile Completed! All dashboard tabs and publishing features are now unlocked.");
        }
      } else {
        alert("Settings saved! All dashboard features are active.");
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
// ENGAGEMENT
// =========================================
function attachEngagementListeners() {
  document.querySelectorAll(".like-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const docId = btn.dataset.id;
      const title = btn.dataset.title;
      const originalHtml = btn.innerHTML;
      btn.innerText = "⏳...";
      let newlyUseful = false;
      let newLikesCount = 0;
      let shareCount = 0;
      let userHasLiked = false;
      
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
            userHasLiked = false;
          } else {
            // Like
            currentLikes.push(currentUser.uid);
            userHasLiked = true;
            
            const updates = { likes: currentLikes };
            if ((currentLikes.length >= 15 || shareCount >= 5) && !usefulResourceEmailed) {
              updates.usefulResourceEmailed = true;
              newlyUseful = true;
            }
            t.update(docRef, updates);
          }
          newLikesCount = currentLikes.length;
        });
        
        // Update current button state in-place without re-rendering grid or scrolling page
        btn.innerHTML = `${userHasLiked ? '❤️ Liked' : '🤍 Like'} (${newLikesCount})`;
        btn.classList.toggle('liked', userHasLiked);

        // Notify Owner via Backend if it was a Like (not unlike)
        if (userHasLiked) {
           const ownerDoc = await getDoc(doc(db, "users", btn.dataset.owner));
           if (ownerDoc.exists() && ownerDoc.data().email) {
             const ownerEmail = ownerDoc.data().email;
             const ownerName = ownerDoc.data().name;
             
             fetch(window.API_BASE_URL + "/api/email/like-notification", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ email: ownerEmail, resourceTitle: title, likerName: currentUser.displayName })
             }).catch(e => console.error("Email API failed:", e));
             
             addDoc(collection(db, "notifications"), {
               email: ownerEmail,
               type: "like",
               title: "New Like! ❤️",
               message: `${currentUser.displayName || "Someone"} liked your resource "${title}"`,
               createdAt: serverTimestamp()
             }).catch(e => console.error(e));
             
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

        if (typeof loadProfile === 'function') loadProfile();
      } catch (err) {
        btn.innerHTML = originalHtml;
        if (window.customAlert) {
          await window.customAlert("Failed to update like status: " + (err.message || err), { title: "Error" });
        } else {
          alert("Failed to update like status");
        }
      }
    });
  });
}

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

// ==========================================
// MANAGE RESOURCES TAB & EDIT MODAL
// ==========================================
let contributorDocsCache = {};

async function loadContributorManageResources() {
  const tbody = document.getElementById("manageResourcesTableBody");
  if (!tbody || !currentUser) return;

  tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem; text-align:center; color:var(--text-muted);"><i class="ri-loader-4-line spin-icon"></i> Loading resources...</td></tr>`;

  try {
    const docsMap = new Map();
    const tryFetch = async (field, val) => {
      if (!val) return;
      try {
        const q = query(collection(db, "documents"), where(field, "==", val));
        const s = await getDocs(q);
        s.forEach(d => docsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch(e) {}
    };
    if (currentUser.email) {
      await tryFetch("uploaderEmail", currentUser.email);
      if (currentUser.email.toLowerCase() !== currentUser.email) {
        await tryFetch("uploaderEmail", currentUser.email.toLowerCase());
      }
    }
    if (currentUser.uid) {
      await tryFetch("uploaderId", currentUser.uid);
      await tryFetch("userId", currentUser.uid);
      await tryFetch("uploaderUid", currentUser.uid);
    }
    const docs = Array.from(docsMap.values());

    if (docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:1.5rem; text-align:center; color:var(--text-muted);">No uploaded resources found. Upload notes using the Upload tab!</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    contributorDocsCache = {};
    docs.forEach((docData, idx) => {
      contributorDocsCache[docData.id] = docData;
      const isApproved = docData.status === "approved" || docData.isApproved === true;
      const isPrivate = docData.visibility === "private" || docData.isPasswordProtected === true || docData.isPublic === false;

      const statusBadge = isApproved
        ? `<span style="background:rgba(34,197,94,0.18); color:#4ade80; border:1px solid rgba(34,197,94,0.35); padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;"><i class="ri-checkbox-circle-line"></i> Approved</span>`
        : `<span style="background:rgba(245,158,11,0.18); color:#fbbf24; border:1px solid rgba(245,158,11,0.35); padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;"><i class="ri-time-line"></i> Pending Approval</span>`;

      const visibilityBadge = isPrivate
        ? `<span style="background:rgba(239,68,68,0.18); color:#f87171; border:1px solid rgba(239,68,68,0.35); padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;"><i class="ri-lock-2-line"></i> Private (Password)</span>`
        : `<span style="background:rgba(59,130,246,0.18); color:#60a5fa; border:1px solid rgba(59,130,246,0.35); padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;"><i class="ri-global-line"></i> Public</span>`;

      const tr = document.createElement("tr");
      tr.className = "manage-res-row";
      tr.style.cssText = "border-bottom:1px solid var(--border); transition:background 0.2s;";
      tr.innerHTML = `
        <td style="padding:0.75rem 1rem; font-weight:600; color:var(--primary-light);" data-label="SR No.">${idx + 1}</td>
        <td class="title-col" style="padding:0.75rem 1rem;" data-label="Title">
          <div style="font-weight:600; color:white; margin-bottom:4px;">${escapeHtml(docData.title || 'Untitled')}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:4px;">
            ${statusBadge}
            ${visibilityBadge}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(docData.category || 'General')} • ID: ${docData.id}</div>
        </td>
        <td style="padding:0.75rem 1rem; color:var(--text-muted);" data-label="Discipline">${escapeHtml(docData.discipline || 'General')}</td>
        <td style="padding:0.75rem 1rem; text-align:center;" data-label="Action Panel">
          <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
            <button onclick="openEditResourceModal('${docData.id}')" style="background:rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.4); color:#a5b4fc; padding:5px 12px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><i class="ri-edit-line"></i> Edit</button>
            <a href="dpgnotes-pdf-viewer.html?resourceID=${docData.id}" target="_blank" style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.78rem; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><i class="ri-eye-line"></i> View</a>
            <a href="train_model.html?id=${docData.id}" style="background:rgba(139,92,246,0.2); border:1px solid rgba(139,92,246,0.4); color:#c4b5fd; padding:5px 12px; border-radius:6px; font-size:0.78rem; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><i class="ri-cpu-line"></i> Train Model</a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Failed loading contributor resources:", err);
    tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem; text-align:center; color:#ef4444;">Failed to load resources: ${err.message}</td></tr>`;
  }
}

window.loadContributorManageResources = loadContributorManageResources;

window.openEditResourceModal = function(docId) {
  const data = contributorDocsCache[docId];
  if (!data) return;

  document.getElementById("modalResDocId").value = docId;
  document.getElementById("modalCategory").value = data.category || "T&N";
  document.getElementById("modalDiscipline").value = data.discipline || "";
  document.getElementById("modalTitle").value = data.title || "";
  document.getElementById("modalDescription").value = data.description || "";
  document.getElementById("modalTags").value = Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || "");
  document.getElementById("modalPdfUrl").value = data.pdfUrl || "";

  // Visibility and Access Password setup
  const isPrivate = data.visibility === "private" || data.isPasswordProtected === true || data.isPublic === false;
  const visSel = document.getElementById("modalVisibility");
  const visBadge = document.getElementById("modalVisBadge");
  const pwdGrp = document.getElementById("modalPasswordGroup");
  const pwdInput = document.getElementById("modalResourcePassword");

  if (visSel) visSel.value = isPrivate ? "private" : "public";
  if (visBadge) {
    visBadge.textContent = isPrivate ? "Private" : "Public";
    visBadge.style.background = isPrivate ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)";
    visBadge.style.color = isPrivate ? "#f87171" : "#34d399";
    visBadge.style.borderColor = isPrivate ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)";
  }
  if (pwdGrp) pwdGrp.style.display = isPrivate ? "block" : "none";
  if (pwdInput) pwdInput.value = data.password || "";

  const modal = document.getElementById("editResourceModal");
  if (modal) modal.style.display = "flex";

  // Reset modal file upload elements
  const fileInput = document.getElementById("modalPdfFileInput");
  if (fileInput) fileInput.value = "";
  const fileText = document.getElementById("modalFileNameText");
  if (fileText) fileText.textContent = "No new file selected";
  const progressDiv = document.getElementById("modalUploadProgressContainer");
  if (progressDiv) progressDiv.style.display = "none";
};

window.closeEditResourceModal = function() {
  const modal = document.getElementById("editResourceModal");
  if (modal) modal.style.display = "none";
};

window.handleModalPdfFileSelect = async function(e) {
  const file = e.target.files[0];
  const textSpan = document.getElementById("modalFileNameText");
  const progressContainer = document.getElementById("modalUploadProgressContainer");
  const statusText = document.getElementById("modalUploadStatusText");
  const percentText = document.getElementById("modalUploadPercentText");
  const progressBar = document.getElementById("modalUploadProgressBar");
  const pdfUrlInput = document.getElementById("modalPdfUrl");
  const saveBtn = document.getElementById("saveResourceModalBtn");

  if (!file) {
    if (textSpan) textSpan.textContent = "No new file selected";
    return;
  }

  if (textSpan) textSpan.textContent = file.name + ` (${(file.size / (1024*1024)).toFixed(1)}MB)`;

  if (file.size > 262144000) {
    alert("File size exceeds 250MB limit. Please enter a direct URL link.");
    return;
  }

  // Intercept > 10MB for Compression Modal or upload directly
  if (file.size > 10 * 1024 * 1024) {
    alert("File exceeds 10MB Cloudinary raw limit. Triggering ILovePDF compression...");
    const compModal = document.getElementById("compressionModal");
    if (compModal) compModal.style.display = "flex";
    return;
  }

  // Direct Cloudinary Upload via Backend
  if (progressContainer) progressContainer.style.display = "block";
  if (saveBtn) saveBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("pdfFile", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", window.API_BASE_URL + "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        if (progressBar) progressBar.style.width = pct + "%";
        if (percentText) percentText.textContent = pct + "%";
        if (statusText) statusText.textContent = `Uploading fresh PDF to Cloudinary... (${(event.loaded / (1024*1024)).toFixed(1)}MB / ${(event.total / (1024*1024)).toFixed(1)}MB)`;
      }
    });

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.pdfUrl) {
            pdfUrlInput.value = resp.pdfUrl;
            if (statusText) statusText.textContent = "✅ Fresh PDF uploaded successfully to Cloudinary!";
            if (progressBar) progressBar.style.width = "100%";
            if (percentText) percentText.textContent = "100%";
          } else {
            throw new Error(resp.error || "No Cloudinary URL returned");
          }
        } catch(err) {
          alert("Cloudinary upload parse error: " + err.message);
        }
      } else {
        alert("Upload failed with status " + xhr.status);
      }
      if (saveBtn) saveBtn.disabled = false;
    };

    xhr.onerror = function() {
      alert("Network error during Cloudinary PDF upload.");
      if (saveBtn) saveBtn.disabled = false;
    };

    xhr.send(formData);
  } catch(err) {
    alert("Upload error: " + err.message);
    if (saveBtn) saveBtn.disabled = false;
  }
};

window.handleEditResourceSubmit = async function(e) {
  e.preventDefault();
  const docId = document.getElementById("modalResDocId").value;
  if (!docId) return;

  const category = document.getElementById("modalCategory").value;
  const discipline = document.getElementById("modalDiscipline").value.trim();
  const title = document.getElementById("modalTitle").value.trim();
  const description = document.getElementById("modalDescription").value.trim();
  const tagsStr = document.getElementById("modalTags").value.trim();
  const pdfUrl = document.getElementById("modalPdfUrl").value.trim();
  const visibilityVal = document.getElementById("modalVisibility")?.value || "public";
  const isPrivate = visibilityVal === "private";

  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

  const saveBtn = document.getElementById("saveResourceModalBtn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Saving...";

  let rawPw = "";
  let passwordHash = "";

  if (isPrivate) {
    rawPw = document.getElementById("modalResourcePassword")?.value.trim() || "";
    if (!rawPw || rawPw.length < 4) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Changes";
      if (window.customAlert) {
        await window.customAlert("Private resources require an access password of at least 4 characters.", { title: "Password Required", isDanger: true });
      } else {
        alert("Private resources require an access password of at least 4 characters.");
      }
      return;
    }
    // Compute SHA-256 hash of password
    const msgBuffer = new TextEncoder().encode(rawPw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    const docRef = doc(db, "documents", docId);
    const updatePayload = {
      category,
      discipline,
      title,
      description,
      tags,
      pdfUrl,
      visibility: isPrivate ? "private" : "public",
      isPublic: !isPrivate,
      isPasswordProtected: isPrivate,
      password: isPrivate ? rawPw : "",
      passwordHash: isPrivate ? passwordHash : "",
      updatedAt: serverTimestamp()
    };

    await updateDoc(docRef, updatePayload);

    // Update local cache
    if (contributorDocsCache[docId]) {
      Object.assign(contributorDocsCache[docId], updatePayload);
    }

    // Log Activity
    try {
      await addDoc(collection(db, "activity_logs"), {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        action: isPrivate ? "RESOURCE_MADE_PRIVATE" : "RESOURCE_MADE_PUBLIC",
        details: `Updated resource: ${title} (${isPrivate ? 'Protected with Password' : 'Public / Unlocked'})`,
        timestamp: serverTimestamp()
      });
    } catch(e) {}

    if (window.customAlert) {
      await window.customAlert(`Resource updated successfully! (${isPrivate ? 'Private / Password Protected' : 'Set to Public'})`, { title: "Success" });
    } else {
      alert(`Resource updated successfully! (${isPrivate ? 'Private / Password Protected' : 'Set to Public'})`);
    }

    closeEditResourceModal();
    loadContributorManageResources();
    loadPasswordVaultData(true);
  } catch(err) {
    console.error("Error updating resource:", err);
    if (window.customAlert) {
      await window.customAlert("Failed to update resource: " + err.message, { title: "Error", isDanger: true });
    } else {
      alert("Failed to update resource: " + err.message);
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Save Changes";
  }
};

// =========================================
// PASSWORD VAULT ENGINE
// =========================================
let vaultItemsCache = [];

// Web Crypto PBKDF2/AES-GCM encryption & decryption helpers for solutions
async function encryptSolutionData(dataObj, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  let binarySalt = '';
  for (let i = 0; i < salt.byteLength; i++) binarySalt += String.fromCharCode(salt[i]);
  const saltBase64 = btoa(binarySalt);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(JSON.stringify(dataObj));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) binary += String.fromCharCode(combined[i]);
  const encryptedData = btoa(binary);
  const passHashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password + saltBase64));
  const passHash = Array.from(new Uint8Array(passHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { encryptedData, salt: saltBase64, passHash };
}

async function decryptSolutionData(encryptedBase64, saltBase64, password) {
  const rawCipher = atob(encryptedBase64);
  const cipherBytes = new Uint8Array(rawCipher.length);
  for (let i = 0; i < rawCipher.length; i++) cipherBytes[i] = rawCipher.charCodeAt(i);
  const iv = cipherBytes.slice(0, 12);
  const dataBytes = cipherBytes.slice(12);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, dataBytes);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function loadPasswordVaultData(forceReload = false) {
  const tbody = document.getElementById("vaultTableBody");
  if (!tbody) return;
  if (!currentUser) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem; text-align:center; color:var(--text-muted);">Please authenticate to access your Password Vault.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem; text-align:center; color:var(--text-muted);"><i class="ri-loader-4-line spin-icon"></i> Loading Password Vault...</td></tr>`;

  try {
    const items = [];
    const uid = currentUser.uid;
    const email = currentUser.email;

    // 1. Fetch Private Documents from Firestore across all contributor identifiers
    try {
      const userDocsMap = new Map();
      const tryFetchDocs = async (field, val) => {
        if (!val) return;
        try {
          const q = query(collection(db, "documents"), where(field, "==", val));
          const s = await getDocs(q);
          s.forEach(d => userDocsMap.set(d.id, d.data()));
        } catch(e) {}
      };

      if (email) {
        await tryFetchDocs("uploaderEmail", email);
        if (email.toLowerCase() !== email) {
          await tryFetchDocs("uploaderEmail", email.toLowerCase());
        }
      }
      if (uid) {
        await tryFetchDocs("uploaderId", uid);
        await tryFetchDocs("userId", uid);
        await tryFetchDocs("uploaderUid", uid);
      }

      userDocsMap.forEach((data, docId) => {
        const isPrivate = data.visibility === "private" || data.isPasswordProtected === true || data.isPublic === false;
        if (isPrivate) {
          items.push({
            id: docId,
            type: "document",
            category: data.category || "Document",
            title: data.title || "Untitled Resource",
            discipline: data.discipline || "General",
            password: data.password || data.accessPassword || "",
            passwordHash: data.passwordHash || "",
            createdAt: data.createdAt,
            raw: data
          });
        }
      });
    } catch (docErr) {
      console.warn("Vault documents fetch error:", docErr);
    }

    // 2. Fetch Encrypted Assignment Solutions
    try {
      const qAssign = collection(db, "assignment_solutions", uid, "solutions");
      const snapAssign = await getDocs(qAssign);
      snapAssign.forEach(d => {
        const data = d.data();
        if (data.isEncrypted) {
          const localPass = localStorage.getItem('dpg_sol_pass_' + d.id) || '';
          const plainPass = data.password || data.accessPassword || data.pass || localPass || '';
          items.push({
            id: d.id,
            type: "assignment",
            category: "Assignment Solution",
            title: (data.subjectName || "Assignment Solution") + (data.subjectCode ? ` (${data.subjectCode})` : ''),
            discipline: data.course || data.courseSec || "Academic",
            password: plainPass,
            passwordHash: data.passHash || "",
            salt: data.salt || "",
            encryptedData: data.encryptedData || "",
            createdAt: data.createdAt,
            raw: data
          });
        }
      });
    } catch (assignErr) {
      console.warn("Vault assignment solutions fetch warning:", assignErr);
    }

    // 3. Fetch Encrypted Practical Solutions
    try {
      const qPract = collection(db, "practical_solutions", uid, "solutions");
      const snapPract = await getDocs(qPract);
      snapPract.forEach(d => {
        const data = d.data();
        if (data.isEncrypted) {
          const localPass = localStorage.getItem('dpg_sol_pass_' + d.id) || '';
          const plainPass = data.password || data.accessPassword || data.pass || localPass || '';
          items.push({
            id: d.id,
            type: "practical",
            category: "Practical Solution",
            title: (data.subjectName || "Practical Solution") + (data.subjectCode ? ` (${data.subjectCode})` : ''),
            discipline: data.course || data.courseSec || "Academic",
            password: plainPass,
            passwordHash: data.passHash || "",
            salt: data.salt || "",
            encryptedData: data.encryptedData || "",
            createdAt: data.createdAt,
            raw: data
          });
        }
      });
    } catch (practErr) {
      console.warn("Vault practical solutions fetch warning:", practErr);
    }

    vaultItemsCache = items;
    updateVaultMetrics(items);
    renderPasswordVaultTable(items);

  } catch (err) {
    console.error("loadPasswordVaultData error:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem; text-align:center; color:#ef4444;">Failed to load Password Vault: ${err.message}</td></tr>`;
  }
}
window.loadPasswordVaultData = loadPasswordVaultData;

function updateVaultMetrics(items) {
  const total = items.length;
  const docs = items.filter(i => i.type === "document").length;
  const assign = items.filter(i => i.type === "assignment").length;
  const pract = items.filter(i => i.type === "practical").length;

  const totalEl = document.getElementById("vaultTotalCount");
  const docsEl = document.getElementById("vaultDocsCount");
  const assignEl = document.getElementById("vaultAssignCount");
  const practEl = document.getElementById("vaultPractCount");
  const badgeEl = document.getElementById("vaultSidebarBadge");

  if (totalEl) totalEl.textContent = total;
  if (docsEl) docsEl.textContent = docs;
  if (assignEl) assignEl.textContent = assign;
  if (practEl) practEl.textContent = pract;

  if (badgeEl) {
    badgeEl.textContent = total;
    badgeEl.style.display = total > 0 ? "inline-block" : "none";
  }
}

function renderPasswordVaultTable(items) {
  const tbody = document.getElementById("vaultTableBody");
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="manage-res-empty-cell" style="padding:3rem 1.5rem; text-align:center; color:var(--text-muted); white-space:normal !important; word-break:break-word !important; overflow-wrap:break-word !important;">
          <div style="width:60px; height:60px; border-radius:50%; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; color:var(--primary-light); font-size:1.8rem;">
            <i class="ri-shield-keyhole-line"></i>
          </div>
          <h3 style="color:white; font-size:1.15rem; margin:0 0 0.4rem 0; white-space:normal !important;">No Password-Protected Assets</h3>
          <p style="margin:0 auto; font-size:0.88rem; max-width:440px; line-height:1.5; white-space:normal !important; word-wrap:break-word !important; word-break:break-word !important;">All your academic resources and solutions are currently public or you haven't uploaded private assets yet. When you set a resource to Private or encrypt a solution, it will appear here.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    let typeBadge = "";
    if (item.type === "document") {
      typeBadge = `<span style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); padding:2px 8px; border-radius:10px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-file-text-line"></i> Private Document</span>`;
    } else if (item.type === "assignment") {
      typeBadge = `<span style="background:rgba(167,139,250,0.15); color:#c4b5fd; border:1px solid rgba(167,139,250,0.35); padding:2px 8px; border-radius:10px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-book-read-line"></i> Assignment Solution</span>`;
    } else {
      typeBadge = `<span style="background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.35); padding:2px 8px; border-radius:10px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-flask-line"></i> Practical Solution</span>`;
    }

    const plainPw = item.password || item.accessPassword || "";
    const displayPw = plainPw ? plainPw : "Not Stored";

    const tr = document.createElement("tr");
    tr.style.cssText = "border-bottom:1px solid var(--border); transition:background 0.2s;";
    tr.innerHTML = `
      <td style="padding:0.85rem 1rem; font-weight:600; color:var(--primary-light); vertical-align:middle;">${idx + 1}</td>
      <td style="padding:0.85rem 1rem; vertical-align:middle;">
        <div style="font-weight:700; color:white; margin-bottom:4px; font-size:0.95rem;">${escapeHtml(item.title)}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:4px;">
          ${typeBadge}
          <span style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(item.discipline)}</span>
        </div>
        <div style="font-size:0.74rem; color:#64748b; font-family:'Fira Code',monospace;">ID: ${escapeHtml(item.id)}</div>
      </td>
      <td style="padding:0.85rem 1rem; color:var(--text-muted); font-size:0.85rem; vertical-align:middle;">
        ${escapeHtml(item.category)}
      </td>
      <td style="padding:0.85rem 1rem; vertical-align:middle;">
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.12); padding:5px 10px; border-radius:8px;">
          <i class="ri-key-fill" style="color:#38bdf8; font-size:0.95rem;"></i>
          <span id="vaultPwSpan_${item.id}" style="font-family:'Fira Code', monospace; font-weight:700; color:#38bdf8; font-size:0.9rem; letter-spacing:0.5px;">${escapeHtml(displayPw)}</span>
          ${plainPw ? `
          <button type="button" onclick="copyVaultPassword('${escapeHtml(plainPw)}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem; padding:2px; margin-left:4px;" title="Copy Password">
            <i class="ri-file-copy-line"></i>
          </button>
          ` : ''}
        </div>
      </td>
      <td style="padding:0.85rem 1rem; text-align:center; vertical-align:middle;">
        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
          <button onclick="openVaultChangePasswordModal('${item.id}', '${item.type}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')" style="background:rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.4); color:#a5b4fc; padding:5px 12px; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Change Password on Firestore">
            <i class="ri-edit-line"></i> Change Password
          </button>
          <button onclick="removeVaultPasswordMakePublic('${item.id}', '${item.type}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')" style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Remove Password, Make Public, Index in SERP, and remove from Vault">
            <i class="ri-lock-unlock-line"></i> Remove Password (Make Public)
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterPasswordVault = function() {
  const searchVal = (document.getElementById("vaultSearchInput")?.value || "").toLowerCase().trim();
  const typeVal = document.getElementById("vaultTypeFilter")?.value || "all";

  let filtered = vaultItemsCache;
  if (typeVal !== "all") {
    filtered = filtered.filter(i => i.type === typeVal);
  }
  if (searchVal) {
    filtered = filtered.filter(i => {
      const t = (i.title || "").toLowerCase();
      const d = (i.discipline || "").toLowerCase();
      const id = (i.id || "").toLowerCase();
      const c = (i.category || "").toLowerCase();
      return t.includes(searchVal) || d.includes(searchVal) || id.includes(searchVal) || c.includes(searchVal);
    });
  }
  renderPasswordVaultTable(filtered);
};

window.copyVaultPassword = async function(pw) {
  if (!pw || pw.startsWith("(") || pw === "Not Set") {
    if (window.customAlert) {
      await window.customAlert("No plain text password stored for this record. Use 'Change Password' to set a new password.", { title: "Notice" });
    } else {
      alert("No plain text password stored for this record. Use 'Change Password' to set a new password.");
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(pw);
    if (window.customAlert) {
      await window.customAlert(`Password "${pw}" copied to clipboard!`, { title: "Copied" });
    } else {
      alert(`Password "${pw}" copied to clipboard!`);
    }
  } catch(e) {
    alert("Copied: " + pw);
  }
};

window.openVaultChangePasswordModal = function(id, type, title) {
  const modal = document.getElementById("vaultChangePasswordModal");
  if (!modal) return;
  document.getElementById("vaultModalItemId").value = id;
  document.getElementById("vaultModalItemType").value = type;
  document.getElementById("vaultModalTargetTitle").textContent = title || "Asset";
  document.getElementById("vaultNewPasswordInput").value = "";
  modal.style.display = "flex";
};

window.closeVaultChangePasswordModal = function() {
  const modal = document.getElementById("vaultChangePasswordModal");
  if (modal) modal.style.display = "none";
};

window.handleVaultChangePasswordSubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById("vaultModalItemId").value;
  const type = document.getElementById("vaultModalItemType").value;
  const newPw = document.getElementById("vaultNewPasswordInput").value.trim();
  const title = document.getElementById("vaultModalTargetTitle").textContent;

  if (!newPw || newPw.length < 4) {
    alert("Password must be at least 4 characters.");
    return;
  }

  const saveBtn = document.getElementById("vaultSavePasswordBtn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Updating...";

  try {
    if (type === "document") {
      // Compute SHA-256
      const msgBuffer = new TextEncoder().encode(newPw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      await updateDoc(doc(db, "documents", id), {
        password: newPw,
        passwordHash: passwordHash,
        updatedAt: serverTimestamp()
      });

      if (contributorDocsCache[id]) {
        contributorDocsCache[id].password = newPw;
        contributorDocsCache[id].passwordHash = passwordHash;
      }
    } else {
      // Assignment or Practical Solution
      const colName = type === "practical" ? "practical_solutions" : "assignment_solutions";
      const item = vaultItemsCache.find(it => it.id === id);
      const updateData = {
        password: newPw,
        updatedAt: new Date().toISOString()
      };

      // If old cipher exists and old password is known, re-encrypt questions
      if (item && item.raw?.encryptedData && item.password) {
        try {
          const dec = await decryptSolutionData(item.raw.encryptedData, item.raw.salt, item.password);
          const encResult = await encryptSolutionData(dec, newPw);
          updateData.encryptedData = encResult.encryptedData;
          updateData.salt = encResult.salt;
          updateData.passHash = encResult.passHash;
        } catch(decErr) {
          console.warn("Re-encryption warning:", decErr);
        }
      }

      await updateDoc(doc(db, colName, currentUser.uid, "solutions", id), updateData);
      localStorage.setItem('dpg_sol_pass_' + id, newPw);
    }

    // Log Activity
    try {
      await addDoc(collection(db, "activity_logs"), {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        action: "PASSWORD_CHANGED",
        details: `Changed access password for ${type}: "${title}" directly on Firestore.`,
        timestamp: serverTimestamp()
      });
    } catch(e) {}

    closeVaultChangePasswordModal();
    if (window.customAlert) {
      await window.customAlert(`Access password for "${title}" successfully updated on Firestore!`, { title: "Password Updated" });
    } else {
      alert(`Access password for "${title}" successfully updated on Firestore!`);
    }

    await loadPasswordVaultData(true);
    loadContributorManageResources();
  } catch(err) {
    console.error("handleVaultChangePasswordSubmit error:", err);
    if (window.customAlert) {
      await window.customAlert("Failed to update password: " + err.message, { title: "Error", isDanger: true });
    } else {
      alert("Failed to update password: " + err.message);
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Update Password";
  }
};

window.removeVaultPasswordMakePublic = async function(id, type, title) {
  let confirmed = false;
  const promptText = `Make "${title}" 100% Public?\n\nPassword protection will be removed, the asset will immediately appear in SERP search results, and this record will be deleted from your Password Vault.`;
  if (window.customConfirm) {
    confirmed = await window.customConfirm(promptText, { title: "Make Public & Remove Password", confirmText: "Make Public", isDanger: false });
  } else {
    confirmed = confirm(promptText);
  }
  if (!confirmed) return;

  try {
    if (type === "document") {
      await updateDoc(doc(db, "documents", id), {
        visibility: "public",
        isPublic: true,
        isPasswordProtected: false,
        password: "",
        passwordHash: "",
        updatedAt: serverTimestamp()
      });
      if (contributorDocsCache[id]) {
        contributorDocsCache[id].visibility = "public";
        contributorDocsCache[id].isPublic = true;
        contributorDocsCache[id].isPasswordProtected = false;
        contributorDocsCache[id].password = "";
        contributorDocsCache[id].passwordHash = "";
      }
    } else {
      // Assignment or Practical Solution
      const colName = type === "practical" ? "practical_solutions" : "assignment_solutions";
      const item = vaultItemsCache.find(it => it.id === id);
      const updateData = {
        isEncrypted: false,
        password: "",
        passHash: "",
        salt: "",
        encryptedData: "",
        updatedAt: new Date().toISOString()
      };

      if (item && item.raw?.encryptedData && item.password) {
        try {
          const dec = await decryptSolutionData(item.raw.encryptedData, item.raw.salt, item.password);
          if (type === "practical" && (dec.practicals || dec)) {
            updateData.practicals = dec.practicals || dec;
          } else if (dec.questions || dec) {
            updateData.questions = dec.questions || dec;
          }
        } catch(decErr) {
          console.warn("Could not decrypt before unprotecting:", decErr);
        }
      }

      await updateDoc(doc(db, colName, currentUser.uid, "solutions", id), updateData);
      localStorage.removeItem('dpg_sol_pass_' + id);
    }

    // Auto delete that log on exist (remove from local vault list)
    vaultItemsCache = vaultItemsCache.filter(it => it.id !== id);
    updateVaultMetrics(vaultItemsCache);
    renderPasswordVaultTable(vaultItemsCache);

    // Log Activity
    try {
      await addDoc(collection(db, "activity_logs"), {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        action: "PASSWORD_REMOVED_MADE_PUBLIC",
        details: `Removed password protection from ${type}: "${title}". Asset is now 100% public and live in SERP.`,
        timestamp: serverTimestamp()
      });
    } catch(e) {}

    if (window.customAlert) {
      await window.customAlert(`"${title}" is now Public! It appears in SERP search results and has been removed from your Password Vault.`, { title: "Made Public" });
    } else {
      alert(`"${title}" is now Public! It appears in SERP search results and has been removed from your Password Vault.`);
    }

    loadContributorManageResources();
  } catch(err) {
    console.error("removeVaultPasswordMakePublic error:", err);
    if (window.customAlert) {
      await window.customAlert("Failed to remove password: " + err.message, { title: "Error", isDanger: true });
    } else {
      alert("Failed to remove password: " + err.message);
    }
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    localStorage.setItem("dpgActiveUserUid", user.uid);
    localStorage.setItem("dpgActiveUserEmail", user.email || "");
    localStorage.setItem("dpgActiveUserName", user.displayName || "");
    localStorage.setItem("dpgActiveUserPhoto", user.photoURL || "");
    localStorage.setItem("dpgActiveUser", JSON.stringify({
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "",
      photoURL: user.photoURL || ""
    }));
    loadContributorManageResources();
    loadPasswordVaultData();
    populateAdResourceSuggestions();
  }
});
// MULTI-PLATFORM AD UPLOAD & AI TAGS ENGINE
// =========================================
window.updateAdFormFields = function() {
  const platformSel = document.getElementById("adPlatformSelect");
  if (!platformSel) return;

  const val = platformSel.value;
  const resourceBox = document.getElementById("adResourceSelectorBox");
  const videoBox = document.getElementById("adVideoUrlBox");
  const thumbLabel = document.getElementById("adThumbnailLabel");
  const titleInput = document.getElementById("adTitle");
  const targetLinkInput = document.getElementById("adTargetLink");
  const videoUrlInput = document.getElementById("adVideoUrl");

  if (val === "dpgnotes_resource") {
    if (resourceBox) resourceBox.style.display = "block";
    if (videoBox) videoBox.style.display = "block";
    if (thumbLabel) thumbLabel.textContent = "Ad Banner Thumbnail Image (Cloudinary Upload - Optional for Header/Footer Ads)";
    if (titleInput) titleInput.placeholder = "Type or select uploaded resource...";
    if (targetLinkInput) targetLinkInput.placeholder = "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?...";
  } else if (val.startsWith("linkedin_")) {
    if (resourceBox) resourceBox.style.display = "block";
    if (videoBox) videoBox.style.display = "none";
    if (thumbLabel) thumbLabel.textContent = "LinkedIn Post / Blog Cover Image (Optional)";
    if (titleInput) titleInput.placeholder = val.includes("post") ? "Enter LinkedIn Post Title..." : "Enter LinkedIn Blog/Article Title...";
    if (targetLinkInput) targetLinkInput.placeholder = val.includes("post") ? "https://www.linkedin.com/posts/..." : "https://www.linkedin.com/pulse/...";
  } else if (val === "medium_story") {
    if (resourceBox) resourceBox.style.display = "block";
    if (videoBox) videoBox.style.display = "none";
    if (thumbLabel) thumbLabel.textContent = "Medium Story Banner Image (Cloudinary Upload - Optional; if provided, enables Main/Sidebar placement)";
    if (titleInput) titleInput.placeholder = "Enter Medium Story Title...";
    if (targetLinkInput) targetLinkInput.placeholder = "https://medium.com/@username/story-title-...";
  } else if (val === "github_repo") {
    if (resourceBox) resourceBox.style.display = "block";
    if (videoBox) videoBox.style.display = "none";
    if (thumbLabel) thumbLabel.textContent = "GitHub Repository Header Banner (Optional)";
    if (titleInput) titleInput.placeholder = "Enter GitHub Repository Name / Title...";
    if (targetLinkInput) targetLinkInput.placeholder = "https://github.com/username/repository-name";
  } else if (val === "youtube_video") {
    if (resourceBox) resourceBox.style.display = "block";
    if (videoBox) videoBox.style.display = "block";
    if (thumbLabel) thumbLabel.textContent = "YouTube Video / Channel Banner Thumbnail Image (Optional)";
    if (titleInput) titleInput.placeholder = "Enter YouTube Video or Channel Title...";
    if (targetLinkInput) targetLinkInput.placeholder = "https://www.youtube.com/watch?v=... or https://youtube.com/@channel";
    if (videoUrlInput) videoUrlInput.placeholder = "https://www.youtube.com/watch?v=... (Required for hover autoplay preview)";
  }
};

window.generateAiAdTags = async function() {
  const title = document.getElementById("adTitle")?.value.trim() || "";
  const desc = document.getElementById("adDesc")?.value.trim() || "";
  const url = document.getElementById("adTargetLink")?.value.trim() || "";
  const platformVal = document.getElementById("adPlatformSelect")?.value || "dpgnotes_resource";
  const tagsInput = document.getElementById("adTags");
  const btn = document.getElementById("aiSuggestTagsBtn");

  if (!title && !desc && !url) {
    alert("Please enter a Title, Description, or Destination Link first so AI can analyze and suggest relevant tags!");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line spin-icon"></i> AI Analyzing...`;
  }

  try {
    const rawText = `${title} ${desc} ${url} ${platformVal}`.toLowerCase();
    const commonTagsMap = [
      { key: "react", tag: "React.js" },
      { key: "javascript", tag: "JavaScript" },
      { key: "python", tag: "Python" },
      { key: "node", tag: "Node.js" },
      { key: "express", tag: "Express.js" },
      { key: "firebase", tag: "Firebase" },
      { key: "github", tag: "OpenSource" },
      { key: "repo", tag: "GitHub Project" },
      { key: "linkedin", tag: "Professional Post" },
      { key: "medium", tag: "Blog Article" },
      { key: "youtube", tag: "YouTube Video" },
      { key: "video", tag: "Tutorial Video" },
      { key: "vlog", tag: "Tech Vlog" },
      { key: "exam", tag: "Exam Notes" },
      { key: "computer", tag: "Computer Science" },
      { key: "data", tag: "Data Science" },
      { key: "ai", tag: "Artificial Intelligence" },
      { key: "ml", tag: "Machine Learning" },
      { key: "web", tag: "Web Development" },
      { key: "pdf", tag: "Study Notes" },
      { key: "interview", tag: "Interview Prep" }
    ];

    const suggested = new Set();
    if (platformVal.includes("linkedin")) suggested.add("LinkedIn");
    if (platformVal.includes("medium")) suggested.add("Medium");
    if (platformVal.includes("github")) suggested.add("GitHub");
    if (platformVal.includes("youtube")) { suggested.add("YouTube"); suggested.add("Video Tutorial"); }

    commonTagsMap.forEach(item => {
      if (rawText.includes(item.key)) suggested.add(item.tag);
    });

    if (suggested.size < 3) {
      if (title.length > 3) suggested.add(title.split(" ")[0]);
      suggested.add("Education");
      suggested.add("Notes");
    }

    const resultStr = Array.from(suggested).slice(0, 6).join(", ");
    if (tagsInput) tagsInput.value = resultStr;

  } catch(err) {
    console.error("AI tag generation error:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-sparkles-line" style="color:#f59e0b;"></i> AI Auto-Suggest Tags`;
    }
  }
};

window.handleAdThumbnailSelect = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileNameSpan = document.getElementById("adThumbnailFileName");
  if (fileNameSpan) fileNameSpan.textContent = file.name;

  const progressContainer = document.getElementById("adUploadProgressContainer");
  const progressBar = document.getElementById("adUploadProgressBar");
  const percentText = document.getElementById("adUploadPercent");
  const statusText = document.getElementById("adUploadStatus");
  const urlInput = document.getElementById("adThumbnailUrl");

  if (progressContainer) progressContainer.style.display = "block";
  if (statusText) statusText.textContent = "Uploading image to Cloudinary...";
  if (progressBar) progressBar.style.width = "10%";
  if (percentText) percentText.textContent = "10%";

  const formData = new FormData();
  formData.append("pdfFile", file);
  formData.append("file", file);

  try {
    const res = await fetch(window.API_BASE_URL + "/api/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Server response " + res.status);
    const data = await res.json();

    const finalUrl = data.pdfUrl || data.secure_url || data.url;
    if (finalUrl) {
      if (urlInput) urlInput.value = finalUrl;
      if (progressBar) progressBar.style.width = "100%";
      if (percentText) percentText.textContent = "100%";
      if (statusText) statusText.textContent = "Thumbnail uploaded successfully!";
    } else {
      throw new Error(data.error || "Cloudinary upload failed");
    }
  } catch(err) {
    console.error("Ad thumbnail upload error:", err);
    if (statusText) statusText.textContent = "Upload failed: " + err.message;
    if (window.customAlert) {
      await window.customAlert("Thumbnail upload failed: " + err.message, { title: "Upload Error", isDanger: true });
    }
  }
};

async function populateAdResourceSuggestions() {
  const datalist = document.getElementById("contributorResourceTitles");
  if (!datalist || !currentUser) return;

  try {
    const q = query(collection(db, "documents"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    datalist.innerHTML = "";
    snap.forEach(dSnap => {
      const d = dSnap.data();
      const opt = document.createElement("option");
      opt.value = d.title || "Untitled";
      opt.dataset.id = dSnap.id;
      opt.dataset.desc = d.description || "";
      opt.dataset.tags = Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || "");
      opt.dataset.pdfurl = d.pdfUrl || "";
      datalist.appendChild(opt);
    });
  } catch(e) {
    console.warn("Failed fetching ad resource suggestions:", e);
  }
}

function generateAdTrackIdLocal(seedStr) {
  if (!seedStr) return "74920184";
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  return (positiveHash % 90000000 + 10000000).toString();
}

let isAdSubmitting = false;
const adForm = document.getElementById("uploadAdForm");
if (adForm) {
  const titleInput = document.getElementById("adTitle");
  if (titleInput) {
    titleInput.addEventListener("input", function() {
      const datalist = document.getElementById("contributorResourceTitles");
      if (!datalist) return;
      const matchingOpt = Array.from(datalist.options).find(o => o.value === this.value);
      if (matchingOpt) {
        if (matchingOpt.dataset.desc) document.getElementById("adDesc").value = matchingOpt.dataset.desc;
        if (matchingOpt.dataset.tags) document.getElementById("adTags").value = matchingOpt.dataset.tags;
        if (matchingOpt.dataset.id) {
          const vUrl = `https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceID=${matchingOpt.dataset.id}&pdf=${encodeURIComponent(matchingOpt.dataset.pdfurl || '')}&title=${encodeURIComponent(matchingOpt.value)}`;
          document.getElementById("adTargetLink").value = vUrl;
        }
      }
    });
  }

  adForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (isAdSubmitting) return;
    isAdSubmitting = true;

    const btn = document.getElementById("submitAdBtn");
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line spin-icon"></i> Submitting Ad...`;

    try {
      const platformSelectVal = document.getElementById("adPlatformSelect")?.value || "dpgnotes_resource";
      let platform = "dpgnotes";
      let adCategory = "resource";

      if (platformSelectVal === "linkedin_post") { platform = "linkedin"; adCategory = "post"; }
      else if (platformSelectVal === "linkedin_blog") { platform = "linkedin"; adCategory = "blog"; }
      else if (platformSelectVal === "medium_story") { platform = "medium"; adCategory = "story"; }
      else if (platformSelectVal === "github_repo") { platform = "github"; adCategory = "repo"; }
      else if (platformSelectVal === "youtube_video") { platform = "youtube"; adCategory = "video"; }

      const title = document.getElementById("adTitle").value.trim();
      const description = document.getElementById("adDesc").value.trim();
      const tagsStr = document.getElementById("adTags").value.trim();
      const thumbnailUrl = document.getElementById("adThumbnailUrl").value.trim();
      const targetLink = document.getElementById("adTargetLink").value.trim();
      const videoUrl = document.getElementById("adVideoUrl")?.value.trim() || "";

      // Calculate target placement priority based on platform and uploaded media assets
      let targetPlacement = ["header", "footer"];
      if (platform === "medium" && thumbnailUrl) {
        targetPlacement = ["sidebar", "feed", "main", "header", "footer"];
      } else if (thumbnailUrl && videoUrl) {
        targetPlacement = ["feed", "main", "sidebar", "header", "footer"];
      } else if (thumbnailUrl) {
        targetPlacement = ["sidebar", "header", "footer", "feed"];
      }

      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

      const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';
      const res = await fetch(apiBase + '/api/ads/submit-with-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          targetLink,
          platform,
          category: adCategory,
          tags,
          thumbnailUrl,
          videoUrl,
          userEmail: currentUser ? currentUser.email : "contributor@dpgnotes.app",
          userName: currentUser ? (currentUser.displayName || "Contributor") : "Contributor",
          userId: currentUser ? currentUser.uid : "anonymous"
        })
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Submission failed");

      if (window.customAlert) {
        await window.customAlert(`Ad campaign (${platform.toUpperCase()} ${adCategory.toUpperCase()}) submitted successfully! It is now pending Administrator review and approval. Once approved, your ad campaign will be published live.`, { title: "Ad Submitted for Approval 🚀" });
      } else {
        alert(`Ad campaign (${platform.toUpperCase()} ${adCategory.toUpperCase()}) submitted successfully!\n\nStatus: Pending Administrator Approval\n\nYour ad will go live once approved by an Administrator.`);
      }
      adForm.reset();
      updateAdFormFields();

      const fileNameSpan = document.getElementById("adThumbnailFileName");
      if (fileNameSpan) fileNameSpan.textContent = "No image selected";
      const progressContainer = document.getElementById("adUploadProgressContainer");
      if (progressContainer) progressContainer.style.display = "none";
    } catch(err) {
      console.error("Submit Ad error:", err);
      if (window.customAlert) {
        await window.customAlert("Failed submitting ad: " + err.message, { title: "Submission Error", isDanger: true });
      } else {
        alert("Failed submitting ad: " + err.message);
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-rocket-line"></i> Submit Ad Campaign for Admin Approval`;
      isAdSubmitting = false;
    }
  });
}

// ==========================================
// CONTRIBUTOR WEBSITE SUBMISSION & VERIFICATION LOGIC
// ==========================================
window.currentVerificationWebsiteId = null;

window.handleWebsiteSubmit = async function(e) {
  if (e) e.preventDefault();
  const urlInput = document.getElementById("contributorWebsiteUrl");
  const btn = document.getElementById("submitWebsiteBtn");
  if (!urlInput || !urlInput.value) return;

  const targetUrl = urlInput.value.trim();
  const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Crawling Source Code...`;
    }

    const user = currentUser || auth.currentUser;
    const reqBody = JSON.stringify({
      url: targetUrl,
      contributorUid: user ? user.uid : 'guest',
      contributorEmail: user ? user.email : 'guest@dpgnotes.app',
      contributorName: user ? (user.displayName || 'Contributor') : 'Contributor',
      contributorAvatar: user ? (user.photoURL || '') : ''
    });

    let res = await fetch(`${apiBase}/api/website/submit-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reqBody
    });

    if (!res.ok && res.status === 404) {
      res = await fetch(`${apiBase}/submit-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody
      });
    }

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Failed submitting website");

    window.currentVerificationWebsiteId = data.websiteId;
    window.openWebsiteVerificationModal(data.websiteId);
    urlInput.value = "";
    window.loadContributorWebsites();
  } catch(err) {
    console.error("handleWebsiteSubmit error:", err);
    if (window.customAlert) {
      await window.customAlert(err.message, { title: "Crawler Error", isDanger: true });
    } else {
      alert("Error: " + err.message);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-search-eye-line"></i> Crawl & Submit Site`;
    }
  }
};

window.openWebsiteVerificationModal = function(websiteId) {
  window.currentVerificationWebsiteId = websiteId;
  const user = currentUser || auth.currentUser;
  const cUid = user ? user.uid : 'guest';

  const metaEl = document.getElementById("verificationMetaTagCode");
  const scriptEl = document.getElementById("verificationScriptCode");

  if (metaEl) {
    metaEl.textContent = `<meta name="dpg-notes-verification-tag" content="${websiteId}">`;
  }
  if (scriptEl) {
    scriptEl.textContent = `<script src="https://dpgnotes.web.app/track-init.js?referer-to=${websiteId}&used-by=${cUid}" defer></script>`;
  }

  const modal = document.getElementById("websiteVerificationModal");
  if (modal) modal.style.display = "flex";
};

window.copyVerificationCode = function(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    if (window.customAlert) {
      window.customAlert("Verification code snippet copied to clipboard!", { title: "Copied to Clipboard 📋" });
    } else {
      alert("Copied to clipboard!");
    }
  }).catch(() => {});
};

window.copyBothVerificationCodes = function() {
  const metaEl = document.getElementById("verificationMetaTagCode");
  const scriptEl = document.getElementById("verificationScriptCode");
  if (!metaEl || !scriptEl) return;
  const combined = `${metaEl.textContent}\n${scriptEl.textContent}`;
  navigator.clipboard.writeText(combined).then(() => {
    if (window.customAlert) {
      window.customAlert("Both Meta & Script tags copied to clipboard! Paste inside your HTML <head> section.", { title: "Both Tags Copied 📋" });
    } else {
      alert("Both tags copied to clipboard!");
    }
  }).catch(() => {});
};

window.runMetaTagVerification = async function() {
  const websiteId = window.currentVerificationWebsiteId;
  if (!websiteId) return;

  const btn = document.getElementById("verifyMetaTagBtn");
  const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Checking Head Tags Live...`;
    }

    const res = await fetch(`${apiBase}/api/website/verify-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Meta tag verification failed.");

    if (window.customAlert) {
      await window.customAlert(data.message || "Meta tag verified successfully!", { title: "Verification Successful! ✅" });
    } else {
      alert(data.message || "Meta tag verified successfully!");
    }

    document.getElementById("websiteVerificationModal").style.display = "none";
    window.loadContributorWebsites();
  } catch(err) {
    console.error("runMetaTagVerification error:", err);
    if (window.customAlert) {
      await window.customAlert(err.message, { title: "Verification Failed ❌", isDanger: true });
    } else {
      alert("Verification Failed: " + err.message);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-refresh-line"></i> Verify Meta Tag Live`;
    }
  }
};

window.loadContributorWebsites = async function() {
  const tbody = document.getElementById("contributorWebsitesTableBody");
  if (!tbody) return;

  const user = currentUser || auth.currentUser;
  if (!user) return;

  const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';

  try {
    const res = await fetch(`${apiBase}/api/website/contributor-sites?uid=${user.uid}`);
    if (!res.ok) throw new Error("Failed fetching websites");
    const data = await res.json();
    const sites = data.websites || [];

    if (sites.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:var(--text-muted);">No websites registered yet. Submit your website URL above!</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    sites.forEach(s => {
      const tr = document.createElement("tr");
      tr.className = "manage-res-row";
      
      const isVerified = s.status === 'Verified' || s.status === 'Approved' || s.status === 'Verified & Active';
      const statusBadge = isVerified ?
        `<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">Verified & Active</span>` :
        `<span style="background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">Pending Meta Verification</span>`;

      const favicon = s.iconUrl ? `<img src="${s.iconUrl}" style="width:16px; height:16px; vertical-align:middle; margin-right:6px; border-radius:3px;">` : `<i class="ri-global-line" style="color:#38bdf8; margin-right:6px;"></i>`;

      tr.innerHTML = `
        <td style="padding:0.75rem 0.9rem; font-weight:700; color:white;">
          ${favicon} ${s.title || 'Untitled Website'}
        </td>
        <td style="padding:0.75rem 0.9rem;">
          <a href="${s.url}" target="_blank" style="color:#60a5fa; text-decoration:none; font-size:0.85rem;">${s.url} <i class="ri-external-link-line"></i></a>
        </td>
        <td style="padding:0.75rem 0.9rem;">${statusBadge}</td>
        <td style="padding:0.75rem 0.9rem; color:#94a3b8; font-size:0.8rem;">${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Recent'}</td>
        <td style="padding:0.75rem 0.9rem; text-align:center;">
          <button onclick="window.openWebsiteVerificationModal('${s.id}')" style="background:rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.4); color:#a5b4fc; padding:4px 10px; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer; margin-right:6px;">
            ⚡ Verification Steps
          </button>
          <button onclick="window.deleteContributorWebsite('${s.id}')" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:4px 8px; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer;">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch(e) {
    console.warn("loadContributorWebsites error:", e);
  }
};

window.deleteContributorWebsite = async function(siteId) {
  if (!confirm("Are you sure you want to delete this registered website?")) return;
  const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';

  try {
    const res = await fetch(`${apiBase}/api/website/delete-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteId: siteId })
    });
    if (!res.ok) throw new Error("Delete failed");
    window.loadContributorWebsites();
  } catch(err) {
    alert("Delete error: " + err.message);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => window.loadContributorWebsites(), 1200);
});
