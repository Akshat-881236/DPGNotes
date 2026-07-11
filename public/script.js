// =========================================
// DPGNotes
// Production SPA Script
// =========================================

/* =========================================
   FIREBASE
========================================= */

import { initializeApp, getApps, getApp }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {

  getAuth,

  GoogleAuthProvider,

  signInWithPopup,

  signOut,

  onAuthStateChanged

}
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

// =========================================
// THEME ENGINE (Global Load)
// =========================================
const savedTheme = localStorage.getItem("dpgTheme");
if (savedTheme && savedTheme !== "default") {
  document.body.classList.add(`theme-${savedTheme}`);
}

import {

  getFirestore,

  collection,

  addDoc,

  getDocs,

  query,

  orderBy,

  limit,

  serverTimestamp,

  getDoc,

  doc

}
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

/* =========================================
   CONFIG
========================================= */

const firebaseConfig = {

  apiKey:
  "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",

  authDomain:
  "dpgnotes.firebaseapp.com",

  projectId:
  "dpgnotes",

  storageBucket:
  "dpgnotes.firebasestorage.app",

  messagingSenderId:
  "910494426039",

  appId:
  "1:910494426039:web:adeae5315caaf846c43e32"
};

/* =========================================
   INIT
========================================= */

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth =
  getAuth(app);

const db =
  getFirestore(app);

const PDF_VIEWER =
"https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=";

/* =========================================
   PROVIDERS
========================================= */

const googleProvider =
  new GoogleAuthProvider();

/* =========================================
   DOM
========================================= */

const pages =
  document.querySelectorAll(".spa-page");

const navButtons =
  document.querySelectorAll(
    ".bottom-nav button"
  );

const categoryButtons =
  document.querySelectorAll(
    ".category-strip button"
  );

const uploadForm =
  document.getElementById(
    "uploadForm"
  );
const googleLogin =
  document.getElementById(
    "googleLogin"
  );

let selectedCategory = "";

const globalSearch =
  document.getElementById(
    "globalSearch"
  );

const latestResources =
  document.getElementById(
    "latestResources"
  );

const examResources =
  document.getElementById(
    "examResources"
  );

const learningResources =
  document.getElementById(
    "learningResources"
  );

const placementResources =
  document.getElementById(
    "placementResources"
  );

/* =========================================
   STATE
========================================= */

let currentUser = null;

let allDocuments = [];
let usersCache = {};

/* =========================================
   ACTIVITY LOGGING
========================================= */
async function logActivity(action, details = "") {
  try {
    if (!currentUser) return;
    await addDoc(collection(db, "activity_logs"), {
      userId: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      action: action,
      details: details,
      timestamp: serverTimestamp()
    });
  } catch(e) { console.error("Log failed", e); }
}

window.usersCache = usersCache;
window.logActivity = logActivity;

/* =========================================
   URL PARAM ENGINE
========================================= */

const urlParams =
new URLSearchParams(
  window.location.search
);

/* -----------------------------------------
   SAFE PARAM
----------------------------------------- */

function getParam(key){

  try{

    return urlParams.get(key);

  }catch(error){

    console.log(
      "Param Error:",
      error
    );

    return null;
  }
}

/* -----------------------------------------
   PARAMS
----------------------------------------- */

const urlTab =
getParam("tab");

const urlCategory =
getParam("category");

const urlSearch =
getParam("search");

const urlPdf =
getParam("pdf");

const urlRef =
getParam("ref");

const urlUploader =
getParam("uploader");

const urlView = getParam("view");

/* -----------------------------------------
   AUTO-VIEW SHARED PDF
----------------------------------------- */
if (urlView) {
  (async () => {
    try {
      const docSnap = await getDoc(doc(db, "documents", urlView));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const viewerUrl = `https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(data.documentId)}&description=${encodeURIComponent(data.description)}&tags=${encodeURIComponent(Array.isArray(data.tags) ? data.tags.join(", ") : "")}`;
        
        // Redirect to viewer
        window.location.replace(viewerUrl);
      } else {
        alert("This shared document is no longer available.");
        // Remove param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch(err) {
      console.error("Failed to load shared document:", err);
    }
  })();
}

