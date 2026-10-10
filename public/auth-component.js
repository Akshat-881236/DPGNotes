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
  signInWithCustomToken,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
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
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

// Guarantee custom modals for alert() and confirm() globally across all environments
if (typeof window !== 'undefined' && typeof window.customAlert !== 'function' && typeof document !== 'undefined') {
  if (!document.querySelector('script[src*="custom-dialogs.js"]')) {
    const s = document.createElement('script');
    s.src = '/custom-dialogs.js';
    (document.head || document.documentElement).appendChild(s);
  }
}

const app = getApps().find(a => a.name === "dpgnotes") || (!getApps().length ? initializeApp(firebaseConfig, "dpgnotes") : getApps()[0]);
const auth = getAuth(app);
const db = getFirestore(app);

const API_BASE = (window.API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : 'https://dpgnotes.onrender.com')).replace(/\/+$/, "");

// State
let pendingUser = null;
let pendingEmail = "";
let pendingRecoveryEmail = "";

// Friendly Firebase Auth Error Translator
function getFriendlyAuthError(err) {
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
    return "Too many failed attempts. For your security, access is temporarily locked. Please wait a few moments or reset your password.";
  }
  if (code.includes("network-request-failed")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }
  if (code.includes("user-disabled")) {
    return "This contributor account has been disabled. Please contact the platform Helpdesk.";
  }
  return (err && err.message) || "Authentication failed. Please verify your details and try again.";
}
window.getFriendlyAuthError = getFriendlyAuthError;

