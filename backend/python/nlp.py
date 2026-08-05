import re
import math
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

COMMON_STOPWORDS = {
    "a", "about", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "in", "is", "it", "its", "of", "on", "or", "that", "the",
    "to", "was", "were", "will", "with", "what", "which", "how", "why", "where"
}

class NLPProcessor:
    @staticmethod
    def clean_query(text: str) -> str:
        """Normalizes and cleans input search query string."""
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        tokens = [w for w in text.split() if w not in COMMON_STOPWORDS and len(w) > 1]
        return " ".join(tokens)

    @staticmethod
    def calculate_similarity(query: str, corpus: list[str]) -> list[float]:
        """
        Calculates cosine similarity scores between input query and corpus using TF-IDF.
        Includes mathematical zero-vector bounds handling.
        """
        if not query or not corpus:
            return [0.0] * len(corpus)

        cleaned_query = NLPProcessor.clean_query(query)
        cleaned_corpus = [NLPProcessor.clean_query(doc) for doc in corpus]

        if not cleaned_query or not any(cleaned_corpus):
            return [0.0] * len(corpus)

        try:
            vectorizer = TfidfVectorizer().fit([cleaned_query] + cleaned_corpus)
            query_vec = vectorizer.transform([cleaned_query])
            corpus_vecs = vectorizer.transform(cleaned_corpus)

            similarities = cosine_similarity(query_vec, corpus_vecs).flatten()
            return [float(score) for score in similarities]
        except Exception:
            return [0.0] * len(corpus)

    @staticmethod
    def find_top_matches(query: str, items: list[dict], text_key: str = "query", top_n: int = 3) -> list[dict]:
        """Ranks items based on NLP similarity scores."""
        if not items:
            return []

        corpus = [item.get(text_key, "") for item in items]
        scores = NLPProcessor.calculate_similarity(query, corpus)

        scored_items = []
        for i, score in enumerate(scores):
            if score > 0.05:  # Relevance threshold cutoff
                item_copy = items[i].copy()
                item_copy["similarityScore"] = round(score, 4)
                scored_items.append(item_copy)

        scored_items.sort(key=lambda x: x["similarityScore"], reverse=True)
        return scored_items[:top_n]
