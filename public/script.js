// ============================================================================
// DPGNotes - Modern Academic & Examination Hub
// Homepage Client Script (v3.1.0)
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
  getCountFromServer,
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
let pendingRecoveryEmailScript = "";

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateNavbarAuth(user);
});

function updateNavbarAuth(user) {
  const guestAreaDesktop = document.getElementById("navGuestArea");
  const userAreaDesktop = document.getElementById("navUserArea");
  const guestAreaMobile = document.getElementById("navGuestAreaMobile");
  const userAreaMobile = document.getElementById("navUserAreaMobile");
  const userNameEl = document.getElementById("navUserName");
  const userAvatarEl = document.getElementById("navUserAvatar");
  const userNameMobileEl = document.getElementById("navUserNameMobile");
  const userAvatarMobileEl = document.getElementById("navUserAvatarMobile");

  if (user) {
    document.documentElement.classList.add("dpg-user-authenticated");
    if (guestAreaDesktop) {
      guestAreaDesktop.classList.remove("d-flex");
      guestAreaDesktop.classList.add("d-none");
      guestAreaDesktop.style.setProperty("display", "none", "important");
    }
    if (userAreaDesktop) {
      userAreaDesktop.classList.remove("d-none");
      userAreaDesktop.classList.add("d-flex");
      userAreaDesktop.style.setProperty("display", "flex", "important");
    }
    if (guestAreaMobile) {
      guestAreaMobile.classList.add("d-none");
      guestAreaMobile.style.setProperty("display", "none", "important");
    }
    if (userAreaMobile) {
      userAreaMobile.classList.remove("d-none");
      userAreaMobile.classList.add("d-flex");
      userAreaMobile.style.setProperty("display", "flex", "important");
    }
    
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Contributor');
    if (userNameEl) userNameEl.innerText = displayName;
    if (userNameMobileEl) userNameMobileEl.innerText = displayName;

    const avatarHtml = user.photoURL 
      ? `<img src="${user.photoURL}" alt="${displayName}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
      : displayName.charAt(0).toUpperCase();

    if (userAvatarEl) {
      if (user.photoURL) {
        userAvatarEl.innerHTML = avatarHtml;
      } else {
        userAvatarEl.innerText = avatarHtml;
      }
    }
    if (userAvatarMobileEl) {
      if (user.photoURL) {
        userAvatarMobileEl.innerHTML = avatarHtml;
      } else {
        userAvatarMobileEl.innerText = avatarHtml;
      }
    }
  } else {
    document.documentElement.classList.remove("dpg-user-authenticated");
    if (guestAreaDesktop) {
      guestAreaDesktop.classList.remove("d-none");
      guestAreaDesktop.classList.add("d-flex");
      guestAreaDesktop.style.removeProperty("display");
    }
    if (userAreaDesktop) {
      userAreaDesktop.classList.remove("d-flex");
      userAreaDesktop.classList.add("d-none");
      userAreaDesktop.style.setProperty("display", "none", "important");
    }
    if (guestAreaMobile) {
      guestAreaMobile.classList.remove("d-none");
      guestAreaMobile.style.removeProperty("display");
    }
    if (userAreaMobile) {
      userAreaMobile.classList.add("d-none");
      userAreaMobile.style.setProperty("display", "none", "important");
    }
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

// Inline Auth Error Helpers for script.js
function showScriptAuthError(boxId, msg, inputId) {
  const box = document.getElementById(boxId);
  if (box) {
    box.innerHTML = `<i class="ri-error-warning-fill"></i><span>${msg}</span>`;
    box.classList.remove("dpg-alert-hidden");
    box.style.display = "flex";
  }
  if (inputId) {
    const inp = document.getElementById(inputId);
    if (inp) {
      inp.classList.add("dpg-input-error");
      inp.focus();
    }
  }
}

function clearScriptAuthError(boxId, inputId) {
  const box = document.getElementById(boxId);
  if (box) {
    box.classList.add("dpg-alert-hidden");
    box.style.display = "none";
    box.innerHTML = "";
  }
  if (inputId) {
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.remove("dpg-input-error");
  }
}

function getScriptFriendlyAuthError(err) {
  if (typeof window.getFriendlyAuthError === "function") {
    return window.getFriendlyAuthError(err);
  }
  if (!err) return "An unexpected error occurred. Please try again.";
  const code = (err && err.code) || (typeof err === "string" ? err : (err && err.message) || "");
  if (code.includes("invalid-credential") || code.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Incorrect Student/Employee ID, Email, or Password. Please check your credentials and try again.";
  }
  if (code.includes("user-not-found") || code.includes("EMAIL_NOT_FOUND")) {
    return "No contributor account found with this identifier. Please verify your ID or create a free account.";
  }
  if (code.includes("wrong-password") || code.includes("INVALID_PASSWORD")) {
    return "Incorrect password. Please verify your password or use 'Forgot Password' to reset.";
  }
  if (code.includes("email-already-in-use") || code.includes("EMAIL_EXISTS")) {
    return "An account is already registered with this email address. Please sign in instead.";
  }
  if (code.includes("weak-password")) {
    return "Password is too weak. Please use at least 6 characters with mixed letters and numbers.";
  }
  if (code.includes("invalid-email")) {
    return "Please enter a valid, well-formed email address (e.g. name@domain.com).";
  }
  if (code.includes("too-many-requests")) {
    return "Too many failed attempts. For your security, access is temporarily locked. Please wait a few moments.";
  }
  if (code.includes("network-request-failed")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }
  return (err && err.message) || "Authentication failed. Please check your details and try again.";
}

window.logoutUser = async function() {
  try {
    await signOut(auth);
    if (typeof window.dpgPurgeCredentials === "function") {
      window.dpgPurgeCredentials();
    } else {
      localStorage.removeItem("dpgActiveUser");
      localStorage.removeItem("dpgActiveUserUid");
      sessionStorage.removeItem("dpgActiveUser");
      sessionStorage.removeItem("dpgActiveUserUid");
    }
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
  clearScriptAuthError("signUpErrorAlert");

  const userType = document.getElementById("signupUserType")?.value || "";
  const name = document.getElementById("signupName")?.value.trim() || "";
  const studentId = document.getElementById("signupStudentId")?.value.trim() || "";
  const contact = document.getElementById("signupContact")?.value.trim() || "";
  const email = (document.getElementById("signupEmail")?.value.trim() || "").toLowerCase();
  const linkedin = document.getElementById("signupLinkedin")?.value.trim() || "";
  const github = document.getElementById("signupGithub")?.value.trim() || "";
  const password = document.getElementById("signupPassword")?.value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";

  if (!userType) {
    showScriptAuthError("signUpErrorAlert", "Please select your User Role (Student or Teacher).", "signupUserType");
    return;
  }
  if (!name) {
    showScriptAuthError("signUpErrorAlert", "Please enter your Full Name.", "signupName");
    return;
  }
  if (!studentId) {
    showScriptAuthError("signUpErrorAlert", "Please enter your Student ID or Employee ID.", "signupStudentId");
    return;
  }
  if (!email || !email.includes("@")) {
    showScriptAuthError("signUpErrorAlert", "Please enter a valid email address.", "signupEmail");
    return;
  }
  if (password.length < 6) {
    showScriptAuthError("signUpErrorAlert", "Password must be at least 6 characters long.", "signupPassword");
    return;
  }
  if (password !== confirmPassword) {
    showScriptAuthError("signUpErrorAlert", "Passwords do not match. Please verify both password fields.", "signupConfirmPassword");
    return;
  }

  const btn = document.getElementById("btnSubmitSignUp");
  if (btn) { btn.disabled = true; btn.innerText = "Creating Account..."; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Compute SHA-256 hash of password for security records in Firestore
    let passwordHash = "";
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (hashErr) {
      console.warn("Password hash computation fallback:", hashErr);
    }

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      userType: userType,
      studentIdOrEmployeeId: studentId,
      studentId: studentId,
      contactNumber: contact,
      linkedin: linkedin,
      github: github,
      passwordHash: passwordHash,
      createdAt: serverTimestamp()
    }, { merge: true });

    fetch(apiBase + "/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, name: name })
    }).catch(console.warn);

    // Close modal cleanly
    const suEl = document.getElementById("signUpModal");
    if (suEl && window.bootstrap) {
      const suModal = bootstrap.Modal.getInstance(suEl);
      if (suModal) suModal.hide();
    }

    window.location.href = "dashboard.html";
  } catch(err) {
    console.error("Email sign up error:", err);
    showScriptAuthError("signUpErrorAlert", getScriptFriendlyAuthError(err), "signupEmail");
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
  clearScriptAuthError("signInErrorAlert");

  const identifier = document.getElementById("loginIdentifier")?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";

  if (!identifier) {
    showScriptAuthError("signInErrorAlert", "Please enter your Student ID, Employee ID, or Email.", "loginIdentifier");
    return;
  }
  if (!password) {
    showScriptAuthError("signInErrorAlert", "Please enter your password.", "loginPassword");
    return;
  }

  const btn = document.getElementById("btnSubmitSignIn");
  if (btn) { btn.disabled = true; btn.innerText = "Verifying Credentials..."; }

  let resolvedEmail = identifier;
  if (!identifier.includes('@')) {
    let resolved = false;
    // 1. Try backend API with 3.5s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(apiBase + "/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.found && data.email) {
          resolvedEmail = data.email;
          resolved = true;
        }
      }
    } catch(resolveErr) {
      console.warn("Backend resolve fallback, querying Firestore directly:", resolveErr.message);
    }

    // 2. Direct client Firestore query fallback checking both fields & casing
    if (!resolved) {
      try {
        const candidates = [identifier, identifier.toUpperCase(), identifier.toLowerCase()];
        for (const cand of candidates) {
          const q1 = await getDocs(query(collection(db, "users"), where("studentIdOrEmployeeId", "==", cand), limit(1)));
          if (!q1.empty) {
            resolvedEmail = q1.docs[0].data().email;
            resolved = true;
            break;
          }
          const q2 = await getDocs(query(collection(db, "users"), where("studentId", "==", cand), limit(1)));
          if (!q2.empty) {
            resolvedEmail = q2.docs[0].data().email;
            resolved = true;
            break;
          }
        }
      } catch(fsErr) {
        console.warn("Firestore client identifier lookup error:", fsErr);
      }
    }

    if (!resolved) {
      if (btn) { btn.disabled = false; btn.innerText = "Sign In"; }
      showScriptAuthError("signInErrorAlert", `No account found matching Student/Employee ID "${identifier}". Please check your ID or create a free account.`, "loginIdentifier");
      return;
    }
  }

  // Normalize email to clean lowercase
  resolvedEmail = resolvedEmail.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
    pendingSignInUser = cred.user;
    pendingSignInEmail = resolvedEmail;

    // Check if user disabled 2FA in settings
    try {
      const userDocRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userDocRef);
      const userData = snap.exists() ? snap.data() : null;

      if (userData && userData.twoFactorEnabled === false) {
        // 2FA is explicitly disabled by user: complete sign in directly
        const isComplete = userData.userType && (userData.studentIdOrEmployeeId || userData.studentId);
        if (!isComplete) {
          window.location.href = "dashboard.html?tab=settingsTab&profileIncomplete=true";
        } else {
          window.location.href = "dashboard.html";
        }
        return;
      }
    } catch(profileErr) {
      console.warn("User profile check error:", profileErr);
    }

    // Default: Dispatch 2FA OTP
    try {
      await fetch(apiBase + "/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resolvedEmail,
          purpose: "2fa",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
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
    showScriptAuthError("signInErrorAlert", getScriptFriendlyAuthError(err), "loginPassword");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Sign In"; }
  }
};

window.verify2FACode = async function() {
  clearScriptAuthError("twoFactorErrorAlert");
  const code = document.getElementById("twoFactorInput")?.value.trim() || "";
  if (code.length !== 6) {
    showScriptAuthError("twoFactorErrorAlert", "Please enter the 6-digit verification code sent to your email.", "twoFactorInput");
    return;
  }

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
    showScriptAuthError("twoFactorErrorAlert", err.message || "Verification failed.", "twoFactorInput");
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
      body: JSON.stringify({
        email: pendingSignInEmail,
        purpose: "2fa",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
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
  clearScriptAuthError("recoveryErrorAlert");

  const rawId = document.getElementById("recoveryIdentifier")?.value.trim() || "";
  if (!rawId) {
    showScriptAuthError("recoveryErrorAlert", "Please enter your Student/Employee ID or Email.", "recoveryIdentifier");
    return;
  }

  const btn = document.getElementById("btnSubmitRecovery");
  if (btn) { btn.disabled = true; btn.innerText = "Sending Reset Link & OTP..."; }

  let targetEmail = rawId;
  if (!rawId.includes('@')) {
    let resolved = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(apiBase + "/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: rawId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.found && data.email) {
          targetEmail = data.email;
          resolved = true;
        }
      }
    } catch(err) {
      console.warn("Backend recovery resolve fallback:", err.message);
    }

    if (!resolved) {
      try {
        const candidates = [rawId, rawId.toUpperCase(), rawId.toLowerCase()];
        for (const cand of candidates) {
          const q1 = await getDocs(query(collection(db, "users"), where("studentIdOrEmployeeId", "==", cand), limit(1)));
          if (!q1.empty) { targetEmail = q1.docs[0].data().email; resolved = true; break; }
          const q2 = await getDocs(query(collection(db, "users"), where("studentId", "==", cand), limit(1)));
          if (!q2.empty) { targetEmail = q2.docs[0].data().email; resolved = true; break; }
        }
      } catch(fsErr) {
        console.warn("Firestore recovery lookup error:", fsErr);
      }
    }

    if (!resolved) {
      if (btn) { btn.disabled = false; btn.innerText = "Send Password Recovery Code"; }
      showScriptAuthError("recoveryErrorAlert", `Account lookup failed for ID "${rawId}". Please enter your registered email address.`, "recoveryIdentifier");
      return;
    }
  }

  targetEmail = targetEmail.trim().toLowerCase();

  // Rigorous verification of user existence
  let userFound = false;
  try {
    const qEmail = await getDocs(query(collection(db, "users"), where("email", "==", targetEmail), limit(1)));
    if (!qEmail.empty) userFound = true;
  } catch(fsErr) {
    console.warn("Firestore recovery email check fallback:", fsErr);
  }

  if (!userFound) {
    try {
      const res = await fetch(apiBase + "/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: targetEmail })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.found) userFound = true;
      }
    } catch(apiErr) {
      console.warn("API resolve check error:", apiErr);
    }
  }

  if (!userFound) {
    if (btn) { btn.disabled = false; btn.innerText = "Send Password Recovery Code"; }
    showScriptAuthError("recoveryErrorAlert", `No registered contributor account found with email "${targetEmail}". Please verify your email or create a free account.`, "recoveryIdentifier");
    return;
  }

  // User exists: Dispatch Recovery OTP and transition to Step 2
  try {
    const otpRes = await fetch(apiBase + "/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetEmail,
        purpose: "recovery",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });
    const otpData = await otpRes.json().catch(() => ({}));
    if (!otpRes.ok || !otpData.success) {
      throw new Error(otpData.error || "Failed to dispatch verification code.");
    }

    sendPasswordResetEmail(auth, targetEmail).catch(console.warn);

    pendingRecoveryEmailScript = targetEmail;

    const step1 = document.getElementById("recoveryStep1");
    const step2 = document.getElementById("recoveryStep2");
    const emailDisp = document.getElementById("recoveryEmailDisplay");
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
    if (emailDisp) emailDisp.textContent = targetEmail;
    clearScriptAuthError("recoveryOtpErrorAlert");

    const otpInp = document.getElementById("recoveryOtpCode");
    if (otpInp) {
      otpInp.value = "";
      setTimeout(() => otpInp.focus(), 150);
    }
  } catch(err) {
    showScriptAuthError("recoveryErrorAlert", getScriptFriendlyAuthError(err), "recoveryIdentifier");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Send Password Recovery Code"; }
  }
};

window.handleRecoveryOtpSubmit = async function(e) {
  e.preventDefault();
  clearScriptAuthError("recoveryOtpErrorAlert");

  const otp = document.getElementById("recoveryOtpCode")?.value.trim() || "";
  const newPass = document.getElementById("recoveryNewPassword")?.value || "";
  const confirmPass = document.getElementById("recoveryConfirmPassword")?.value || "";
  const btn = document.getElementById("btnSubmitRecoveryOtp");

  if (!otp || otp.length !== 6) {
    showScriptAuthError("recoveryOtpErrorAlert", "Please enter the 6-digit verification code sent to your email.", "recoveryOtpCode");
    return;
  }
  if (!newPass || newPass.length < 6) {
    showScriptAuthError("recoveryOtpErrorAlert", "Password must be at least 6 characters.", "recoveryNewPassword");
    return;
  }
  if (newPass !== confirmPass) {
    showScriptAuthError("recoveryOtpErrorAlert", "Passwords do not match. Please re-enter.", "recoveryConfirmPassword");
    return;
  }

  if (btn) { btn.disabled = true; btn.innerText = "Resetting Password..."; }

  try {
    const res = await fetch(apiBase + "/api/auth/reset-password-with-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingRecoveryEmailScript, otp, newPassword: newPass })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to reset password. Please check your verification code.");
    }

    alert("Password reset successful! You can now sign in with your new password.");
    const fpEl = document.getElementById("forgotPasswordModal");
    if (fpEl && window.bootstrap) {
      const inst = bootstrap.Modal.getInstance(fpEl);
      if (inst) inst.hide();
    }
    window.openSignInModal();
    const loginInp = document.getElementById("loginIdentifier");
    if (loginInp && pendingRecoveryEmailScript) {
      loginInp.value = pendingRecoveryEmailScript;
    }
  } catch(err) {
    showScriptAuthError("recoveryOtpErrorAlert", err.message || "Failed to reset password.", "recoveryOtpCode");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Reset Password & Sign In"; }
  }
};

window.resendRecoveryOtpScript = async function() {
  if (!pendingRecoveryEmailScript) return;
  try {
    const res = await fetch(apiBase + "/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pendingRecoveryEmailScript,
        purpose: "recovery",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      alert(`A fresh 6-digit verification code has been sent to ${pendingRecoveryEmailScript}`);
    } else {
      alert(data.error || "Failed to resend code.");
    }
  } catch(e) {
    alert("Failed to resend code: " + e.message);
  }
};

window.backToRecoveryStep1Script = function() {
  const step1 = document.getElementById("recoveryStep1");
  const step2 = document.getElementById("recoveryStep2");
  if (step1) step1.style.display = "block";
  if (step2) step2.style.display = "none";
};

// ============================================================================
// MODAL SWITCHING HELPERS
// (Delegates to auth-component overlay when quota is locked or overlay exists)
// ============================================================================
window.openSignInModal = function() {
  // Always close mobile offcanvas drawer and guest prompt first
  const drawer = document.getElementById("mobileNavDrawer");
  if (drawer && window.bootstrap) {
    const offcanvas = bootstrap.Offcanvas.getInstance(drawer);
    if (offcanvas) offcanvas.hide();
  }
  const guestPromptEl = document.getElementById("guestPromptModal");
  if (guestPromptEl && window.bootstrap) {
    const gpInst = bootstrap.Modal.getInstance(guestPromptEl);
    if (gpInst) gpInst.hide();
  }

  // Clean reset of forms and fields (unless 2FA is in progress)
  if (!pendingSignInUser) {
    ["formSignIn", "formSignUp", "formRecovery"].forEach(fId => {
      const f = document.getElementById(fId);
      if (f && typeof f.reset === "function") f.reset();
    });
    ["loginIdentifier", "loginPassword", "signupName", "signupStudentId", "signupContact", "signupEmail", "signupLinkedin", "signupGithub", "signupPassword", "signupConfirmPassword", "recoveryIdentifier"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ""; el.classList.remove("dpg-input-error"); }
    });
    ["signInErrorAlert", "signUpErrorAlert", "recoveryErrorAlert", "twoFactorErrorAlert"].forEach(id => clearScriptAuthError(id));
  }

  // Always prefer the auth-component overlay (dpgSignInModal) if it exists
  const dpgOverlay = document.getElementById("dpgAuthOverlay");
  if (dpgOverlay && typeof window.dpgBackToSignInStep1 === "function") {
    ["signUpModal", "forgotPasswordModal", "signInModal"].forEach(mId => {
      const el = document.getElementById(mId);
      if (el && window.bootstrap) {
        const inst = bootstrap.Modal.getInstance(el);
        if (inst) inst.hide();
      }
    });
    ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === "dpgSignInModal") ? "block" : "none";
    });
    dpgOverlay.classList.add("active");
    if (!pendingSignInUser) {
      window.dpgBackToSignInStep1();
    }
    return;
  }

  // Fallback: legacy Bootstrap modal
  const suEl = document.getElementById("signUpModal");
  if (suEl && window.bootstrap) { const suModal = bootstrap.Modal.getInstance(suEl); if (suModal) suModal.hide(); }
  const fpEl = document.getElementById("forgotPasswordModal");
  if (fpEl && window.bootstrap) { const fpModal = bootstrap.Modal.getInstance(fpEl); if (fpModal) fpModal.hide(); }
  const step1 = document.getElementById("signInFormStep");
  const step2 = document.getElementById("twoFactorStep");
  if (!pendingSignInUser) {
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
  } else {
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
  }
  const siModal = new bootstrap.Modal(document.getElementById("signInModal"));
  siModal.show();
};

window.openSignUpModal = function() {
  const drawer = document.getElementById("mobileNavDrawer");
  if (drawer && window.bootstrap) {
    const offcanvas = bootstrap.Offcanvas.getInstance(drawer);
    if (offcanvas) offcanvas.hide();
  }
  const guestPromptEl = document.getElementById("guestPromptModal");
  if (guestPromptEl && window.bootstrap) {
    const gpInst = bootstrap.Modal.getInstance(guestPromptEl);
    if (gpInst) gpInst.hide();
  }

  // Never show previous log credentials: clean reset
  ["formSignIn", "formSignUp", "formRecovery"].forEach(fId => {
    const f = document.getElementById(fId);
    if (f && typeof f.reset === "function") f.reset();
  });
  ["loginIdentifier", "loginPassword", "signupName", "signupStudentId", "signupContact", "signupEmail", "signupLinkedin", "signupGithub", "signupPassword", "signupConfirmPassword", "recoveryIdentifier"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ""; el.classList.remove("dpg-input-error"); }
  });
  ["signInErrorAlert", "signUpErrorAlert", "recoveryErrorAlert", "twoFactorErrorAlert"].forEach(id => clearScriptAuthError(id));

  // Always prefer the auth-component overlay (dpgSignUpModal) if it exists
  const dpgOverlay = document.getElementById("dpgAuthOverlay");
  if (dpgOverlay) {
    ["signUpModal", "signInModal", "forgotPasswordModal"].forEach(mId => {
      const el = document.getElementById(mId);
      if (el && window.bootstrap) { const inst = bootstrap.Modal.getInstance(el); if (inst) inst.hide(); }
    });
    ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === "dpgSignUpModal") ? "block" : "none";
    });
    dpgOverlay.classList.add("active");
    return;
  }

  // Fallback
  const siEl = document.getElementById("signInModal");
  if (siEl && window.bootstrap) { const siModal = bootstrap.Modal.getInstance(siEl); if (siModal) siModal.hide(); }
  const suModal = new bootstrap.Modal(document.getElementById("signUpModal"));
  suModal.show();
};

window.openForgotPasswordModal = function() {
  const drawer = document.getElementById("mobileNavDrawer");
  if (drawer && window.bootstrap) {
    const offcanvas = bootstrap.Offcanvas.getInstance(drawer);
    if (offcanvas) offcanvas.hide();
  }

  ["signInErrorAlert", "signUpErrorAlert", "recoveryErrorAlert"].forEach(id => clearScriptAuthError(id));

  // Always prefer the auth-component overlay (dpgForgotPasswordModal) if it exists
  const dpgOverlay = document.getElementById("dpgAuthOverlay");
  if (dpgOverlay) {
    ["signInModal", "signUpModal", "forgotPasswordModal"].forEach(mId => {
      const el = document.getElementById(mId);
      if (el && window.bootstrap) { const inst = bootstrap.Modal.getInstance(el); if (inst) inst.hide(); }
    });
    ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === "dpgForgotPasswordModal") ? "block" : "none";
    });
    dpgOverlay.classList.add("active");
    return;
  }

  // Fallback
  const siEl = document.getElementById("signInModal");
  if (siEl && window.bootstrap) { const siModal = bootstrap.Modal.getInstance(siEl); if (siModal) siModal.hide(); }
  const fpModal = new bootstrap.Modal(document.getElementById("forgotPasswordModal"));
  fpModal.show();
};


// ============================================================================
// THEME SWITCHER ENGINE (Dark Nebula / Light Academic / Midnight Emerald)
// ============================================================================
window.toggleDpgTheme = function() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  let next = "dark";
  let iconClass = "ri-moon-line";

  if (current === "dark") {
    next = "light";
    iconClass = "ri-sun-line";
  } else if (current === "light") {
    next = "emerald";
    iconClass = "ri-contrast-2-line";
  } else {
    next = "dark";
    iconClass = "ri-moon-line";
  }

  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("dpg_active_theme", next);
  } catch(e) {}

  ["themeToggleIconDesktop", "themeToggleIconMobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = iconClass;
  });
};

// Initialize theme icon on load
(function initThemeIcon() {
  try {
    const saved = localStorage.getItem("dpg_active_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    const iconClass = saved === "light" ? "ri-sun-line" : (saved === "emerald" ? "ri-contrast-2-line" : "ri-moon-line");
    ["themeToggleIconDesktop", "themeToggleIconMobile"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = iconClass;
    });
  } catch(e) {}
})();

// ============================================================================
// SMART & ADVANCED GUEST USER PROMPT (NON-INTRUSIVE)
// ============================================================================
let guestPromptRetryCount = 0;
function tryShowSmartGuestPrompt() {
  // 1. Is user already a signed-in Contributor?
  if (auth.currentUser || localStorage.getItem("dpgActiveUser") || localStorage.getItem("dpgActiveUserUid") || document.documentElement.classList.contains("dpg-user-authenticated")) {
    return;
  }

  // 2. Has the user already seen/dismissed the prompt in this session?
  if (sessionStorage.getItem("dpg_guest_prompt_dismissed") === "true") {
    return;
  }

  // 3. Is ANY modal (Sign In, Sign Up, Forgot Password, OTP / 2FA, Custom Alert) active?
  const anyActiveModal = document.querySelector(".modal.show, .dpg-custom-dialog-overlay, [id*='Modal'].show");
  if (anyActiveModal) {
    // User is actively authenticating or interacting: retry gracefully in 30 seconds
    if (guestPromptRetryCount < 3) {
      guestPromptRetryCount++;
      setTimeout(tryShowSmartGuestPrompt, 30000);
    }
    return;
  }

  // 4. Is the user currently typing in a search bar or form input?
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
    if (guestPromptRetryCount < 3) {
      guestPromptRetryCount++;
      setTimeout(tryShowSmartGuestPrompt, 20000);
    }
    return;
  }

  // 5. Safe to show prompt gently
  const el = document.getElementById("guestPromptModal");
  if (el && window.bootstrap) {
    const modal = new bootstrap.Modal(el);
    modal.show();

    // Mark as shown for this session so it never interrupts the user repeatedly
    sessionStorage.setItem("dpg_guest_prompt_dismissed", "true");
  }
}

// Check after 2 minutes of passive browsing
setTimeout(tryShowSmartGuestPrompt, 120000);

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
// NOTE: Download feature is completely removed per user instruction.
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

    // 1. Fetch user feed weights from IndexedDB & cookies
    const feedWeights = window.dpgFeed ? await window.dpgFeed.getUserFeedWeights() : { disciplines: {}, categories: {}, keywords: new Set() };

    // 2. Perform daily sync of feed profile & cookies to Firestore
    if (window.dpgFeed) {
      window.dpgFeed.dailySyncToFirestore(db, currentUser, setDoc, doc, serverTimestamp);
    }

    let totalRendered = 0;
    ACADEMIC_CATEGORIES.forEach(cat => {
      const container = document.getElementById(`gridContainer_${cat.key}`);
      const cardsWrapper = document.getElementById(`cardsWrapper_${cat.key}`);
      const countBadge = document.getElementById(`countBadge_${cat.key}`);
      const docs = grouped[cat.key] || [];

      // Requirement: For only 2 or less resources for any category, do NOT show them on index.html directly!
      if (docs.length <= 2) {
        if (container) container.style.display = "none";
      } else {
        totalRendered++;
        if (container) container.style.display = "block";
        if (countBadge) countBadge.innerText = `${docs.length} Items`;

        // Rank resources by user feed relevance (PDF visits, SERP searches, and cookies)
        const rankedDocs = [...docs].sort((a, b) => {
          const scoreA = window.dpgFeed ? window.dpgFeed.scoreResource(a, feedWeights) : 0;
          const scoreB = window.dpgFeed ? window.dpgFeed.scoreResource(b, feedWeights) : 0;
          return scoreB - scoreA;
        });

        // Strictly show only 3 resources per grid
        const displayDocs = rankedDocs.slice(0, 3);

        if (cardsWrapper) {
          cardsWrapper.innerHTML = "";
          displayDocs.forEach(item => {
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
                  <span><i class="ri-calendar-line"></i> ${date}</span>
                </div>
                <div class="res-card-actions">
                  <a href="${viewerUrl}" class="btn-res-view">
                    <i class="ri-book-read-line"></i> Read &amp; View Notes
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
  const q = document.getElementById("homeSearchInput")?.value.trim() || document.getElementById("drawerSearchInput")?.value.trim();
  if (q) {
    window.location.href = `dpgnotes-serp.html?query=${encodeURIComponent(q)}`;
  }
};

// ============================================================================
// LIVE STATS FROM FIRESTORE (Image 2 Data Cards)
// ============================================================================

async function loadLiveStats() {
  const resourceEl = document.getElementById("statResourceCount");
  const streamEl   = document.getElementById("statStreamCount");

  try {
    // 1. Total academic resource count from 'documents' collection
    let totalDocs = 0;
    try {
      const countSnap = await getCountFromServer(collection(db, "documents"));
      totalDocs = countSnap.data().count;
    } catch (countErr) {
      // Fallback: full getDocs (for environments where getCountFromServer is unavailable)
      const snap = await getDocs(collection(db, "documents"));
      totalDocs = snap.size;
    }

    // Format: show exact count if < 1000, else "N+" rounded to nearest 50
    let resourceLabel;
    if (totalDocs >= 1000) {
      resourceLabel = Math.floor(totalDocs / 100) * 100 + "+";
    } else if (totalDocs >= 100) {
      resourceLabel = Math.floor(totalDocs / 50) * 50 + "+";
    } else if (totalDocs >= 10) {
      resourceLabel = Math.floor(totalDocs / 10) * 10 + "+";
    } else {
      resourceLabel = String(totalDocs);
    }

    if (resourceEl) resourceEl.textContent = resourceLabel;

    // 2. Count active streams (categories with ≥ 3 resources)
    // Re-use documents already loaded by loadAcademicResources if available, else query
    let activeStreams = 0;
    try {
      const docsSnap = await getDocs(query(collection(db, "documents"), limit(500)));
      const catCounts = {};
      ACADEMIC_CATEGORIES.forEach(c => { catCounts[c.key] = 0; });
      docsSnap.forEach(d => {
        const key = matchCategory(d.data().category);
        if (key && catCounts[key] !== undefined) catCounts[key]++;
      });
      activeStreams = Object.values(catCounts).filter(count => count >= 3).length;
      // Always at least show 1 stream if documents exist
      if (activeStreams === 0 && totalDocs > 0) activeStreams = 1;
    } catch {
      activeStreams = ACADEMIC_CATEGORIES.length; // fallback: all defined categories
    }

    if (streamEl) streamEl.textContent = activeStreams + " Stream" + (activeStreams !== 1 ? "s" : "");

  } catch (err) {
    console.warn("Stats load error:", err);
    // Graceful fallback values
    if (resourceEl) resourceEl.textContent = "500+";
    if (streamEl)   streamEl.textContent = "8 Streams";
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadAcademicResources();
  loadLiveStats(); // Load real Firestore stats for stat pills

  const searchForm = document.getElementById("homeSearchForm");
  if (searchForm) searchForm.addEventListener("submit", window.handleHomeSearch);

  const drawerSearchForm = document.getElementById("drawerSearchForm");
  if (drawerSearchForm) drawerSearchForm.addEventListener("submit", window.handleHomeSearch);

  const signUpForm = document.getElementById("formSignUp");
  if (signUpForm) signUpForm.addEventListener("submit", window.handleEmailSignUp);

  const signInForm = document.getElementById("formSignIn");
  if (signInForm) signInForm.addEventListener("submit", window.handlePasswordSignIn);

  const recoveryForm = document.getElementById("formRecovery");
  if (recoveryForm) recoveryForm.addEventListener("submit", window.handlePasswordRecovery);

  // Close offcanvas menu when any in-page link is clicked
  document.querySelectorAll("#mobileNavDrawer a[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      const drawer = document.getElementById("mobileNavDrawer");
      if (drawer && window.bootstrap) {
        const offcanvas = bootstrap.Offcanvas.getInstance(drawer);
        if (offcanvas) offcanvas.hide();
      }
    });
  });

  // Deep-linked Auth Modals (?action=signin, ?action=signup)
  const urlParams = new URLSearchParams(window.location.search);
  const actionParam = urlParams.get("action") || urlParams.get("auth");
  if (actionParam === "signin" || actionParam === "login") {
    setTimeout(() => { if (window.openSignInModal) window.openSignInModal(); }, 350);
  } else if (actionParam === "signup" || actionParam === "register") {
    setTimeout(() => { if (window.openSignUpModal) window.openSignUpModal(); }, 350);
  }

  // Universal WAI-ARIA modal & offcanvas focus safety listener:
  // Prevents "Blocked aria-hidden on an element because its descendant retained focus"
  document.addEventListener("hide.bs.modal", (e) => {
    if (document.activeElement && e.target && e.target.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });
  document.addEventListener("hidden.bs.modal", (e) => {
    if (document.activeElement && e.target && e.target.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });
  document.addEventListener("hide.bs.offcanvas", (e) => {
    if (document.activeElement && e.target && e.target.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });
});