function showDpgError(boxId, msg, inputId) {
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
window.showDpgError = showDpgError;

function clearDpgError(boxId, inputId) {
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
window.clearDpgError = clearDpgError;

// Never show previous log credentials: clean purge of cookies, session, and input caches
window.dpgPurgeCredentials = function() {
  try {
    localStorage.removeItem("dpgActiveUser");
    localStorage.removeItem("dpgActiveUserUid");
    sessionStorage.removeItem("dpgActiveUser");
    sessionStorage.removeItem("dpgActiveUserUid");

    // Clear all auth session cookies
    const cookiesToPurge = ["dpgActiveUser", "dpgActiveUserUid", "dpg_user", "dpg_auth", "dpg_token"];
    cookiesToPurge.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    });

    // Clear and reset all auth forms and inputs across DOM
    ["dpgSignInForm", "dpgSignUpForm", "dpgRecoveryForm", "formSignIn", "formSignUp", "formRecovery"].forEach(fId => {
      const f = document.getElementById(fId);
      if (f && typeof f.reset === "function") f.reset();
    });

    ["dpgLoginIdentifier", "dpgLoginPassword", "dpg2faInput", "dpgSignupName", "dpgSignupId", "dpgSignupEmail", "dpgSignupPassword", "dpgSignupConfirmPassword", "dpgRecoveryIdentifier", "loginIdentifier", "loginPassword", "signupName", "signupStudentId", "signupContact", "signupEmail", "signupLinkedin", "signupGithub", "signupPassword", "signupConfirmPassword", "recoveryIdentifier"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = "";
        el.classList.remove("dpg-input-error");
      }
    });
  } catch(e) {
    console.warn("dpgPurgeCredentials notice:", e);
  }
};

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

        <!-- INLINE ERROR ALERT -->
        <div id="dpgSignInError" class="dpg-auth-alert-error dpg-alert-hidden" role="alert"></div>

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

        <form id="dpgSignInForm" onsubmit="window.dpgHandleSignIn(event)" autocomplete="off">
          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Student ID, Employee ID or Email*</label>
            <input type="text" id="dpgLoginIdentifier" class="dpg-auth-input" placeholder="e.g. 2112345678 or student@dpgnotes.app" required autocomplete="off" data-lpignore="true" oninput="window.clearDpgError('dpgSignInError', 'dpgLoginIdentifier')" />
          </div>

          <div class="dpg-auth-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
              <label class="dpg-auth-label" style="margin:0;">Password*</label>
              <a class="dpg-auth-link" onclick="window.openForgotPasswordModal()" style="font-size:0.8rem;">Forgot Password?</a>
            </div>
            <input type="password" id="dpgLoginPassword" class="dpg-auth-input" placeholder="••••••••" required autocomplete="new-password" data-lpignore="true" oninput="window.clearDpgError('dpgSignInError', 'dpgLoginPassword')" />
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

      <!-- INLINE ERROR ALERT -->
      <div id="dpgSignUpError" class="dpg-auth-alert-error dpg-alert-hidden" role="alert"></div>

      <div class="dpg-auth-oauth-row">
        <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-google" onclick="window.dpgLoginGoogle()">
          <i class="ri-google-fill" style="color:#ea4335; font-size:1.2rem;"></i> Google
        </button>
        <button type="button" class="dpg-auth-btn-oauth dpg-auth-btn-github" onclick="window.dpgLoginGithub()">
          <i class="ri-github-fill" style="font-size:1.2rem;"></i> GitHub
        </button>
      </div>

      <!-- SIGNUP STEP 1: CREDENTIALS INPUT -->
      <div id="dpgSignUpStep1">
        <div class="dpg-auth-divider">
          <span>Or register with academic credentials</span>
        </div>

        <form id="dpgSignUpForm" onsubmit="window.dpgHandleSignUp(event)" autocomplete="off">
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
              <input type="text" id="dpgSignupName" class="dpg-auth-input" placeholder="e.g. Aman Sharma" required autocomplete="off" data-lpignore="true" oninput="window.clearDpgError('dpgSignUpError', 'dpgSignupName')" />
            </div>

            <div class="dpg-auth-form-group">
              <label id="dpgSignupIdLabel" class="dpg-auth-label">Student ID / Roll No*</label>
              <input type="text" id="dpgSignupId" class="dpg-auth-input" placeholder="e.g. 2112345678" required autocomplete="off" data-lpignore="true" oninput="window.clearDpgError('dpgSignUpError', 'dpgSignupId')" />
            </div>

            <div class="dpg-auth-form-group">
              <label class="dpg-auth-label">Email Address*</label>
              <input type="email" id="dpgSignupEmail" class="dpg-auth-input" placeholder="name@domain.com" required autocomplete="off" data-lpignore="true" oninput="window.clearDpgError('dpgSignUpError', 'dpgSignupEmail')" />
            </div>

            <div class="dpg-auth-form-group">
              <label class="dpg-auth-label">Password* (min 6 characters)</label>
              <input type="password" id="dpgSignupPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" data-lpignore="true" oninput="window.clearDpgError('dpgSignUpError', 'dpgSignupPassword')" />
            </div>

            <div class="dpg-auth-form-group">
              <label class="dpg-auth-label">Confirm Password*</label>
              <input type="password" id="dpgSignupConfirmPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" data-lpignore="true" oninput="window.clearDpgError('dpgSignUpError', 'dpgSignupConfirmPassword')" />
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

      <!-- SIGNUP STEP 2: EMAIL VERIFICATION REQUIRED -->
      <div id="dpgSignUpStep2" style="display:none; text-align:center; padding-top:0.5rem;">
        <div style="font-size:2.8rem; color:#38bdf8; margin-bottom:0.5rem;">
          <i class="ri-mail-check-line"></i>
        </div>
        <h3 class="dpg-auth-title" style="font-size:1.35rem;">Verify Your Email</h3>
        <p class="dpg-auth-subtitle" style="margin-bottom:0.8rem;">
          A verification link and 6-digit code was dispatched to <strong id="dpgVerifyTargetEmail" style="color:#ffffff;"></strong>.
        </p>
        <p style="font-size:0.82rem; color:#94a3b8; margin-bottom:1.1rem; line-height:1.4;">
          To activate your DPGNotes contributor profile and grant access, verify email ownership using either option below:
        </p>

        <!-- INLINE ERROR ALERT FOR SIGNUP STEP 2 -->
        <div id="dpgVerifyError" class="dpg-auth-alert-error dpg-alert-hidden" role="alert"></div>

        <form id="dpgSignupOtpForm" onsubmit="window.dpgSubmitSignupOtp(event)" autocomplete="off">
          <div class="dpg-auth-form-group" style="max-width:240px; margin:0 auto 0.8rem auto;">
            <label class="dpg-auth-label" style="text-align:center;">Enter 6-Digit Email Code</label>
            <input type="text" id="dpgSignupOtpInput" class="dpg-auth-input" placeholder="123456" maxlength="6" style="text-align:center; font-size:1.6rem; letter-spacing:6px; font-family:monospace; font-weight:700;" autocomplete="off" oninput="window.dpgOnSignupOtpInput(this)" />
          </div>
          <button type="submit" id="dpgBtnSignupOtpSubmit" class="dpg-auth-btn-primary" style="margin-bottom:0.6rem;">
            <i class="ri-checkbox-circle-line"></i> Verify Code &amp; Activate Account
          </button>
        </form>

        <button type="button" id="dpgBtnCheckVerification" class="dpg-auth-btn-secondary" style="width:100%; margin-bottom:0.6rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:white; padding:9px; border-radius:8px; cursor:pointer; font-size:0.85rem;" onclick="window.dpgCheckVerificationStatus()">
          <i class="ri-refresh-line"></i> I Clicked the Link in My Email
        </button>

        <div style="display:flex; justify-content:space-between; margin-top:1rem; font-size:0.84rem;">
          <a class="dpg-auth-link" onclick="window.dpgResendVerificationEmail()">Resend Verification Link</a>
          <a class="dpg-auth-link" onclick="window.dpgBackToSignupStep1()" style="color:#94a3b8;">Back to Details</a>
        </div>
      </div>
    </div>

    <!-- 4. FORGOT PASSWORD MODAL (2-Step OTP Password Reset) -->
    <div id="dpgForgotPasswordModal" class="dpg-auth-dialog" style="display:none;">
      <button type="button" class="dpg-auth-close-btn" onclick="window.closeAuthModals()" title="Close">&times;</button>
      
      <!-- RECOVERY STEP 1: IDENTIFIER LOOKUP -->
      <div id="dpgRecoveryStep1">
        <div class="dpg-auth-badge dpg-auth-badge-amber">
          <i class="ri-key-2-line"></i> Security Recovery
        </div>
        <h2 class="dpg-auth-title">Reset Password</h2>
        <p class="dpg-auth-subtitle">
          Enter your registered <strong>Student ID, Employee ID, or Email Address</strong>. We will dispatch secure password recovery instructions and a 6-digit verification code.
        </p>

        <!-- INLINE ERROR ALERT -->
        <div id="dpgRecoveryError" class="dpg-auth-alert-error dpg-alert-hidden" role="alert"></div>

        <form id="dpgRecoveryForm" onsubmit="window.dpgHandleRecovery(event)" autocomplete="off">
          <div class="dpg-auth-form-group">
            <label class="dpg-auth-label">Student ID, Employee ID or Email*</label>
            <input type="text" id="dpgRecoveryIdentifier" class="dpg-auth-input" placeholder="e.g. 2112345678 or student@dpgnotes.app" required autocomplete="off" data-lpignore="true" oninput="window.clearDpgError('dpgRecoveryError', 'dpgRecoveryIdentifier')" />
          </div>

          <button type="submit" id="dpgBtnRecoverySubmit" class="dpg-auth-btn-primary">
            <i class="ri-mail-send-line"></i> Send Password Recovery Code
          </button>
        </form>

        <div class="dpg-auth-footer">
          <a class="dpg-auth-link" onclick="window.openSignInModal()">Return to Sign In</a>
        </div>
      </div>

      <!-- RECOVERY STEP 2: OTP VERIFICATION & NEW PASSWORD -->
      <div id="dpgRecoveryStep2" style="display:none; text-align:center;">
        <div style="font-size:2.8rem; color:#f59e0b; margin-bottom:0.6rem;">
          <i class="ri-lock-password-line"></i>
        </div>
        <h3 class="dpg-auth-title" style="font-size:1.4rem;">Enter Verification Code</h3>
        <p class="dpg-auth-subtitle">
          We sent a 6-digit recovery code to <strong id="dpgRecoveryEmailTarget" style="color:#ffffff;"></strong>. Enter the code and choose your new password below:
        </p>

        <!-- INLINE ERROR ALERT FOR STEP 2 -->
        <div id="dpgRecoveryOtpError" class="dpg-auth-alert-error dpg-alert-hidden" role="alert"></div>

        <form id="dpgRecoveryOtpForm" onsubmit="window.dpgSubmitRecoveryOtp(event)" autocomplete="off">
          <div class="dpg-auth-form-group" style="max-width:240px; margin:0 auto 1.1rem auto;">
            <label class="dpg-auth-label" style="text-align:center;">6-Digit Recovery Code*</label>
            <input type="text" id="dpgRecoveryOtpInput" class="dpg-auth-input" placeholder="123456" maxlength="6" style="text-align:center; font-size:1.6rem; letter-spacing:6px; font-family:monospace; font-weight:700;" required autocomplete="off" oninput="window.clearDpgError('dpgRecoveryOtpError', 'dpgRecoveryOtpInput')" />
          </div>

          <div class="dpg-auth-form-group" style="text-align:left; margin-bottom:0.9rem;">
            <label class="dpg-auth-label">New Password* (min 6 characters)</label>
            <input type="password" id="dpgRecoveryNewPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" data-lpignore="true" oninput="window.clearDpgError('dpgRecoveryOtpError', 'dpgRecoveryNewPassword')" />
          </div>

          <div class="dpg-auth-form-group" style="text-align:left; margin-bottom:1.2rem;">
            <label class="dpg-auth-label">Confirm New Password*</label>
            <input type="password" id="dpgRecoveryConfirmPassword" class="dpg-auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" data-lpignore="true" oninput="window.clearDpgError('dpgRecoveryOtpError', 'dpgRecoveryConfirmPassword')" />
          </div>

          <button type="submit" id="dpgBtnRecoveryOtpSubmit" class="dpg-auth-btn-primary">
            <i class="ri-checkbox-circle-line"></i> Reset Password &amp; Sign In
          </button>
        </form>

        <div style="display:flex; justify-content:space-between; margin-top:1.2rem; font-size:0.84rem;">
          <a class="dpg-auth-link" onclick="window.dpgResendRecoveryOtp()">Resend Code</a>
          <a class="dpg-auth-link" onclick="window.dpgBackToRecoveryStep1()" style="color:#94a3b8;">Back</a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on Escape key (blocked if quota is locked or in OTP verification step)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (localStorage.getItem("dpg_quota_locked") === "true" || sessionStorage.getItem("dpg_quota_locked") === "true") {
        return;
      }
      const isSignInOtp = document.getElementById("dpgSignInStep2")?.style.display !== "none" && pendingUser;
      const isRecoveryOtp = document.getElementById("dpgRecoveryStep2")?.style.display !== "none";
      if (isSignInOtp || isRecoveryOtp) {
        return;
      }
      window.closeAuthModals();
    }
  });

  // Close on overlay backdrop click (blocked if quota is locked or during OTP verification)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      if (localStorage.getItem("dpg_quota_locked") === "true" || sessionStorage.getItem("dpg_quota_locked") === "true") {
        return;
      }
      const isSignInOtp = document.getElementById("dpgSignInStep2")?.style.display !== "none" && pendingUser;
      const isRecoveryOtp = document.getElementById("dpgRecoveryStep2")?.style.display !== "none";
      if (isSignInOtp || isRecoveryOtp) {
        // User is actively verifying OTP; do NOT dismiss on tab switch or backdrop click!
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

// ============================================================================
// DPGNOTES HIGH-LEVEL ANTI-BYPASS & DEVTOOLS GUARDIAN ENGINE
// Prevents inspection-mode element deletion, CSS disabling, and quota bypasses
// ============================================================================
let _dpgTamperObserver = null;
let _dpgWatchdogTimer = null;
let _dpgAntiDebugTimer = null;
let _authBypassPermitted = false;

function isQuotaLocked() {
  return localStorage.getItem("dpg_quota_locked") === "true" ||
         sessionStorage.getItem("dpg_quota_locked") === "true" ||
         (typeof document !== 'undefined' && document.cookie.includes("dpg_quota_locked=true"));
}

function allowAuthUnlock() {
  _authBypassPermitted = true;
  try {
    localStorage.removeItem("dpg_quota_locked");
    sessionStorage.removeItem("dpg_quota_locked");
    document.cookie = "dpg_quota_locked=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("dpg_quota_visits");
    localStorage.removeItem("dpg_quota_pdfs");
  } catch(e) {}
  enforceLockdownShield(false);
  setTimeout(() => { _authBypassPermitted = false; }, 1000);
}

// Hook Storage API to prevent removing dpg_quota_locked from console
(function installStorageGuard() {
  try {
    const origLocalRemove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) {
      if (key === 'dpg_quota_locked' && isQuotaLocked() && !_authBypassPermitted) {
        console.warn("[DPG-SECURITY] Quota lock key tampering intercepted.");
        return;
      }
      return origLocalRemove.apply(this, arguments);
    };
    const origLocalClear = Storage.prototype.clear;
    Storage.prototype.clear = function() {
      const wasLocked = isQuotaLocked();
      const res = origLocalClear.apply(this, arguments);
      if (wasLocked && !_authBypassPermitted) {
        localStorage.setItem("dpg_quota_locked", "true");
        sessionStorage.setItem("dpg_quota_locked", "true");
        document.cookie = "dpg_quota_locked=true;path=/;max-age=86400;SameSite=Lax";
      }
      return res;
    };
    window.addEventListener('storage', (e) => {
      if (e.key === 'dpg_quota_locked' && e.newValue !== 'true' && isQuotaLocked() && !_authBypassPermitted) {
        localStorage.setItem('dpg_quota_locked', 'true');
        sessionStorage.setItem('dpg_quota_locked', 'true');
      }
    });
  } catch(e) {}
})();

