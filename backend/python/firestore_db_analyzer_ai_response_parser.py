import logging
from datetime import datetime, timezone
from nlp import NLPProcessor
from cloudinary_pdf_url_pdf_content_reader import CloudinaryPdfContentReader

logger = logging.getLogger("FirestoreDbAnalyzer")

class FirestoreDbAnalyzerAIResponseParser:
    def __init__(self, db_client=None):
        self.db = db_client
        self.pdf_reader = CloudinaryPdfContentReader()
        self.legal_notes_cache = {}

    def fetch_all_resource_documents(self) -> list[dict]:
        """Fetches all documents from Firestore collection documents."""
        docs = []
        if not self.db:
            return docs

        try:
            snapshot = self.db.collection("documents").get()
            for s in snapshot:
                d = s.to_dict()
                d["id"] = s.id
                docs.append(d)
        except Exception as e:
            logger.error(f"Error fetching documents from Firestore: {e}")

        return docs

    def fetch_all_blogs(self) -> list[dict]:
        """Fetches all blogs from Firestore collection blogs."""
        blogs = []
        if not self.db:
            return blogs

        try:
            snapshot = self.db.collection("blogs").get()
            for s in snapshot:
                d = s.to_dict()
                d["id"] = s.id
                blogs.append(d)
        except Exception as e:
            logger.error(f"Error fetching blogs from Firestore: {e}")

        return blogs

    def read_legal_notes_pdf_in_advance(self, legal_pdf_urls: list[str]) -> dict:
        """
        Pre-loads and extracts text from Legal Notes PDFs via CloudinaryPdfContentReader in advance.
        """
        for url in legal_pdf_urls:
            if url and url not in self.legal_notes_cache:
                try:
                    res = self.pdf_reader.read_pdf_content(url=url, max_pages=10)
                    if res.get("success"):
                        self.legal_notes_cache[url] = res.get("text", "")
                        logger.info(f"Pre-indexed Legal PDF: {url[:60]}")
                except Exception as e:
                    logger.warning(f"Legal PDF pre-read skipped for {url}: {e}")

        return self.legal_notes_cache

    def build_comprehensive_ai_context(self, user_query: str, resource_id: str = None) -> str:
        """
        Analyzes Firestore database, resource_knowledge/{resourceId}, blogs, and Legal PDFs
        to produce a rich context block for AI responses.
        """
        context_parts = []

        # 1. Fetch Specific Resource Knowledge if resource_id provided
        if resource_id and self.db:
            try:
                r_snap = self.db.collection("resource_knowledge").document(resource_id).get()
                if r_snap.exists:
                    r_data = r_snap.to_dict()
                    faqs = r_data.get("faqs", [])
                    k_md = r_data.get("knowledgeMd", "")

                    if faqs:
                        matches = NLPProcessor.find_top_matches(user_query, faqs, text_key="query", top_n=3)
                        if matches:
                            context_parts.append("### Relevant Resource FAQs:")
                            for m in matches:
                                context_parts.append(f"Q: {m['query']}\nA: {m['solution']}")

                    if k_md:
                        context_parts.append(f"### Resource Knowledge Base:\n{k_md[:2000]}")
            except Exception as e:
                logger.warning(f"Resource knowledge fetch error: {e}")

        # 2. Match against general documents in Firestore
        all_docs = self.fetch_all_resource_documents()
        if all_docs:
            matched_docs = NLPProcessor.find_top_matches(user_query, all_docs, text_key="title", top_n=2)
            if matched_docs:
                context_parts.append("### Database Resource Matches:")
                for d in matched_docs:
                    context_parts.append(f"- Title: {d.get('title')}, Category: {d.get('category')}, Discipline: {d.get('discipline')}, Description: {d.get('description')}")

        # 3. Include cached Legal Notes context if query mentions legal/disclaimer/dmca
        if any(term in user_query.lower() for term in ["legal", "copyright", "dmca", "disclaimer", "privacy", "policy", "terms"]):
            if self.legal_notes_cache:
                context_parts.append("### Legal Policy Context:")
                for url, text in self.legal_notes_cache.items():
                    context_parts.append(f"Source ({url}):\n{text[:1000]}")

        return "\n\n".join(context_parts)