/* -----------------------------------------
   OPTIONAL DEBUG
----------------------------------------- */

try{

  if(urlRef){

    console.log(
      "Project Ref:",
      urlRef
    );
  }

  if(urlUploader){

    console.log(
      "Uploader:",
      urlUploader
    );
  }

}catch(error){

  console.log(
    "URL Debug Error:",
    error
  );
}

/* =========================================
   AUTH
========================================= */

/* =========================================
   AUTH SYSTEM
========================================= */

let authMode = "login";

/* GOOGLE */

if (googleLogin) {
  googleLogin.addEventListener(
    "click",
  async () => {

    try {

      // LOGOUT

      if(currentUser){

        await signOut(auth);

        return;
      }

      // LOGIN
      await signInWithPopup(
        auth,
        googleProvider
      );
      
      // Activity logged in onAuthStateChanged

    } catch(error){

      console.log(error);
    }
  });
}

/* GITHUB LOGIN REMOVED */

/* AUTH STATE */

onAuthStateChanged(
  auth,
  async (user)=>{
    if(user){
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.isBlocked) {
            if (userData.suspendedUntil && userData.suspendedUntil <= Date.now()) {
              // Suspension expired! Auto-unblock.
              await updateDoc(userRef, { isBlocked: false, suspendedUntil: null });
            } else {
              const msg = (userData.suspendedUntil && userData.suspendedUntil > Date.now()) 
                ? `Your account is suspended for ${Math.ceil((userData.suspendedUntil - Date.now()) / 86400000)} more days.`
                : "Your account has been permanently blocked by the Administrator.";
              alert(msg + " Please contact support.");
              await signOut(auth);
              return;
            }
          }
        }
      } catch (e) { console.error(e); }

      const isNewLogin = !currentUser;
      currentUser = user;
      if (googleLogin) googleLogin.innerHTML = "Logout";
      
      if (isNewLogin) logActivity("LOGIN", "Logged into DPGNotes");
      
      const isDashboard = window.location.pathname.endsWith("dashboard.html");
      const isAdmin = window.location.pathname.endsWith("admin.html");
      if (!isDashboard && !isAdmin) {
        window.location.href = "dashboard.html" + window.location.search;
      }
    }else{
      if (currentUser) logActivity("LOGOUT", "User logged out");
      currentUser = null;
      if (googleLogin) googleLogin.innerHTML = "Google";
      
      const isDashboard = window.location.pathname.endsWith("dashboard.html");
      if (isDashboard) {
        window.location.href = "index.html";
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const shareToken = urlParams.get('share');
        if (shareToken) {
          document.body.innerHTML = "<h2 style='text-align:center; margin-top:20vh; color:var(--primary); font-family:var(--font-heading);'>Opening Shared Document...</h2>";
          (async () => {
            try {
              const res = await fetch(`${window.API_BASE_URL}/api/share/click?token=${shareToken}`);
              const data = await res.json();
              if (res.ok && data.documentData) {
                const d = data.documentData;
                const viewerUrl = `https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=${encodeURIComponent(d.pdfUrl)}&title=${encodeURIComponent(d.title)}&category=${encodeURIComponent(d.category)}&discipline=${encodeURIComponent(d.discipline)}&uploader=${encodeURIComponent(d.uploader)}&docid=${encodeURIComponent(d.docId)}&description=${encodeURIComponent(d.description)}&tags=${encodeURIComponent(Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''))}`;
                window.location.href = viewerUrl;
              } else {
                alert("Share link expired or invalid.");
                window.location.href = "index.html";
              }
            } catch (e) {
              alert("Network error.");
              window.location.href = "index.html";
            }
          })();
        }
      }
    }
  }
);

/* =========================================
   SPA NAVIGATION
========================================= */

