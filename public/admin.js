import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = getApps().find(a => a.name === "dpgnotes") || initializeApp(firebaseConfig, "dpgnotes");
const db = getFirestore(app);
const auth = getAuth(app);

const API_URL = window.API_BASE_URL + "/api";

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

const loginForm = document.getElementById("adminLoginForm");
const otpForm = document.getElementById("adminOtpForm");
const deleteDocForm = document.getElementById("deleteDocForm");
const adminStatus = document.getElementById("adminStatus");

let adminEmailGlobal = "";

const authLayer = document.getElementById("authLayer");
const dashboardLayer = document.getElementById("dashboardLayer");
const token = localStorage.getItem("adminToken");

// Wait for Firebase Auth to hydrate from IndexedDB before querying
auth.authStateReady().then(() => {
  if (token) {
    if (auth.currentUser) {
      authLayer.style.display = "none";
      dashboardLayer.style.display = "flex";
      loadUsers();
      loadActivityLogs();
      loadSecurityViolations();
      loadPermanentBlocks();
    } else {
      // Firebase auth missing but backend token exists. Needs re-login.
      localStorage.removeItem("adminToken");
    }
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  
  try {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      adminEmailGlobal = email;
      document.getElementById("step1").classList.remove("active");
      document.getElementById("step2").classList.add("active");
    } else {
      alert(data.error);
    }
  } catch (error) {
    alert("Server error");
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const otp = document.getElementById("adminOtp").value;
  
  try {
    const res = await fetch(`${API_URL}/admin/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmailGlobal, otp })
    });
    
    const data = await res.json();
    if (res.ok) {
      try {
        await signInWithCustomToken(auth, data.firebaseToken);
      } catch (authError) {
        console.error("Firebase Auth failed:", authError);
        alert("Firebase Auth failed. Some actions may be restricted.");
      }
      localStorage.setItem("adminToken", data.token);
      authLayer.style.display = "none";
      dashboardLayer.style.display = "flex";
      loadUsers();
      loadActivityLogs();
    } else {
      alert(data.error);
    }
  } catch (error) {
    alert("Server error");
  }
});

// Global cache for dropdowns
let adminUsersCache = [];
let adminDocsCache = [];

const delContributorSelect = document.getElementById("delContributorSelect");
const delDocSelect = document.getElementById("delDocSelect");
const deleteDocBtn = document.getElementById("deleteDocBtn");
const delReasonInput = document.getElementById("delReason");

delContributorSelect.addEventListener("change", () => {
  const uid = delContributorSelect.value;
  delDocSelect.innerHTML = '<option value="">-- Choose Document --</option>';
  if (!uid) {
    delDocSelect.disabled = true;
    deleteDocBtn.disabled = true;
    return;
  }
  
  const userDocs = adminDocsCache.filter(d => d.userId === uid);
  userDocs.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.innerText = d.title;
    delDocSelect.appendChild(opt);
  });
  
  delDocSelect.disabled = false;
  deleteDocBtn.disabled = true;
});

delDocSelect.addEventListener("change", () => {
  deleteDocBtn.disabled = !delDocSelect.value;
});

deleteDocForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const docId = delDocSelect.value;
  const uid = delContributorSelect.value;
  if (!docId || !uid) return;
  
  const user = adminUsersCache.find(u => u.id === uid);
  const docItem = adminDocsCache.find(d => d.id === docId);
  const contributorEmail = user ? user.email : null;
  
  let reason = delReasonInput.value.trim();
  if (reason.length > 0 && (reason.length < 50 || reason.length > 150)) {
    alert("Custom reason must be between 50 and 150 characters.");
    return;
  }
  
  if (!reason) {
    reason = "Your document was found to be in violation of our community guidelines and quality standards. Please ensure future uploads adhere to the rules.";
  }
  
  try {
    // Delete from Firestore directly
    await deleteDoc(doc(db, "documents", docId));
    
    // Trigger email via backend
    if (contributorEmail && contributorEmail !== "Legacy Contributor") {
      fetch(`${API_URL}/email/admin-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contributorEmail, resourceTitle: docItem.title, reason })
      }).catch(console.error);
      
      addDoc(collection(db, "notifications"), {
        email: contributorEmail,
        type: "alert",
        title: "Document Removed ⚠️",
        message: `Your document "${docItem.title}" was removed by an admin. Reason: ${reason}`,
        createdAt: serverTimestamp()
      }).catch(console.error);
    }
    
    alert("Document deleted and notification sent!");
    deleteDocForm.reset();
    delDocSelect.disabled = true;
    deleteDocBtn.disabled = true;
    loadUsers(); // Refresh
  } catch (error) {
    console.error(error);
    alert("Failed to delete document.");
  }
});

