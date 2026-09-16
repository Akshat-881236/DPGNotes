// ============================================================================
// DPGNotes - Modern Academic & Examination Hub
// Homepage Client Script (v3.0.0)
// ============================================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Firebase Configuration
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

window.dpgDb = db;
window.dpgAuth = auth;

const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';

// 8 Academic Classifications Definition (Image 3 Reference)
const ACADEMIC_CATEGORIES = [
  {
    key: "SE",
    fullName: "Sessional Exam",
    shortCode: "SE",
    icon: "ri-file-list-3-line",
    accent: "#6366f1",
    desc: "Internal assessment test papers, unit tests, and midterm exam resources."
  },
  {
    key: "SP",
    fullName: "Sample Paper",
    shortCode: "SP",
    icon: "ri-draft-line",
    accent: "#0ea5e9",
    desc: "Model question papers, practice test series, and simulated exam files."
  },
  {
    key: "UE",
    fullName: "University Exam",
    shortCode: "UE",
    icon: "ri-bank-line",
    accent: "#8b5cf6",
    desc: "Past years university question papers and official final semester exam archives."
  },
  {
    key: "EV",
    fullName: "Event Material",
    shortCode: "EV",
    icon: "ri-calendar-event-line",
    accent: "#f59e0b",
    desc: "Hackathons, symposiums, technical seminars, workshop handouts, and tech fest guides."
  },
  {
    key: "TN",
    fullName: "Tutorial & Notes",
    shortCode: "T&N",
    altShortCode: "TN",
    icon: "ri-book-open-line",
    accent: "#10b981",
    desc: "Curated semester lecture notes, subject guides, textbook summaries, and slides."
  },
  {
    key: "IQ",
    fullName: "Interview Questions",
    shortCode: "IQ",
    icon: "ri-question-answer-line",
    accent: "#ec4899",
    desc: "Technical interview Q&A, HR rounds preparation, coding problem walk-throughs."
  },
  {
    key: "ALR",
    fullName: "Aptitude & LR",
    shortCode: "A&LR",
    altShortCode: "ALR",
    icon: "ri-brain-line",
    accent: "#14b8a6",
    desc: "Quantitative aptitude, logical reasoning, data interpretation, and verbal formulas."
  },
  {
    key: "PQ",
    fullName: "Placement Question",
    shortCode: "PQ",
    icon: "ri-briefcase-line",
    accent: "#f97316",
    desc: "Company-specific recruitment tests, coding assessment challenges, and placement drives."
  }
];

function matchCategory(docCat) {
  if (!docCat) return null;
  const clean = String(docCat).trim().toLowerCase();
  for (const cat of ACADEMIC_CATEGORIES) {
    if (
      clean === cat.fullName.toLowerCase() ||
      clean === cat.shortCode.toLowerCase() ||
      (cat.altShortCode && clean === cat.altShortCode.toLowerCase())
    ) {
      return cat.key;
    }
  }
  return null;
}

// Global state
let currentUser = null;
let pendingSignInEmail = null;
let pendingSignInUser = null;

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateNavbarAuth(user);
});

