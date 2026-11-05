/** DPGNotes NOVA - Navigation Allowlist & Safe URL Builder */
const ALLOWED_DESTINATIONS = {
  'home': '/index.html',
  'main_library': '/index.html',
  'study_hub': '/study-hub.html',
  'serp': '/dpgnotes-serp.html',
  'search': '/dpgnotes-serp.html',
  'dashboard': '/dashboard.html',
  'profile': '/profile.html',
  'pdf_viewer': '/dpgnotes-pdf-viewer.html',
  'quiz_portal': '/Quizes/index.html',
  'quiz_generator': '/Quizes/quiz-generator.html',
  'quiz_analytics': '/Quizes/quiz-record-and-analytics.html',
  'assignment_generator': '/AssignmentCoverPageGenerator/index.html',
  'practical_generator': '/PracticalCoverPageGenerator/index.html',
  'assignment_solutions': '/AssignmentSolution/index.html',
  'practical_solutions': '/PracticalSolution/index.html',
  'legal_center': '/legal/index.html',
  'privacy_policy': '/legal/privacy-policy.html',
  'terms_conditions': '/legal/terms-conditions.html',
  'cookie_policy': '/legal/cookie-policy.html',
  'dmca_policy': '/legal/dmca-policy.html',
  'quiz_policy': '/legal/quiz-policy.html',
  'report_support': '/report.html',
  'image_to_pdf': '/ImagetoPdfConverter.html'
};
const ALLOWED_RELATIVE_PREFIXES = [
  'index.html',
  'study-hub.html',
  'dpgnotes-serp.html',
  'dashboard.html',
  'profile.html',
  'dpgnotes-pdf-viewer.html',
  'Quizes/',
  'AssignmentCoverPageGenerator/',
  'PracticalCoverPageGenerator/',
  'AssignmentSolution/',
  'PracticalSolution/',
  'legal/',
  'report.html',
  'ImagetoPdfConverter.html'
];
/**
 * Validates a platform destination and builds a safe, sanitized internal URL.
 * @param {string} destinationKey 
 * @param {object} queryParams 
 * @param {string} hash 
 * @returns {{ allowed: boolean, url?: string, reason?: string }}
 */
function buildSafePlatformUrl(destinationKey, queryParams = {}, hash = '') {
  if (!destinationKey || typeof destinationKey !== 'string') {
    return { allowed: false, reason: 'Destination must be a non-empty string.' };
  }
  const trimmed = destinationKey.trim();
  if (/^(https?:|\/\/|javascript:|data:|vbscript:)/i.test(trimmed)) {
    return { allowed: false, reason: 'External URLs and script protocol targets are strictly prohibited.' };
  }
  let targetPath = ALLOWED_DESTINATIONS[trimmed.toLowerCase()];
  if (!targetPath) {
    const cleanLeading = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    if (cleanLeading === '') {
      targetPath = '/index.html';
    } else {
      const isPrefixAllowed = ALLOWED_RELATIVE_PREFIXES.some(prefix => {
        const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;
        return cleanLeading === cleanPrefix || cleanLeading.startsWith(cleanPrefix);
      });
      if (isPrefixAllowed) {
        targetPath = `/${cleanLeading}`;
      }
    }
  }
  if (!targetPath) {
    return { allowed: false, reason: `Destination '${destinationKey}' is not in the approved navigation allowlist.` };
  }
  if (/^(https?:|\/\/|javascript:|data:|vbscript:)/i.test(targetPath)) {
    return { allowed: false, reason: 'External URLs and javascript protocol targets are strictly prohibited.' };
  }
  const dummyBase = 'https://dpgnotes.web.app';
  const urlObj = new URL(targetPath, dummyBase);
  if (queryParams && typeof queryParams === 'object') {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        urlObj.searchParams.set(k, String(v));
      }
    }
  }
  if (hash && typeof hash === 'string') {
    urlObj.hash = hash.startsWith('#') ? hash : `#${hash}`;
  }
  const finalRelativeUrl = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  return {
    allowed: true,
    url: finalRelativeUrl,
    destination: targetPath
  };
}
module.exports = {
  ALLOWED_DESTINATIONS,
  ALLOWED_RELATIVE_PREFIXES,
  buildSafePlatformUrl
};
