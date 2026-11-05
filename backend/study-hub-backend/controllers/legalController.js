/** DPGNotes NOVA - Legal Documentation Controller */
const fs = require('fs');
const path = require('path');
const { LEGAL_DOCUMENTS, findRelevantLegalDoc } = require('../../study-hub-allowlist/legalAllowlist');
const legalContentCache = {};
function getParsedLegalDoc(docId) {
  if (legalContentCache[docId]) {
    return legalContentCache[docId];
  }
  const docMeta = LEGAL_DOCUMENTS[docId] || LEGAL_DOCUMENTS['index'];
  const filePath = path.resolve(__dirname, '..', '..', '..', 'public', 'legal', docMeta.file);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    let cleaned = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
    const sections = [];
    const sectionRegex = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=(?:<h[1-4]|$))/gi;
    let match;
    while ((match = sectionRegex.exec(cleaned)) !== null) {
      const heading = match[2].replace(/<[^>]*>/g, '').trim();
      const content = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (heading && content.length > 20) {
        sections.push({
          heading,
          content: content.slice(0, 1500) // Keep bounded snippet for context
        });
      }
    }
    const docObj = {
      id: docId,
      title: docMeta.title,
      url: docMeta.path,
      sectionCount: sections.length,
      sections: sections.slice(0, 15),
      rawSnippet: cleaned.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)
    };
    legalContentCache[docId] = docObj;
    return docObj;
  } catch (err) {
    console.error(`[Legal Controller] Error parsing doc ${docId}:`, err);
    return null;
  }
}
/**
 * Handler for GET /api/study-hub/legal
 */
async function getLegalDocumentation(req, res) {
  try {
    const { documentId, query, sectionId } = req.query;
    let targetDocId = documentId;
    if (!targetDocId || targetDocId === 'auto') {
      targetDocId = findRelevantLegalDoc(query || sectionId || '');
    }
    const doc = getParsedLegalDoc(targetDocId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: `Legal document '${targetDocId}' was not found in the DPGNotes Legal Center.`,
        availableDocuments: Object.keys(LEGAL_DOCUMENTS)
      });
    }
    let matchedSections = doc.sections;
    if (sectionId) {
      const sLower = sectionId.toLowerCase();
      matchedSections = doc.sections.filter(s => s.heading.toLowerCase().includes(sLower));
    } else if (query) {
      const qLower = query.toLowerCase();
      matchedSections = doc.sections.filter(s => 
        s.heading.toLowerCase().includes(qLower) || 
        s.content.toLowerCase().includes(qLower)
      );
    }
    return res.json({
      success: true,
      documentId: doc.id,
      title: doc.title,
      url: doc.url,
      disclaimer: 'DPGNotes NOVA provides legal and policy assistance for educational and navigational transparency. This does not constitute binding legal counsel.',
      sections: matchedSections.length ? matchedSections : doc.sections.slice(0, 5)
    });
  } catch (err) {
    console.error('[Legal Controller] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve legal document.'
    });
  }
}
module.exports = {
  getLegalDocumentation,
  getParsedLegalDoc
};
