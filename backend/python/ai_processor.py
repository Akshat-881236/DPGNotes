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
        and mathematical exception handling for rate limits.
        """
        if not self.model:
            return "Gemini API key is not configured on server."

        full_prompt = f"{system_context}\n\nUser Question: {prompt}" if system_context else prompt

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
