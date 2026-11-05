/** DPGNotes NOVA - Legal Allowlist & Document Registry */
const LEGAL_DOCUMENTS = {
  'index': {
    title: 'Legal Center & Policy Hub',
    file: 'index.html',
    path: '/legal/index.html',
    topics: ['overview', 'compliance', 'framework', 'governance']
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    file: 'privacy-policy.html',
    path: '/legal/privacy-policy.html',
    topics: ['personal data', 'telemetry', 'cookies', 'device info', 'storage', 'retention', 'rights', 'deletion']
  },
  'terms-conditions': {
    title: 'Terms and Conditions of Use',
    file: 'terms-conditions.html',
    path: '/legal/terms-conditions.html',
    topics: ['terms', 'user conduct', 'contributor rules', 'prohibited activities', 'account suspension', 'liability']
  },
  'cookie-policy': {
    title: 'Cookie & Tracking Policy',
    file: 'cookie-policy.html',
    path: '/legal/cookie-policy.html',
    topics: ['cookies', 'local storage', 'session storage', 'consent', 'third-party trackers']
  },
  'dmca-policy': {
    title: 'DMCA Takedown & Copyright Notice Policy',
    file: 'dmca-policy.html',
    path: '/legal/dmca-policy.html',
    topics: ['dmca', 'copyright infringement', 'takedown requests', 'counter notice', 'intellectual property']
  },
  'copyright-policy': {
    title: 'Academic Copyright & Fair Use Policy',
    file: 'copyright-policy.html',
    path: '/legal/copyright-policy.html',
    topics: ['fair use', 'original content', 'academic license', 'attribution', 'reproduction']
  },
  'quiz-policy': {
    title: 'Examination Integrity & Quiz Policy',
    file: 'quiz-policy.html',
    path: '/legal/quiz-policy.html',
    topics: ['quiz rules', 'cheating prevention', 'camera proctoring', 'umc', 'single attempt', 'retest requests']
  },
  'disclaimer': {
    title: 'Educational Content Disclaimer',
    file: 'disclaimer.html',
    path: '/legal/disclaimer.html',
    topics: ['disclaimer', 'accuracy', 'study aid', 'no warranty', 'university affiliation']
  },
  'drasa-policy': {
    title: 'Digital Rights & Automated Security Architecture (DRASA)',
    file: 'drasa-policy.html',
    path: '/legal/drasa-policy.html',
    topics: ['drasa', 'anti-scraping', 'rate limiting', 'quota', 'security tokens', 'bot prevention']
  },
  'advertising-policy': {
    title: 'Advertising & Commercial Transparency Policy',
    file: 'advertising-policy.html',
    path: '/legal/advertising-policy.html',
    topics: ['adsense', 'sponsored banners', 'native ads', 'advertiser standards']
  },
  'analytics-policy': {
    title: 'Platform Telemetry & Analytics Policy',
    file: 'analytics-policy.html',
    path: '/legal/analytics-policy.html',
    topics: ['telemetry', 'ctr tracking', 'screentime metrics', 'anonymized data']
  },
  'security-policy': {
    title: 'Platform Infrastructure & Security Policy',
    file: 'security-policy.html',
    path: '/legal/security-policy.html',
    topics: ['encryption', 'aes-256', 'session validation', 'firebase security rules', 'vulnerability reporting']
  },
  'retention-policy': {
    title: 'Data Retention & Erasure Policy',
    file: 'retention-policy.html',
    path: '/legal/retention-policy.html',
    topics: ['data retention', 'purging', 'user data deletion', 'archive periods']
  },
  'links-policy': {
    title: 'External Linking & Attribution Policy',
    file: 'links-policy.html',
    path: '/legal/links-policy.html',
    topics: ['outbound links', 'third-party sites', 'attribution', 'affiliate links']
  },
  'native-ads-monetization-policy': {
    title: 'Native Ads & Contributor Monetization Policy',
    file: 'native-ads-monetization-policy.html',
    path: '/legal/native-ads-monetization-policy.html',
    topics: ['monetization', 'contributor revenue', 'payouts', 'traffic criteria']
  }
};
/**
 * Finds the most relevant legal document ID based on a user query.
 * @param {string} query 
 * @returns {string} documentId
 */
function findRelevantLegalDoc(query = '') {
  const q = query.toLowerCase().trim();
  if (!q) return 'index';
  for (const [docId, docInfo] of Object.entries(LEGAL_DOCUMENTS)) {
    if (q.includes(docId.replace(/-/g, ' '))) return docId;
    for (const topic of docInfo.topics) {
      if (q.includes(topic)) return docId;
    }
  }
  if (q.includes('privacy') || q.includes('data') || q.includes('collect') || q.includes('information') || q.includes('shared') || q.includes('personal')) return 'privacy-policy';
  if (q.includes('term') || q.includes('rule') || q.includes('condition') || q.includes('guideline')) return 'terms-conditions';
  if (q.includes('quiz') || q.includes('exam') || q.includes('cheating') || q.includes('proctor')) return 'quiz-policy';
  if (q.includes('copyright') || q.includes('dmca') || q.includes('stolen') || q.includes('infring')) return 'dmca-policy';
  if (q.includes('security') || q.includes('protect') || q.includes('hack')) return 'security-policy';
  if (q.includes('cookie') || q.includes('storage')) return 'cookie-policy';
  return 'index';
}
module.exports = {
  LEGAL_DOCUMENTS,
  findRelevantLegalDoc
};
