/** DPGNotes NOVA - Autonomous Agent Controller */
const { handleChatConversation } = require('./conversationController');
const { executeAction } = require('./actionController');
const { ACTION_REGISTRY } = require('../../study-hub-allowlist/actionRegistry');
const { resolveUserContext } = require('../../study-hub-allowlist/permissions');
/**
 * Handler for POST /api/study-hub/agent
 */
async function handleAgentQuery(req, res) {
  return handleChatConversation(req, res);
}
/**
 * Handler for GET /api/study-hub/agent/tools
 * Returns approved tool definitions for client inspection
 */
async function getAvailableAgentTools(req, res) {
  try {
    const adminAuth = req.app.get('firebaseAuth') || null;
    const userContext = await resolveUserContext(req, adminAuth);
    const tools = Object.values(ACTION_REGISTRY).filter(t => 
      userContext.role === 'admin' || t.permission === 'public' || t.permission === userContext.role
    );
    return res.json({
      success: true,
      role: userContext.role,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        permission: t.permission
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
module.exports = {
  handleAgentQuery,
  getAvailableAgentTools
};