async function loadUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    const docSnap = await getDocs(collection(db, "documents"));
    
    const usersMap = {};
    
    // 1. Populate from 'users' collection
    snap.forEach(d => {
      usersMap[d.id] = { id: d.id, ...d.data() };
    });
    
    // 2. Populate legacy users from 'documents' collection
    docSnap.forEach(d => {
      const data = d.data();
      if (data.userId && !usersMap[data.userId]) {
        usersMap[data.userId] = {
          id: data.userId,
          name: data.userName || "Unknown",
          email: "Legacy Contributor",
          isBlocked: false
        };
      }
    });
    
    adminUsersCache = Object.values(usersMap);
    
    // Cache documents
    adminDocsCache = [];
    docSnap.forEach(d => {
      adminDocsCache.push({ id: d.id, ...d.data() });
    });
    
    // Update Stats UI
    document.getElementById("statUsers").innerText = adminUsersCache.length;
    document.getElementById("statDocs").innerText = adminDocsCache.length;
    // We will update statShares later when share tracking is implemented
    
    // Populate Document Deletion Dropdowns (Content Mgmt Tab)
    const delContributorSelect = document.getElementById("delContributorSelect");
    if (delContributorSelect) {
      delContributorSelect.innerHTML = '<option value="">-- Choose Contributor --</option>';
      adminUsersCache.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.innerText = `${u.name || "Unknown"} (${u.email})`;
        delContributorSelect.appendChild(opt);
      });
    }
    
    const allUsers = adminUsersCache;
    
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";
    
    if (allUsers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No users found.</td></tr>`;
      return;
    }
    
    allUsers.forEach(user => {
      const isBlocked = user.isBlocked ? true : false;
      let statusBadge = isBlocked ? '<span class="badge blocked">Blocked</span>' : '<span class="badge active">Active</span>';
      
      if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
        const days = Math.ceil((user.suspendedUntil - Date.now()) / (1000 * 60 * 60 * 24));
        statusBadge = `<span class="badge suspended">Suspended (${days}d)</span>`;
      }
      
      const userDocs = adminDocsCache.filter(d => d.userId === user.id).length;
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:500;">${user.name || "Unknown"}</td>
        <td style="color:var(--admin-muted);">${user.email || "N/A"}</td>
        <td>${statusBadge}</td>
        <td>${userDocs} docs</td>
        <td>
          <div class="action-group">
            ${isBlocked || (user.suspendedUntil && user.suspendedUntil > Date.now())
              ? (() => {
                  if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
                    const suspensionDurationMs = user.suspensionDurationMs || (user.suspendedUntil - (user.suspendedAt || (user.suspendedUntil - 10000)));
                    const suspendedAt = user.suspendedAt || (user.suspendedUntil - suspensionDurationMs);
                    const elapsedMs = Date.now() - suspendedAt;
                    const eligibleForReactivation = elapsedMs >= (suspensionDurationMs * 0.5);

                    if (!eligibleForReactivation) {
                      const totalSecsRemaining = Math.max(0, Math.ceil(((suspendedAt + (suspensionDurationMs * 0.5)) - Date.now()) / 1000));
                      const hrs = Math.floor(totalSecsRemaining / 3600);
                      const mins = Math.floor((totalSecsRemaining % 3600) / 60);
                      const lockLabel = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
                      return `<span class="badge suspended" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border: 1px solid rgba(239, 68, 68, 0.2); cursor:not-allowed; padding:6px 12px; border-radius:6px;" title="Admin can reactivate only after 50% completion of suspension.">🔒 Locked (${lockLabel})</span>`;
                    }
                  }
                  return `<button class="btn-action success unblock-btn" data-id="${user.id}">Reactivate</button>`;
                })()
              : `<button class="btn-action warn block-btn" data-id="${user.id}" data-email="${user.email}">Suspend</button>`
            }
            <button class="btn-action danger delete-user-btn" data-id="${user.id}" data-email="${user.email}" data-name="${user.name}">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // Add block/suspend listeners
    document.querySelectorAll(".block-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const uid = btn.dataset.id;
        const email = btn.dataset.email;
        
        const days = await window.customPrompt("Enter days to suspend (0 for permanent block):", "0");
        if (days === null) return;
        
        const reason = await window.customPrompt("Enter reason for suspension/blocking:");
        if (reason === null) return;

        let caseStatus = "Active";
        if (parseInt(days) === 0) {
          caseStatus = await window.customPrompt("Enter Case Status (e.g. Flagged, Under Review, Resolved):", "Active");
          if (caseStatus === null) return;
        }
        
        btn.innerText = "⏳";
        try {
          // If legacy user, they might not exist in "users" collection yet
          const userRef = doc(db, "users", uid);
          const updateData = { isBlocked: true, blockedReason: reason };
          if (parseInt(days) > 0) {
            updateData.suspendedUntil = Date.now() + parseInt(days) * 24 * 60 * 60 * 1000;
          }
          
          try {
            await updateDoc(userRef, updateData);
          } catch (e) {
            // Document might not exist (Legacy User). Create it.
            const { setDoc } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");
            await setDoc(userRef, { email, name: "Legacy Contributor", ...updateData, createdAt: new Date() });
          }

          if (parseInt(days) === 0) {
            const blockActionId = 'BLK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            await addDoc(collection(db, "permanent_blocks"), {
              block_action_id: blockActionId,
              block_email: email,
              UID: uid,
              Permanent_Block_on: serverTimestamp(),
              Reason: reason,
              Case_Status: caseStatus
            });
          }
          
          fetch(`${API_URL}/email/admin-block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, reason })
          }).catch(console.error);
          
          addDoc(collection(db, "notifications"), {
            email: email,
            type: "alert",
            title: "Account Suspended 🚫",
            message: `Your account has been suspended by an administrator. Reason: ${reason}`,
            createdAt: serverTimestamp()
          }).catch(console.error);
          
          loadUsers();
          if (typeof loadPermanentBlocks === 'function') loadPermanentBlocks();
        } catch(e) {
          alert("Failed to block user.");
          console.error(e);
        }
      });
    });
    
    document.querySelectorAll(".unblock-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const uid = btn.dataset.id;
        btn.innerText = "⏳";
        try {
          await updateDoc(doc(db, "users", uid), { isBlocked: false, suspendedUntil: null });
          loadUsers();
        } catch(e) {
          alert("Failed to unblock user.");
          console.error(e);
        }
      });
    });
    
    // Add Delete User Listeners
    let pendingDeleteUid = null;
    let pendingDeleteEmail = null;
    
    document.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const uid = btn.dataset.id;
        const email = btn.dataset.email;
        const name = btn.dataset.name;
        
        btn.innerText = "⏳";
        try {
          const res = await fetch(`${API_URL}/admin/send-delete-key`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
            },
            body: JSON.stringify({ contributorId: uid, contributorEmail: email })
          });
          
          if (res.ok) {
            pendingDeleteUid = uid;
            pendingDeleteEmail = email;
            document.getElementById("delTargetName").innerText = name || email;
            document.getElementById("deleteModal").classList.add("active");
            btn.innerText = "Delete";
          } else {
            const data = await res.json();
            alert(data.error || "Failed to send auth key.");
            btn.innerText = "Delete";
          }
        } catch (e) {
          console.error(e);
          alert("Server error");
          btn.innerText = "Delete";
        }
      });
    });
    
    document.getElementById("deleteConfirmForm").onsubmit = async (e) => {
      e.preventDefault();
      const key = document.getElementById("deleteAuthKey").value;
      const confirmBtn = document.getElementById("confirmDeleteBtn");
      
      confirmBtn.innerText = "Deleting...";
      try {
        const res = await fetch(`${API_URL}/admin/delete-contributor`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
          },
          body: JSON.stringify({ contributorId: pendingDeleteUid, key })
        });
        
        const data = await res.json();
        if (res.ok) {
          alert("Contributor and all their data successfully deleted.");
          document.getElementById("deleteModal").classList.remove("active");
          document.getElementById("deleteConfirmForm").reset();
          loadUsers();
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert("Server error");
      }
      confirmBtn.innerText = "Execute Deletion";
    };
    
  } catch (error) {
    console.error("Failed to load users", error);
  }
}

// ==========================================
// ACTIVITY LOGS
// ==========================================
async function loadActivityLogs() {
  const table = document.getElementById("activityLogsTableBody");
  if (!table) return;
  
  try {
    const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(100));
    const snap = await getDocs(q);
    
    table.innerHTML = "";
    if (snap.empty) {
      table.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity yet.</td></tr>`;
      return;
    }
    
    snap.forEach(doc => {
      const data = doc.data();
      const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : "Just now";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--text-muted);">${timeStr}</td>
        <td>${data.name || data.userId}</td>
        <td><span style="background:var(--primary); color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${data.action}</span></td>
        <td>${data.details || ""}</td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error("Failed to load activity logs", error);
    table.innerHTML = `<tr><td colspan="4" style="color:#ef4444; text-align:center;">Failed to load logs.</td></tr>`;
  }
}