// Block DevTools shortcuts on Desktop/Laptop in capture phase
function blockDevToolsKeybindings(e) {
  const isKeyF12 = e.key === 'F12' || e.keyCode === 123;
  const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73);
  const isCtrlShiftJ = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74);
  const isCtrlShiftC = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67);
  const isCtrlU = (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85);
  const isCtrlS = (e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83);

  if (isKeyF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC || isCtrlU || isCtrlS) {
    if (isQuotaLocked() || isKeyF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC || isCtrlU) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (isQuotaLocked()) {
        enforceLockdownShield(true);
      }
      return false;
    }
  }
}
window.addEventListener('keydown', blockDevToolsKeybindings, true);

// Block ContextMenu (Right Click Inspect) when quota is locked
window.addEventListener('contextmenu', function(e) {
  if (isQuotaLocked()) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
}, true);

function ensureLockdownShieldElement() {
  if (typeof document === 'undefined' || !document.body) return null;
  let shield = document.getElementById('dpgLockdownShield');
  if (!shield) {
    shield = document.createElement('div');
    shield.id = 'dpgLockdownShield';
    shield.innerHTML = `
      <div style="text-align:center; padding:2rem; max-width:440px; color:#f8fafc; font-family:'Outfit',sans-serif; z-index:2147483647;">
        <div style="font-size:2.8rem; margin-bottom:1rem; color:#ef4444;"><i class="ri-shield-keyhole-fill"></i></div>
        <h2 style="font-size:1.4rem; font-weight:800; margin-bottom:0.5rem;">Access Boundary Enforced</h2>
        <p style="color:#94a3b8; font-size:0.88rem; line-height:1.5;">Guest preview limit active. Please complete sign-in or create a free contributor account to resume reading.</p>
        <button type="button" onclick="window.showQuotaReachedModal()" style="margin-top:1.2rem; background:#6366f1; color:white; border:none; padding:10px 22px; border-radius:10px; font-weight:700; cursor:pointer;">
          Open Verification Modal
        </button>
      </div>
    `;
    document.body.insertBefore(shield, document.body.firstChild);
  }
  return shield;
}

