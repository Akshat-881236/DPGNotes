/** DPGNotes NOVA - AI Multi-Provider Adapter */
const axios = require('axios');
const getGeminiKey = () => process.env.DPGNOTES_NOVA_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const getGroqKey = () => process.env.DPGNOTES_NOVA_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
const getNvidiaKey = () => process.env.DPGNOTES_NOVA_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY || '';
const CONFIG = {
  timeoutMs: 15000,
  geminiModel: process.env.NOVA_GEMINI_MODEL || 'gemini-2.5-flash',
  geminiFallbackModel: 'gemini-1.5-flash',
  groqModel: process.env.NOVA_GROQ_MODEL || 'llama-3.3-70b-versatile',
  nvidiaModel: process.env.NOVA_NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct'
};
/**
 * Transforms action registry definitions into Gemini function declarations.
 * @param {Array<object>} actions 
 * @returns {Array<object>}
 */
function toGeminiTools(actions = []) {
  if (!actions.length) return undefined;
  const functionDeclarations = actions.map(act => {
    const properties = {};
    const required = [];
    if (act.parameters) {
      for (const [k, p] of Object.entries(act.parameters)) {
        properties[k] = {
          type: p.type === 'integer' ? 'INTEGER' : p.type === 'number' ? 'NUMBER' : p.type === 'boolean' ? 'BOOLEAN' : p.type === 'array' ? 'ARRAY' : 'STRING',
          description: p.description || ''
        };
        if (p.enum) properties[k].enum = p.enum;
      }
    }
    return {
      name: act.name,
      description: act.description,
      parameters: {
        type: 'OBJECT',
        properties,
        required
      }
    };
  });
  return [{ functionDeclarations }];
}
/**
 * Transforms action registry definitions into OpenAI/Groq/NVIDIA compatible tools.
 * @param {Array<object>} actions 
 * @returns {Array<object>}
 */
function toStandardTools(actions = []) {
  if (!actions.length) return undefined;
  return actions.map(act => {
    const properties = {};
    const required = [];
    if (act.parameters) {
      for (const [k, p] of Object.entries(act.parameters)) {
        properties[k] = {
          type: p.type || 'string',
          description: p.description || ''
        };
        if (p.enum) properties[k].enum = p.enum;
      }
    }
    return {
      type: 'function',
      function: {
        name: act.name,
        description: act.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      }
    };
  });
}
/**
 * Executes a call to Google Gemini.
 */
async function callGemini({ systemPrompt, messages, tools, toolResults = [] }) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('Gemini API key is not configured.');
  const contents = [];
  for (const m of messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      if (m.toolCalls && m.toolCalls.length) {
        for (const tc of m.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments || {}
            }
          });
        }
      }
      contents.push({ role: 'model', parts });
    }
  }
  if (toolResults.length) {
    for (const tr of toolResults) {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: tr.name,
            response: { content: tr.result }
          }
        }]
      });
    }
  }
  const payload = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048
    }
  };
  const geminiTools = toGeminiTools(tools);
  if (geminiTools) payload.tools = geminiTools;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.geminiModel}:generateContent?key=${apiKey}`;
  let res;
  try {
    res = await axios.post(url, payload, { timeout: CONFIG.timeoutMs });
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 400)) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.geminiFallbackModel}:generateContent?key=${apiKey}`;
      res = await axios.post(url, payload, { timeout: CONFIG.timeoutMs });
    } else {
      throw err;
    }
  }
  const candidate = res.data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let text = '';
  const toolCalls = [];
  for (const p of parts) {
    if (p.text) text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args || {}
      });
    }
  }
  return {
    provider: 'gemini',
    text: text.trim(),
    toolCalls,
    finishReason: toolCalls.length ? 'tool_calls' : 'stop'
  };
}
/**
 * Executes a call to Groq.
 */
async function callGroq({ systemPrompt, messages, tools, toolResults = [] }) {
  const apiKey = getGroqKey();
  if (!apiKey) throw new Error('Groq API key is not configured.');
  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }
  for (const m of messages) {
    formattedMessages.push({ role: m.role, content: m.content });
  }
  if (toolResults.length) {
    for (const tr of toolResults) {
      formattedMessages.push({
        role: 'system',
        content: `Tool Execution Result for '${tr.name}': ${JSON.stringify(tr.result)}`
      });
    }
  }
  const payload = {
    model: CONFIG.groqModel,
    messages: formattedMessages,
    temperature: 0.3,
    max_tokens: 2048
  };
  const stdTools = toStandardTools(tools);
  if (stdTools && stdTools.length) {
    payload.tools = stdTools;
    payload.tool_choice = 'auto';
  }
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: CONFIG.timeoutMs
  });
  const choice = res.data?.choices?.[0];
  const msg = choice?.message || {};
  const toolCalls = [];
  if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      let args = {};
      try {
        args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      } catch (e) {}
      toolCalls.push({
        id: tc.id || `call_${Date.now()}`,
        name: tc.function.name,
        arguments: args
      });
    }
  }
  return {
    provider: 'groq',
    text: (msg.content || '').trim(),
    toolCalls,
    finishReason: toolCalls.length ? 'tool_calls' : 'stop'
  };
}
/**
 * Executes a call to NVIDIA NIM.
 */
