# DPGNotes Backend Security & Vault Architecture

This repository uses the **DPGNotes Security Vault** to protect sensitive backend code, proprietary APIs, email templates, and Firebase credentials from being exposed in public GitHub repositories while maintaining 100% operational functionality for local development, CI/CD, and production deployments.

---

## 🔒 Security Architecture

### 1. AES-256-GCM Authenticated Encryption
- **Cipher**: `aes-256-gcm` with 256-bit keys and 96-bit unique IVs per file.
- **Integrity**: 128-bit authentication tag verification (`getAuthTag()`). Any bit modification or payload corruption triggers immediate rejection.
- **Key Derivation**: Supports direct 64-character 256-bit hex keys or PBKDF2-SHA256 with 100,000 iterations and 16-byte random salts.
- **In-Memory Decryption**: In production or secure mode, code is decrypted directly into memory (`V8 VM`) and never written as plaintext to disk.

### 2. Files Protected by Vault
| File | Git Status | Description |
| :--- | :---: | :--- |
| `backend/server.payload.enc` | **Tracked on GitHub** | Encrypted backend application logic, APIs, and templates. |
| `backend/serviceAccountKey.json.enc` | **Tracked on GitHub** | Encrypted Firebase service account credentials. |
| `backend/server.js` | **Tracked on GitHub** | Lightweight, open-source-friendly bootstrap loader (~100 lines). |
| `backend/security/vault.js` | **Tracked on GitHub** | Vault cryptographic engine and CLI. |
| `backend/server.source.js` | 🚫 **Gitignored (Local Only)** | Plaintext server source code for local editing. |
| `backend/serviceAccountKey.json` | 🚫 **Gitignored (Local Only)** | Plaintext service account key. |
| `backend/.backend_key` | 🚫 **Gitignored (Local Only)** | Local 256-bit secret key. |

---

## 🚀 How to Run the Server

### Option A: Local Development
When developing locally with the local key in `backend/.backend_key`:
```bash
# Start backend server
npm start
# or
node backend/server.js
```
The loader detects `server.source.js` and runs it directly. If any changes are made to `server.source.js`, the loader automatically re-encrypts `server.payload.enc` on startup so your git working tree is always synced.

### Option B: Production / Docker / Render / Heroku / GitHub Actions
In production environments where plaintext files are omitted:
1. Provide the key via the environment variable `DPG_BACKEND_KEY`:
   ```bash
   export DPG_BACKEND_KEY="your-64-character-hex-key"
   npm start
   ```
2. The bootstrap loader will:
   - Verify the encryption key.
   - Decrypt `server.payload.enc` into memory.
   - Automatically restore `serviceAccountKey.json` on disk if required by companion Python or Node scripts.
   - Start the Express server on `PORT 5000`.

---

## 🛠️ Vault Commands

| Command | Action |
| :--- | :--- |
| `npm run vault:status` | Inspect encryption status of all managed files and keys |
| `npm run encrypt-backend` | Re-encrypt local plaintext files into `.enc` archives |
| `npm run decrypt-backend` | Unpack `.enc` archives back into local plaintext files |
| `npm run vault:key` | Generate a new 256-bit cryptographically secure key |
| `npm test` | Run syntax validation and the automated vault security verification suite |

---

## 🛡️ Git Pre-push Checklist
Before pushing to GitHub, verify with:
```bash
git status
```
Ensure that:
1. `backend/server.source.js` is NOT listed (it must remain ignored).
2. `backend/.backend_key` is NOT listed (it must remain ignored).
3. `backend/serviceAccountKey.json` is NOT listed (it must remain ignored).
4. `backend/server.payload.enc` and `backend/serviceAccountKey.json.enc` ARE staged/committed.
