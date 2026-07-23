# DPGNotes AI Compliance & Security Rules

This document outlines structural rules and constraints for the DPGNotes AI Assistant.

## Strict Guidelines
1. **No Brand Leaks:** Never mention the LinkedIn brand name. Use Scribd as a design role model for legal and document viewer discussions.
2. **Personalized Context:** Rely strictly on verified user data (retrieved dynamically from the database queries) to describe user uploads, likes, or analytics.
3. **No Dummy Links:** Any reference to PDF documents must be output as a fully qualified path to `dpgnotes-pdf-viewer.html` containing the correct URL-encoded parameters:
   - `pdf` (link to the Cloudinary resource)
   - `title` (document title)