async function callNvidia({ systemPrompt, messages, tools, toolResults = [] }) {
  const apiKey = getNvidiaKey();
  if (!apiKey) throw new Error('NVIDIA NIM API key is not configured.');
  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }
  for (const m of messages) {
    formattedMessages.push({ role: m.role, content: m.content });
  }
  if (toolResults.length) {
    for (const tr of toolResults) {
      formattedMessages.push({
        role: 'system',
        content: `Tool Result for '${tr.name}': ${JSON.stringify(tr.result)}`
      });
    }
  }
  const payload = {
    model: CONFIG.nvidiaModel,
    messages: formattedMessages,
    temperature: 0.2,
    max_tokens: 2048
  };
  const res = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: CONFIG.timeoutMs
  });
  const choice = res.data?.choices?.[0];
  const msg = choice?.message || {};
  return {
    provider: 'nvidia',
    text: (msg.content || '').trim(),
    toolCalls: [],
    finishReason: 'stop'
  };
}
/**
 * Local Rule-based Educational Assistant Fallback
 * Used when no external API credentials are present or during total provider outage.
 */
function localEducationalFallback({ messages }) {
  const lastMsg = (messages[messages.length - 1]?.content || '').toLowerCase();
  if (lastMsg.includes('cloud computing') || lastMsg.includes('cloud')) {
    return {
      provider: 'local_engine',
      text: 'Cloud Computing refers to the on-demand delivery of IT resources over the Internet with pay-as-you-go pricing. The core delivery models include IaaS (Infrastructure as a Service), PaaS (Platform as a Service), and SaaS (Software as a Service). On DPGNotes, verified lecture notes, semester question papers, and architecture diagrams are available directly in our academic repository.',
      toolCalls: [
        {
          id: `local_${Date.now()}`,
          name: 'search_resources',
          arguments: { query: 'Cloud Computing', tab: 'all' }
        }
      ],
      finishReason: 'tool_calls'
    };
  }
  if (lastMsg.includes('normalization') || lastMsg.includes('dbms')) {
    return {
      provider: 'local_engine',
      text: 'Database Normalization is the systematic process of organizing fields and tables in a relational database to minimize redundancy and eliminate insertion, update, and deletion anomalies.\n\n### Normal Forms Overview:\n- **1NF**: Atomic column values, unique records.\n- **2NF**: In 1NF + no partial dependency on a composite primary key.\n- **3NF**: In 2NF + no transitive dependency (non-prime attributes must depend only on the primary key).\n- **BCNF**: Strict 3NF where for every dependency X -> Y, X must be a super key.',
      toolCalls: [
        {
          id: `local_${Date.now()}`,
          name: 'search_resources',
          arguments: { query: 'DBMS Normalization', tab: 'solutions' }
        }
      ],
      finishReason: 'tool_calls'
    };
  }
  if (lastMsg.includes('quiz') || lastMsg.includes('mcq')) {
    return {
      provider: 'local_engine',
      text: 'I can prepare a complete interactive examination in the DPGNotes Quiz Studio. I have configured the examination parameters for you.',
      toolCalls: [
        {
          id: `local_${Date.now()}`,
          name: 'generate_quiz_url',
          arguments: {
            subName: 'Software Engineering',
            quizTitle: 'Software Engineering Assessment',
            questionCount: 15,
            timeMinutes: 30
          }
        }
      ],
      finishReason: 'tool_calls'
    };
  }
  if (lastMsg.includes('privacy') || lastMsg.includes('legal') || lastMsg.includes('policy')) {
    return {
      provider: 'local_engine',
      text: 'DPGNotes prioritizes student privacy, intellectual property rights, and fair academic usage. Our Privacy Policy and Terms of Use guarantee that student reading activities are conducted securely.',
      toolCalls: [
        {
          id: `local_${Date.now()}`,
          name: 'get_legal_section',
          arguments: { documentId: 'privacy-policy', query: 'privacy commitments' }
        }
      ],
      finishReason: 'tool_calls'
    };
  }
  return {
    provider: 'local_engine',
    text: "Welcome to DPGNotes NOVA — your AI Academic Companion, Search Guide, and Quiz Assistant. How can I assist you with your studies or navigating our academic repository today?",
    toolCalls: [],
    finishReason: 'stop'
  };
}
/**
 * Primary dispatch function with automatic failover across providers.
 */
async function generateAiResponse({ systemPrompt, messages, tools = [], toolResults = [] }) {
  const errors = [];
  if (getGeminiKey()) {
    try {
      return await callGemini({ systemPrompt, messages, tools, toolResults });
    } catch (err) {
      console.warn('[NOVA AI] Gemini call failed, attempting fallback:', err.message);
      errors.push({ provider: 'gemini', error: err.message });
    }
  }
  if (getGroqKey()) {
    try {
      return await callGroq({ systemPrompt, messages, tools, toolResults });
    } catch (err) {
      console.warn('[NOVA AI] Groq call failed, attempting fallback:', err.message);
      errors.push({ provider: 'groq', error: err.message });
    }
  }
  if (getNvidiaKey()) {
    try {
      return await callNvidia({ systemPrompt, messages, tools, toolResults });
    } catch (err) {
      console.warn('[NOVA AI] NVIDIA NIM call failed:', err.message);
      errors.push({ provider: 'nvidia', error: err.message });
    }
  }
  console.log('[NOVA AI] Utilizing local deterministic engine response.');
  return localEducationalFallback({ messages });
}
module.exports = {
  generateAiResponse,
  callGemini,
  callGroq,
  callNvidia
};
