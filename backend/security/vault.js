/**
 * DPGNotes Backend Security Vault
 * 
 * Provides AES-256-GCM authenticated encryption/decryption for sensitive backend files
 * (such as server.js, serviceAccountKey.json, and environment secrets) so they can be
 * stored safely in encrypted form on GitHub while retaining 100% operational functionality.
 *
 * Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
 * Key Derivation: PBKDF2-SHA256 (100,000 iterations) or direct 256-bit hex key
 * File Format:
 *   [0..3]   Magic header "DPGV"
 *   [4]      Version byte 0x01
 *   [5..20]  Salt (16 bytes)
 *   [21..32] IV (12 bytes)
 *   [33..48] Auth Tag (16 bytes)
 *   [49..]   Ciphertext
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAGIC = Buffer.from('DPGV', 'utf8');
const VERSION = 0x01;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = 4 + 1 + SALT_LEN + IV_LEN + TAG_LEN; // 49 bytes

// Paths relative to backend/
const BACKEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');

const KEY_FILE_PATHS = [
  path.join(BACKEND_DIR, '.backend_key'),
  path.join(ROOT_DIR, '.backend_key')
];

/**
 * Derives a 32-byte (256-bit) encryption key
 * @param {string|Buffer} rawKey 
 * @param {Buffer} salt 
 * @returns {Buffer}
 */
function deriveKey(rawKey, salt) {
  if (!rawKey) {
    throw new Error('Encryption key is required.');
  }

  const strKey = rawKey.toString().trim();

  // If already a 64-char hex string (32 bytes), use directly
  if (/^[0-9a-fA-F]{64}$/.test(strKey)) {
    return Buffer.from(strKey, 'hex');
  }

  // Otherwise derive using PBKDF2
  return crypto.pbkdf2Sync(strKey, salt, 100000, 32, 'sha256');
}

/**
 * Resolves the backend encryption key from environment or local key files
 * @returns {string|null}
 */
function resolveKey() {
  if (process.env.DPG_BACKEND_KEY && process.env.DPG_BACKEND_KEY.trim()) {
    return process.env.DPG_BACKEND_KEY.trim();
  }

  for (const keyPath of KEY_FILE_PATHS) {
    if (fs.existsSync(keyPath)) {
      try {
        const content = fs.readFileSync(keyPath, 'utf8').trim();
        if (content) return content;
      } catch (e) {
        // ignore read errors
      }
    }
  }

  return null;
}

/**
 * Generates a cryptographically strong 256-bit key formatted as 64 hex characters
 * @returns {string}
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypts a Buffer using AES-256-GCM
 * @param {Buffer} plainBuffer 
 * @param {string|Buffer} rawKey 
 * @returns {Buffer}
 */
function encryptBuffer(plainBuffer, rawKey) {
  if (!plainBuffer || !Buffer.isBuffer(plainBuffer)) {
    plainBuffer = Buffer.from(plainBuffer || '', 'utf8');
  }

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(rawKey, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const header = Buffer.concat([
    MAGIC,
    Buffer.from([VERSION]),
    salt,
    iv,
    authTag
  ]);

  return Buffer.concat([header, ciphertext]);
}

/**
 * Decrypts a Buffer using AES-256-GCM
 * @param {Buffer} encBuffer 
 * @param {string|Buffer} rawKey 
 * @returns {Buffer}
 */
function decryptBuffer(encBuffer, rawKey) {
  if (!encBuffer || encBuffer.length < HEADER_LEN) {
    throw new Error('Invalid encrypted payload: Data too short.');
  }

  const magic = encBuffer.subarray(0, 4);
  if (!magic.equals(MAGIC)) {
    throw new Error('Invalid encrypted payload: Missing DPGV header signature.');
  }

  const version = encBuffer[4];
  if (version !== VERSION) {
    throw new Error(`Unsupported vault version: 0x${version.toString(16)}`);
  }

  let offset = 5;
  const salt = encBuffer.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;

  const iv = encBuffer.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;

  const authTag = encBuffer.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;

  const ciphertext = encBuffer.subarray(offset);
  const key = deriveKey(rawKey, salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    throw new Error('Decryption failed: Invalid key or corrupted/tampered payload.');
  }
}

/**
 * Encrypts a file on disk
 * @param {string} srcPath 
 * @param {string} destPath 
 * @param {string} key 
 */
function encryptFile(srcPath, destPath, key) {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file not found: ${srcPath}`);
  }
  const plainBuffer = fs.readFileSync(srcPath);
  const encBuffer = encryptBuffer(plainBuffer, key);
  fs.writeFileSync(destPath, encBuffer);
}

/**
 * Decrypts a file on disk
 * @param {string} srcPath 
 * @param {string} destPath 
 * @param {string} key 
 */
function decryptFile(srcPath, destPath, key) {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Encrypted file not found: ${srcPath}`);
  }
  const encBuffer = fs.readFileSync(srcPath);
  const plainBuffer = decryptBuffer(encBuffer, key);
  fs.writeFileSync(destPath, plainBuffer);
}

/**
 * Files managed by the vault
 */
