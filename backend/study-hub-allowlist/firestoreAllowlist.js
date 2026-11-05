/** DPGNotes NOVA - Firestore Allowlist & Data Sanitizer */
const PUBLIC_READ_COLLECTIONS = [
  'documents',
  'site_metadata',
  'blogs',
  'videos'
];
const CONTRIBUTOR_READ_COLLECTIONS = [
  'contributors',
  'assignment_solutions',
  'practical_solutions'
];
const RESTRICTED_ADMIN_COLLECTIONS = [
  'users',
  'security_violations',
  'permanent_blocks',
  'active_sessions',
  'confidential_read_history',
  'quiz_device_tracking'
];
const STRIPPED_FIELDS = [
  'privateAnswerKey',
  'answerKey',
  'answers',
  'clientIp',
  'hardwareInfo',
  'password',
  'token',
  'secret',
  'serviceAccountKey',
  'adminKey'
];
/**
 * Checks if a collection is allowed for reading under the current user role.
 * @param {string} collectionName 
 * @param {string} userRole 
 * @returns {boolean}
 */
function isCollectionReadable(collectionName, userRole = 'public') {
  if (RESTRICTED_ADMIN_COLLECTIONS.includes(collectionName)) {
    return userRole === 'admin';
  }
  if (CONTRIBUTOR_READ_COLLECTIONS.includes(collectionName)) {
    return userRole === 'contributor' || userRole === 'admin';
  }
  return PUBLIC_READ_COLLECTIONS.includes(collectionName);
}
/**
 * Sanitizes Firestore document data by stripping confidential and internal fields.
 * @param {object} docData 
 * @returns {object} sanitizedData
 */
function sanitizeDocData(docData) {
  if (!docData || typeof docData !== 'object') return {};
  const sanitized = {};
  for (const [key, val] of Object.entries(docData)) {
    if (STRIPPED_FIELDS.includes(key)) continue;
    if (val && typeof val.toDate === 'function') {
      sanitized[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitized[key] = sanitizeDocData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}
module.exports = {
  PUBLIC_READ_COLLECTIONS,
  CONTRIBUTOR_READ_COLLECTIONS,
  RESTRICTED_ADMIN_COLLECTIONS,
  STRIPPED_FIELDS,
  isCollectionReadable,
  sanitizeDocData
};
