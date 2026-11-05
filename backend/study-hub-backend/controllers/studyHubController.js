/** DPGNotes NOVA - Study Hub Main Controller */
function checkHealth(req, res) {
  const hasGemini = !!(process.env.DPGNOTES_NOVA_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
  const hasGroq = !!(process.env.DPGNOTES_NOVA_GROQ_API_KEY || process.env.GROQ_API_KEY);
  const hasNvidia = !!(process.env.DPGNOTES_NOVA_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY);
  res.json({
    status: 'healthy',
    service: 'DPGNotes NOVA AI Assistant & Autonomous Agent',
    tagline: 'Chat, Search , Find',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    providers: {
      gemini: hasGemini ? 'configured' : 'fallback_mode',
      groq: hasGroq ? 'configured' : 'fallback_mode',
      nvidia: hasNvidia ? 'configured' : 'fallback_mode'
    },
    version: '2.0.0'
  });
}
module.exports = {
  checkHealth
};
