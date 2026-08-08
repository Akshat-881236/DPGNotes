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
      loadPermanentBlocks();
      if (typeof loadShares === 'function') loadShares();
      if (typeof loadAdminNotifications === 'function') loadAdminNotifications();
      if (typeof loadEngagementTelemetry === 'function') loadEngagementTelemetry();
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
      if (typeof loadShares === 'function') loadShares();
      if (typeof loadAdminNotifications === 'function') loadAdminNotifications();
      if (typeof loadEngagementTelemetry === 'function') loadEngagementTelemetry();
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
            const durationMs = parseInt(days) * 24 * 60 * 60 * 1000;
            updateData.suspendedUntil = Date.now() + durationMs;
            updateData.suspendedAt = Date.now();
            updateData.suspensionDurationMs = durationMs;
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
            isRead: false,
            createdAt: serverTimestamp()
          }).catch(console.error);
          
          loadUsers();
          loadPermanentBlocks();

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
          await updateDoc(doc(db, "users", uid), { 
            isBlocked: false, 
            suspendedUntil: null,
            suspendedAt: null,
            suspensionDurationMs: null
          });
          loadUsers();
          loadPermanentBlocks();
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
    const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(200));
    const snap = await getDocs(q);
    
    table.innerHTML = "";
    if (snap.empty) {
      table.innerHTML = `<tr><td colspan="6" style="text-align:center;">No activity yet.</td></tr>`;
      return;
    }
    
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : "Just now";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:0.5rem 0.75rem; text-align:center;">
          <input type="checkbox" class="log-row-check" data-id="${docId}" style="cursor:pointer; width:16px; height:16px;" onchange="updateLogSelectionBar()">
        </td>
        <td style="color:var(--admin-muted); font-size:0.85rem;">${timeStr}</td>
        <td>${data.name || data.userId || 'N/A'}</td>
        <td><span style="background:var(--admin-primary); color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${data.action || 'N/A'}</span></td>
        <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${data.details || ''}">${data.details || ""}</td>
        <td><button onclick="deleteSingleLog('${docId}')" style="padding:4px 10px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:600;" title="Delete this log"><i class="ri-delete-bin-line"></i></button></td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error("Failed to load activity logs", error);
    table.innerHTML = `<tr><td colspan="6" style="color:#ef4444; text-align:center;">Failed to load logs.</td></tr>`;
  }
}

// Add real-time text filter to notifications log
setTimeout(() => {
  const notifSearch = document.getElementById("notifSearch");
  if (notifSearch) {
    notifSearch.addEventListener("input", (e) => {
      const queryStr = e.target.value.toLowerCase();
      document.querySelectorAll("#adminNotifsTableBody tr").forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(queryStr) ? "" : "none";
      });
    });
  }
}, 1000);

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
    loadAdminNotifications();
  }
};

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
const permanentSearch = document.getElementById("permanentSearch");
if (permanentSearch) {
  permanentSearch.addEventListener("input", (e) => {
    const queryStr = e.target.value.toLowerCase();
    document.querySelectorAll("#permanentTableBody tr").forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(queryStr) ? "" : "none";
    });
  });
}

async function loadAdminNotifications() {
  const tableBody = document.getElementById("adminNotifsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">Loading system notifications...</td></tr>`;

  try {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    tableBody.innerHTML = "";

    if (snap.empty) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">No system notifications recorded.</td></tr>`;
      return;
    }

    snap.forEach(d => {
      const data = d.data();
      const time = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : (data.timestamp || 'N/A');
      const isKept = data.isKept || data.keepPermanently || false;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="notif-row-check" data-id="${d.id}" onchange="updateNotifSelectionBar()">
        </td>
        <td style="text-align:center;">
          <button style="background:none; border:none; cursor:pointer; font-size:1.1rem;" onclick="toggleKeepNotif('${d.id}')" title="${isKept ? 'Saved permanently from 15-day auto purge' : 'Click to Keep permanently'}">
            ${isKept ? '<i class="ri-bookmark-fill" style="color:#f59e0b;"></i>' : '<i class="ri-bookmark-line" style="color:var(--admin-muted);"></i>'}
          </button>
        </td>
        <td><small style="color:var(--admin-muted);">${time}</small></td>
        <td><strong>${data.toEmail || data.email || 'System Log'}</strong></td>
        <td>${data.title || 'Notification'}</td>
        <td style="max-width:240px; word-break:break-word;">${data.message || data.text || ''}</td>
        <td>
          <button class="btn-action danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteSingleNotif('${d.id}')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    updateNotifSelectionBar();
  } catch (err) {
    console.error("Failed loading notifications:", err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-danger);">Failed loading notifications.</td></tr>`;
  }
}

function toggleAllNotifs(masterCheck) {
  document.querySelectorAll(".notif-row-check").forEach(cb => {
    cb.checked = masterCheck.checked;
  });
  updateNotifSelectionBar();
}

function updateNotifSelectionBar() {
  const selected = document.querySelectorAll(".notif-row-check:checked");
  const countEl = document.getElementById("selectedNotifsCount");
  const btnEl = document.getElementById("deleteSelectedNotifsBtn");
  if (selected.length > 0) {
    if (countEl) { countEl.innerText = `${selected.length} selected`; countEl.style.display = "inline"; }
    if (btnEl) btnEl.style.display = "inline-flex";
  } else {
    if (countEl) countEl.style.display = "none";
    if (btnEl) btnEl.style.display = "none";
  }
}

async function deleteSingleNotif(id) {
  const confirmed = await window.customConfirm("Are you sure you want to delete this notification log?", { title: "Delete Notification?", isDanger: true });
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_URL}/admin/delete-notifs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] })
    });
    if (res.ok) {
      loadAdminNotifications();
    } else {
      alert("Failed to delete notification.");
    }
  } catch (e) {
    console.error(e);
    alert("Error deleting notification.");
  }
}

async function deleteSelectedNotifs() {
  const checked = Array.from(document.querySelectorAll(".notif-row-check:checked")).map(cb => cb.dataset.id);
  if (checked.length === 0) return;
  const confirmed = await window.customConfirm(`Are you sure you want to delete ${checked.length} selected notifications?`, { title: "Delete Selected Notifications?", isDanger: true });
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_URL}/admin/delete-notifs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: checked })
    });
    if (res.ok) {
      loadAdminNotifications();
    } else {
      alert("Failed to delete selected notifications.");
    }
  } catch (e) {
    console.error(e);
    alert("Error deleting notifications.");
  }
}

