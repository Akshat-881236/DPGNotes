import sys
import json
import re
import urllib.request
import urllib.parse
import ssl
from xml.etree import ElementTree

def extract_meta_content(html, meta_name_or_property):
    """
    Extracts content attribute from <meta name="..." content="..."> or <meta property="..." content="...">
    """
    pattern = r'<meta[^>]*?(?:name|property)\s*=\s*["\']' + re.escape(meta_name_or_property) + r'["\'][^>]*?content\s*=\s*["\']([^"\']+)["\']'
    match = re.search(pattern, html, re.IGNORECASE)
    if not match:
        # Check reverse attribute order: content="..." name="..."
        pattern_rev = r'<meta[^>]*?content\s*=\s*["\']([^"\']+)["\'][^>]*?(?:name|property)\s*=\s*["\']' + re.escape(meta_name_or_property) + r'["\']'
        match = re.search(pattern_rev, html, re.IGNORECASE)
    return match.group(1).strip() if match else ""

def crawl_url(target_url, custom_website_id=None):
    """
    Performs live HTTP test over target_url, follows redirects, and extracts live runtime metadata.
    """
    if not target_url or not isinstance(target_url, str):
        return None

    clean_url = target_url.strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = "https://" + clean_url

    parsed_domain = ""
    try:
        parsed_domain = urllib.parse.urlparse(clean_url).netloc
    except Exception:
        parsed_domain = clean_url

    res_data = {
        "originalUrl": clean_url,
        "redirectUrl": clean_url,
        "domain": parsed_domain,
        "title": f"Web Resource ({parsed_domain})",
        "description": "External web resource indexed by DPGNotes search crawler.",
        "keywords": ["Website", "Resource", "Academic"],
        "iconUrl": f"https://www.google.com/s2/favicons?domain={parsed_domain}&sz=64",
        "secondaryVerificationTag": "",
        "isVerified": False,
        "statusCode": 0,
        "liveStatus": "Offline / Unreachable"
    }

    # Setup SSL context & Request headers
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        clean_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DPGNotesLiveSearchBot/3.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=7, context=ctx) as response:
            res_data["statusCode"] = response.getcode()
            res_data["redirectUrl"] = response.geturl()
            res_data["liveStatus"] = "200 OK" if response.getcode() == 200 else f"HTTP {response.getcode()}"
            
            # Recalculate domain from final redirect URL
            final_parsed = urllib.parse.urlparse(res_data["redirectUrl"])
            if final_parsed.netloc:
                res_data["domain"] = final_parsed.netloc

            raw_bytes = response.read(300000) # Read first 300KB
            try:
                html = raw_bytes.decode('utf-8', errors='ignore')
            except Exception:
                html = raw_bytes.decode('latin-1', errors='ignore')

            # 1. Extract <title>
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            if title_match and title_match.group(1).strip():
                clean_title = re.sub(r'\s+', ' ', title_match.group(1)).strip()
                if len(clean_title) > 2:
                    res_data["title"] = clean_title

            # 2. Extract Meta Description / OG Description
            desc = extract_meta_content(html, "description") or extract_meta_content(html, "og:description")
            if desc:
                res_data["description"] = desc

            # 3. Extract Meta Keywords / Tags
            kw_str = extract_meta_content(html, "keywords")
            if kw_str:
                kws = [k.strip() for k in kw_str.split(',') if len(k.strip()) > 1]
                if kws:
                    res_data["keywords"] = kws[:10]
            else:
                # Auto-generate tags from title & description words
                combined_text = (res_data["title"] + " " + res_data["description"]).lower()
                extracted_words = re.findall(r'\b[a-z]{4,15}\b', combined_text)
                stop_words = {"this", "that", "with", "from", "have", "more", "your", "were", "what", "when", "where", "which", "notes", "page"}
                filtered = [w.capitalize() for w in extracted_words if w not in stop_words]
                seen = set()
                unique_tags = []
                for w in filtered:
                    if w not in seen:
                        seen.add(w)
                        unique_tags.append(w)
                if unique_tags:
                    res_data["keywords"] = unique_tags[:6]

            # 4. Extract Favicon Icon
            icon_match = re.search(r'<link[^>]*?rel\s*=\s*["\'](?:shortcut icon|icon)["\'][^>]*?href\s*=\s*["\']([^"\']+)["\']', html, re.IGNORECASE)
            if icon_match and icon_match.group(1).strip():
                raw_icon = icon_match.group(1).strip()
                if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                    res_data["iconUrl"] = raw_icon
                elif raw_icon.startswith("//"):
                    res_data["iconUrl"] = "https:" + raw_icon
                else:
                    res_data["iconUrl"] = urllib.parse.urljoin(res_data["redirectUrl"], raw_icon)

            # 5. Extract Verification Tags (Primary & Secondary Verification Tags)
            v_tag = extract_meta_content(html, "dpg-notes-verification-tag") or extract_meta_content(html, "dpgnotes-secondary-verification")
            if v_tag:
                res_data["secondaryVerificationTag"] = v_tag
                if custom_website_id and (v_tag == custom_website_id or custom_website_id in v_tag):
                    res_data["isVerified"] = True

    except Exception as e:
        res_data["liveStatus"] = f"Error: {str(e)}"
        # Fallback favicon
        res_data["iconUrl"] = f"https://www.google.com/s2/favicons?domain={parsed_domain}&sz=64"

    return res_data

def main():
    """
    Reads stdin JSON list of website targets, processes live metadata crawl, and outputs JSON.
    """
    try:
        input_text = sys.stdin.read()
        if not input_text or not input_text.strip():
            print(json.dumps({"success": True, "results": []}))
            return

        items = json.loads(input_text)
        if not isinstance(items, list):
            items = [items]

        results = []
        for item in items:
            if isinstance(item, str):
                target_url = item
                web_id = None
                extra_info = {}
            elif isinstance(item, dict):
                target_url = item.get("url") or item.get("targetUrl") or ""
                web_id = item.get("id") or item.get("websiteId") or None
                extra_info = item
            else:
                continue

            if not target_url:
                continue

            crawled = crawl_url(target_url, web_id)
            if crawled:
                # Merge existing fields (e.g. contributorUid, status)
                merged = {**extra_info, **crawled}
                if extra_info.get("status") == "Verified & Active" or extra_info.get("verified"):
                    merged["isVerified"] = True
                results.append(merged)

        print(json.dumps({"success": True, "results": results}, ensure_ascii=False))

    except Exception as err:
        print(json.dumps({"success": False, "error": str(err), "results": []}))

if __name__ == "__main__":
    main()
