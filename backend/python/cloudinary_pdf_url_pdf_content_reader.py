import io
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from pypdf import PdfReader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CloudinaryPdfReader")

class CloudinaryPdfContentReader:
    def __init__(self, timeout: int = 10, max_threads: int = 4):
        self.timeout = timeout
        self.max_threads = max_threads

    def fetch_pdf_stream(self, url: str) -> io.BytesIO:
        """Fetches raw PDF bytes from Cloudinary or HTTP URL into in-memory buffer."""
        try:
            headers = {"User-Agent": "DPGNotes-Cloudinary-PdfReader/2.0"}
            response = requests.get(url, headers=headers, timeout=self.timeout, stream=True)
            response.raise_for_status()

            buffer = io.BytesIO(response.content)
            buffer.seek(0)
            return buffer
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP stream error fetching PDF from {url}: {e}")
            raise ValueError(f"Failed to download PDF from URL: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected memory stream error: {e}")
            raise RuntimeError(f"Memory stream initialization failed: {str(e)}")

    def _extract_page_text(self, page_tuple) -> tuple[int, str]:
        """Worker function for single-page extraction with exception handling."""
        page_num, page_obj = page_tuple
        try:
            text = page_obj.extract_text() or ""
            # Clean non-printable control characters
            cleaned_text = "".join(ch for ch in text if ch.isprintable() or ch in "\n\t\r")
            return page_num, cleaned_text.strip()
        except Exception as e:
            logger.warning(f"Error reading page {page_num}: {e}")
            return page_num, ""

    def read_pdf_content(self, url: str, max_pages: int = 15) -> dict:
        """
        Fetches PDF from Cloudinary URL and extracts text using parallel thread execution.
        Returns dictionary containing full text, page count, and page snippets.
        """
        try:
            pdf_buffer = self.fetch_pdf_stream(url)
            reader = PdfReader(pdf_buffer)

            total_pages = len(reader.pages)
            target_pages = min(total_pages, max_pages)

            page_tasks = [(i + 1, reader.pages[i]) for i in range(target_pages)]
            page_results = {}

            with ThreadPoolExecutor(max_workers=self.max_threads) as executor:
                futures = [executor.submit(self._extract_page_text, task) for task in page_tasks]
                for future in as_completed(futures):
                    page_num, text = future.result()
                    page_results[page_num] = text

            # Reassemble ordered pages
            ordered_snippets = []
            full_text_list = []
            for i in range(1, target_pages + 1):
                txt = page_results.get(i, "")
                if txt:
                    ordered_snippets.append(f"--- PAGE {i} ---\n{txt}")
                    full_text_list.append(txt)

            combined_text = "\n\n".join(ordered_snippets)

            return {
                "success": True,
                "url": url,
                "totalPages": total_pages,
                "readPages": target_pages,
                "text": combined_text,
                "charCount": len(combined_text)
            }

        except Exception as e:
            logger.error(f"CloudinaryPdfContentReader error for {url}: {e}")
            return {
                "success": False,
                "url": url,
                "error": str(e),
                "text": "",
                "totalPages": 0
            }