function updateNavbarAuth(user) {
  const guestArea = document.getElementById("navGuestArea");
  const userArea = document.getElementById("navUserArea");
  const userNameEl = document.getElementById("navUserName");
  const userAvatarEl = document.getElementById("navUserAvatar");

  if (user) {
    if (guestArea) guestArea.style.display = "none";
    if (userArea) userArea.style.display = "flex";
    if (userNameEl) userNameEl.innerText = user.displayName || user.email.split('@')[0];
    if (userAvatarEl) {
      if (user.photoURL) {
        userAvatarEl.innerHTML = `<img src="${user.photoURL}" alt="User" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      } else {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        userAvatarEl.innerText = initial;
      }
    }
  } else {
    if (guestArea) guestArea.style.display = "flex";
    if (userArea) userArea.style.display = "none";
  }
}

// ============================================================================
// GOOGLE & GITHUB AUTHENTICATION
// ============================================================================
async function handlePostOAuthLogin(user) {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    const userData = snap.exists() ? snap.data() : null;
    const isComplete = userData && userData.userType && (userData.studentIdOrEmployeeId || userData.studentId);

    if (!snap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    if (!isComplete) {
      // Force user to Settings Tab to fill User Type and ID
      window.location.href = "dashboard.html?tab=settingsTab&profileIncomplete=true";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch(e) {
    console.error("OAuth post-login hook failed:", e);
    window.location.href = "dashboard.html";
  }
}

window.loginWithGoogle = async function() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await handlePostOAuthLogin(result.user);
  } catch(err) {
    console.error("Google sign-in error:", err);
    alert("Google Sign-In Error: " + (err.message || err));
  }
};

window.loginWithGithub = async function() {
  const provider = new GithubAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await handlePostOAuthLogin(result.user);
  } catch(err) {
    console.error("GitHub sign-in error:", err);
    alert("GitHub Sign-In Error: " + (err.message || err));
  }
};

window.logoutUser = async function() {
  try {
    await signOut(auth);
    localStorage.removeItem("dpgActiveUser");
    localStorage.removeItem("dpgActiveUserUid");
    updateNavbarAuth(null);
  } catch(err) {
    console.error("Sign out error:", err);
  }
};

// ============================================================================
// SIGN UP (EMAIL & PASSWORD)
// ============================================================================
window.handleEmailSignUp = async function(e) {
  e.preventDefault();
  const userType = document.getElementById("signupUserType").value;
  const name = document.getElementById("signupName").value.trim();
  const studentId = document.getElementById("signupStudentId").value.trim();
  const contact = document.getElementById("signupContact").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const linkedin = document.getElementById("signupLinkedin").value.trim();
  const github = document.getElementById("signupGithub").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (!userType) return alert("Please select User Type (Student or Teacher).");
  if (!name) return alert("Please enter your Full Name.");
  if (!studentId) return alert("Please enter your Student ID or Employee ID.");
  if (!email) return alert("Please enter a valid Email.");
  if (password.length < 6) return alert("Password must be at least 6 characters.");
  if (password !== confirmPassword) return alert("Passwords do not match.");

  const btn = document.getElementById("btnSubmitSignUp");
  if (btn) { btn.disabled = true; btn.innerText = "Creating Account..."; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      userType: userType,
      studentIdOrEmployeeId: studentId,
      contactNumber: contact,
      linkedin: linkedin,
      github: github,
      createdAt: serverTimestamp()
    }, { merge: true });

    fetch(apiBase + "/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, name: name })
    }).catch(console.warn);

    alert("Registration successful! Redirecting to Contributor Dashboard...");
    window.location.href = "dashboard.html";
  } catch(err) {
    console.error("Sign up error:", err);
    alert("Registration Failed: " + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Create Contributor Account"; }
  }
};

// Dynamic label switch for Sign Up
const signupUserTypeEl = document.getElementById("signupUserType");
if (signupUserTypeEl) {
  signupUserTypeEl.addEventListener("change", () => {
    const lbl = document.getElementById("lblSignupStudentId");
    const inp = document.getElementById("signupStudentId");
    if (signupUserTypeEl.value === "Teacher") {
      if (lbl) lbl.innerText = "Employee ID / Teacher ID*";
      if (inp) inp.placeholder = "e.g. EMP1024 or FAC77";
    } else {
      if (lbl) lbl.innerText = "Student ID / Roll No*";
      if (inp) inp.placeholder = "e.g. 2112345678 or 22001";
    }
  });
}

// ============================================================================
// SIGN IN (STUDENT/EMPLOYEE ID OR EMAIL + 2FA)
// ============================================================================
window.handlePasswordSignIn = async function(e) {
  e.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!identifier || !password) return alert("Please enter your Student/Employee ID or Email, and Password.");

  const btn = document.getElementById("btnSubmitSignIn");
  if (btn) { btn.disabled = true; btn.innerText = "Verifying Credentials..."; }

  let resolvedEmail = identifier;
  if (!identifier.includes('@')) {
    try {
      const res = await fetch(apiBase + "/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        throw new Error(data.error || "No account found matching this Student / Employee ID.");
      }
      resolvedEmail = data.email;
    } catch(resolveErr) {
      console.warn("Backend resolve fallback, querying Firestore directly:", resolveErr);
      const qSnap = await getDocs(query(collection(db, "users"), where("studentIdOrEmployeeId", "==", identifier)));
      if (qSnap.empty) {
        if (btn) { btn.disabled = false; btn.innerText = "Sign In"; }
        return alert("No account found matching Student / Employee ID: " + identifier);
      }
      resolvedEmail = qSnap.docs[0].data().email;
    }
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
    pendingSignInUser = cred.user;
    pendingSignInEmail = resolvedEmail;

    // Send 2FA OTP
    try {
      await fetch(apiBase + "/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resolvedEmail, purpose: "2fa" })
      });
    } catch(otpErr) {
      console.warn("2FA send failed:", otpErr);
    }

    // Transition to 2FA view in modal
    document.getElementById("signInFormStep").style.display = "none";
    document.getElementById("twoFactorStep").style.display = "block";
    document.getElementById("twoFactorEmailDisplay").innerText = resolvedEmail;
  } catch(err) {
    console.error("Sign in error:", err);
    alert("Sign In Error: " + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Sign In"; }
  }
};

window.verify2FACode = async function() {
  const code = document.getElementById("twoFactorInput").value.trim();
  if (code.length !== 6) return alert("Please enter the 6-digit verification code sent to your email.");

  const btn = document.getElementById("btnVerify2FA");
  if (btn) { btn.disabled = true; btn.innerText = "Verifying..."; }

  try {
    const res = await fetch(apiBase + "/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingSignInEmail, otp: code, purpose: "2fa" })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Invalid or expired verification code.");
    }

    // 2FA Successful! Check profile completion
    const userDocRef = doc(db, "users", pendingSignInUser.uid);
    const snap = await getDoc(userDocRef);
    const userData = snap.exists() ? snap.data() : null;
    const isComplete = userData && userData.userType && (userData.studentIdOrEmployeeId || userData.studentId);

    if (!isComplete) {
      window.location.href = "dashboard.html?tab=settingsTab&profileIncomplete=true";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch(err) {
    alert("Verification Error: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Verify & Complete Sign In"; }
  }
};

window.resend2FACode = async function() {
  if (!pendingSignInEmail) return;
  try {
    await fetch(apiBase + "/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingSignInEmail, purpose: "2fa" })
    });
    alert("New 6-digit code has been dispatched to " + pendingSignInEmail);
  } catch(e) {
    alert("Failed to resend code: " + e.message);
  }
};

// ============================================================================
// PASSWORD RECOVERY (FORGOT PASSWORD)
// ============================================================================
window.handlePasswordRecovery = async function(e) {
  e.preventDefault();
  const rawId = document.getElementById("recoveryIdentifier").value.trim();
  if (!rawId) return alert("Please enter your Student/Employee ID or Email.");

  const btn = document.getElementById("btnSubmitRecovery");
  if (btn) { btn.disabled = true; btn.innerText = "Sending Reset Link & OTP..."; }

  let targetEmail = rawId;
  if (!rawId.includes('@')) {
    try {
      const res = await fetch(apiBase + "/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: rawId })
      });
      const data = await res.json();
      if (!data.found) throw new Error("No account found with this ID.");
      targetEmail = data.email;
    } catch(err) {
      if (btn) { btn.disabled = false; btn.innerText = "Send Password Recovery Code"; }
      return alert("Account lookup failed. Please enter your registered email address.");
    }
  }

  try {
    await sendPasswordResetEmail(auth, targetEmail);
    fetch(apiBase + "/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, purpose: "recovery" })
    }).catch(console.warn);

    alert(`Password reset instructions and security code have been dispatched to: ${targetEmail}\n\nPlease check your inbox and follow the link to reset your password.`);
    const modalEl = document.getElementById("forgotPasswordModal");
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  } catch(err) {
    alert("Recovery failed: " + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Send Password Recovery Code"; }
  }
};

// ============================================================================
// MODAL SWITCHING HELPERS
// ============================================================================
window.openSignInModal = function() {
  const suEl = document.getElementById("signUpModal");
  if (suEl && window.bootstrap) {
    const suModal = bootstrap.Modal.getInstance(suEl);
    if (suModal) suModal.hide();
  }
  const fpEl = document.getElementById("forgotPasswordModal");
  if (fpEl && window.bootstrap) {
    const fpModal = bootstrap.Modal.getInstance(fpEl);
    if (fpModal) fpModal.hide();
  }
  // Reset steps
  document.getElementById("signInFormStep").style.display = "block";
  document.getElementById("twoFactorStep").style.display = "none";
  const siModal = new bootstrap.Modal(document.getElementById("signInModal"));
  siModal.show();
};

window.openSignUpModal = function() {
  const siEl = document.getElementById("signInModal");
  if (siEl && window.bootstrap) {
    const siModal = bootstrap.Modal.getInstance(siEl);
    if (siModal) siModal.hide();
  }
  const suModal = new bootstrap.Modal(document.getElementById("signUpModal"));
  suModal.show();
};

window.openForgotPasswordModal = function() {
  const siEl = document.getElementById("signInModal");
  if (siEl && window.bootstrap) {
    const siModal = bootstrap.Modal.getInstance(siEl);
    if (siModal) siModal.hide();
  }
  const fpModal = new bootstrap.Modal(document.getElementById("forgotPasswordModal"));
  fpModal.show();
};

// ============================================================================
// GUEST 2-MINUTE PROMPT (R2)
// ============================================================================
setTimeout(() => {
  if (!auth.currentUser && !localStorage.getItem("dpgActiveUser")) {
    const el = document.getElementById("guestPromptModal");
    if (el && window.bootstrap) {
      const modal = new bootstrap.Modal(el);
      modal.show();
    }
  }
}, 120000); // 120,000ms = 2 minutes

// ============================================================================
// BLOGS & DOCUMENTATION EXPANDER (R3)
// ============================================================================
window.toggleDocCard = function(id) {
  const content = document.getElementById(`docDetail_${id}`);
  const btn = document.getElementById(`docBtn_${id}`);
  if (!content || !btn) return;

  const isHidden = content.style.display === "none" || !content.style.display;
  if (isHidden) {
    content.style.display = "block";
    btn.innerHTML = `Read Less <i class="ri-arrow-up-s-line"></i>`;
  } else {
    content.style.display = "none";
    btn.innerHTML = `Read More <i class="ri-arrow-down-s-line"></i>`;
  }
};

// ============================================================================
// 8 VERTICAL RESOURCE GRIDS ENGINE (R3.1 & R3.2)
// ============================================================================
async function loadAcademicResources() {
  const statusEl = document.getElementById("resourceLoadingStatus");
  if (statusEl) statusEl.innerText = "Fetching academic resources...";

  try {
    const snap = await getDocs(query(collection(db, "documents"), limit(150)));
    const grouped = {};
    ACADEMIC_CATEGORIES.forEach(c => { grouped[c.key] = []; });

    snap.forEach(d => {
      const data = d.data();
      const docId = d.id;
      const matchedKey = matchCategory(data.category);
      if (matchedKey && grouped[matchedKey]) {
        grouped[matchedKey].push({ id: docId, ...data });
      }
    });

    if (statusEl) statusEl.style.display = "none";

    let totalRendered = 0;
    ACADEMIC_CATEGORIES.forEach(cat => {
      const container = document.getElementById(`gridContainer_${cat.key}`);
      const cardsWrapper = document.getElementById(`cardsWrapper_${cat.key}`);
      const countBadge = document.getElementById(`countBadge_${cat.key}`);
      const docs = grouped[cat.key] || [];

      // R3.1: Only show vertical grid if Firestore has resources corresponding to it! Otherwise clean grid.
      if (docs.length === 0) {
        if (container) container.style.display = "none";
      } else {
        totalRendered++;
        if (container) container.style.display = "block";
        if (countBadge) countBadge.innerText = `${docs.length} Items`;

        if (cardsWrapper) {
          cardsWrapper.innerHTML = "";
          docs.forEach(item => {
            const card = document.createElement("div");
            card.className = "col-12 col-md-6 col-lg-4";
            
            const title = item.title || "Academic Resource";
            const discipline = item.discipline || "General Science";
            const uploader = item.uploader || item.userName || "Verified Contributor";
            const date = item.createdAt ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString() : "Recent";
            const pdfUrl = item.pdfUrl || "#";
            const viewerUrl = `dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(pdfUrl)}&title=${encodeURIComponent(title)}&category=${encodeURIComponent(cat.fullName)}&discipline=${encodeURIComponent(discipline)}&uploader=${encodeURIComponent(uploader)}&docid=${encodeURIComponent(item.id)}`;

            card.innerHTML = `
              <div class="academic-res-card">
                <div class="res-card-top">
                  <span class="res-badge-cat" style="color:${cat.accent}; border-color:${cat.accent}40; background:${cat.accent}15;">
                    <i class="${cat.icon}"></i> ${cat.fullName}
                  </span>
                  <span class="res-badge-disc">${discipline}</span>
                </div>
                <h4 class="res-card-title">${title}</h4>
                <div class="res-card-meta">
                  <span><i class="ri-user-line"></i> ${uploader}</span>
                  <span><i class="ri-time-line"></i> ${date}</span>
                </div>
                <div class="res-card-actions">
                  <a href="${viewerUrl}" class="btn-res-view">
                    <i class="ri-eye-line"></i> Read PDF
                  </a>
                  <a href="${pdfUrl}" target="_blank" download class="btn-res-download" title="Direct Download">
                    <i class="ri-download-2-line"></i>
                  </a>
                </div>
              </div>
            `;
            cardsWrapper.appendChild(card);
          });
        }
      }
    });

    if (totalRendered === 0 && statusEl) {
      statusEl.style.display = "block";
      statusEl.innerText = "No academic resources published yet in the database.";
    }
  } catch(err) {
    console.error("Resource load error:", err);
    if (statusEl) {
      statusEl.innerText = "Error loading academic resources. Please refresh.";
    }
  }
}

// Global search submit
window.handleHomeSearch = function(e) {
  e.preventDefault();
  const q = document.getElementById("homeSearchInput")?.value.trim();
  if (q) {
    window.location.href = `dpgnotes-serp.html?query=${encodeURIComponent(q)}`;
  }
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadAcademicResources();

  const searchForm = document.getElementById("homeSearchForm");
  if (searchForm) searchForm.addEventListener("submit", window.handleHomeSearch);

  const signUpForm = document.getElementById("formSignUp");
  if (signUpForm) signUpForm.addEventListener("submit", window.handleEmailSignUp);

  const signInForm = document.getElementById("formSignIn");
  if (signInForm) signInForm.addEventListener("submit", window.handlePasswordSignIn);

  const recoveryForm = document.getElementById("formRecovery");
  if (recoveryForm) recoveryForm.addEventListener("submit", window.handlePasswordRecovery);
});