function enforceLockdownShield(active) {
  if (typeof document === 'undefined' || !document.body) return;

  if (active) {
    document.documentElement.classList.add("dpg-quota-locked-state");
    document.body.classList.add("dpg-quota-locked-state");

    ensureLockdownShieldElement();
    injectAuthDOM();

    const overlay = document.getElementById("dpgAuthOverlay");
    if (overlay) {
      if (!document.body.contains(overlay)) {
        document.body.appendChild(overlay);
      }
      overlay.classList.add("active");
      overlay.style.setProperty("display", "flex", "important");
      overlay.style.setProperty("visibility", "visible", "important");
      overlay.style.setProperty("opacity", "1", "important");
      overlay.style.setProperty("z-index", "2147483647", "important");
    }

    // Ensure at least one auth modal is visible inside overlay
    const anyModalVisible = ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].some(mId => {
      const el = document.getElementById(mId);
      return el && el.style.display !== 'none';
    });
    if (!anyModalVisible) {
      const qModal = document.getElementById("dpgQuotaReachModal");
      if (qModal) qModal.style.setProperty("display", "block", "important");
    }

    // Initialize Active MutationObserver
    if (!_dpgTamperObserver && window.MutationObserver) {
      _dpgTamperObserver = new MutationObserver(function(mutations) {
        if (!isQuotaLocked() || _authBypassPermitted) return;
        let tampered = false;

        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.type === 'childList') {
            for (let j = 0; j < m.removedNodes.length; j++) {
              const node = m.removedNodes[j];
              if (node && (node.id === 'dpgAuthOverlay' || node.id === 'dpgQuotaReachModal' || node.id === 'dpgLockdownShield')) {
                tampered = true;
                break;
              }
            }
          }
          if (m.type === 'attributes') {
            const target = m.target;
            if (target === document.body || target === document.documentElement) {
              if (!target.classList.contains('dpg-quota-locked-state')) {
                tampered = true;
              }
            }
            if (target && target.id === 'dpgAuthOverlay') {
              if (!target.classList.contains('active') || target.style.display === 'none' || target.style.visibility === 'hidden') {
                tampered = true;
              }
            }
          }
        }

        if (tampered) {
          enforceLockdownShield(true);
          try { console.clear(); } catch(e){}
        }
      });

      _dpgTamperObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden', 'id']
      });
    }

    // High-frequency watchdog timer (250ms)
    if (!_dpgWatchdogTimer) {
      _dpgWatchdogTimer = setInterval(function() {
        if (isQuotaLocked() && !_authBypassPermitted) {
          const ov = document.getElementById("dpgAuthOverlay");
          const isBodyLocked = document.body && document.body.classList.contains("dpg-quota-locked-state");
          if (!ov || !document.body.contains(ov) || !ov.classList.contains("active") || !isBodyLocked) {
            enforceLockdownShield(true);
          }
        }
      }, 250);
    }

    // Anti-debugging & DevTools timing trap (1000ms)
    if (!_dpgAntiDebugTimer) {
      _dpgAntiDebugTimer = setInterval(function() {
        if (!isQuotaLocked() || _authBypassPermitted) return;

        // Check if DevTools is docked on Desktop / Laptop
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        const isDevToolsDocked = widthDiff > 160 || heightDiff > 160;

        const start = performance.now();
        (function antiInspectDebugger() { debugger; })();
        const elapsed = performance.now() - start;

        if (isDevToolsDocked || elapsed > 100) {
          try { console.clear(); } catch(e){}
          enforceLockdownShield(true);
        }
      }, 1000);
    }
  } else {
    document.documentElement.classList.remove("dpg-quota-locked-state");
    document.body.classList.remove("dpg-quota-locked-state");

    if (_dpgTamperObserver) {
      _dpgTamperObserver.disconnect();
      _dpgTamperObserver = null;
    }
    if (_dpgWatchdogTimer) {
      clearInterval(_dpgWatchdogTimer);
      _dpgWatchdogTimer = null;
    }
    if (_dpgAntiDebugTimer) {
      clearInterval(_dpgAntiDebugTimer);
      _dpgAntiDebugTimer = null;
    }

    const shield = document.getElementById('dpgLockdownShield');
    if (shield) shield.remove();
  }
}