function openPage(pageId){

  pages.forEach((page)=>{

    page.classList.remove(
      "active"
    );
  });

  document
    .getElementById(pageId)
    .classList.add("active");

  window.scrollTo({

    top:0,

    behavior:"smooth"
  });

  navButtons.forEach((button)=>{

    button.classList.remove(
      "active-nav"
    );

    if(

      button.dataset.page
      ===
      pageId

    ){

      button.classList.add(
        "active-nav"
      );
    }
  });
}

/* =========================================
   NAV BUTTONS
========================================= */

navButtons.forEach((button)=>{

  button.addEventListener(
    "click",
    ()=>{

      openPage(
        button.dataset.page
      );
    }
  );
});

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener(
  "keydown",
  (e)=>{

    // ALT + 1

    if(

      e.altKey &&
      e.key === "1"

    ){

      openPage(
        "resourcesPage"
      );
    }

    // ALT + 2

    if(

      e.altKey &&
      e.key === "2"

    ){

      openPage(
        "examsPage"
      );
    }

    // ALT + 3

    if(

      e.altKey &&
      e.key === "3"

    ){

      openPage(
        "learningPage"
      );
    }

    // ALT + 4

    if(

      e.altKey &&
      e.key === "4"

    ){

      openPage(
        "placementPage"
      );
    }

    // ALT + 5

    if(

      e.altKey &&
      e.key === "5"

    ){

      openPage(
        "contributionPage"
      );
    }

    // CTRL + K

    if(

      e.ctrlKey &&
      e.key.toLowerCase() === "k"

    ){

      e.preventDefault();

      globalSearch.focus();
    }
  }
);

/* =========================================
   RESOURCE CARD
========================================= */

function createCard(data){

  return `

  <article class="resource-card">

    <div class="card-top">

      <span class="category">
        ${data.category}
      </span>

      <span class="discipline">
        ${data.discipline}
      </span>

    </div>

    <h3>
      ${data.title}
    </h3>
    
    <div class="card-author">
      ${window.usersCache && window.usersCache[data.userId] && window.usersCache[data.userId].profilePic 
        ? `<img src="${window.usersCache[data.userId].profilePic}" class="author-avatar" alt="Avatar">` 
        : (window.usersCache && window.usersCache[data.userId] && window.usersCache[data.userId].photoURL ? `<img src="${window.usersCache[data.userId].photoURL}" class="author-avatar" alt="Avatar">` : `<div class="author-avatar-fallback">${(data.userName || "C").charAt(0).toUpperCase()}</div>`)
      }
      <span class="author-name">By ${data.userName || "Contributor"}</span>
      <div class="author-socials">
        ${window.usersCache && window.usersCache[data.userId] && window.usersCache[data.userId].linkedin ? `<a href="${window.usersCache[data.userId].linkedin}" target="_blank" title="LinkedIn">🔗</a>` : ""}
        ${window.usersCache && window.usersCache[data.userId] && window.usersCache[data.userId].github ? `<a href="${window.usersCache[data.userId].github}" target="_blank" title="GitHub">🐙</a>` : ""}
      </div>
    </div>

    <p class="card-desc">
      ${data.description}
    </p>

    <div class="tags">

      ${data.tags.map(tag => `

        <span>
          #${tag.trim()}
        </span>

      `).join("")}

    </div>

    <div class="card-stats">
      <span title="Total Likes">🤍 ${data.likes ? data.likes.length : 0}</span>
      <span title="Total Shares Generated">🔗 ${data.shareCount || 0}</span>
      <span title="Link Clicks (CTR)">👀 ${data.ctrCount || 0}</span>
    </div>

    <a href="https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(data.documentId)}&description=${encodeURIComponent(
    Array.isArray(data.tags) ? data.tags.join(", ") : ""
    )}" target="_blank" class="open-btn" onclick="if(window.logActivity) window.logActivity('VIEW', 'Viewed document: ${data.title}')">Open PDF</a>
  
    <div class="card-actions">
      <button class="action-btn like-action" onclick="alert('Please login via Dashboard to like this resource.')">🤍 Like</button>
      <button class="action-btn share-action" onclick="handleShare('${data.id}', '${data.title}', '${data.category}', '${data.discipline}', '${data.userName}', '${data.pdfUrl}', '${data.description}', '${Array.isArray(data.tags) ? data.tags.join(", ") : ""}')">🔗 Share</button>
    </div>
  </article>

  `;
}

