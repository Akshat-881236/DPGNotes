/**
 * DPGNotes Backend Bootstrap & Security Loader
 * 
 * This file serves as the main entry point for the DPGNotes backend service.
 * To protect proprietary business logic, email templates, and credentials when
 * pushing to GitHub, the backend codebase is stored in encrypted form (server.payload.enc)
 * using AES-256-GCM authenticated encryption.
 * 
 * Execution Modes:
 * 1. Development Mode:
 *    If `server.source.js` is present locally, it is executed directly.
 *    Any changes to source files are automatically re-synchronized with the
 *    encrypted payload (server.payload.enc) so your repository is always ready for git push.
 * 
 * 2. Encrypted / Production Mode:
 *    If `server.source.js` is absent (e.g. fresh clone from GitHub, production deployment),
 *    the loader resolves the decryption key (from process.env.DPG_BACKEND_KEY or local .backend_key),
 *    decrypts `server.payload.enc` entirely in memory, and executes it without
 *    exposing plaintext source on disk.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');
const vm = require('vm');

// Ensure environment variables from .env files are loaded into process.env
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const vault = require('./security/vault');

const SOURCE_FILE = path.join(__dirname, 'server.source.js');
const PAYLOAD_FILE = path.join(__dirname, 'server.payload.enc');
const SERVICE_KEY_PLAIN = path.join(__dirname, 'serviceAccountKey.json');
const SERVICE_KEY_ENC = path.join(__dirname, 'serviceAccountKey.json.enc');

/**
 * Automatically synchronizes encrypted archives if local plaintext source files were edited.
 */
function autoSyncEncryptedFiles(key) {
  if (!key) return;

  try {
    // Check server source vs payload
    if (fs.existsSync(SOURCE_FILE)) {
      const srcMtime = fs.statSync(SOURCE_FILE).mtimeMs;
      const encMtime = fs.existsSync(PAYLOAD_FILE) ? fs.statSync(PAYLOAD_FILE).mtimeMs : 0;
      if (srcMtime > encMtime) {
        vault.encryptFile(SOURCE_FILE, PAYLOAD_FILE, key);
        console.log('[DPG Vault] Auto-synced encrypted payload: server.payload.enc updated.');
      }
    }

    // Check serviceAccountKey.json vs enc
    if (fs.existsSync(SERVICE_KEY_PLAIN)) {
      const plainMtime = fs.statSync(SERVICE_KEY_PLAIN).mtimeMs;
      const encMtime = fs.existsSync(SERVICE_KEY_ENC) ? fs.statSync(SERVICE_KEY_ENC).mtimeMs : 0;
      if (plainMtime > encMtime) {
        vault.encryptFile(SERVICE_KEY_PLAIN, SERVICE_KEY_ENC, key);
        console.log('[DPG Vault] Auto-synced encrypted payload: serviceAccountKey.json.enc updated.');
      }
    }
  } catch (err) {
    // Non-fatal warning for auto-sync
    console.warn('[DPG Vault] Warning during auto-sync:', err.message);
  }
}

/**
 * Restores companion files (such as serviceAccountKey.json) if missing on disk.
 */
function ensureCompanionFiles(key) {
  if (!fs.existsSync(SERVICE_KEY_PLAIN) && fs.existsSync(SERVICE_KEY_ENC)) {
    try {
      vault.decryptFile(SERVICE_KEY_ENC, SERVICE_KEY_PLAIN, key);
      console.log('[DPG Vault] Successfully restored serviceAccountKey.json from encrypted vault.');
    } catch (err) {
      console.warn('[DPG Vault] Warning: Could not restore serviceAccountKey.json:', err.message);
    }
  }
}

/**
 * Executes JavaScript code in memory within a CommonJS module context.
 */
function executeInMemory(code, targetFilename) {
  const wrapper = Module.wrap(code);
  const compiledWrapper = vm.runInThisContext(wrapper, {
    filename: targetFilename,
    lineOffset: 0,
    displayErrors: true
  });

  return compiledWrapper.call(
    module.exports,
    module.exports,
    require,
    module,
    targetFilename,
    path.dirname(targetFilename)
  );
}

/**
 * Bootstraps the backend server
 */
function bootstrap() {
  const key = vault.resolveKey();

  // Mode 1: Local development with unencrypted source
  if (fs.existsSync(SOURCE_FILE)) {
    autoSyncEncryptedFiles(key);
    // Execute local source
    require('./server.source.js');
    return;
  }

  // Mode 2: Encrypted runtime (GitHub clone or Production container)
  if (!fs.existsSync(PAYLOAD_FILE)) {
    console.error('\n================================================================');
    console.error('[DPG Vault] Fatal Error: Neither server.source.js nor server.payload.enc found!');
    console.error('Make sure you have cloned all repository files.');
    console.error('================================================================\n');
    process.exit(1);
  }

  if (!key) {
    console.error('\n================================================================');
    console.error('[DPG Vault] Security Notice: DPG_BACKEND_KEY not configured!');
    console.error('The backend codebase is protected with AES-256-GCM encryption.');
    console.error('To run the server, please provide the decryption key:');
    console.error('  1. Set environment variable: DPG_BACKEND_KEY="<key>"');
    console.error('  OR');
    console.error('  2. Place the key in backend/.backend_key (local, gitignored)');
    console.error('================================================================\n');
    process.exit(1);
  }

  // Restore companion files if necessary
  ensureCompanionFiles(key);

  try {
    const encBuffer = fs.readFileSync(PAYLOAD_FILE);
    const decryptedBuffer = vault.decryptBuffer(encBuffer, key);
    const serverCode = decryptedBuffer.toString('utf8');

    console.log('[DPG Vault] Decrypted backend server into memory (AES-256-GCM verified).');
    executeInMemory(serverCode, path.join(__dirname, 'server.js'));
  } catch (err) {
    console.error('\n================================================================');
    console.error('[DPG Vault] Fatal Decryption Error:', err.message);
    console.error('Please verify that DPG_BACKEND_KEY matches the encryption key.');
    console.error('================================================================\n');
    process.exit(1);
  }
}

bootstrap();
