import logging
from datetime import datetime, timezone
import requests
from user_agents import parse

logger = logging.getLogger("IPDeviceTracker")

class IPDeviceTracker:
    def __init__(self, db_client=None):
        self.db = db_client

    @staticmethod
    def extract_client_ip(headers: dict, remote_addr: str) -> str:
        """Extracts real client IP address handling reverse proxies."""
        x_forwarded = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return remote_addr or "127.0.0.1"

    @staticmethod
    def parse_user_agent(user_agent_str: str) -> dict:
        """Parses User Agent string into device, OS, and browser components."""
        try:
            ua = parse(user_agent_str or "")
            return {
                "browser": f"{ua.browser.family} {ua.browser.version_string}".strip(),
                "os": f"{ua.os.family} {ua.os.version_string}".strip(),
                "device": ua.device.family or "Desktop",
                "isMobile": ua.is_mobile,
                "isTablet": ua.is_tablet,
                "isBot": ua.is_bot
            }
        except Exception as e:
            logger.warning(f"User Agent parse error: {e}")
            return {"browser": "Unknown", "os": "Unknown", "device": "Unknown"}

    @staticmethod
    def fetch_ip_geolocation(ip_address: str) -> dict:
        """Fetches IP Geolocation details (Country, City, Region, ISP)."""
        if ip_address in ["127.0.0.1", "localhost", "::1"] or ip_address.startswith("192.168."):
            return {"country": "Local", "city": "Internal Network", "region": "Dev", "isp": "Localhost"}

        try:
            resp = requests.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,regionName,city,isp", timeout=3)
            if resp.status_code == 200 and resp.json().get("status") == "success":
                data = resp.json()
                return {
                    "country": data.get("country", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "region": data.get("regionName", "Unknown"),
                    "isp": data.get("isp", "Unknown")
                }
        except Exception as e:
            logger.warning(f"Geo IP lookup error for {ip_address}: {e}")

        return {"country": "Unknown", "city": "Unknown", "region": "Unknown", "isp": "Unknown"}

    def log_device_history(self, user_type: str, user_id: str, email: str, headers: dict, remote_addr: str) -> dict:
        """Logs Contributor or Admin login device history to Firestore."""
        ip = self.extract_client_ip(headers, remote_addr)
        ua_info = self.parse_user_agent(headers.get("user-agent", ""))
        geo_info = self.fetch_ip_geolocation(ip)

        history_record = {
            "userType": user_type,  # "Admin" or "Contributor"
            "userId": user_id,
            "email": email,
            "ipAddress": ip,
            "browser": ua_info["browser"],
            "os": ua_info["os"],
            "device": ua_info["device"],
            "country": geo_info["country"],
            "city": geo_info["city"],
            "region": geo_info["region"],
            "isp": geo_info["isp"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if self.db:
            try:
                self.db.collection("device_login_history").add(history_record)
            except Exception as e:
                logger.error(f"Firestore device history log error: {e}")

        return history_record

    def process_guest_quota(self, headers: dict, remote_addr: str, guest_id: str, action: str = "page_visit") -> dict:
        """
        Processes Anonymous Guest Access Quota rules (Max 6 Visits / 3 PDFs per day).
        Returns quota enforcement status.
        """
        ip = self.extract_client_ip(headers, remote_addr)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        safe_ip = re.sub(r"[^a-zA-Z0-9]", "_", ip)
        quota_key = f"quota_{safe_ip}_{guest_id}"

        page_visits = 0
        pdf_views = 0

        if self.db:
            try:
                doc_ref = self.db.collection("guest_quotas").document(quota_key)
                snap = doc_ref.get()

                if snap.exists:
                    d = snap.to_dict()
                    if d.get("lastResetDate") == today_str:
                        page_visits = d.get("pageVisits", 0)
                        pdf_views = d.get("pdfViews", 0)

                if action == "pdf_view":
                    pdf_views += 1
                else:
                    page_visits += 1

                doc_ref.set({
                    "clientIp": ip,
                    "guestId": guest_id,
                    "pageVisits": page_visits,
                    "pdfViews": pdf_views,
                    "lastResetDate": today_str,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }, merge=True)
            except Exception as e:
                logger.error(f"Firestore guest quota error: {e}")
                if action == "pdf_view":
                    pdf_views += 1
                else:
                    page_visits += 1
        else:
            if action == "pdf_view":
                pdf_views += 1
            else:
                page_visits += 1

        max_visits = 6
        max_pdfs = 3
        allowed = (page_visits <= max_visits) and (pdf_views <= max_pdfs)

        return {
            "allowed": allowed,
            "ipAddress": ip,
            "guestId": guest_id,
            "pageVisits": page_visits,
            "pdfViews": pdf_views,
            "maxVisits": max_visits,
            "maxPdfs": max_pdfs
        }
