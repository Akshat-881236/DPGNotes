import re
import logging
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("KnowledgeMdBuilder")

class KnowledgeMdBuilder:
    def __init__(self, db_client=None):
        self.db = db_client

    @staticmethod
    def crawl_web_link(url: str, timeout: int = 4) -> dict:
        """Crawls external URL and extracts page title and main text content snippet."""
        try:
            headers = {"User-Agent": "DPGNotes-AI-Crawler/2.0"}
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                title = soup.title.string.strip() if soup.title and soup.title.string else url
                paragraphs = [p.get_text().strip() for p in soup.find_all("p") if p.get_text().strip()]
                snippet = " ".join(paragraphs[:3])[:400]
                return {"url": url, "title": title, "snippet": snippet, "success": True}
        except Exception as e:
            logger.warning(f"Crawl error for {url}: {e}")

        return {"url": url, "title": url, "snippet": "Crawl bypassed or unavailable.", "success": False}

    def generate_and_save_knowledge_md(self, resource_id: str, urls: list[str], faqs: list[dict]) -> dict:
        """
        Processes web links and character-constrained FAQs (Query max 80 chars, Solution max 300 chars).
        Builds runtime knowledge.md and updates Firestore collection resource_knowledge/{resourceId}.
        """
        crawled_snippets = []
        for u in urls:
            if u and u.startswith("http"):
                res = self.crawl_web_link(u)
                crawled_snippets.append(res)

        clean_faqs = []
        for f in faqs:
            q = (f.get("query") or "").strip()[:80]
            a = (f.get("solution") or "").strip()[:300]
            if q and a:
                clean_faqs.append({"query": q, "solution": a})

        # Assemble Markdown
        md = f"# Runtime AI Knowledge Base — Resource ID: {resource_id}\n\n"
        md += f"*Generated on: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}*\n\n"

        if clean_faqs:
          md += f"## Structured FAQs ({len(clean_faqs)} entries)\n"
          for idx, item in enumerate(clean_faqs, 1):
              md += f"### Q{idx}: {item['query']}\n"
              md += f"**Answer**: {item['solution']}\n\n"

        if crawled_snippets:
          md += f"## Indexed External Web Context\n"
          for item in crawled_snippets:
              md += f"- **[{item['title']}]({item['url']})**\n  _{item['snippet']}_\n\n"

        # Save to Firestore
        if self.db:
            try:
                self.db.collection("resource_knowledge").document(resource_id).set({
                    "resourceId": resource_id,
                    "knowledgeMd": md,
                    "faqs": clean_faqs,
                    "urls": urls,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }, merge=True)
            except Exception as e:
                logger.error(f"Firestore resource_knowledge save error: {e}")

        return {
            "success": True,
            "resourceId": resource_id,
            "faqCount": len(clean_faqs),
            "linkCount": len(crawled_snippets),
            "knowledgeMd": md
        }