window.openAdminSidebar = function() {
  document.getElementById('adminSidebar').classList.add('active');
  document.getElementById('adminOverlay').classList.add('active');
};

window.closeAdminSidebar = function() {
  document.getElementById('adminSidebar').classList.remove('active');
  document.getElementById('adminOverlay').classList.remove('active');
};

// Touch swipe gestures
let touchstartX = 0;
let touchendX = 0;
document.addEventListener('touchstart', e => {
  touchstartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  touchendX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeDist = touchendX - touchstartX;
  if (swipeDist > 50) {
    // Swipe Right -> Open Sidebar
    window.openAdminSidebar();
  }
  if (swipeDist < -50) {
    // Swipe Left -> Close Sidebar
    window.closeAdminSidebar();
  }
}

// Global cache for shares
let adminSharesCache = [];

async function loadShares() {
  const tbody = document.getElementById("sharesTableBody");
  if (!tbody) return;
  
  try {
    const snap = await getDocs(query(collection(db, "share_links"), orderBy("createdAt", "desc")));
    adminSharesCache = [];
    snap.forEach(doc => {
      adminSharesCache.push({ id: doc.id, ...doc.data() });
    });
    
    // Update stats
    const statShares = document.getElementById("statShares");
    if (statShares) statShares.innerText = adminSharesCache.length;
    
    renderSharesTable(adminSharesCache);
  } catch (err) {
    console.error("Failed to load shares", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-danger);">Failed to load shares data.</td></tr>`;
  }
}

function renderSharesTable(shares) {
  const tbody = document.getElementById("sharesTableBody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  if (shares.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-muted);">No share links found.</td></tr>`;
    return;
  }
  
  shares.forEach(link => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:600;">${link.token}</td>
      <td>${link.title || "Untitled"}</td>
      <td style="color:var(--admin-muted);">${link.uploader || "Unknown"}</td>
      <td><strong>${link.clicks || 0}</strong> clicks</td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <a href="report.html?code=${link.token}" target="_blank" class="btn-action success" style="text-decoration:none;">View Report</a>
          <button onclick="window.deleteShareCode('${link.token}')" class="btn-action danger">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteShareCode = async function(token) {
  const confirmDelete = await window.customConfirm(`Are you sure you want to permanently delete share code "${token}"? This will terminate access for all visitors and notify the generator.`, {
    title: "Delete Share Code?",
    isDanger: true,
    confirmText: "Delete Code"
  });
  
  if (!confirmDelete) return;
  
  try {
    const res = await fetch(`${API_URL}/admin/delete-share-code`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
      },
      body: JSON.stringify({ token })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert("Share code deleted successfully!");
      loadShares(); // refresh
    } else {
      alert(data.error || "Failed to delete share code");
    }
  } catch (err) {
    alert("Server error deleting share code");
  }
};

// Live search for shares
const shareSearch = document.getElementById("shareSearch");
if (shareSearch) {
  shareSearch.addEventListener("input", (e) => {
    const queryStr = e.target.value.toLowerCase().trim();
    if (!queryStr) {
      renderSharesTable(adminSharesCache);
      return;
    }
    const filtered = adminSharesCache.filter(link => 
      link.token.toLowerCase().includes(queryStr) ||
      (link.title || "").toLowerCase().includes(queryStr) ||
      (link.uploader || "").toLowerCase().includes(queryStr)
    );
    renderSharesTable(filtered);
  });
}

// Hook into switchTab
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
  if (typeof originalSwitchTab === 'function') {
    originalSwitchTab(tabId);
  } else {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }
  }
  
  if (tabId === 'shares') {
    loadShares();
  } else if (tabId === 'users') {
    loadUsers();
  } else if (tabId === 'logs') {
    loadActivityLogs();
  } else if (tabId === 'security') {
    loadSecurityViolations();
  }
};

async function loadSecurityViolations() {
  const tableBody = document.getElementById("securityTableBody");
  if (!tableBody) return;
  
  tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-muted);">Loading security logs...</td></tr>`;
  
  try {
    const q = query(collection(db, "security_violations"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    tableBody.innerHTML = "";
    
    if (querySnapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-muted);">No security violations logged.</td></tr>`;
      return;
    }

    const usersSnap = await getDocs(collection(db, "users"));
    const usersDataMap = {};
    usersSnap.forEach(docSnap => {
      usersDataMap[docSnap.id] = docSnap.data();
    });

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
      const userId = data.userId || 'Unknown';
      const email = data.email || 'N/A';
      const ip = data.ipAddress || 'N/A';
      const reason = data.reason || 'N/A';

      const isContributor = !userId.startsWith('admin_') && userId !== 'Guest';
      let actionBtn = '';
      if (isContributor) {
        const userProfile = usersDataMap[userId];
        const isBlocked = userProfile ? (userProfile.isBlocked || (userProfile.suspendedUntil && userProfile.suspendedUntil > Date.now())) : false;
        if (isBlocked) {
          if (userProfile && userProfile.suspendedUntil && userProfile.suspendedUntil > Date.now()) {
            const suspensionDurationMs = userProfile.suspensionDurationMs || (userProfile.suspendedUntil - (userProfile.suspendedAt || (userProfile.suspendedUntil - 10000)));
            const suspendedAt = userProfile.suspendedAt || (userProfile.suspendedUntil - suspensionDurationMs);
            const elapsedMs = Date.now() - suspendedAt;
            const eligibleForReactivation = elapsedMs >= (suspensionDurationMs * 0.5);

            if (!eligibleForReactivation) {
              const totalSecsRemaining = Math.max(0, Math.ceil(((suspendedAt + (suspensionDurationMs * 0.5)) - Date.now()) / 1000));
              const hrs = Math.floor(totalSecsRemaining / 3600);
              const mins = Math.floor((totalSecsRemaining % 3600) / 60);
              const lockLabel = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
              actionBtn = `<span class="badge suspended" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border: 1px solid rgba(239, 68, 68, 0.2); cursor:not-allowed; font-size:0.75rem; padding:4px 8px; border-radius:4px;" title="Admin can reactivate only after 50% completion of suspension.">🔒 Locked (${lockLabel})</span>`;
            } else {
              actionBtn = `<button class="btn-action success unblock-sec-btn" style="background:var(--admin-success);color:white;padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-uid="${userId}">Reactivate</button>`;
            }
          } else {
            actionBtn = `<button class="btn-action success unblock-sec-btn" style="background:var(--admin-success);color:white;padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-uid="${userId}">Reactivate</button>`;
          }
        } else {
          actionBtn = `<button class="btn-action warn block-sec-btn" style="background:var(--admin-warning);color:white;padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-uid="${userId}" data-email="${email}">Suspend</button>`;
        }
      } else {
        actionBtn = `<button class="btn-action danger dismiss-sec-btn" style="background:var(--admin-danger);color:white;padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-id="${docId}">Dismiss</button>`;
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${time}</td>
        <td>
          <div style="font-weight:600;">${email}</div>
          <div style="font-size:0.8rem; color:var(--admin-muted);">${userId}</div>
        </td>
        <td>${ip}</td>
        <td><span style="color:var(--admin-danger); font-weight:500;">${reason}</span></td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            ${actionBtn}
            ${isContributor ? `<button class="btn-action danger dismiss-sec-btn" style="background:rgba(239, 68, 68, 0.1);color:var(--admin-danger);padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-id="${docId}">Dismiss</button>` : ''}
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Bind button events
    document.querySelectorAll(".dismiss-sec-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        btn.innerText = "⏳";
        try {
          await deleteDoc(doc(db, "security_violations", id));
          loadSecurityViolations();
        } catch (e) {
          alert("Failed to delete log");
        }
      };
    });

    document.querySelectorAll(".block-sec-btn").forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        const email = btn.dataset.email;
        const days = await window.customPrompt("Enter days to suspend this violator (0 for permanent block):", "3");
        if (days === null) return;
        const reason = await window.customPrompt("Enter reason for suspension/blocking:", "Security Violation: Visibility change or Blur detected");
        if (reason === null) return;

        let caseStatus = "Active";
        if (parseInt(days) === 0) {
          caseStatus = await window.customPrompt("Enter Case Status (e.g. Flagged, Under Review, Resolved):", "Active");
          if (caseStatus === null) return;
        }

        btn.innerText = "⏳";
        const userRef = doc(db, "users", uid);
        const updateData = {
          isBlocked: true,
          suspendedUntil: null,
          blockedReason: reason
        };
        if (parseInt(days) > 0) {
          updateData.suspendedUntil = Date.now() + parseInt(days) * 24 * 60 * 60 * 1000;
        }
        
        try {
          await updateDoc(userRef, updateData);

          if (parseInt(days) === 0) {
            const blockActionId = 'BLK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            await addDoc(collection(db, "permanent_blocks"), {
              block_action_id: blockActionId,
              block_email: email,
              UID: uid,
              Permanent_Block_on: serverTimestamp(),
              Reason: reason,
              Case_Status: caseStatus
            });
          }

          fetch(`${API_URL}/email/admin-block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, reason })
          }).catch(console.error);

          addDoc(collection(db, "notifications"), {
            email: email,
            type: "alert",
            title: "Account Suspended 🚫",
            message: `Your account has been suspended by an administrator. Reason: ${reason}`,
            createdAt: serverTimestamp()
          }).catch(console.error);

          loadSecurityViolations();
        } catch (e) {
          alert("Failed to suspend user.");
        }
      };
    });

    document.querySelectorAll(".unblock-sec-btn").forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        btn.innerText = "⏳";
        try {
          await updateDoc(doc(db, "users", uid), { isBlocked: false, suspendedUntil: null });
          loadSecurityViolations();
        } catch(e) {
          alert("Failed to reactivate user.");
        }
      };
    });

  } catch (err) {
    console.error("Failed to load security violations:", err);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-danger);">Failed to query database logs.</td></tr>`;
  }
  
  // Refresh permanent blocks table
  loadPermanentBlocks();
}

// Add real-time text filter to security logs
document.getElementById("securitySearch").addEventListener("input", (e) => {
  const queryStr = e.target.value.toLowerCase();
  document.querySelectorAll("#securityTableBody tr").forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(queryStr) ? "" : "none";
  });
});