// Modal Visibility Controls (strictly non-dismissible on quota lock)
window.closeAuthModals = function(force = false) {
  if (!force && !_authBypassPermitted && isQuotaLocked()) {
    window.showQuotaReachedModal();
    return;
  }
  const overlay = document.getElementById("dpgAuthOverlay");
  if (overlay) {
    // Release keyboard/browser focus from inside modal to prevent aria-hidden warnings
    if (document.activeElement && overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    overlay.classList.remove("active");
  }
  ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  // Clear entered password fields on modal close
  ["dpgLoginPassword", "dpgSignupPassword", "dpgSignupConfirmPassword"].forEach(pId => {
    const pEl = document.getElementById(pId);
    if (pEl) pEl.value = "";
  });
};

function showModal(id) {
  injectAuthDOM();
  const overlay = document.getElementById("dpgAuthOverlay");

  // Close any legacy Bootstrap modals or mobile drawers cleanly
  ["guestPromptModal", "signInModal", "signUpModal", "forgotPasswordModal"].forEach(mId => {
    const el = document.getElementById(mId);
    if (el && window.bootstrap) {
      const inst = bootstrap.Modal.getInstance(el);
      if (inst) inst.hide();
    }
  });
  const drawer = document.getElementById("mobileNavDrawer");
  if (drawer && window.bootstrap) {
    const offcanvas = bootstrap.Offcanvas.getInstance(drawer);
    if (offcanvas) offcanvas.hide();
  }

  // Never show previous log credentials: clean reset of forms and fields
  ["dpgSignInForm", "dpgSignUpForm", "dpgRecoveryForm", "dpgRecoveryOtpForm"].forEach(fId => {
    const f = document.getElementById(fId);
    if (f && typeof f.reset === "function") f.reset();
  });
  ["dpgLoginIdentifier", "dpgLoginPassword", "dpgSignupName", "dpgSignupId", "dpgSignupEmail", "dpgSignupPassword", "dpgSignupConfirmPassword", "dpgRecoveryIdentifier", "dpgRecoveryOtpInput", "dpgRecoveryNewPassword", "dpgRecoveryConfirmPassword"].forEach(iId => {
    const el = document.getElementById(iId);
    if (el) {
      el.value = "";
      el.classList.remove("dpg-input-error");
    }
  });
  if (!pendingUser) {
    const el = document.getElementById("dpg2faInput");
    if (el) { el.value = ""; el.classList.remove("dpg-input-error"); }
  }
  ["dpgSignInError", "dpgSignUpError", "dpgRecoveryError", "dpgRecoveryOtpError"].forEach(eId => clearDpgError(eId));

  ["dpgQuotaReachModal", "dpgSignInModal", "dpgSignUpModal", "dpgForgotPasswordModal"].forEach(mId => {
    const el = document.getElementById(mId);
    if (el) el.style.display = (mId === id) ? "block" : "none";
  });
  if (overlay) overlay.classList.add("active");
}

window.openSignInModal = function(forceReset = false) {
  const is2FaPending = Boolean(pendingUser && pendingEmail);
  showModal("dpgSignInModal");
  if (!is2FaPending || forceReset) {
    window.dpgBackToSignInStep1();
  } else {
    const step1 = document.getElementById("dpgSignInStep1");
    const step2 = document.getElementById("dpgSignInStep2");
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
    const emailTarget = document.getElementById("dpg2faEmailTarget");
    if (emailTarget && pendingEmail) emailTarget.textContent = pendingEmail;
  }
};

window.openSignUpModal = function() {
  showModal("dpgSignUpModal");
};

window.openForgotPasswordModal = function() {
  showModal("dpgForgotPasswordModal");
  window.dpgBackToRecoveryStep1();
};

window.showQuotaReachedModal = function() {
  localStorage.setItem("dpg_quota_locked", "true");
  sessionStorage.setItem("dpg_quota_locked", "true");
  document.cookie = "dpg_quota_locked=true;path=/;max-age=86400;SameSite=Lax";
  if (!window.location.pathname.includes('quota-lockdown.html')) {
    window.location.href = "https://dpgnotes.web.app/quota-lockdown.html?returnUrl=" + encodeURIComponent(window.location.href);
    return;
  }
  showModal("dpgQuotaReachModal");
  enforceLockdownShield(true);
};

window.dpgBackToSignInStep1 = function() {
  pendingUser = null;
  pendingEmail = "";
  const step1 = document.getElementById("dpgSignInStep1");
  const step2 = document.getElementById("dpgSignInStep2");
  if (step1) step1.style.display = "block";
  if (step2) step2.style.display = "none";
  const inp2fa = document.getElementById("dpg2faInput");
  if (inp2fa) inp2fa.value = "";
};

window.dpgBackToRecoveryStep1 = function() {
  const step1 = document.getElementById("dpgRecoveryStep1");
  const step2 = document.getElementById("dpgRecoveryStep2");
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

  // Clear guest quota locks via authorized unlock method
  allowAuthUnlock();
  window.closeAuthModals(true);

  // If a hard quota overlay style was injected by legacy redirect.js, remove it
  const lockStyle = document.getElementById("quotaLockOverrideStyle");
  if (lockStyle) lockStyle.remove();
  const legacyScreen = document.getElementById("unnegotiableLockedQuotaScreen");
  if (legacyScreen) legacyScreen.remove();

  // Handle post-auth redirect if specified via URL parameters (isSignIn=true&redirect-to=...)
  const authRedirect = sessionStorage.getItem("dpg_auth_redirect") || localStorage.getItem("dpg_auth_redirect");
  if (authRedirect) {
    sessionStorage.removeItem("dpg_auth_redirect");
    localStorage.removeItem("dpg_auth_redirect");
    window.location.href = authRedirect;
    return;
  }

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
      try {
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          name: cred.user.displayName || "Google Contributor",
          email: cred.user.email,
          userType: "Student",
          isVerified: true,
          emailVerified: true,
          status: 'active',
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      } catch (docErr) {
        console.warn("Could not save Google profile:", docErr);
      }
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
  clearDpgError("dpgSignInError");

  const rawIdentifier = document.getElementById("dpgLoginIdentifier")?.value.trim() || "";
  const password = document.getElementById("dpgLoginPassword")?.value || "";
  const btn = document.getElementById("dpgBtnSignInSubmit");

  if (!rawIdentifier) {
    showDpgError("dpgSignInError", "Please enter your Student ID, Employee ID, or registered Email.", "dpgLoginIdentifier");
    return;
  }
  if (!password) {
    showDpgError("dpgSignInError", "Please enter your password.", "dpgLoginPassword");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Verifying Credentials...`;
  }

  let resolvedEmail = rawIdentifier;
  if (!rawIdentifier.includes('@')) {
    let resolved = false;
    // 1. Try backend API with fast 3.5s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: rawIdentifier }),
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
    } catch(apiErr) {
      console.warn("Backend resolve fallback, querying Firestore directly:", apiErr.message);
    }

    // 2. Direct client Firestore query fallback checking both fields & casing
    if (!resolved) {
      try {
        const candidates = [rawIdentifier, rawIdentifier.toUpperCase(), rawIdentifier.toLowerCase()];
        let foundEmail = null;
        for (const cand of candidates) {
          const q1 = await getDocs(query(collection(db, "users"), where("studentIdOrEmployeeId", "==", cand), limit(1)));
          if (!q1.empty) {
            foundEmail = q1.docs[0].data().email;
            break;
          }
          const q2 = await getDocs(query(collection(db, "users"), where("studentId", "==", cand), limit(1)));
          if (!q2.empty) {
            foundEmail = q2.docs[0].data().email;
            break;
          }
        }
        if (foundEmail) {
          resolvedEmail = foundEmail;
          resolved = true;
        }
      } catch(fsErr) {
        console.warn("Firestore client identifier lookup error:", fsErr);
      }
    }

    if (!resolved) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ri-login-box-line"></i> Sign In to DPGNotes`;
      }
      showDpgError("dpgSignInError", `No registered account found matching ID "${rawIdentifier}". Please check your ID or create a free account.`, "dpgLoginIdentifier");
      return;
    }
  }

  // Normalize email to clean lowercase
  resolvedEmail = resolvedEmail.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
    pendingUser = cred.user;
    pendingEmail = resolvedEmail;

    // Ensure Firestore user document has verified contributor status
    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        isVerified: true,
        emailVerified: true,
        status: 'active',
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {}

    // Ensure Firestore user document has verified status
    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        isVerified: true,
        emailVerified: true,
        status: 'active',
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {}

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
        body: JSON.stringify({
          email: resolvedEmail,
          purpose: "2fa",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
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
    console.error("Sign in failed:", authErr);
    const friendlyMsg = getFriendlyAuthError(authErr);
    showDpgError("dpgSignInError", friendlyMsg, "dpgLoginPassword");
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
      body: JSON.stringify({
        email: pendingEmail,
        purpose: "2fa",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });
    alert("A new verification code was sent to " + pendingEmail);
  } catch(err) {
    alert("Failed to resend code: " + err.message);
  }
};