function getManagedFiles() {
  return [
    {
      name: 'Server Code',
      plainPath: path.join(BACKEND_DIR, 'server.source.js'),
      legacyPath: path.join(BACKEND_DIR, 'server.js'),
      encPath: path.join(BACKEND_DIR, 'server.payload.enc')
    },
    {
      name: 'Firebase Service Account Key',
      plainPath: path.join(BACKEND_DIR, 'serviceAccountKey.json'),
      legacyPath: null,
      encPath: path.join(BACKEND_DIR, 'serviceAccountKey.json.enc')
    }
  ];
}

/**
 * Encrypt all managed files
 * @param {string} [key]
 */
function packAll(key) {
  const encKey = key || resolveKey();
  if (!encKey) {
    throw new Error('No encryption key found. Provide DPG_BACKEND_KEY or backend/.backend_key.');
  }

  const files = getManagedFiles();
  console.log('[DPG Vault] Encrypting sensitive backend files...');

  for (const item of files) {
    let source = item.plainPath;
    if (!fs.existsSync(source) && item.legacyPath && fs.existsSync(item.legacyPath)) {
      source = item.legacyPath;
    }

    if (fs.existsSync(source)) {
      encryptFile(source, item.encPath, encKey);
      const encStats = fs.statSync(item.encPath);
      console.log(`  ✔ Encrypted ${item.name}: ${path.basename(source)} -> ${path.basename(item.encPath)} (${encStats.size} bytes)`);
    } else {
      console.log(`  ℹ Skipping ${item.name}: Source not present (${path.basename(source)})`);
    }
  }

  console.log('[DPG Vault] Packaging complete.');
}

/**
 * Decrypt all managed files
 * @param {string} [key]
 */
function unpackAll(key) {
  const decKey = key || resolveKey();
  if (!decKey) {
    throw new Error('No decryption key found. Provide DPG_BACKEND_KEY or backend/.backend_key.');
  }

  const files = getManagedFiles();
  console.log('[DPG Vault] Decrypting backend files...');

  for (const item of files) {
    if (fs.existsSync(item.encPath)) {
      decryptFile(item.encPath, item.plainPath, decKey);
      const plainStats = fs.statSync(item.plainPath);
      console.log(`  ✔ Decrypted ${item.name}: ${path.basename(item.encPath)} -> ${path.basename(item.plainPath)} (${plainStats.size} bytes)`);
    } else {
      console.log(`  ℹ Skipping ${item.name}: Encrypted archive not present (${path.basename(item.encPath)})`);
    }
  }

  console.log('[DPG Vault] Decryption complete.');
}

/**
 * Check vault status
 */
function status() {
  const key = resolveKey();
  const files = getManagedFiles();

  console.log('\n--- DPGNotes Backend Security Vault Status ---');
  console.log(`Key Status: ${key ? '✔ Available (' + (key.length === 64 ? '256-bit Hex Key' : 'Passphrase') + ')' : '✘ Missing (set DPG_BACKEND_KEY or backend/.backend_key)'}`);
  
  for (const item of files) {
    const hasPlain = fs.existsSync(item.plainPath);
    const hasLegacy = item.legacyPath && fs.existsSync(item.legacyPath);
    const hasEnc = fs.existsSync(item.encPath);

    console.log(`\nFile: ${item.name}`);
    console.log(`  Encrypted Payload: ${hasEnc ? '✔ Present (' + (hasEnc ? fs.statSync(item.encPath).size + ' bytes' : '') + ')' : '✘ Missing'}`);
    console.log(`  Plaintext Source:  ${hasPlain ? '✔ Present (' + (hasPlain ? fs.statSync(item.plainPath).size + ' bytes' : '') + ')' : (hasLegacy ? '✔ In legacy server.js' : '✘ Not present')}`);
  }
  console.log('----------------------------------------------\n');
}

// CLI Execution Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = (args[0] || '').toLowerCase();

  try {
    switch (command) {
      case 'generate-key': {
        const newKey = generateKey();
        console.log('\n[DPG Vault] Generated new 256-bit key:');
        console.log(`\n  ${newKey}\n`);

        const defaultKeyFile = path.join(BACKEND_DIR, '.backend_key');
        if (args.includes('--save') || !fs.existsSync(defaultKeyFile)) {
          fs.writeFileSync(defaultKeyFile, newKey, 'utf8');
          console.log(`Saved key to local secret file: ${defaultKeyFile}`);
          console.log('Ensure this file remains listed in .gitignore!\n');
        }
        break;
      }

      case 'pack':
      case 'encrypt': {
        const keyArg = args[1];
        packAll(keyArg);
        break;
      }

      case 'unpack':
      case 'decrypt': {
        const keyArg = args[1];
        unpackAll(keyArg);
        break;
      }

      case 'status': {
        status();
        break;
      }

      default:
        console.log('DPGNotes Security Vault CLI');
        console.log('Usage:');
        console.log('  node backend/security/vault.js generate-key [--save]');
        console.log('  node backend/security/vault.js encrypt [key]');
        console.log('  node backend/security/vault.js decrypt [key]');
        console.log('  node backend/security/vault.js status');
        break;
    }
  } catch (err) {
    console.error('[DPG Vault Error]:', err.message);
    process.exit(1);
  }
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
  encryptFile,
  decryptFile,
  generateKey,
  resolveKey,
  packAll,
  unpackAll,
  status,
  getManagedFiles,
  BACKEND_DIR,
  ROOT_DIR
};
