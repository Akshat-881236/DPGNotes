/** DPGNotes NOVA - Permissions & Role Hierarchy */
const ROLE_HIERARCHY = {
  public: 0,
  student: 1,
  contributor: 2,
  admin: 3
};
const DPG_ADMIN_EMAILS = [
  'its.akshatnetworkhub23@gmail.com'
];
/**
 * Checks if a given role meets the required role level.
 * @param {string} userRole 
 * @param {string} requiredRole 
 * @returns {boolean}
 */
function isRoleAllowed(userRole = 'public', requiredRole = 'public') {
  const userLevel = ROLE_HIERARCHY[userRole] !== undefined ? ROLE_HIERARCHY[userRole] : 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] !== undefined ? ROLE_HIERARCHY[requiredRole] : 0;
  return userLevel >= requiredLevel;
}
/**
 * Resolves user role and identity from Express request context.
 * @param {object} req - Express request
 * @param {object} adminAuth - Optional Firebase Admin Auth instance
 * @returns {Promise<{ role: string, uid: string|null, email: string|null, isContributor: boolean, isAdmin: boolean }>}
 */
async function resolveUserContext(req, adminAuth = null) {
  const context = {
    role: 'public',
    uid: null,
    email: null,
    isContributor: false,
    isAdmin: false
  };
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1].trim();
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(idToken);
        context.uid = decoded.uid;
        context.email = decoded.email || null;
        if (decoded.admin === true || DPG_ADMIN_EMAILS.includes(context.email)) {
          context.isAdmin = true;
          context.role = 'admin';
        } else if (decoded.contributor === true || decoded.isContributor === true) {
          context.isContributor = true;
          context.role = 'contributor';
        } else {
          context.role = 'student';
        }
        return context;
      }
    }
    const customRole = req.headers['x-user-role'];
    const customUid = req.headers['x-user-uid'];
    const customEmail = req.headers['x-user-email'];
    if (customEmail && DPG_ADMIN_EMAILS.includes(customEmail)) {
      context.isAdmin = true;
      context.role = 'admin';
      context.email = customEmail;
      context.uid = customUid || null;
    } else if (customRole === 'contributor' && customUid) {
      context.isContributor = true;
      context.role = 'contributor';
      context.uid = customUid;
      context.email = customEmail || null;
    } else if (customRole === 'student' || customUid) {
      context.role = 'student';
      context.uid = customUid;
      context.email = customEmail || null;
    }
  } catch (err) {
    context.role = 'public';
  }
  return context;
}
module.exports = {
  ROLE_HIERARCHY,
  DPG_ADMIN_EMAILS,
  isRoleAllowed,
  resolveUserContext
};