// Sign Up Handler
window.dpgHandleSignUp = async function(e) {
  e.preventDefault();
  clearDpgError("dpgSignUpError");

  const role = document.getElementById("dpgSignupRole")?.value || "Student";
  const name = document.getElementById("dpgSignupName")?.value.trim() || "";
  const studentId = document.getElementById("dpgSignupId")?.value.trim() || "";
  const email = (document.getElementById("dpgSignupEmail")?.value.trim() || "").toLowerCase();
  const password = document.getElementById("dpgSignupPassword")?.value || "";
  const confirmPassword = document.getElementById("dpgSignupConfirmPassword")?.value || "";
  const btn = document.getElementById("dpgBtnSignUpSubmit");

  if (!name) {
    showDpgError("dpgSignUpError", "Please enter your full name.", "dpgSignupName");
    return;
  }
  if (!studentId) {
    showDpgError("dpgSignUpError", "Please enter your Student ID or Employee ID.", "dpgSignupId");
    return;
  }
  if (!email || !email.includes("@")) {
    showDpgError("dpgSignUpError", "Please enter a valid academic email address.", "dpgSignupEmail");
    return;
  }
  if (password.length < 6) {
    showDpgError("dpgSignUpError", "Password must be at least 6 characters long.", "dpgSignupPassword");
    return;
  }
  if (password !== confirmPassword) {
    showDpgError("dpgSignUpError", "Passwords do not match. Please re-enter confirm password.", "dpgSignupConfirmPassword");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Checking Account...`;
  }

  // 1. Verify New Email already does NOT exist as an Old Verified Contributor
  try {
    const chkRes = await fetch(`${API_BASE}/api/auth/check-contributor-exists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (chkRes.ok) {
      const chkData = await chkRes.json();
      if (chkData && chkData.isVerified) {
        showDpgError("dpgSignUpError", chkData.message || "This email is already registered and verified as a contributor. Please sign in instead.", "dpgSignupEmail");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="ri-user-follow-line"></i> Create Contributor Account`;
        }
        return;
      }
    }
  } catch (chkErr) {
    console.warn("Pre-signup check error:", chkErr);
  }

  if (btn) {
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Validating Email & Account...`;
  }

  try {
    // 2. Dispatch backend verification request (Zero-Creation Policy: NO Firebase Auth account created yet!)
    // Strictly validates email format, blocks disposable burner domains, and verifies live DNS MX records
    const startRes = await fetch(`${API_BASE}/api/auth/start-signup-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, studentId, role, email, password })
    });
    const startData = await startRes.json();

    if (!startRes.ok || !startData.success) {
      showDpgError("dpgSignUpError", startData.error || "Failed to start registration verification. Please check your email.", "dpgSignupEmail");
      return;
    }

    // Save pending registration state in memory (Zero Firebase Auth or Firestore accounts exist yet!)
    window._pendingSignup = {
      name,
      studentId,
      email,
      role,
      password
    };

    // Transition to Step 2: Verification Pending screen
    const step1 = document.getElementById("dpgSignUpStep1");
    const step2 = document.getElementById("dpgSignUpStep2");
    const targetEmailEl = document.getElementById("dpgVerifyTargetEmail");
    if (targetEmailEl) targetEmailEl.textContent = email;
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";

    // Clear previous OTP code input
    const otpInput = document.getElementById("dpgSignupOtpInput");
    if (otpInput) otpInput.value = "";

    // Auto-listen to verification in real-time (link click & polling)
    window.startSignupVerificationPolling();

  } catch(err) {
    console.error("Sign up failed:", err);
    const friendlyMsg = getFriendlyAuthError(err);
    showDpgError("dpgSignUpError", friendlyMsg, "dpgSignupEmail");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-user-follow-line"></i> Create Contributor Account`;
    }
  }
};

let signupPollTimer = null;

window.startSignupVerificationPolling = function() {
  if (signupPollTimer) clearInterval(signupPollTimer);

  const pending = window._pendingSignup;
  if (!pending || !pending.email) return;

  // Real-time backend status polling: instantly detects when verification link is clicked
  signupPollTimer = setInterval(async () => {
    const p = window._pendingSignup;
    if (!p || !p.email) {
      clearInterval(signupPollTimer);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-pending-signup-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email })
      });
      const data = await res.json();
      if (data && data.verified && data.customToken) {
        clearInterval(signupPollTimer);
        signupPollTimer = null;
        await window.activateVerifiedContributor(data.customToken, p);
      }
    } catch (e) {
      // Passive poll error ignored
    }
  }, 3000);
};

