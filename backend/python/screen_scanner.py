import re
import logging

logger = logging.getLogger("ScreenScanner")

class ScreenScanner:
    def __init__(self):
        self.question_pattern = re.compile(r"^(Q|Question|\b\d{1,2}\.|\([a-z]\))\s*", re.IGNORECASE)
        self.section_pattern = re.compile(r"^(SECTION|UNIT|PART|GROUP)\s+[A-Z0-9]+", re.IGNORECASE)
        self.marks_pattern = re.compile(r"\[?\b(\d{1,2})\s*(Marks?|pts|Points)\b\]?", re.IGNORECASE)

    def scan_layout_and_structure(self, raw_text: str) -> dict:
        """
        Scans document text, identifies structural sections, question patterns,
        and unit divisions for academic PDF examination papers and notes.
        """
        if not raw_text:
            return {
                "sections": [],
                "questions": [],
                "detectedUnits": [],
                "hasCodeSnippets": False,
                "questionCount": 0
            }

        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        sections = []
        questions = []
        units = set()
        has_code = False

        current_section = "General Overview"

        for line in lines:
            # Check for section or unit headers
            sec_match = self.section_pattern.search(line)
            if sec_match:
                current_section = sec_match.group(0).upper()
                sections.append(current_section)
                if "UNIT" in current_section:
                    units.add(current_section)
                continue

            # Check for question patterns
            if self.question_pattern.match(line):
                marks_match = self.marks_pattern.search(line)
                marks_val = int(marks_match.group(1)) if marks_match else None

                questions.append({
                    "section": current_section,
                    "text": line[:150],  # First 150 chars preview
                    "marks": marks_val
                })

            # Detect code snippets
            if any(kw in line for kw in ["#include", "public class", "def ", "function()", "import ", "void main"]):
                has_code = True

        return {
            "sections": list(set(sections)),
            "questions": questions,
            "detectedUnits": list(units),
            "hasCodeSnippets": has_code,
            "questionCount": len(questions)
        }
