import os
import time
import logging
import google.generativeai as genai

logger = logging.getLogger("AIProcessor")

class AIProcessor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None
            logger.warning("Gemini API Key not set.")

    def generate_ai_response(self, prompt: str, system_context: str = "", max_retries: int = 3) -> str:
        """
        Generates Gemini AI response with exponential backoff retry algorithm
        and persona isolation to prevent cross-assistant conflicts on Hi/Hello/greetings.
        """
        if not self.model:
            return "Gemini API key is not configured on server."

        clean_p = (prompt or "").strip().lower()
        greetings = ["hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon", "good evening", "greetings", "who are you", "who are you?"]

        # Prevent cross-assistant persona conflicts on simple greetings
        if clean_p in greetings or any(clean_p.startswith(g + " ") for g in ["hi", "hello", "hey"]):
            ctx_lower = (system_context or "").lower()
            if "legal" in ctx_lower:
                return "Hello! I am **DPGNotes Legal & Compliance AI Assistant**. How can I help you regarding our Privacy Policy, Terms of Use, DRASA Regulations, Copyright, or Disclaimer policies today?"
            elif "admin" in ctx_lower or "report" in ctx_lower:
                return "Hello! I am **DPGNotes Admin Operations AI Assistant**. How can I assist you with system analytics, support ticket resolutions, or platform activity reports today?"
            else:
                return "Hello! I am **DPGNotes Academic AI Assistant**. How can I help you analyze, summarize, or answer questions about this academic document today?"

        full_prompt = f"System Persona & Guidelines:\n{system_context}\n\nUser Question: {prompt}" if system_context else prompt

        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(full_prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                wait_time = (2 ** attempt) * 1.5  # Exponential backoff formula: t = 1.5 * 2^n
                logger.warning(f"Gemini API attempt {attempt + 1} failed: {e}. Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)

        return "AI response temporarily unavailable due to network timeout. Please retry."