// Global Share Handler for Token Engine
window.handleShare = async function(docId, title, category, discipline, uploader, pdfUrl, description, tags) {
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
        uploaderUid: (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : ""
      })
    });
    const data = await res.json();
    if (res.ok) {
      const shareUrl = data.shareUrl;
      if (navigator.share) {
        await navigator.share({ title: `Check out ${title} on DPGNotes`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Smart Link copied to clipboard!");
      }
      btn.innerText = "✅ Shared";
    } else {
      throw new Error();
    }
  } catch (e) {
    alert("Failed to generate share link.");
    btn.innerText = originalText;
  }
  setTimeout(() => btn.innerText = originalText, 3000);
}

/* =========================================
   RENDER
========================================= */

function renderResources(data){

  latestResources.innerHTML = "";

  examResources.innerHTML = "";

  learningResources.innerHTML = "";

  placementResources.innerHTML = "";

  data.forEach((doc)=>{

    const card =
    createCard(doc);

    // HOME

    latestResources.innerHTML +=
    card;

    // EXAMS

    if(

      doc.category === "SE"

      ||

      doc.category === "SP"

      ||

      doc.category === "UE"

      ||

      doc.category === "EV"

    ){

      examResources.innerHTML +=
      card;
    }

    // LEARNING

    if(

      doc.category === "T&N"

    ){

      learningResources.innerHTML +=
      card;
    }

    // PLACEMENT

    if(

      doc.category === "IQ"

      ||

      doc.category === "A&LR"

      ||

      doc.category === "PQ"

    ){

      placementResources.innerHTML +=
      card;
    }
  });
}

/* =========================================
   FETCH FIRESTORE
========================================= */

async function fetchDocuments(){
  try{
    // PRELOAD USERS CACHE
    const uSnap = await getDocs(collection(db, "users"));
    uSnap.forEach(uDoc => {
      usersCache[uDoc.id] = uDoc.data();
    });

    const q = query(

      collection(
        db,
        "documents"
      ),

      orderBy(
        "createdAt",
        "desc"
      ),

      limit(50)
    );

    const snapshot =
    await getDocs(q);

    allDocuments = [];

    snapshot.forEach((doc)=>{

      allDocuments.push({

        id:doc.id,

        ...doc.data()
      });
    });

    applyURLFilters();
    renderLeaderboard();

  }catch(error){

    console.log(error);
  }
}