async function loadPermanentBlocks() {
  const tableBody = document.getElementById("permanentTableBody");
  if (!tableBody) return;
  
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">Loading permanent blocks...</td></tr>`;
  
  try {
    const q = query(collection(db, "permanent_blocks"), orderBy("Permanent_Block_on", "desc"));
    const querySnapshot = await getDocs(q);
    tableBody.innerHTML = "";
    
    if (querySnapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">No permanent blocks found.</td></tr>`;
      return;
    }

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const blockId = data.block_action_id || 'N/A';
      const email = data.block_email || 'N/A';
      const uid = data.UID || 'N/A';
      const time = data.Permanent_Block_on ? new Date(data.Permanent_Block_on.seconds * 1000).toLocaleString() : 'N/A';
      const reason = data.Reason || 'N/A';
      const caseStatus = data.Case_Status || 'Active';

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong style="color:var(--admin-warning);">${blockId}</strong></td>
        <td>${email}</td>
        <td><code style="font-size:0.8rem; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${uid}</code></td>
        <td>${time}</td>
        <td>${reason}</td>
        <td><span class="badge blocked" style="text-transform:uppercase;">${caseStatus}</span></td>
        <td>
          <button class="btn-action success lift-block-btn" style="background:var(--admin-success);color:white;padding:4px 8px;border-radius:6px;border:none;font-size:0.8rem;cursor:pointer;" data-id="${docId}" data-uid="${uid}" data-email="${email}">Lift Block</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Bind Lift Block button events
    document.querySelectorAll(".lift-block-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const uid = btn.dataset.uid;
        const email = btn.dataset.email;
        btn.innerText = "⏳";
        try {
          await deleteDoc(doc(db, "permanent_blocks", id));
          try {
            await updateDoc(doc(db, "users", uid), { isBlocked: false, suspendedUntil: null });
          } catch (e) {
            console.log("User doc didn't exist or unblock skipped");
          }
          loadPermanentBlocks();
          if (typeof loadUsers === 'function') loadUsers();
          if (typeof loadSecurityViolations === 'function') loadSecurityViolations();
        } catch (e) {
          alert("Failed to lift permanent block");
        }
      };
    });

  } catch (err) {
    console.error("Failed to load permanent blocks:", err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-danger);">Failed to query permanent blocks.</td></tr>`;
  }
}

// Add real-time text filter to permanent blocks
document.getElementById("permanentSearch").addEventListener("input", (e) => {
  const queryStr = e.target.value.toLowerCase();
  document.querySelectorAll("#permanentTableBody tr").forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(queryStr) ? "" : "none";
  });
});

window.loadShares = loadShares;
window.loadSecurityViolations = loadSecurityViolations;
window.loadPermanentBlocks = loadPermanentBlocks;