window.activateVerifiedContributor = async function(customToken, data) {
  if (signupPollTimer) {
    clearInterval(signupPollTimer);
    signupPollTimer = null;
  }

  // Sign in to Firebase Auth using custom token
  if (customToken) {
    try {
      const cred = await signInWithCustomToken(auth, customToken);
      const user = cred.user;
      localStorage.setItem("dpgActiveUserUid", user.uid);
      localStorage.setItem("dpgActiveUser", JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: data.name || (user.email ? user.email.split('@')[0] : 'Contributor')
      }));
    } catch (tokenErr) {
      console.warn("Custom token sign-in notice:", tokenErr);
    }
  }

  window._pendingSignup = null;

  // Clear guest quota locks via authorized unlock method
  allowAuthUnlock();
  window.closeAuthModals(true);

  // Landing Dashboard --> Setting tab (unlock every tab until profile completion)
  window.location.href = "dashboard.html?verified=1#settings";
};

// Auto-call verify when OTP input is filled (6 digits)
window.dpgOnSignupOtpInput = function(inp) {
  clearDpgError("dpgVerifyError");
  const cleaned = (inp.value || "").replace(/\D/g, '').slice(0, 6);
  inp.value = cleaned;
  if (cleaned.length === 6) {
    window.dpgSubmitSignupOtp();
  }
};

window.dpgSubmitSignupOtp = async function(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  clearDpgError("dpgVerifyError");
  const pending = window._pendingSignup;
  if (!pending || !pending.email) {
    showDpgError("dpgVerifyError", "Registration session expired. Please start registration again.");
    return;
  }
  const otp = document.getElementById("dpgSignupOtpInput")?.value.trim() || "";
  if (!otp || otp.length !== 6) {
    showDpgError("dpgVerifyError", "Please enter the 6-digit code sent to your email.", "dpgSignupOtpInput");
    return;
  }

  const btn = document.getElementById("dpgBtnSignupOtpSubmit");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Verifying Code...`;
  }

  try {
    // Backend verifies 6-digit OTP, creates Firebase Auth user & Firestore profile, and returns customToken
    const res = await fetch(`${API_BASE}/api/auth/complete-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pending.email, otp })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || "Invalid or expired verification code.");
    }

    await window.activateVerifiedContributor(result.customToken, pending);
  } catch (err) {
    console.error("Signup OTP verify error:", err);
    showDpgError("dpgVerifyError", err.message || "Failed to verify code.", "dpgSignupOtpInput");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-checkbox-circle-line"></i> Verify Code &amp; Activate Account`;
    }
  }
};

window.dpgCheckVerificationStatus = async function() {
  clearDpgError("dpgVerifyError");
  const pending = window._pendingSignup;
  if (!pending || !pending.email) {
    showDpgError("dpgVerifyError", "Registration session expired. Please register again.");
    return;
  }
  const btn = document.getElementById("dpgBtnCheckVerification");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Checking Verification...`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/check-pending-signup-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pending.email })
    });
    const result = await res.json();
    if (result && result.verified && result.customToken) {
      await window.activateVerifiedContributor(result.customToken, pending);
    } else {
      showDpgError("dpgVerifyError", `Email not verified yet. Please check your inbox and click the verification link sent to ${pending.email} first.`);
    }
  } catch (err) {
    console.error("Verification check error:", err);
    showDpgError("dpgVerifyError", "Error checking verification status. Please try again.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-refresh-line"></i> I Clicked the Link in My Email`;
    }
  }
};

