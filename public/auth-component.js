/**
 * DPGNotes Shared Authentication & Quota Component
 * Comprehensive zero-dependency client component for Sign In, Sign Up, Forgot Password, and Quota Reach.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider, 
  GithubAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = getApps().find(a => a.name === "dpgnotes") || (!getApps().length ? initializeApp(firebaseConfig, "dpgnotes") : getApps()[0]);
const auth = getAuth(app);
const db = getFirestore(app);

const API_BASE = (window.API_BASE_URL || "").replace(/\/+$/, "");

// State
let pendingUser = null;
let pendingEmail = "";

// Ensure CSS stylesheet is injected
if (!document.getElementById("dpgAuthComponentCss")) {
  const link = document.createElement("link");
  link.id = "dpgAuthComponentCss";
  link.rel = "stylesheet";
  link.href = "/auth-component.css";
  document.head.appendChild(link);
}

// Inject HTML Modals
function injectAuthDOM() {
  if (document.getElementById("dpgAuthOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "dpgAuthOverlay";
  overlay.className = "dpg-auth-overlay";

  overlay.innerHTML = `
    <!-- 1. QUOTA REACHED MODAL (Strictly locked: no close button) -->
    <div id="dpgQuotaReachModal" class="dpg-auth-dialog" style="display:none;">
      
      <div style="text-align:center;">
        <div class="dpg-auth-badge dpg-auth-badge-blue">
          <i class="ri-graduation-cap-fill" style="font-size:1.1rem; color:#818cf8;"></i> Welcome to the DPG Academic Community
        </div>

        <h2 class="dpg-auth-title">Glad You're Finding DPGNotes Helpful!</h2>

        <p class="dpg-auth-subtitle">
          You've reached your free daily preview limit for guest reading. DPGNotes is built for students and educators, and is <strong style="color:#ffffff;">completely free for all verified contributors</strong>. Sign in to your account to enjoy continuous, unlimited access to verified notes, practical manuals, and exam solutions.
        </p>

        <!-- LIVE COUNTDOWN TIMER -->
        <div class="dpg-auth-timer-box">
          <div class="dpg-auth-timer-sub">GUEST PREVIEW RESETS IN</div>
          <div id="dpgQuotaCountdown" class="dpg-auth-timer-num">00:00:00</div>
          <div class="dpg-auth-timer-sub">(HH : MM : SS until midnight UTC)</div>
        </div>

        <!-- OAUTH BUTTONS -->
        <div class="dpg-auth-oauth-row">
          <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-google" onclick="window.dpgLoginGoogle()">
            <i class="ri-google-fill" style="color:#ea4335; font-size:1.2rem;"></i> Google
          </button>
          <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-github" onclick="window.dpgLoginGithub()">
            <i class="ri-github-fill" style="font-size:1.2rem;"></i> GitHub
          </button>
        </div>

        <!-- EMAIL / STUDENT ID BUTTON -->
        <button type="button" class="dpg-auth-btn-secondary" onclick="window.openSignInModal()" style="margin-bottom:1rem;">
          <i class="ri-id-card-line" style="font-size:1.1rem; color:#818cf8;"></i> Sign In with Student ID / Contributor Email
        </button>

        <!-- FOOTER LINKS -->
        <div class="dpg-auth-footer">
          Don't have a contributor account? 
          <a class="dpg-auth-link" onclick="window.openSignUpModal()">Create Free Account</a>
        </div>
        <div style="margin-top:0.6rem; font-size:0.8rem;">
          <a class="dpg-auth-link" onclick="window.openForgotPasswordModal()" style="color:#94a3b8;">Forgot Password?</a>
        </div>
      </div>
    </div>

    <!-- 2. SIGN IN MODAL -->
    <div id="dpgSignInModal" class="dpg-auth-dialog" style="display:none;">
      <button type="button" class="dpg-auth-close-btn" onclick="window.closeAuthModals()" title="Close">&times;</button>
      
      <div id="dpgSignInStep1">
        <div class="dpg-auth-badge dpg-auth-badge-blue">
          <i class="ri-shield-user-fill"></i> Contributor Sign In
        </div>
        <h2 class="dpg-auth-title">Sign In to DPGNotes</h2>
        <p class="dpg-auth-subtitle">Access your personal bookmarks, study materials, and unlimited academic suite tools.</p>

        <div class="dpg-auth-oauth-row">
          <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-google" onclick="window.dpgLoginGoogle()">
            <i class="ri-google-fill" style="color:#ea4335; font-size:1.2rem;"></i> Google
          </button>
          <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-github" onclick="window.dpgLoginGithub()">
            <i class="ri-github-fill" style="font-size:1.2rem;"></i> GitHub
          </button>
        </div>

        <div class="dpg-auth-divider">
          <span>Or with Student / Employee ID</span>
        </div>

        <form id="dpgSignInForm" onsubmit="window.dpgHandleSignIn(event)">
          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Student ID, Employee ID or Email*</label>
            <input type="text" id="dpgLoginIdentifier" class="dpg-auth-input" placeholder="e.g. 2112345678 or student@dpgnotes.app" required autocomplete="username" />
          </div>

          <div class="dpg-auth-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
              <label class="dpg-auth-label" style="margin:0;">Password*</label>
              <a class="dpg-auth-link" onclick="window.openForgotPasswordModal()" style="font-size:0.8rem;">Forgot Password?</a>
            </div>
            <input type="password" id="dpgLoginPassword" class="dpg-auth-input" placeholder="••••••••" required autocomplete="current-password" />
          </div>

          <button type="submit" id="dpgBtnSignInSubmit" class="dpg-auth-btn-primary">
            <i class="ri-login-box-line"></i> Sign In to DPGNotes
          </button>
        </form>

        <div class="dpg-auth-footer">
          Don't have an account? 
          <a class="dpg-auth-link" onclick="window.openSignUpModal()">Create Free Contributor Account</a>
        </div>
      </div>

      <!-- STEP 2: 2FA OTP -->
      <div id="dpgSignInStep2" style="display:none; text-align:center;">
        <div style="font-size:3rem; color:#6366f1; margin-bottom:0.8rem;">
          <i class="ri-shield-keyhole-line"></i>
        </div>
        <h3 class="dpg-auth-title" style="font-size:1.4rem;">Two-Factor Verification</h3>
        <p class="dpg-auth-subtitle">
          We sent a 6-digit security verification code to <strong id="dpg2faEmailTarget" style="color:#ffffff;"></strong>. Enter it below to complete authentication:
        </p>

        <form onsubmit="window.dpgVerify2FA(event)">
          <div class="dpg-auth-form-group" style="max-width:240px; margin:0 auto 1.4rem auto;">
            <input type="text" id="dpg2faInput" class="dpg-auth-input" placeholder="123456" maxlength="6" style="text-align:center; font-size:1.6rem; letter-spacing:6px; font-family:monospace;" required />
          </div>

          <button type="submit" id="dpgBtn2faSubmit" class="dpg-auth-btn-primary">
            <i class="ri-checkbox-circle-line"></i> Verify &amp; Complete Sign In
          </button>
        </form>

        <div style="display:flex; justify-content:space-between; margin-top:1.4rem; font-size:0.84rem;">
          <a class="dpg-auth-link" onclick="window.dpgResend2FA()">Resend Code</a>
          <a class="dpg-auth-link" onclick="window.dpgBackToSignInStep1()" style="color:#94a3b8;">Back to Sign In</a>
        </div>
      </div>
    </div>

    <!-- 3. SIGN UP MODAL -->
    <div id="dpgSignUpModal" class="dpg-auth-dialog modal-wide" style="display:none;">
      <button type="button" class="dpg-auth-close-btn" onclick="window.closeAuthModals()" title="Close">&times;</button>
      
      <div class="dpg-auth-badge dpg-auth-badge-blue">
        <i class="ri-user-add-line"></i> Free Registration
      </div>
      <h2 class="dpg-auth-title">Create Contributor Account</h2>
      <p class="dpg-auth-subtitle">Join thousands of verified students &amp; faculty sharing notes, papers, and lab manuals.</p>

      <div class="dpg-auth-oauth-row">
        <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-google" onclick="window.dpgLoginGoogle()">
          <i class="ri-google-fill" style="color:#ea4335; font-size:1.2rem;"></i> Google
        </button>
        <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-github" onclick="window.dpgLoginGithub()">
          <i class="ri-github-fill" style="font-size:1.2rem;"></i> GitHub
        </button>
      </div>

      <div class="dpg-auth-divider">
        <span>Or register with academic credentials</span>
      </div>

      <form id="dpgSignUpForm" onsubmit="window.dpgHandleSignUp(event)">
        <div class="dpg-auth-grid-2">
          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Role / Classification*</label>
            <select id="dpgSignupRole" class="dpg-auth-input" onchange="window.dpgOnRoleChange()" required>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher / Faculty</option>
            </select>
          </div>

          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Full Name*</label>
            <input type="text" id="dpgSignupName" class="dpg-auth-input" placeholder="e.g. Aman Sharma" required />
          </div>

          <div class="dpg-auth-form-group">
            <label id="dpgSignupIdLabel" class="dpg-auth-label">Student ID / Roll No*</label>
            <input type="text" id="dpgSignupId" class="dpg-auth-input" placeholder="e.g. 2112345678" required />
          </div>

          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Email Address*</label>
            <input type="email" id="dpgSignupEmail" class="dpg-auth-input" placeholder="name@domain.com" required />
          </div>

          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Password* (min 6 characters)</label>
            <input type="password" id="dpgSignupPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" />
          </div>

          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Confirm Password*</label>
            <input type="password" id="dpgSignupConfirmPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" />
          </div>
        </div>

        <button type="submit" id="dpgBtnSignUpSubmit" class="dpg-auth-btn-primary" style="margin-top:0.8rem;">
          <i class="ri-user-follow-line"></i> Create Contributor Account
        </button>
      </form>

      <div class="dpg-auth-footer">
        Already registered? 
        <a class="dpg-auth-link" onclick="window.openSignInModal()">Sign In Here</a>
      </div>
    </div>

    <!-- 4. FORGOT PASSWORD MODAL -->
    <div id="dpgForgotPasswordModal" class="dpg-auth-dialog" style="display:none;">
      <button type="button" class="dpg-auth-close-btn" onclick="window.closeAuthModals()" title="Close">&times;</button>
      
      <div class="dpg-auth-badge dpg-auth-badge-amber">
        <i class="ri-key-2-line"></i> Security Recovery
      </div>
      <h2 class="dpg-auth-title">Reset Password</h2>
      <p class="dpg-auth-subtitle">
        Enter your registered <strong>Student ID, Employee ID, or Email Address</strong>. We will dispatch secure password recovery instructions to your verified email.
      </p>

      <form id="dpgRecoveryForm" onsubmit="window.dpgHandleRecovery(event)">
        <div class="dpg-auth-form-group">
          <label class="dpg-auth-label">Student ID, Employee ID or Email*</label>
          <input type="text" id="dpgRecoveryIdentifier" class="dpg-auth-input" placeholder="e.g. 2112345678 or student@dpgnotes.app" required />
        </div>

        <button type="submit" id="dpgBtnRecoverySubmit" class="dpg-auth-btn-primary">
          <i class="ri-mail-send-line"></i> Send Password Recovery Link
        </button>
      </form>

      <div class="dpg-auth-footer">
        <a class="dpg-auth-link" onclick="window.openSignInModal()">Return to Sign In</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on Escape key (blocked if quota is locked)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (localStorage.getItem("dpg_quota_locked") === "true" || sessionStorage.getItem("dpg_quota_locked") === "true") {
        return;
      }
      window.closeAuthModals();
    }
  });

  // Close on overlay backdrop click (blocked if quota is locked)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      if (localStorage.getItem("dpg_quota_locked") === "true" || sessionStorage.getItem("dpg_quota_locked") === "true") {
        return;
      }
      window.closeAuthModals();
    }
  });

  // Start live countdown timer
  startQuotaCountdown();
}

// Live Reset Countdown Timer
function startQuotaCountdown() {
  function update() {
    const now = new Date();
    const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const diff = Math.max(0, midnightUtc - now);

    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    const el = document.getElementById("dpgQuotaCountdown");
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// Modal Visibility Controls (strictly non-dismissible on quota lock)
window.closeAuthModals = function(force = false) {
  if (!force && (localStorage.getItem("dpg_quota_locked") === "true" || sessionStorage.getItem("dpg_quota_locked") === "true")) {
    window.showQuotaReachedModal();
    return;
  }
  const overlay = document.getElementById("dpgAuthOverlay");
  if (overlay) overlay.classList.remove("active");
  ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
};

function showModal(id) {
  injectAuthDOM();
  const overlay = document.getElementById("dpgAuthOverlay");
  ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(mId => {
    const el = document.getElementById(mId);
    if (el) el.style.display = (mId === id) ? "block" : "none";
  });
  if (overlay) overlay.classList.add("active");
}

window.openSignInModal = function() {
  showModal("dpgSignInModal");
  window.dpgBackToSignInStep1();
};

window.openSignUpModal = function() {
  showModal("dpgSignUpModal");
};

window.openForgotPasswordModal = function() {
  showModal("dpgForgotPasswordModal");
};

window.showQuotaReachedModal = function() {
  showModal("dpgQuotaReachModal");
};

window.dpgBackToSignInStep1 = function() {
  const step1 = document.getElementById("dpgSignInStep1");
  const step2 = document.getElementById("dpgSignInStep2");
  if (step1) step1.style.display = "block";
  if (step2) step2.style.display = "none";
};

window.dpgOnRoleChange = function() {
  const role = document.getElementById("dpgSignupRole")?.value;
  const lbl = document.getElementById("dpgSignupIdLabel");
  const inp = document.getElementById("dpgSignupId");
  if (role === "Teacher") {
    if (lbl) lbl.innerText = "Employee ID / Teacher ID*";
    if (inp) inp.placeholder = "e.g. EMP1024 or FAC77";
  } else {
    if (lbl) lbl.innerText = "Student ID / Roll No*";
    if (inp) inp.placeholder = "e.g. 2112345678 or 22001";
  }
};

// Post Auth Completion Hook
async function completeAuthSuccess(user) {
  localStorage.setItem("dpgActiveUserUid", user.uid);
  localStorage.setItem("dpgActiveUser", JSON.stringify({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0]
  }));

  // Clear guest quota locks
  localStorage.removeItem("dpg_quota_locked");
  sessionStorage.removeItem("dpg_quota_locked");
  document.cookie = "dpg_quota_locked=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  localStorage.removeItem("dpg_quota_visits");
  localStorage.removeItem("dpg_quota_pdfs");

  window.closeAuthModals();

  // If a hard quota overlay style was injected by legacy redirect.js, remove it
  const lockStyle = document.getElementById("quotaLockOverrideStyle");
  if (lockStyle) lockStyle.remove();
  const legacyScreen = document.getElementById("unnegotiableLockedQuotaScreen");
  if (legacyScreen) legacyScreen.remove();

  // Dispatch global event for listeners
  window.dispatchEvent(new CustomEvent("dpg-auth-success", { detail: { user } }));

  // Call optional custom callback or notify user
  if (typeof window.onDpgAuthSuccess === "function") {
    window.onDpgAuthSuccess(user);
  } else {
    if (window.customAlert) {
      await window.customAlert("Welcome back, " + (user.displayName || user.email) + "! You have unlimited contributor access.", { title: "Signed In" });
    }
  }
}

// OAuth Handlers
window.dpgLoginGoogle = async function() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    if (cred && cred.user) {
      await completeAuthSuccess(cred.user);
    }
  } catch(err) {
    console.error("Google sign in error:", err);
    alert("Google Sign-In Error: " + (err.message || err));
  }
};

window.dpgLoginGithub = async function() {
  try {
    const provider = new GithubAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    if (cred && cred.user) {
      await completeAuthSuccess(cred.user);
    }
  } catch(err) {
    console.error("GitHub sign in error:", err);
    alert("GitHub Sign-In Error: " + (err.message || err));
  }
};

// Sign In with Identifier / Email + Password
window.dpgHandleSignIn = async function(e) {
  e.preventDefault();
  const identifier = document.getElementById("dpgLoginIdentifier")?.value.trim();
  const password = document.getElementById("dpgLoginPassword")?.value;
  const btn = document.getElementById("dpgBtnSignInSubmit");

  if (!identifier || !password) return alert("Please enter your identifier and password.");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Verifying Credentials...`;
  }

  let resolvedEmail = identifier;
  if (!identifier.includes('@')) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        throw new Error(data.error || "No account found matching this Student / Employee ID.");
      }
      resolvedEmail = data.email;
    } catch(err) {
      // Fallback to client Firestore query
      try {
        const snap = await getDocs(query(collection(db, "users"), where("studentIdOrEmployeeId", "==", identifier)));
        if (snap.empty) {
          throw new Error("No account found matching ID: " + identifier);
        }
        resolvedEmail = snap.docs[0].data().email;
      } catch(fErr) {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ri-login-box-line"></i> Sign In to DPGNotes`; }
        return alert(fErr.message || "Failed to resolve identifier.");
      }
    }
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
    pendingUser = cred.user;
    pendingEmail = resolvedEmail;

    // Check 2FA preference in Firestore
    let twoFaEnabled = true;
    try {
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists() && userDoc.data().twoFactorEnabled === false) {
        twoFaEnabled = false;
      }
    } catch(docErr) {
      console.warn("Could not check 2FA preference:", docErr);
    }

    if (!twoFaEnabled) {
      // 2FA disabled: login immediately
      await completeAuthSuccess(cred.user);
      return;
    }

    // Dispatch 2FA OTP
    try {
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resolvedEmail, purpose: "2fa" })
      });
    } catch(otpErr) {
      console.warn("2FA dispatch error:", otpErr);
    }

    // Switch to Step 2
    const step1 = document.getElementById("dpgSignInStep1");
    const step2 = document.getElementById("dpgSignInStep2");
    const emailTarget = document.getElementById("dpg2faEmailTarget");
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
    if (emailTarget) emailTarget.textContent = resolvedEmail;

  } catch(authErr) {
    alert(authErr);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-login-box-line"></i> Sign In to DPGNotes`;
    }
  }
};

// 2FA OTP Verification
window.dpgVerify2FA = async function(e) {
  e.preventDefault();
  const code = document.getElementById("dpg2faInput")?.value.trim();
  const btn = document.getElementById("dpgBtn2faSubmit");

  if (!code || code.length !== 6) {
    return alert("Please enter the 6-digit verification code.");
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Verifying...`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, otp: code, purpose: "2fa" })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Invalid or expired verification code.");
    }

    // Verification succeeded
    if (pendingUser) {
      await completeAuthSuccess(pendingUser);
    } else {
      window.closeAuthModals();
      location.reload();
    }
  } catch(err) {
    alert("Verification Error: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-checkbox-circle-line"></i> Verify &amp; Complete Sign In`;
    }
  }
};

window.dpgResend2FA = async function() {
  if (!pendingEmail) return alert("Session expired. Please sign in again.");
  try {
    await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, purpose: "2fa" })
    });
    alert("A new verification code was sent to " + pendingEmail);
  } catch(err) {
    alert("Failed to resend code: " + err.message);
  }
};

// Sign Up Handler
window.dpgHandleSignUp = async function(e) {
  e.preventDefault();
  const role = document.getElementById("dpgSignupRole")?.value;
  const name = document.getElementById("dpgSignupName")?.value.trim();
  const studentId = document.getElementById("dpgSignupId")?.value.trim();
  const email = document.getElementById("dpgSignupEmail")?.value.trim();
  const password = document.getElementById("dpgSignupPassword")?.value;
  const confirmPassword = document.getElementById("dpgSignupConfirmPassword")?.value;
  const btn = document.getElementById("dpgBtnSignUpSubmit");

  if (!name || !studentId || !email || !password) return alert("Please fill all required fields.");
  if (password.length < 6) return alert("Password must be at least 6 characters.");
  if (password !== confirmPassword) return alert("Passwords do not match.");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Creating Account...`;
  }

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

    // Save profile to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      userType: role,
      studentIdOrEmployeeId: studentId,
      passwordHash: passwordHash,
      createdAt: serverTimestamp()
    }, { merge: true });

    // Optional welcome email
    fetch(`${API_BASE}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name })
    }).catch(console.warn);

    await completeAuthSuccess(user);
  } catch(err) {
    alert(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-user-follow-line"></i> Create Contributor Account`;
    }
  }
};

// Forgot Password Handler
window.dpgHandleRecovery = async function(e) {
  e.preventDefault();
  const rawId = document.getElementById("dpgRecoveryIdentifier")?.value.trim();
  const btn = document.getElementById("dpgBtnRecoverySubmit");

  if (!rawId) return alert("Please enter your Student ID or Email.");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Sending Link...`;
  }

  let targetEmail = rawId;
  if (!rawId.includes('@')) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: rawId })
      });
      const data = await res.json();
      if (!data.found) throw new Error("No account found with this ID.");
      targetEmail = data.email;
    } catch(err) {
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ri-mail-send-line"></i> Send Password Recovery Link`; }
      return alert("Account lookup failed. Please enter your registered email address.");
    }
  }

  try {
    await sendPasswordResetEmail(auth, targetEmail);
    fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, purpose: "recovery" })
    }).catch(console.warn);

    alert("Password reset instructions have been sent to: " + targetEmail + "\nPlease check your email inbox.");
    window.closeAuthModals();
  } catch(err) {
    alert("Recovery failed: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-mail-send-line"></i> Send Password Recovery Link`;
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectAuthDOM);
} else {
  injectAuthDOM();
}

// Global Auth Guard: Can be called on pages requiring Contributor Authentication
window.requireContributorAuth = function() {
  const activeUid = localStorage.getItem("dpgActiveUserUid");
  if (activeUid || auth.currentUser) return true;

  // Show Sign In modal directly
  window.openSignInModal();
  return false;
};