async function renderLeaderboard() {
  const list = document.getElementById("indexLeaderboardList");
  if (!list) return;
  
  const userStats = {};
  allDocuments.forEach(doc => {
    const uid = doc.userId;
    if (!uid) return;
    if (!userStats[uid]) {
      userStats[uid] = { name: doc.userName || "Unknown", likes: 0, uploads: 0 };
    }
    userStats[uid].uploads++;
    if (doc.likes) userStats[uid].likes += doc.likes.length;
  });
  
  const sortedUsers = Object.entries(userStats)
    .map(([uid, stats]) => ({ uid, ...stats }))
    .sort((a, b) => b.likes - a.likes || b.uploads - a.uploads)
    .slice(0, 3);
    
  if (sortedUsers.length === 0) {
    list.innerHTML = `<li style="color:var(--text-muted); text-align:center;">No contributors yet.</li>`;
    return;
  }
  
  list.innerHTML = "";
  for (let i = 0; i < sortedUsers.length; i++) {
    const user = sortedUsers[i];
    const badges = ["🥇", "🥈", "🥉"];
    
    // Fetch profile photo from users collection
    let photoHtml = `<div style="width:40px; height:40px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center;">👤</div>`;
    try {
      // NOTE: getDoc is not imported by default in script.js, we need to make sure we have access to it or skip photo.
      // Since script.js doesn't import getDoc from firestore, I'll fallback to initial if we can't get it.
      // I'll add the getDoc import to script.js shortly.
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");
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
    list.appendChild(li);
  }
}

/* =========================================
   URL FILTERS
========================================= */

function applyURLFilters(){
  try{
    if(urlCategory){
      selectedCategory = urlCategory;
    }
    
    if(urlSearch){
      globalSearch.value = urlSearch;
    }
    
    if (typeof window.applyIndexFilters === 'function') {
      window.applyIndexFilters();
    }
  }catch(error){

    console.log(
      "URL Filter Error:",
      error
    );

    renderResources(
      sortDocuments(allDocuments)
    );
  }
}

function sortDocuments(docsArray) {
  const sortVal = document.getElementById("globalSort") ? document.getElementById("globalSort").value : "newest";
  
  return [...docsArray].sort((a, b) => {
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
}

/* =========================================
   SEARCH
========================================= */

if (globalSearch) {
  document.addEventListener("DOMContentLoaded", async ()=>{
    // Normal initialization
    initFirebase();
  loadAllUsers();
  loadDocuments();
  setupFilters();

  if(addDocBtn) addDocBtn.addEventListener("click", openModal);
  if(closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  
  window.applyIndexFilters = function() {
    const searchValue = globalSearch ? globalSearch.value.toLowerCase().trim() : "";
    let filtered = [...allDocuments];
    
    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }
    
    if (searchValue) {
      filtered = filtered.filter(doc => 
        (doc.title || "").toLowerCase().includes(searchValue) ||
        (doc.description || "").toLowerCase().includes(searchValue) ||
        (doc.discipline || "").toLowerCase().includes(searchValue) ||
        (Array.isArray(doc.tags) ? doc.tags.join(" ") : (doc.tags || "")).toLowerCase().includes(searchValue)
      );
    }
    
    renderResources(sortDocuments(filtered));
  };

  const globalSortSelect = document.getElementById("globalSort");
  if (globalSortSelect) {
    globalSortSelect.addEventListener("change", () => {
      window.applyIndexFilters();
    });
  }
  
  if (globalSearch) {
    globalSearch.addEventListener("input", () => {
      window.applyIndexFilters();
    });
  }
});
}

/* =========================================
   CATEGORY FILTER
========================================= */

categoryButtons.forEach((button)=>{

  button.addEventListener(
    "click",
    ()=>{

      selectedCategory = button.dataset.category;
      window.applyIndexFilters();
      openPage("resourcesPage");
    }
  );
});

/* =========================================
   UPLOAD
========================================= */

// Upload logic moved to dashboard.js

/* =========================================
   INIT
========================================= */

fetchDocuments();

/* -----------------------------------------
   SAFE TAB OPEN
----------------------------------------- */

try{

  const validTabs = [

    "resourcesPage",

    "examsPage",

    "learningPage",

    "placementPage",

    "leaderboardPage"
  ];

  if(

    urlTab
    &&
    validTabs.includes(urlTab)

  ){

    openPage(urlTab);

  }else{

    openPage(
      "resourcesPage"
    );
  }

}catch(error){

  console.log(
    "Tab Error:",
    error
  );

  openPage(
    "resourcesPage"
  );
}

/* -----------------------------------------
   DIRECT PDF
----------------------------------------- */

try{

  if(urlPdf){

    window.open(

      `${PDF_VIEWER}${encodeURIComponent(urlPdf)}`,

      "_blank"
    );
  }

}catch(error){

  console.log(
    "PDF Error:",
    error
  );
}

/* =========================================
   DPG SIMPLE DIAGNOSIS
========================================= */

(function(){

  const params =

  new URLSearchParams(
    window.location.search
  );

  const source =

  params.get(
    "utm_source"
  );

  const medium =

  params.get(
    "utm_medium"
  );

  const campaign =

  params.get(
    "utm_campaign"
  );

  const error =

  params.get(
    "error"
  );

  /* ONLY PDF VIEWER */

  if(source !== "pdfviewer"){

    return;
  }

  console.log({

    source,
    medium,
    campaign,
    error,

    timestamp:
    new Date().toISOString()
  });

  /* CARD */

  const card =

  document.createElement(
    "div"
  );

  card.style = `

    position:fixed;

    left:1rem;
    right:1rem;
    bottom:1rem;

    z-index:999999;

    max-width:560px;

    margin:auto;

    background:
    linear-gradient(
      135deg,
      #0f172a,
      #111827
    );

    color:white;

    border:
    1px solid #1e293b;

    border-radius:24px;

    box-shadow:
    0 20px 50px rgba(0,0,0,.45);

    overflow:hidden;

    font-family:
    Arial,sans-serif;
  `;

  card.innerHTML = `

    <div
      style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:1rem;
      border-bottom:
      1px solid #1e293b;
      "
    >

      <strong
        style="
        color:#60a5fa;
        font-size:1rem;
        "
      >

        DPGNotes Diagnosis

      </strong>

      <button
        id="dpgClose"

        style="
        width:40px;
        height:40px;
        border:none;
        border-radius:12px;
        background:#1e293b;
        color:white;
        cursor:pointer;
        font-size:1rem;
        "
      >

        ✕

      </button>

    </div>

    <div
      style="
      padding:1rem;
      "
    >

      <h2
        style="
        margin-bottom:.7rem;
        "
      >

        PDF Resource Failed

      </h2>

      <p
        style="
        color:#cbd5e1;
        line-height:1.7;
        margin-bottom:1rem;
        "
      >

        DPGNotes detected that the
        PDF Viewer redirected here
        because the requested
        PDF could not be loaded.

      </p>

      <div
        style="
        display:grid;
        gap:.6rem;
        "
      >

        <div
          style="
          background:#0f172a;
          border:1px solid #1e293b;
          padding:.75rem;
          border-radius:14px;
          "
        >

          <strong>
            Source:
          </strong>

          ${source || "N/A"}

        </div>

        <div
          style="
          background:#0f172a;
          border:1px solid #1e293b;
          padding:.75rem;
          border-radius:14px;
          "
        >

          <strong>
            Medium:
          </strong>

          ${medium || "N/A"}

        </div>

        <div
          style="
          background:#0f172a;
          border:1px solid #1e293b;
          padding:.75rem;
          border-radius:14px;
          "
        >

          <strong>
            Campaign:
          </strong>

          ${campaign || "N/A"}

        </div>

        <div
          style="
          background:#0f172a;
          border:1px solid #1e293b;
          padding:.75rem;
          border-radius:14px;
          "
        >

          <strong>
            Error:
          </strong>

          ${error || "Unknown"}

        </div>

      </div>

      <button
        id="dpgLearn"

        style="
        margin-top:1rem;
        width:100%;
        border:none;
        padding:1rem;
        border-radius:16px;
        background:#2563eb;
        color:white;
        font-weight:700;
        cursor:pointer;
        "
      >

        Learn More

      </button>

    </div>

  `;

  document.body.appendChild(
    card
  );

  /* CLOSE */

  document.getElementById(
    "dpgClose"
  ).onclick = ()=>{

    card.remove();
  };

  /* LEARN */

  document.getElementById(
    "dpgLearn"
  ).onclick = ()=>{

    alert(

`DPGNotes PDF Diagnosis

Possible Reasons:

• Missing PDF URL
• Invalid Redirect
• Firebase Hosting Restriction
• CORS Issue
• Deleted PDF Resource

Referral Details:

Source:
${source}

Medium:
${medium}

Campaign:
${campaign}

Error:
${error}

Timestamp:
${new Date().toISOString()}`
    );
  };

  // Live Search & Filtering
  const gSearch = document.getElementById("globalSearch");
  if (gSearch) {
    gSearch.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allDocuments.filter(doc => 
        (doc.title && doc.title.toLowerCase().includes(query)) ||
        (doc.description && doc.description.toLowerCase().includes(query)) ||
        (doc.discipline && doc.discipline.toLowerCase().includes(query)) ||
        (doc.tags && doc.tags.some(t => t.toLowerCase().includes(query)))
      );
      renderResources(filtered);
    });
  }

})();