window.dpgResendVerificationEmail = async function() {
  clearDpgError("dpgVerifyError");
  const pending = window._pendingSignup;
  if (!pending || !pending.email) return;

  try {
    const res = await fetch(`${API_BASE}/api/auth/start-signup-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to resend verification email.");
    }

    alert(`Verification link and code re-dispatched to ${pending.email}. Please check your inbox and spam folder.`);
  } catch (e) {
    showDpgError("dpgVerifyError", "Failed to resend verification email: " + (e.message || e));
  }
};

window.dpgBackToSignupStep1 = function() {
  if (signupPollTimer) clearInterval(signupPollTimer);
  const step1 = document.getElementById("dpgSignUpStep1");
  const step2 = document.getElementById("dpgSignUpStep2");
  if (step1) step1.style.display = "block";
  if (step2) step2.style.display = "none";
};

// Forgot Password Handler
window.dpgHandleRecovery = async function(e) {
  e.preventDefault();
  clearDpgError("dpgRecoveryError");

  const rawId = document.getElementById("dpgRecoveryIdentifier")?.value.trim() || "";
  const btn = document.getElementById("dpgBtnRecoverySubmit");

  if (!rawId) {
    showDpgError("dpgRecoveryError", "Please enter your Student ID, Employee ID, or Email.", "dpgRecoveryIdentifier");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Sending Link...`;
  }

  let targetEmail = rawId;
  if (!rawId.includes('@')) {
    let resolved = false;
    // 1. Try backend API with 3.5s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/api/auth/resolve-identifier`, {
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
      console.warn("Backend recovery resolve fallback, querying Firestore directly:", err.message);
    }

    // 2. Direct client Firestore query fallback
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
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ri-mail-send-line"></i> Send Password Recovery Link`;
      }
      showDpgError("dpgRecoveryError", `Account lookup failed for ID "${rawId}". Please enter your registered email address.`, "dpgRecoveryIdentifier");
      return;
    }
  }

  targetEmail = targetEmail.trim().toLowerCase();

  // 1. Rigorous User Existence Verification (Client Firestore + Backend)
  let userFound = false;
  try {
    const qEmail = await getDocs(query(collection(db, "users"), where("email", "==", targetEmail), limit(1)));
    if (!qEmail.empty) userFound = true;
  } catch(fsErr) {
    console.warn("Firestore recovery email check fallback:", fsErr);
  }

  if (!userFound) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/resolve-identifier`, {
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

  // Halt immediately if user account does not exist
  if (!userFound) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-mail-send-line"></i> Send Password Recovery Code`;
    }
    showDpgError("dpgRecoveryError", `No registered contributor account found with email "${targetEmail}". Please check your email or create a free account.`, "dpgRecoveryIdentifier");
    return;
  }

  // 2. User exists: Dispatch Recovery OTP and switch to Step 2
  try {
    const otpRes = await fetch(`${API_BASE}/api/auth/send-otp`, {
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

    // Also trigger Firebase Password Reset Link as secondary backup
    sendPasswordResetEmail(auth, targetEmail).catch(console.warn);

    pendingRecoveryEmail = targetEmail;

    // Transition smoothly to Step 2
    const step1 = document.getElementById("dpgRecoveryStep1");
    const step2 = document.getElementById("dpgRecoveryStep2");
    const emailTarget = document.getElementById("dpgRecoveryEmailTarget");
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
    if (emailTarget) emailTarget.textContent = targetEmail;
    clearDpgError("dpgRecoveryOtpError");

    const otpInp = document.getElementById("dpgRecoveryOtpInput");
    if (otpInp) {
      otpInp.value = "";
      setTimeout(() => otpInp.focus(), 150);
    }
  } catch(err) {
    console.error("Password recovery failed:", err);
    showDpgError("dpgRecoveryError", getFriendlyAuthError(err), "dpgRecoveryIdentifier");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-mail-send-line"></i> Send Password Recovery Code`;
    }
  }
};

// Password Recovery Step 2: OTP Verification & New Password Setter
window.dpgSubmitRecoveryOtp = async function(e) {
  e.preventDefault();
  clearDpgError("dpgRecoveryOtpError");

  const otp = document.getElementById("dpgRecoveryOtpInput")?.value.trim() || "";
  const newPass = document.getElementById("dpgRecoveryNewPassword")?.value || "";
  const confirmPass = document.getElementById("dpgRecoveryConfirmPassword")?.value || "";
  const btn = document.getElementById("dpgBtnRecoveryOtpSubmit");

  if (!otp || otp.length !== 6) {
    showDpgError("dpgRecoveryOtpError", "Please enter the 6-digit verification code sent to your email.", "dpgRecoveryOtpInput");
    return;
  }
  if (!newPass || newPass.length < 6) {
    showDpgError("dpgRecoveryOtpError", "Password must be at least 6 characters.", "dpgRecoveryNewPassword");
    return;
  }
  if (newPass !== confirmPass) {
    showDpgError("dpgRecoveryOtpError", "Passwords do not match. Please re-enter.", "dpgRecoveryConfirmPassword");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ri-loader-4-line dpg-auth-spin"></i> Resetting Password...`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/reset-password-with-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingRecoveryEmail, otp, newPassword: newPass })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to reset password. Please check your verification code.");
    }

    alert("Password reset successful! You can now sign in with your new password.");
    window.openSignInModal(true);
    const loginIdentifier = document.getElementById("dpgLoginIdentifier");
    if (loginIdentifier && pendingRecoveryEmail) {
      loginIdentifier.value = pendingRecoveryEmail;
    }
  } catch(err) {
    console.error("OTP password reset error:", err);
    showDpgError("dpgRecoveryOtpError", err.message || "Failed to reset password.", "dpgRecoveryOtpInput");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ri-checkbox-circle-line"></i> Reset Password &amp; Sign In`;
    }
  }
};

window.dpgResendRecoveryOtp = async function() {
  if (!pendingRecoveryEmail) return;
  try {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pendingRecoveryEmail,
        purpose: "recovery",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      alert(`A fresh 6-digit verification code has been sent to ${pendingRecoveryEmail}`);
    } else {
      alert(data.error || "Failed to resend verification code.");
    }
  } catch(e) {
    alert("Failed to resend code: " + e.message);
  }
};

// Auto-initialize when DOM is ready
function handleAuthAutoInit() {
  injectAuthDOM();
  if (isQuotaLocked()) {
    window.showQuotaReachedModal();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handleAuthAutoInit);
} else {
  handleAuthAutoInit();
}

// Global Auth Guard: Can be called on pages requiring Contributor Authentication
window.requireContributorAuth = function() {
  const activeUid = localStorage.getItem("dpgActiveUserUid");
  if (activeUid || auth.currentUser) return true;

  // Show Sign In modal directly
  window.openSignInModal();
  return false;
};

// Dispatch readiness event for external handlers (e.g. dpg-params.js)
window.dispatchEvent(new CustomEvent("dpg-auth-component-ready"));
