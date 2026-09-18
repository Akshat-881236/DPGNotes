/**
 * DPGNotes Security Vault Verification Suite
 * Tests:
 * 1. AES-256-GCM encryption & decryption accuracy
 * 2. Key tampering detection
 * 3. Payload corruption detection (tamper resistance)
 * 4. In-memory execution of encrypted server payload
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vault = require('./vault');
const Module = require('module');
const vm = require('vm');

console.log('=== DPG Vault Verification Test Suite ===\n');

// Test 1: Buffer roundtrip
console.log('Test 1: Encryption & Decryption Roundtrip...');
const originalText = 'Hello DPGNotes Security! 🚀 Sensitive logic and API secrets.';
const key = vault.generateKey();
const encrypted = vault.encryptBuffer(Buffer.from(originalText, 'utf8'), key);
const decrypted = vault.decryptBuffer(encrypted, key).toString('utf8');

if (decrypted === originalText) {
  console.log('  ✔ Passed: Decrypted text matches original bit-for-bit.');
} else {
  console.error('  ✘ Failed: Decrypted text mismatch!');
  process.exit(1);
}

// Test 2: Tamper Resistance (Wrong Key)
console.log('\nTest 2: Tamper Resistance (Wrong Key)...');
const wrongKey = vault.generateKey();
try {
  vault.decryptBuffer(encrypted, wrongKey);
  console.error('  ✘ Failed: Decryption succeeded with wrong key!');
  process.exit(1);
} catch (e) {
  console.log('  ✔ Passed: Decryption with wrong key rejected as expected (' + e.message + ').');
}

// Test 3: Payload Tampering (Bit Flip)
console.log('\nTest 3: Payload Tampering (Bit Flip in Ciphertext)...');
const tampered = Buffer.from(encrypted);
tampered[tampered.length - 5] ^= 0x01; // flip 1 bit
try {
  vault.decryptBuffer(tampered, key);
  console.error('  ✘ Failed: Decryption succeeded with tampered ciphertext!');
  process.exit(1);
} catch (e) {
  console.log('  ✔ Passed: Tampered payload rejected by AES-GCM auth tag (' + e.message + ').');
}

// Test 4: Verify server.payload.enc matches server.source.js
console.log('\nTest 4: Verify Live server.payload.enc vs server.source.js...');
const resolvedKey = vault.resolveKey();
if (!resolvedKey) {
  console.error('  ✘ Failed: No resolved key found!');
  process.exit(1);
}
const payloadFile = path.join(__dirname, '..', 'server.payload.enc');
const sourceFile = path.join(__dirname, '..', 'server.source.js');

if (!fs.existsSync(payloadFile)) {
  console.error('  ✘ Failed: server.payload.enc does not exist!');
  process.exit(1);
}
if (!fs.existsSync(sourceFile)) {
  console.error('  ✘ Failed: server.source.js does not exist!');
  process.exit(1);
}

const encPayload = fs.readFileSync(payloadFile);
const decSource = vault.decryptBuffer(encPayload, resolvedKey);
const diskSource = fs.readFileSync(sourceFile);

const hash1 = crypto.createHash('sha256').update(decSource).digest('hex');
const hash2 = crypto.createHash('sha256').update(diskSource).digest('hex');

if (hash1 === hash2) {
  console.log(`  ✔ Passed: Decrypted payload SHA-256 matches server.source.js (${hash1}).`);
} else {
  console.error('  ✘ Failed: SHA-256 checksum mismatch!');
  process.exit(1);
}

// Test 5: In-memory compilation of decrypted payload
console.log('\nTest 5: In-memory compilation of decrypted server code...');
const code = decSource.toString('utf8');
const wrapper = Module.wrap(code);
const script = new vm.Script(wrapper, { filename: 'backend/server.js' });
console.log(`  ✔ Passed: Successfully compiled ${code.length} characters in V8 VM without errors.`);

console.log('\n=========================================');
console.log('✔ All DPG Vault verification checks PASSED!');
console.log('=========================================\n');
