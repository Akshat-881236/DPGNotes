/** DPGNotes NOVA - Conversational Assistant & Two-Stage Agent Engine */
const { generateAiResponse } = require('../providers/aiProviderAdapter');
const { ACTION_REGISTRY, validateActionRequest } = require('../../study-hub-allowlist/actionRegistry');
const { resolveUserContext } = require('../../study-hub-allowlist/permissions');
const { executeAction } = require('./actionController');
const { buildPlatformKnowledge } = require('./knowledgeController');
/**
 * Builds the comprehensive DPGNotes NOVA system prompt.
 */
function buildNovaSystemPrompt(userRole = 'public', knowledge = null) {
  const currentKnowledge = knowledge || buildPlatformKnowledge();
  return `You are DPGNotes NOVA, the intelligent academic tutor, educational companion, and autonomous platform guide for DPGNotes (Tagline: "Chat, Search , Find").

### Core Identity & Demeanor:
- You feel like a warm, supportive human academic mentor and study buddy.
- You speak natural, conversational English with clarity, encouragement, and academic precision.
- You explain complex engineering, programming, and academic topics in accessible terms using practical analogies, structured bullet points, tables, and clean code blocks.
- When helping with computer science (DBMS, COA, OS, Java, Python, Web Dev, Cloud Computing) or physical education, offer intuitive breakdowns followed by concrete examples.
- You are not a generic corporate bot. You never apologize unnecessarily or repeat robotic disclaimers.

### Platform Knowledge & Verification:
- You know DPGNotes inside-out: the search engine (dpgnotes-serp.html), the Quiz Studio (/Quizes/quiz-generator.html), Assignment and Practical cover page generators, academic solutions, and the Legal Center.
- NEVER fabricate that an academic resource exists if you have not verified it.
- If asked to find materials, questions, notes, or solutions, use your tool 'search_resources' or 'query_academic_resources'.
- If asked to create a quiz or MCQs, use the 'generate_quiz_url' tool to configure the exact URL.
- If asked about DPGNotes rules, policies, terms, or privacy, use 'get_legal_section' and cite the official document. Remind students that your guidance is for informational platform clarity, not binding legal counsel.

### Autonomous Action Policy:
- When a student asks you to find, search, create a quiz, or open a platform feature, ALWAYS invoke the appropriate tool call.
- You operate with maximum safety: only invoke approved allowlisted operations.
- User Role Level: ${userRole}. Respect role boundaries.

### Platform Guidelines Summary:
- Search Destination: /dpgnotes-serp.html (tabs: all, ai, website, videos, solutions, quizzes, contributors)
- Quiz Studio: /Quizes/quiz-generator.html (time: 15 to 180 mins, up to 100 questions)
- Ephemeral Security: All conversations exist only in temporary memory.
`;
}
/**
 * Main Chat Endpoint Controller
 * Handles POST /api/study-hub/chat
 */
async function handleChatConversation(req, res) {
  try {
    const { message, messages = [], knowledgeContext } = req.body;
    if (!message && (!messages || !messages.length)) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required.'
      });
    }
    const adminAuth = req.app.get('firebaseAuth') || null;
    const firestoreDb = req.app.get('firestoreDb') || null;
    const userContext = await resolveUserContext(req, adminAuth);
    const normalizedMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      const recent = messages.slice(-8);
      for (const m of recent) {
        if (m.role && m.content) {
          normalizedMessages.push({ role: m.role, content: String(m.content) });
        }
      }
    } else if (message) {
      normalizedMessages.push({ role: 'user', content: String(message) });
    }
    const systemPrompt = buildNovaSystemPrompt(userContext.role, knowledgeContext);
    const availableTools = Object.values(ACTION_REGISTRY).filter(act => 
      userContext.role === 'admin' || act.permission === 'public' || act.permission === userContext.role
    );
    console.log('[NOVA Chat] Dispatching Stage 1 AI inference...');
    const stage1Response = await generateAiResponse({
      systemPrompt,
      messages: normalizedMessages,
      tools: availableTools
    });
    if (stage1Response.toolCalls && stage1Response.toolCalls.length > 0) {
      console.log(`[NOVA Chat] AI triggered ${stage1Response.toolCalls.length} tool calls.`);
      const executedActions = [];
      const toolResults = [];
      for (const tc of stage1Response.toolCalls) {
        const actionName = tc.name;
        const args = tc.arguments || {};
        const validation = validateActionRequest(actionName, args, userContext);
        if (!validation.valid) {
          toolResults.push({
            name: actionName,
            result: { error: validation.error }
          });
          continue;
        }
        try {
          const result = await executeAction(actionName, args, userContext, firestoreDb);
          toolResults.push({
            name: actionName,
            result
          });
          executedActions.push({
            name: actionName,
            arguments: args,
            result,
            url: result.url || null
          });
        } catch (execErr) {
          toolResults.push({
            name: actionName,
            result: { error: execErr.message }
          });
        }
      }
      console.log('[NOVA Chat] Dispatching Stage 2 AI synthesis with execution results...');
      const stage2Response = await generateAiResponse({
        systemPrompt,
        messages: normalizedMessages,
        tools: [],
        toolResults
      });
      return res.json({
        success: true,
        type: 'agent_action',
        provider: stage2Response.provider || stage1Response.provider,
        message: stage2Response.text || stage1Response.text || 'Action executed successfully.',
        actions: executedActions,
        requiresConfirmation: false
      });
    }
    return res.json({
      success: true,
      type: 'message',
      provider: stage1Response.provider,
      message: stage1Response.text,
      actions: [],
      requiresConfirmation: false
    });
  } catch (err) {
    console.error('[NOVA Chat] Conversation handling failed:', err);
    return res.status(500).json({
      success: false,
      error: 'DPGNotes NOVA was unable to process your request at this moment. Please try again.'
    });
  }
}
module.exports = {
  handleChatConversation,
  buildNovaSystemPrompt
};