async function toggleKeepNotif(id) {
  try {
    const res = await fetch(`${API_URL}/admin/toggle-keep-notif`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      loadAdminNotifications();
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadEngagementTelemetry() {
  const tableBody = document.getElementById("engagementDirectoryBody");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">Loading Telemetry...</td></tr>`;

  try {
    // 1. Fetch Aggregated Connection / Follow Metrics
    const res = await fetch(`${API_URL}/admin/engagement-analytics`);
    const metrics = await res.json();

    document.getElementById("adminTotalFollows").innerText = metrics.followsCount || 0;
    document.getElementById("adminTotalConnections").innerText = metrics.connectionsCount || 0;
    document.getElementById("adminPendingConnections").innerText = metrics.pendingCount || 0;
    document.getElementById("adminReportsCount").innerText = metrics.reportsCount || 0;

    // 2. Fetch Contributor List & Render Directory
    const listRes = await fetch(`${API_URL}/social/list-profiles`);
    const profiles = await listRes.json();

    tableBody.innerHTML = "";
    if (profiles.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No contributors in system directory.</td></tr>`;
      return;
    }

    profiles.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--admin-primary), var(--admin-accent)); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; overflow:hidden;">
            ${p.avatarUrl ? `<img src="${p.avatarUrl}" style="width:100%; height:100%; object-fit:cover;">` : p.name.charAt(0).toUpperCase()}
          </div>
        </td>
        <td style="font-weight:600; color:white;">${p.name}</td>
        <td>${p.email}</td>
        <td style="text-align:center;">${p.uploadedCount}</td>
        <td style="text-align:center;">${p.likesCount}</td>
        <td>
          <button class="btn-action primary" style="background:var(--admin-primary); color:white; padding:4px 8px; border-radius:6px; border:none; font-size:0.8rem; cursor:pointer;" onclick="window.open('/profile.html?uid=${p.uid}', '_blank')">View Profile</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

  } catch (err) {
    console.error("Failed loading engagement telemetry:", err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-danger);">Failed loading telemetry data.</td></tr>`;
  }
}

async function loadSupportRequestsAdmin() {
  const tableBody = document.getElementById("supportRequestsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">Loading support requests...</td></tr>`;

  try {
    const { collection, getDocs, query } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");
    const q = query(collection(db, "support_requests"));
    const snap = await getDocs(q);

    if (snap.empty) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No support or copyright requests submitted yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const reqId = d.id;
      const isResolved = data.status === "RESOLVED";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="badge ${data.type === 'SUSPENSION_APPEAL' ? 'warn' : 'active'}">${data.type || 'GENERAL'}</span></td>
        <td style="font-weight:600; color:white;">${data.name || 'N/A'}</td>
        <td>${data.email || 'N/A'}</td>
        <td>${data.contact || 'N/A'}</td>
        <td><span class="badge ${isResolved ? 'active' : 'suspended'}">${data.status || 'PENDING'}</span></td>
        <td>
          <a href="support-contact-report.html?token=${reqId}" target="_blank" class="btn-action primary" style="background:var(--admin-primary); color:white; padding:4px 10px; border-radius:6px; text-decoration:none; font-size:0.8rem; display:inline-block;">View Report</a>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error loading support requests admin:", err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-danger);">Failed to load requests.</td></tr>`;
  }
}

window.loadShares = loadShares;
window.loadPermanentBlocks = loadPermanentBlocks;
window.loadAdminNotifications = loadAdminNotifications;
window.loadEngagementTelemetry = loadEngagementTelemetry;
window.loadSupportRequestsAdmin = loadSupportRequestsAdmin;
window.toggleAllNotifs = toggleAllNotifs;
window.updateNotifSelectionBar = updateNotifSelectionBar;
window.deleteSingleNotif = deleteSingleNotif;
window.deleteSelectedNotifs = deleteSelectedNotifs;
window.toggleKeepNotif = toggleKeepNotif;

// ==========================================
// REFERRER ANALYSIS TAB
// ==========================================
let adminInvitationsCache = [];

async function loadReferrerAnalysis() {
  const tbody = document.getElementById("referrerTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">Loading Referrer Analysis...</td></tr>`;

  try {
    const q = query(collection(db, "invitations"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No referrer data found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    adminInvitationsCache = [];
    const now = Date.now();
    const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const docId = docSnap.id;

      let rawTime = d.sentAt || d.createdAt;
      let ms = 0;
      if (rawTime) ms = rawTime.toMillis ? rawTime.toMillis() : new Date(rawTime).getTime();

      // AUTO DELETE records older than 20 days
      if (ms > 0 && (now - ms > TWENTY_DAYS_MS)) {
        deleteDoc(doc(db, "invitations", docId)).catch(console.error);
        return;
      }

      adminInvitationsCache.push({ id: docId, ...d });

      const code = d.referrerCode || 'N/A';
      const createdBy = d.senderName || d.senderEmail || 'Unknown';
      const sentTo = d.toName || d.toEmail || 'Unknown';

      let sentAt = ms > 0 ? new Date(ms).toLocaleString() : 'Unknown';

      const status = d.status || 'Sent';
      let statusColor = "var(--admin-muted)";
      if (status === "Sent") statusColor = "var(--admin-primary)";
      if (status === "View") statusColor = "#f59e0b";
      if (status === "Accept") statusColor = "#10b981";
      if (status === "Rejected") statusColor = "#ef4444";

      // Delete icon visible ONLY once status is "View" or "Accept"
      const isEligibleForDelete = status === "View" || status === "Accept";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family:monospace; font-weight:600;">${code}</td>
        <td>${createdBy}</td>
        <td>${sentTo}</td>
        <td>${sentAt}</td>
        <td><span class="badge" style="background:transparent; border:1px solid ${statusColor}; color:${statusColor};">${status}</span></td>
        <td>
          <div style="display:inline-flex; gap:6px; align-items:center;">
            <a href="referrer_code.html?code=${code}" target="_blank" class="btn-action primary" style="background:var(--admin-primary); color:white; padding:4px 10px; border-radius:6px; text-decoration:none; font-size:0.8rem; display:inline-block;">Learn More</a>
            ${isEligibleForDelete ? `
              <button class="btn-action danger" onclick="deleteReferrer('${docId}')" title="Delete Viewed/Accepted Referrer">
                <i class="ri-delete-bin-line"></i>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (tbody.children.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No active referrer data found.</td></tr>`;
    }

  } catch (err) {
    console.error("Failed loading referrer analysis:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-danger);">Failed to load referrer data.</td></tr>`;
  }
}
window.loadReferrerAnalysis = loadReferrerAnalysis;

window.deleteReferrer = async function(invId) {
  const confirmed = window.customConfirm ? await window.customConfirm("Delete this viewed/accepted invitation record?", { title: "Confirm Delete", isDanger: true }) : confirm("Delete invitation?");
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "invitations", invId));
    if (window.customAlert) await window.customAlert("Referrer record deleted.", { title: "Deleted" });
    loadReferrerAnalysis();
  } catch (err) {
    console.error("Failed to delete referrer:", err);
  }
};

window.deleteViewedReferrersGroup = async function() {
  const viewedItems = adminInvitationsCache.filter(item => item.status === "View" || item.status === "Accept");
  if (viewedItems.length === 0) {
    if (window.customAlert) await window.customAlert("No viewed or accepted referrer records found for group deletion.", { title: "Notice" });
    return;
  }

  const confirmed = window.customConfirm ? await window.customConfirm(`Delete all ${viewedItems.length} viewed/accepted referrer records?`, { title: "Group Delete Confirmation", isDanger: true }) : confirm("Delete all viewed?");
  if (!confirmed) return;

  try {
    for (const item of viewedItems) {
      await deleteDoc(doc(db, "invitations", item.id)).catch(console.error);
    }
    if (window.customAlert) await window.customAlert(`${viewedItems.length} referrer records deleted successfully.`, { title: "Group Deletion Complete" });
    loadReferrerAnalysis();
  } catch (err) {
    console.error("Group delete referrer error:", err);
  }
};

// ==========================================
// DEVICE LOGS TAB & MANAGEMENT
// ==========================================
let adminDeviceLogsCache = [];

async function loadDeviceLogsAdmin() {
  const tbody = document.getElementById("deviceLogsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">Loading Device Logs...</td></tr>`;

  try {
    const logsSnap = await getDocs(query(collection(db, "device_login_history"), orderBy("timestamp", "desc")));
    const quotaSnap = await getDocs(query(collection(db, "guest_quotas"), orderBy("updatedAt", "desc")));

    adminDeviceLogsCache = [];

    // Parse Device History logs
    logsSnap.forEach(dSnap => {
      const data = dSnap.data();
      adminDeviceLogsCache.push({
        id: dSnap.id,
        rawId: data.userId || data.email || 'ADM',
        userType: data.userType || 'Contributor',
        ipAddress: data.ipAddress || '127.0.0.1',
        country: `${data.country || 'Unknown'} (${data.city || 'N/A'})`,
        screenTime: data.screenTime || '15 mins',
        timestamp: data.timestamp
      });
    });

    // Parse Anonymous Guest Quota logs
    quotaSnap.forEach(qSnap => {
      const qData = qSnap.data();
      adminDeviceLogsCache.push({
        id: qSnap.id,
        rawId: qData.guestId || qSnap.id,
        userType: 'Anonymous',
        ipAddress: qData.clientIp || '127.0.0.1',
        country: 'Guest Client',
        screenTime: `${qData.pageVisits || 1} Visits / ${qData.pdfViews || 0} PDFs`,
        timestamp: qData.updatedAt
      });
    });

    if (adminDeviceLogsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">No device logs found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    adminDeviceLogsCache.forEach(log => {
      let typeBadge = `<span class="badge" style="background:rgba(99,102,241,0.2); color:#a5b4fc; border:1px solid rgba(99,102,241,0.4);">Contributor</span>`;
      if (log.userType === 'Admin') {
        typeBadge = `<span class="badge" style="background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.4);">Admin</span>`;
      } else if (log.userType === 'Anonymous') {
        typeBadge = `<span class="badge" style="background:rgba(245,158,11,0.2); color:#fcd34d; border:1px solid rgba(245,158,11,0.4);">Anonymous</span>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="device-log-cb" value="${log.id}">
        </td>
        <td style="font-family:monospace; font-size:0.85rem; color:#cbd5e1;">${log.rawId}</td>
        <td>${typeBadge}</td>
        <td style="font-family:monospace;">${log.ipAddress}</td>
        <td>${log.country}</td>
        <td style="color:#a78bfa; font-size:0.85rem;">${log.screenTime}</td>
        <td>
          <button class="btn-action danger" onclick="deleteDeviceLog('${log.id}', '${log.userType}')" title="Delete Device Log">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Failed to load device logs:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-danger);">Failed to load device logs.</td></tr>`;
  }
}

window.loadDeviceLogsAdmin = loadDeviceLogsAdmin;

window.toggleAllDeviceLogs = function(masterCb) {
  document.querySelectorAll(".device-log-cb").forEach(cb => cb.checked = masterCb.checked);
};

window.deleteDeviceLog = async function(logId, userType) {
  const confirmed = window.customConfirm ? await window.customConfirm("Are you sure you want to delete this device log?", { title: "Confirm Deletion", isDanger: true }) : confirm("Delete log?");
  if (!confirmed) return;

  try {
    const collName = userType === 'Anonymous' ? 'guest_quotas' : 'device_login_history';
    await deleteDoc(doc(db, collName, logId));
    if (window.customAlert) await window.customAlert("Device log deleted successfully.", { title: "Deleted" });
    loadDeviceLogsAdmin();
  } catch (err) {
    console.error("Failed to delete log:", err);
    if (window.customAlert) await window.customAlert("Delete error: " + err.message, { title: "Error", isDanger: true });
  }
};

window.deleteSelectedDeviceLogs = async function() {
  const selectedCbs = Array.from(document.querySelectorAll(".device-log-cb:checked"));
  if (selectedCbs.length === 0) {
    if (window.customAlert) await window.customAlert("Please select at least one log to delete.", { title: "Selection Required" });
    return;
  }

  const confirmed = window.customConfirm ? await window.customConfirm(`Delete ${selectedCbs.length} selected device log(s)?`, { title: "Multi-Delete Confirmation", isDanger: true }) : confirm("Delete selected?");
  if (!confirmed) return;

  try {
    for (const cb of selectedCbs) {
      const logId = cb.value;
      const logObj = adminDeviceLogsCache.find(l => l.id === logId);
      const collName = (logObj && logObj.userType === 'Anonymous') ? 'guest_quotas' : 'device_login_history';
      await deleteDoc(doc(db, collName, logId)).catch(e => console.warn(e));
    }
    if (window.customAlert) await window.customAlert("Selected device logs deleted successfully.", { title: "Deleted" });
    loadDeviceLogsAdmin();
  } catch (err) {
    console.error("Batch delete error:", err);
  }
};

// ==========================================
// VIOLATION LOGS TAB & AI PUNISHMENT ENGINE
// ==========================================
let userViolationsCache = [];
let unauthorizedActionsCache = [];

window.switchViolationSubtab = function(tabName) {
  const btnUser = document.getElementById("subtabUserViolationsBtn");
  const btnUnauth = document.getElementById("subtabUnauthorizedActionsBtn");
  const contentUser = document.getElementById("subtabContentUserViolations");
  const contentUnauth = document.getElementById("subtabContentUnauthorizedActions");

  if (tabName === 'user_violations') {
    if (btnUser) btnUser.classList.add("active-subtab");
    if (btnUnauth) btnUnauth.classList.remove("active-subtab");
    if (contentUser) contentUser.style.display = "block";
    if (contentUnauth) contentUnauth.style.display = "none";
  } else {
    if (btnUnauth) btnUnauth.classList.add("active-subtab");
    if (btnUser) btnUser.classList.remove("active-subtab");
    if (contentUnauth) contentUnauth.style.display = "block";
    if (contentUser) contentUser.style.display = "none";
  }
};

async function loadViolationLogsAdmin() {
  const tbodyUser = document.getElementById("userViolationsTableBody");
  const tbodyUnauth = document.getElementById("unauthorizedActionsTableBody");

  if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">Loading user multi-account violations...</td></tr>`;
  if (tbodyUnauth) tbodyUnauth.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">Loading unauthorized action violations...</td></tr>`;

  // 1. Fetch User Violations (multi-account per device)
  try {
    const qUser = query(collection(db, "user_violations"), orderBy("timestamp", "desc"));
    const snapUser = await getDocs(qUser);
    userViolationsCache = [];

    if (snapUser.empty) {
      if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No multi-account violations recorded.</td></tr>`;
    } else {
      if (tbodyUser) tbodyUser.innerHTML = "";
      snapUser.forEach(dSnap => {
        const d = { id: dSnap.id, ...dSnap.data() };
        userViolationsCache.push(d);

        const mapsUrl = d.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.geolocation || d.country || '')}`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="text-align:center;">
            <input type="checkbox" class="user-viol-cb" value="${d.id}">
          </td>
          <td style="font-family:monospace; color:#fca5a5; font-weight:700;">${d.caseId || d.id}</td>
          <td style="font-family:monospace;">
            <a href="${mapsUrl}" target="_blank" style="color:#818cf8; text-decoration:underline;">${d.deviceIp || '127.0.0.1'}</a>
          </td>
          <td>${d.geolocation || 'Unknown'}</td>
          <td>${d.country || 'Unknown'}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn-action" onclick="showUserViolationDetailsModal('${d.id}')" title="View Associated User Accounts" style="background:rgba(99,102,241,0.2); color:#a5b4fc;">
                <i class="ri-information-line"></i>
              </button>
              <button class="btn-action" onclick="suggestViolationPunishmentAI('user_violation', '${d.id}')" title="Generate AI Suspension Suggestion" style="background:rgba(168,85,247,0.2); color:#c084fc;">
                <i class="ri-robot-2-line"></i> AI
              </button>
              <button class="btn-action danger" onclick="deleteUserViolation('${d.id}')" title="Delete Log">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        `;
        tbodyUser.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error loading user violations:", err);
    if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-danger);">Failed to load violations.</td></tr>`;
  }

  // 2. Fetch Unauthorized Action Violations (Train Model unauthorized attempts)
  try {
    const qUnauth = query(collection(db, "authorized_access_violations"), orderBy("timestamp", "desc"));
    const snapUnauth = await getDocs(qUnauth);
    unauthorizedActionsCache = [];

    if (snapUnauth.empty) {
      if (tbodyUnauth) tbodyUnauth.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-muted);">No unauthorized action violations recorded.</td></tr>`;
    } else {
      if (tbodyUnauth) tbodyUnauth.innerHTML = "";
      snapUnauth.forEach(dSnap => {
        const d = { id: dSnap.id, ...dSnap.data() };
        unauthorizedActionsCache.push(d);

        const mapsUrl = d.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.geolocation || d.country || '')}`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="text-align:center;">
            <input type="checkbox" class="unauth-action-cb" value="${d.id}">
          </td>
          <td style="font-family:monospace; color:#fca5a5; font-weight:700;">${d.caseId || d.id}</td>
          <td style="font-family:monospace;">
            <a href="${mapsUrl}" target="_blank" style="color:#818cf8; text-decoration:underline;">${d.deviceIp || '127.0.0.1'}</a>
          </td>
          <td>${d.geolocation || 'Unknown'}</td>
          <td>${d.country || 'Unknown'}</td>
          <td style="font-family:monospace; font-size:0.82rem; color:#cbd5e1;">${d.userId || 'Guest'}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn-action" onclick="suggestViolationPunishmentAI('unauthorized_action', '${d.id}')" title="Generate AI Summary & Penalty" style="background:rgba(168,85,247,0.2); color:#c084fc;">
                <i class="ri-information-line"></i>
              </button>
              <button class="btn-action danger" onclick="deleteUnauthorizedAction('${d.id}')" title="Delete Log">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        `;
        tbodyUnauth.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error loading unauthorized actions:", err);
    if (tbodyUnauth) tbodyUnauth.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-danger);">Failed to load logs.</td></tr>`;
  }
}

window.loadViolationLogsAdmin = loadViolationLogsAdmin;

window.showUserViolationDetailsModal = function(caseDocId) {
  const d = userViolationsCache.find(v => v.id === caseDocId);
  if (!d) return;

  const usersList = d.users || [];
  let userRowsHtml = usersList.map(u => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
      <td style="padding:8px; font-family:monospace; font-size:0.8rem; color:#a5b4fc;">${u.userId || 'N/A'}</td>
      <td style="padding:8px; font-weight:600; color:white;">${u.displayName || 'Contributor'}</td>
      <td style="padding:8px; color:#cbd5e1;">${u.email || ''}</td>
    </tr>
  `).join('');

  let overlay = document.getElementById("violationDetailsModalOverlay");
  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "violationDetailsModalOverlay";
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:1rem;";

  overlay.innerHTML = `
    <div style="background:#0f172a; border:1px solid var(--admin-border); border-radius:18px; padding:2rem; width:100%; max-width:650px; box-shadow:0 20px 50px rgba(0,0,0,0.9); position:relative;">
      <button onclick="document.getElementById('violationDetailsModalOverlay').remove()" style="position:absolute; top:1rem; right:1rem; background:transparent; border:none; color:var(--admin-muted); font-size:1.5rem; cursor:pointer;"><i class="ri-close-line"></i></button>
      <h3 style="color:#ef4444; font-family:'Outfit',sans-serif; margin-top:0; font-size:1.4rem; display:flex; align-items:center; gap:8px;"><i class="ri-alarm-warning-line"></i> Case Details: ${d.caseId}</h3>
      <p style="color:var(--admin-muted); font-size:0.85rem; margin-bottom:1rem;">Associated multi-account user profiles logged in from Device IP <strong>${d.deviceIp}</strong>:</p>
      
      <div style="max-height:300px; overflow-y:auto; margin-bottom:1.5rem; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
          <thead>
            <tr style="background:rgba(255,255,255,0.05); color:var(--admin-muted);">
              <th style="padding:8px;">UID</th>
              <th style="padding:8px;">Name</th>
              <th style="padding:8px;">Email</th>
            </tr>
          </thead>
          <tbody>${userRowsHtml}</tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:flex-end;">
        <button onclick="document.getElementById('violationDetailsModalOverlay').remove()" style="padding:0.6rem 1.4rem; background:linear-gradient(135deg, #6366f1, #8b5cf6); border:none; color:white; font-weight:700; border-radius:8px; cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window.suggestViolationPunishmentAI = async function(type, caseDocId) {
  const d = (type === 'user_violation' ? userViolationsCache : unauthorizedActionsCache).find(v => v.id === caseDocId);
  if (!d) return;

  let overlay = document.getElementById("aiPunishmentModalOverlay");
  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "aiPunishmentModalOverlay";
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:1.5rem;";

  overlay.innerHTML = `
    <div style="background:#0f172a; border:1px solid rgba(168,85,247,0.4); border-radius:20px; padding:2rem; width:100%; max-width:600px; box-shadow:0 20px 50px rgba(0,0,0,0.9); position:relative; color:white;">
      <button onclick="document.getElementById('aiPunishmentModalOverlay').remove()" style="position:absolute; top:1rem; right:1rem; background:transparent; border:none; color:var(--admin-muted); font-size:1.5rem; cursor:pointer;"><i class="ri-close-line"></i></button>
      <h3 style="color:#c084fc; font-family:'Outfit',sans-serif; margin-top:0; font-size:1.3rem; display:flex; align-items:center; gap:8px;"><i class="ri-robot-2-line"></i> AI Violation Assessment & Penalty Suggestion</h3>
      
      <div id="aiPunishmentBody" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem; margin:1rem 0; font-size:0.88rem; line-height:1.6; color:#cbd5e1; max-height:350px; overflow-y:auto;">
        <i class="ri-loader-4-line spin-icon" style="color:#c084fc;"></i> DPGNotes AI Compliance Engine is evaluating security risk and offense history...
      </div>

      <div style="display:flex; justify-content:flex-end;">
        <button onclick="document.getElementById('aiPunishmentModalOverlay').remove()" style="padding:0.6rem 1.4rem; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; font-weight:700; border-radius:8px; cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  try {
    const res = await fetch(window.API_BASE_URL + "/api/ai/violation-punishment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        violationType: type,
        caseId: d.caseId,
        deviceIp: d.deviceIp,
        userCount: d.userCount || 1,
        users: d.users || [],
        userId: d.userId || 'Guest',
        offenseCount: 1
      })
    });
    const data = await res.json();
    const bodyEl = document.getElementById("aiPunishmentBody");
    if (bodyEl) {
      bodyEl.innerHTML = typeof renderMarkdown === 'function' ? renderMarkdown(data.suggestion) : data.suggestion.replace(/\n/g, '<br>');
    }
  } catch (err) {
    const bodyEl = document.getElementById("aiPunishmentBody");
    if (bodyEl) bodyEl.innerHTML = "<p style='color:#ef4444;'>Failed to generate AI suggestion: " + err.message + "</p>";
  }
};

window.deleteUserViolation = async function(docId) {
  const confirmed = window.customConfirm ? await window.customConfirm("Delete this user violation log?", { title: "Delete Log", isDanger: true }) : confirm("Delete this user violation log?");
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "user_violations", docId));
    loadViolationLogsAdmin();
  } catch(e) { alert("Delete failed: " + e.message); }
};

window.deleteUnauthorizedAction = async function(docId) {
  const confirmed = window.customConfirm ? await window.customConfirm("Delete this unauthorized action log?", { title: "Delete Log", isDanger: true }) : confirm("Delete this unauthorized action log?");
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "authorized_access_violations", docId));
    loadViolationLogsAdmin();
  } catch(e) { alert("Delete failed: " + e.message); }
};

window.toggleAllUserViolations = function(masterCb) {
  document.querySelectorAll(".user-viol-cb").forEach(cb => cb.checked = masterCb.checked);
};

window.deleteSelectedUserViolations = async function() {
  const selectedCbs = Array.from(document.querySelectorAll(".user-viol-cb:checked"));
  if (selectedCbs.length === 0) return alert("Select at least one log.");
  const confirmed = window.customConfirm ? await window.customConfirm(`Delete ${selectedCbs.length} selected violation case(s)?`, { title: "Batch Delete", isDanger: true }) : confirm(`Delete ${selectedCbs.length} selected violation case(s)?`);
  if (!confirmed) return;

  try {
    for (const cb of selectedCbs) {
      await deleteDoc(doc(db, "user_violations", cb.value)).catch(console.warn);
    }
    loadViolationLogsAdmin();
  } catch(e) { alert("Batch delete error: " + e.message); }
};

window.toggleAllUnauthorizedActions = function(masterCb) {
  document.querySelectorAll(".unauth-action-cb").forEach(cb => cb.checked = masterCb.checked);
};

window.deleteSelectedUnauthorizedActions = async function() {
  const selectedCbs = Array.from(document.querySelectorAll(".unauth-action-cb:checked"));
  if (selectedCbs.length === 0) return alert("Select at least one log.");
  const confirmed = window.customConfirm ? await window.customConfirm(`Delete ${selectedCbs.length} selected action log(s)?`, { title: "Batch Delete", isDanger: true }) : confirm(`Delete ${selectedCbs.length} selected action log(s)?`);
  if (!confirmed) return;

  try {
    for (const cb of selectedCbs) {
      await deleteDoc(doc(db, "authorized_access_violations", cb.value)).catch(console.warn);
    }
    loadViolationLogsAdmin();
  } catch(e) { alert("Batch delete error: " + e.message); }
};

// ==========================================
// ADMIN ADS MANAGEMENT TAB LOGIC
// ==========================================
let pendingAdsCache = [];
let manageAdsCache = [];

window.switchAdsSubtab = function(tabName) {
  const btnReq = document.getElementById("adsSubtabReqBtn");
  const btnManage = document.getElementById("adsSubtabManageBtn");
  const secReq = document.getElementById("subtabContentAdsRequests");
  const secManage = document.getElementById("subtabContentAdsManage");

  if (!btnReq || !btnManage || !secReq || !secManage) return;

  if (tabName === 'requests') {
    btnReq.style.background = "var(--admin-primary)";
    btnManage.style.background = "rgba(255,255,255,0.1)";
    secReq.style.display = "block";
    secManage.style.display = "none";
  } else {
    btnManage.style.background = "var(--admin-primary)";
    btnReq.style.background = "rgba(255,255,255,0.1)";
    secManage.style.display = "block";
    secReq.style.display = "none";
  }
};

window.loadAdsAdmin = async function() {
  const reqBody = document.getElementById("adsRequestsTableBody");
  const manageBody = document.getElementById("manageAdsTableBody");

  if (reqBody) reqBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);"><i class="ri-loader-4-line spin-icon"></i> Loading pending ad requests...</td></tr>`;
  if (manageBody) manageBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);"><i class="ri-loader-4-line spin-icon"></i> Loading published ads...</td></tr>`;

  try {
    const q = query(collection(db, "user_ads"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    pendingAdsCache = [];
    manageAdsCache = [];

    snap.forEach(dSnap => {
      const ad = { id: dSnap.id, ...dSnap.data() };
      if (ad.status === "Pending Approval") {
        pendingAdsCache.push(ad);
      } else {
        manageAdsCache.push(ad);
      }
    });

    renderAdsRequestsTable();
    renderManageAdsTable();

    // Check for auto-deleting blocked ads (>45 days)
    const now = Date.now();
    for (const ad of manageAdsCache) {
      if (ad.status === "Blocked" && ad.blockedAt) {
        const blockedTime = ad.blockedAt.toMillis ? ad.blockedAt.toMillis() : new Date(ad.blockedAt).getTime();
        const daysDiff = (now - blockedTime) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 45) {
          console.log(`Auto-deleting blocked ad ${ad.id} (blocked for ${Math.floor(daysDiff)} days)`);
          await deleteDoc(doc(db, "user_ads", ad.id)).catch(console.warn);
        }
      }
    }

  } catch(err) {
    console.error("Error loading ads in admin:", err);
    if (reqBody) reqBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error: ${err.message}</td></tr>`;
  }
};

function buildAdPreviewCardHtml(ad) {
  return `
    <div class="admin-ad-preview-card">
      <div class="admin-ad-preview-media" id="adMediaWrap_${ad.id}" style="position:relative; width:100%; height:160px; border-radius:10px; overflow:hidden; margin-bottom:10px; background:#000; cursor:pointer;">
        <img id="adThumb_${ad.id}" src="${ad.thumbnailUrl || 'ANH.png'}" style="width:100%; height:100%; object-fit:cover;">
        ${ad.videoUrl ? `<div id="adPlayBtn_${ad.id}" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:46px; height:46px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem; cursor:pointer; z-index:2;"><i class="ri-play-fill"></i></div>` : ''}
        <div id="adPlayer_${ad.id}" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
      </div>
      <div class="admin-ad-preview-body" style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${ad.userAvatar || 'ANH.png'}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
            <div>
              <div style="font-size:0.8rem; font-weight:700; color:white;">${ad.userName || 'Contributor'}</div>
              <div style="font-size:0.68rem; color:#94a3b8;">${ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleDateString() : 'Published'}</div>
            </div>
          </div>
          <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.62rem; font-weight:800; padding:2px 8px; border-radius:10px; letter-spacing:0.5px;">SPONSORED</span>
        </div>
        <h4 style="font-size:0.92rem; color:white; margin-bottom:4px; font-weight:700; line-height:1.3;">${ad.title || 'Untitled'}</h4>
        <p style="font-size:0.78rem; color:#94a3b8; margin-bottom:10px; line-height:1.4; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${ad.description || ''}</p>
        ${ad.targetLink ? `<a href="${ad.targetLink}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:7px 12px; border-radius:8px; text-decoration:none; font-size:0.8rem; font-weight:700;">Explore Now <i class="ri-external-link-line"></i></a>` : ''}
      </div>
    </div>
  `;
}

function renderAdsRequestsTable() {
  const tbody = document.getElementById("adsRequestsTableBody");
  if (!tbody) return;

  if (pendingAdsCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No pending ad requests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = pendingAdsCache.map(ad => {
    const dt = ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleString() : 'N/A';
    return `
      <tr>
        <td style="font-family:monospace; font-size:0.8rem; color:#a5b4fc;">${ad.userId || 'N/A'}</td>
        <td>${ad.userEmail || 'N/A'}</td>
        <td>${ad.userName || 'Contributor'}</td>
        <td style="font-weight:700; color:white;">${ad.title || 'Untitled'}</td>
        <td style="font-size:0.8rem; color:var(--admin-muted);">${dt}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="admin-btn" style="background:rgba(99,102,241,0.2); color:#a5b4fc; padding:4px 8px; font-size:0.75rem;" title="Preview Ad Card" onclick="toggleAdPreviewRow('${ad.id}')">
              <i class="ri-eye-line"></i> Preview
            </button>
            <button class="admin-btn" style="background:rgba(34,197,94,0.2); color:#4ade80; padding:4px 8px; font-size:0.75rem;" title="Approve Ad" onclick="approveAdAdmin('${ad.id}')">
              <i class="ri-check-line"></i> Approve
            </button>
            <button class="admin-btn" style="background:rgba(239,68,68,0.2); color:#ef4444; padding:4px 8px; font-size:0.75rem;" title="Reject Ad" onclick="rejectAdAdmin('${ad.id}')">
              <i class="ri-close-line"></i> Reject
            </button>
          </div>
        </td>
      </tr>
      <tr id="adPreviewRow_${ad.id}" style="display:none; background:rgba(0,0,0,0.3);">
        <td colspan="6" style="padding:1.2rem;">
          ${buildAdPreviewCardHtml(ad)}
        </td>
      </tr>
    `;
  }).join('');
}

let activeAdminAdPlatformFilter = "ALL";

window.filterAdminAdsByPlatform = function(platform, btn) {
  activeAdminAdPlatformFilter = platform;
  document.querySelectorAll(".ad-platform-filter-btn").forEach(b => {
    b.classList.remove("active");
    b.style.background = "rgba(255,255,255,0.05)";
    b.style.color = "#94a3b8";
    b.style.borderColor = "rgba(255,255,255,0.15)";
  });

  if (btn) {
    btn.classList.add("active");
    btn.style.background = "rgba(59,130,246,0.25)";
    btn.style.color = "#60a5fa";
    btn.style.borderColor = "rgba(59,130,246,0.5)";
  }

  renderPendingAdsTable();
  renderManageAdsTable();
};

function getAdminPlatformBadge(ad) {
  const p = ad.platform || "dpgnotes";
  const cat = ad.adCategory || "resource";
  if (p === "linkedin") {
    return `<span style="background:linear-gradient(135deg,#0a66c2,#004182); color:white; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-linkedin-box-fill"></i> ${cat === 'blog' ? 'LinkedIn Blog' : 'LinkedIn Post'}</span>`;
  }
  if (p === "github") {
    return `<span style="background:linear-gradient(135deg,#1f2937,#111827); border:1px solid rgba(255,255,255,0.2); color:white; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-github-fill"></i> GitHub Repo</span>`;
  }
  if (p === "medium") {
    return `<span style="background:linear-gradient(135deg,#12100e,#2b2927); border:1px solid rgba(255,255,255,0.2); color:white; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-medium-fill"></i> Medium Story</span>`;
  }
  return `<span style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="ri-file-pdf-fill"></i> DPGNotes Resource</span>`;
}

function renderPendingAdsTable() {
  const tbody = document.getElementById("adsRequestsTableBody");
  if (!tbody) return;

  const filtered = activeAdminAdPlatformFilter === "ALL" 
    ? pendingAdsCache 
    : pendingAdsCache.filter(a => (a.platform || "dpgnotes") === activeAdminAdPlatformFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No pending ad requests for ${activeAdminAdPlatformFilter.toUpperCase()}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(ad => {
    const dt = ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleDateString() : 'N/A';
    return `
      <tr>
        <td style="font-family:monospace; font-size:0.8rem; color:#a5b4fc;">${ad.userId || 'N/A'}</td>
        <td style="font-size:0.82rem; color:var(--admin-muted);">${ad.userEmail || 'N/A'}</td>
        <td style="font-weight:600; color:white;">${ad.userName || 'Contributor'}</td>
        <td>
          <div style="font-weight:700; color:white; margin-bottom:2px;">${ad.title || 'Untitled'}</div>
          ${getAdminPlatformBadge(ad)}
        </td>
        <td style="font-size:0.75rem; color:var(--admin-muted);">${dt}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="admin-btn" style="background:rgba(99,102,241,0.2); color:#a5b4fc; padding:4px 8px; font-size:0.75rem;" title="Preview Ad Card" onclick="toggleAdPreviewRow('${ad.id}')">
              <i class="ri-eye-line"></i> Preview
            </button>
            <button class="btn-action success" style="padding:4px 8px; font-size:0.75rem;" onclick="approveAdAdmin('${ad.id}')">
              <i class="ri-check-line"></i> Approve
            </button>
            <button class="btn-action danger" style="padding:4px 8px; font-size:0.75rem;" onclick="rejectAdAdmin('${ad.id}')">
              <i class="ri-close-line"></i> Reject
            </button>
          </div>
        </td>
      </tr>
      <tr id="adPreviewRow_${ad.id}" style="display:none; background:rgba(0,0,0,0.3);">
        <td colspan="6" style="padding:1.2rem;">
          ${buildAdPreviewCardHtml(ad)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderManageAdsTable() {
  const tbody = document.getElementById("manageAdsTableBody");
  if (!tbody) return;

  const filtered = activeAdminAdPlatformFilter === "ALL" 
    ? manageAdsCache 
    : manageAdsCache.filter(a => (a.platform || "dpgnotes") === activeAdminAdPlatformFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--admin-muted);">No active or blocked ads found for ${activeAdminAdPlatformFilter.toUpperCase()}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(ad => {
    const dt = ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleDateString() : 'N/A';
    const isBlocked = ad.status === "Blocked";
    const statusBadge = isBlocked 
      ? `<span style="background:rgba(239,68,68,0.2); color:#ef4444; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">Blocked</span>` 
      : `<span style="background:rgba(34,197,94,0.2); color:#4ade80; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">Approved</span>`;

    return `
      <tr>
        <td style="text-align:center;">
          <input type="checkbox" class="manage-ad-cb" value="${ad.id}">
        </td>
        <td>
          <img src="${ad.userAvatar || 'ANH.png'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
        </td>
        <td style="font-family:monospace; font-size:0.8rem; color:#a5b4fc;">${ad.userId || 'N/A'}</td>
        <td>
          <div style="font-weight:700; color:white; margin-bottom:2px;">${ad.title || 'Untitled'}</div>
          ${getAdminPlatformBadge(ad)}
        </td>
        <td>${statusBadge} <span style="font-size:0.75rem; color:var(--admin-muted); margin-left:6px;">(${dt})</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="admin-btn" style="background:rgba(99,102,241,0.2); color:#a5b4fc; padding:4px 8px; font-size:0.75rem;" title="Preview Ad Card" onclick="toggleAdPreviewRow('${ad.id}')">
              <i class="ri-eye-line"></i>
            </button>
            <button class="admin-btn" style="background:rgba(239,68,68,0.2); color:#ef4444; padding:4px 8px; font-size:0.75rem;" title="Delete Ad" onclick="deleteAdAdmin('${ad.id}')">
              <i class="ri-delete-bin-line"></i> Delete
            </button>
            <button class="admin-btn" style="background:${isBlocked ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}; color:${isBlocked ? '#4ade80' : '#f59e0b'}; padding:4px 8px; font-size:0.75rem;" title="${isBlocked ? 'Unblock Ad' : 'Block Ad'}" onclick="toggleBlockAdAdmin('${ad.id}', ${!isBlocked})">
              <i class="${isBlocked ? 'ri-lock-unlock-line' : 'ri-forbid-line'}"></i> ${isBlocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </td>
      </tr>
      <tr id="adPreviewRow_${ad.id}" style="display:none; background:rgba(0,0,0,0.3);">
        <td colspan="6" style="padding:1.2rem;">
          ${buildAdPreviewCardHtml(ad)}
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleAdPreviewRow = function(adId) {
  const row = document.getElementById(`adPreviewRow_${adId}`);
  if (!row) return;
  const isOpening = row.style.display === "none";
  row.style.display = isOpening ? "table-row" : "none";

  if (isOpening) {
    const ad = [...pendingAdsCache, ...manageAdsCache].find(a => a.id === adId);
    if (ad && ad.videoUrl) {
      const mediaWrap = document.getElementById(`adMediaWrap_${adId}`);
      const playerDiv = document.getElementById(`adPlayer_${adId}`);
      let ytVidId = "";
      const match = ad.videoUrl.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) ytVidId = match[1];

      if (ytVidId && mediaWrap && playerDiv) {
        mediaWrap.onmouseenter = function() {
          playerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytVidId}?autoplay=1&mute=1" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
          playerDiv.style.display = "block";
        };
        mediaWrap.onmouseleave = function() {
          playerDiv.style.display = "none";
          playerDiv.innerHTML = "";
        };
        mediaWrap.onclick = function(e) {
          e.stopPropagation();
          playerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytVidId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
          playerDiv.style.display = "block";
        };
      }
    }
  }
};

window.approveAdAdmin = async function(adId) {
  try {
    await updateDoc(doc(db, "user_ads", adId), {
      status: "Approved",
      publishedAt: serverTimestamp()
    });
    if (window.customAlert) await window.customAlert("Ad campaign approved and published live!", { title: "Success" });
    loadAdsAdmin();
  } catch(e) { alert("Approve failed: " + e.message); }
};

window.rejectAdAdmin = async function(adId) {
  const confirmed = window.customConfirm ? await window.customConfirm("Reject this ad request?", { title: "Reject Ad Request", isDanger: true, confirmText: "Reject Ad" }) : confirm("Reject this ad request?");
  if (!confirmed) return;
  try {
    await updateDoc(doc(db, "user_ads", adId), {
      status: "Rejected",
      rejectedAt: serverTimestamp()
    });
    loadAdsAdmin();
  } catch(e) { alert("Reject failed: " + e.message); }
};

window.deleteAdAdmin = async function(adId) {
  const confirmed = window.customConfirm ? await window.customConfirm("Delete this ad permanently? This action cannot be undone.", { title: "Delete Ad Permanently", isDanger: true, confirmText: "Delete Ad" }) : confirm("Delete this ad permanently?");
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "user_ads", adId));
    loadAdsAdmin();
  } catch(e) { alert("Delete failed: " + e.message); }
};

window.toggleBlockAdAdmin = async function(adId, shouldBlock) {
  const msg = shouldBlock ? "Block this ad? (Blocked ads auto-delete after 45 days)" : "Unblock this ad?";
  const confirmed = window.customConfirm ? await window.customConfirm(msg, { title: shouldBlock ? "Block Ad" : "Unblock Ad", isDanger: shouldBlock }) : confirm(msg);
  if (!confirmed) return;

  try {
    await updateDoc(doc(db, "user_ads", adId), {
      status: shouldBlock ? "Blocked" : "Approved",
      blockedAt: shouldBlock ? serverTimestamp() : null
    });
    loadAdsAdmin();
  } catch(e) { alert("Action failed: " + e.message); }
};

window.toggleAllManageAds = function(masterCb) {
  document.querySelectorAll(".manage-ad-cb").forEach(cb => cb.checked = masterCb.checked);
};

window.deleteSelectedAdsGroup = async function() {
  const selectedCbs = Array.from(document.querySelectorAll(".manage-ad-cb:checked"));
  if (selectedCbs.length === 0) return alert("Select at least one ad to delete.");
  const confirmed = window.customConfirm ? await window.customConfirm(`Delete ${selectedCbs.length} selected ad(s)?`, { title: "Batch Delete Ads", isDanger: true, confirmText: "Delete Selected" }) : confirm(`Delete ${selectedCbs.length} selected ad(s)?`);
  if (!confirmed) return;

  try {
    for (const cb of selectedCbs) {
      await deleteDoc(doc(db, "user_ads", cb.value)).catch(console.warn);
    }
    loadAdsAdmin();
  } catch(e) { alert("Batch delete error: " + e.message); }
};

window.blockSelectedAdsGroup = async function() {
  const selectedCbs = Array.from(document.querySelectorAll(".manage-ad-cb:checked"));
  if (selectedCbs.length === 0) return alert("Select at least one ad to block.");
  const confirmed = window.customConfirm ? await window.customConfirm(`Block ${selectedCbs.length} selected ad(s)? Blocked ads auto-delete after 45 days.`, { title: "Batch Block Ads", isDanger: true, confirmText: "Block Selected" }) : confirm(`Block ${selectedCbs.length} selected ad(s)?`);
  if (!confirmed) return;

  try {
    for (const cb of selectedCbs) {
      await updateDoc(doc(db, "user_ads", cb.value), {
        status: "Blocked",
        blockedAt: serverTimestamp()
      }).catch(console.warn);
    }
    loadAdsAdmin();
  } catch(e) { alert("Batch block error: " + e.message); }
};

// =========================================
// ADS ANALYTICS & CTR GRAPHICAL ENGINE
// =========================================
let adAnalyticsChartInstance = null;

export async function loadAdsAnalyticsAdmin() {
  const filterSelect = document.getElementById("adAnalyticsFilterSelect");
  const selectedAdId = filterSelect ? filterSelect.value : "ALL";

  try {
    const res = await fetch(`${window.API_BASE_URL}/api/admin/ads-analytics?adId=${encodeURIComponent(selectedAdId)}`);
    const data = await res.json();

    if (!data || !data.success) {
      console.warn("Analytics fetch failed:", data?.error);
      return;
    }

    if (filterSelect && filterSelect.options.length <= 1 && data.rawAds) {
      filterSelect.innerHTML = `<option value="ALL">All Approved Ad Campaigns</option>`;
      data.rawAds.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.title || 'Ad'} (${a.id})`;
        if (a.id === selectedAdId) opt.selected = true;
        filterSelect.appendChild(opt);
      });
    }

    document.getElementById("statAdAppearances").textContent = (data.totalImpressions || 0).toLocaleString();
    document.getElementById("statAdClicks").textContent = (data.totalClicks || 0).toLocaleString();
    document.getElementById("statAdCTR").textContent = `${data.averageCtr || 0.00}%`;
    document.getElementById("statAdScreentime").textContent = `${data.totalScreentime || 0}s`;

    const ctx = document.getElementById("adAnalyticsChart")?.getContext("2d");
    if (ctx && typeof Chart !== "undefined") {
      if (adAnalyticsChartInstance) {
        adAnalyticsChartInstance.destroy();
      }

      adAnalyticsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels || [],
          datasets: [
            {
              label: 'CTR % (Green Line with Dots)',
              data: data.ctr || [],
              borderColor: '#10b981',
              backgroundColor: '#10b981',
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 10,
              borderWidth: 2.5,
              tension: 0.3,
              yAxisID: 'yCTR'
            },
            {
              label: 'Ads Appear / Impressions (Yellow Line with Dots)',
              data: data.impressions || [],
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 10,
              borderWidth: 2.5,
              tension: 0.3,
              yAxisID: 'yCount'
            },
            {
              label: 'Link Clicks (Red Line with Dots)',
              data: data.clicks || [],
              borderColor: '#ef4444',
              backgroundColor: '#ef4444',
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 7,
              pointHoverRadius: 11,
              borderWidth: 2,
              showLine: true,
              yAxisID: 'yCount'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'nearest',
            intersect: true
          },
          plugins: {
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#e2e8f0',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                title: function(items) {
                  return items && items.length > 0 ? items[0].label : '';
                },
                label: function(context) {
                  const label = context.dataset.label || '';
                  const val = context.parsed.y;
                  if (label.includes('CTR')) return `🟩 ${label}: ${val}%`;
                  if (label.includes('Appear')) return `🟨 ${label}: ${val}`;
                  return `🟥 ${label}: ${val}`;
                },
                afterBody: function(context) {
                  const dataIndex = context[0].dataIndex;
                  const meta = data.clickMetadata ? data.clickMetadata[dataIndex] : [];
                  if (meta && meta.length > 0) {
                    return meta.map(m => `• User: ${m.visitorEmail || m.visitorUid || 'guest@dpgnotes.app'} (${m.screentimeSeconds || 0}s)`).join('\n');
                  }
                  return '• No recorded visitor clicks on this date';
                }
              }
            }
          },
          onClick: (evt, activeElements) => {
            if (activeElements && activeElements.length > 0) {
              const datasetIdx = activeElements[0].datasetIndex;
              const index = activeElements[0].index;
              const meta = data.clickMetadata ? data.clickMetadata[index] : [];
              const rawAds = data.rawAds || [];

              if (datasetIdx === 0) {
                // Green Line - Advertiser Profile
                const ad = rawAds[0] || {};
                const uid = ad.userId || ad.uid || ad.userUid || "";
                if (uid) {
                  window.open(`profile.html?uid=${encodeURIComponent(uid)}`, '_blank');
                } else {
                  window.open('profile.html', '_blank');
                }
              } else if (datasetIdx === 1) {
                // Yellow Line - Ad Target Link
                const ad = rawAds[0] || {};
                const targetLink = ad.targetLink || "index.html";
                const trackId = ad.trackId || (ad.id ? generateAdTrackId(ad.id) : "74920184");
                const sep = targetLink.includes("?") ? "&" : "?";
                window.open(`${targetLink}${sep}track_id=${trackId}`, '_blank');
              } else if (datasetIdx === 2) {
                // Red Line - Visitor Profile or Ad Link
                if (meta && meta.length > 0) {
                  const clickedUser = meta[0];
                  const uid = clickedUser.visitorUid || clickedUser.userUid;
                  if (uid && uid !== 'guest_anon' && !uid.startsWith('visitor_')) {
                    window.open(`profile.html?uid=${encodeURIComponent(uid)}`, '_blank');
                  } else if (clickedUser.pageUrl) {
                    window.open(clickedUser.pageUrl, '_blank');
                  } else {
                    alert(`Visitor Telemetry: ${clickedUser.visitorEmail || 'guest@dpgnotes.app'}\nTrack ID: ${clickedUser.trackId || 'N/A'}\nScreentime: ${clickedUser.screentimeSeconds || 0}s`);
                  }
                }
              }
            }
          },
          scales: {
            yCount: {
              type: 'linear',
              position: 'left',
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            },
            yCTR: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#10b981', callback: (v) => v + '%' }
            },
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }

    const tbody = document.getElementById("adAnalyticsTableBody");
    if (tbody) {
      const rawTrackings = data.rawTrackings || [];
      if (rawTrackings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--admin-text-muted);">No ad click telemetry logged yet. Click an ad to generate track_id data!</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      rawTrackings.forEach(t => {
        const tr = document.createElement("tr");
        const uid = t.visitorUid || "";
        const hasProfile = uid && uid !== "guest_anon" && !uid.startsWith("visitor_");

        tr.innerHTML = `
          <td style="padding:0.75rem; font-family:monospace; color:#a5b4fc; font-weight:700;">${t.trackId || 'N/A'}</td>
          <td style="padding:0.75rem; color:white;">${t.adId || 'Global Banner'}</td>
          <td style="padding:0.75rem;">
            <div style="font-weight:600; color:white;">${t.visitorEmail || 'Anonymous Guest'}</div>
            <div style="font-size:0.75rem; color:var(--admin-text-muted); font-family:monospace;">UID: ${uid || 'guest_anon'}</div>
          </td>
          <td style="padding:0.75rem;">
            <a href="${t.pageUrl || '#'}" target="_blank" style="color:#38bdf8; text-decoration:none; font-weight:600;">${t.pageTitle || 'Viewed Resource'} <i class="ri-external-link-line"></i></a>
          </td>
          <td style="padding:0.75rem; font-weight:700; color:#f59e0b;">${t.screentimeSeconds || 0}s</td>
          <td style="padding:0.75rem;">
            ${hasProfile ? `<a href="profile.html?uid=${encodeURIComponent(uid)}" target="_blank" class="btn-action success" style="text-decoration:none; padding:4px 8px; font-size:0.75rem;"><i class="ri-user-search-line"></i> View Profile</a>` : `<span style="font-size:0.75rem; color:var(--admin-text-muted);">Guest Visitor</span>`}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

  } catch(err) {
    console.error("loadAdsAnalyticsAdmin error:", err);
  }
}

window.loadAdsAnalyticsAdmin = loadAdsAnalyticsAdmin;
