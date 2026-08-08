import sys
import json
from collections import defaultdict
from datetime import datetime

def process_ad_telemetry(raw_data):
    ads = raw_data.get("ads", [])
    trackings = raw_data.get("trackings", [])
    selected_ad_id = raw_data.get("selectedAdId", "ALL")

    if selected_ad_id != "ALL":
        ads = [a for a in ads if a.get("id") == selected_ad_id]
        trackings = [t for t in trackings if t.get("adId") == selected_ad_id or t.get("trackId") == selected_ad_id]

    daily_stats = defaultdict(lambda: {"impressions": 0, "clicks": 0, "screentime": 0, "click_details": []})

    for ad in ads:
        created = ad.get("createdAt") or ad.get("updatedAt")
        date_str = datetime.now().strftime("%Y-%m-%d")
        if created and isinstance(created, str) and len(created) >= 10:
            date_str = created[:10]
        appearances = ad.get("impressionsCount", 0) or ad.get("views", 1)
        daily_stats[date_str]["impressions"] += max(appearances, 1)

    for track in trackings:
        ts = track.get("timestamp") or track.get("lastActiveAt") or datetime.now().strftime("%Y-%m-%d")
        date_str = ts[:10] if isinstance(ts, str) and len(ts) >= 10 else datetime.now().strftime("%Y-%m-%d")

        daily_stats[date_str]["clicks"] += 1
        daily_stats[date_str]["screentime"] += track.get("screentimeSeconds", 0)

        daily_stats[date_str]["click_details"].append({
            "trackId": track.get("trackId"),
            "adId": track.get("adId"),
            "userUid": track.get("visitorUid"),
            "userEmail": track.get("visitorEmail"),
            "pageUrl": track.get("pageUrl"),
            "screentime": track.get("screentimeSeconds", 0)
        })

    sorted_dates = sorted(daily_stats.keys())
    if not sorted_dates:
        sorted_dates = [datetime.now().strftime("%Y-%m-%d")]

    dates_label = []
    impressions_list = []
    clicks_list = []
    ctr_list = []
    clicks_metadata = []

    for d in sorted_dates:
        st = daily_stats[d]
        imp = max(st["impressions"], st["clicks"], 1)
        clk = st["clicks"]
        ctr = round((clk / imp * 100), 2)

        dates_label.append(d)
        impressions_list.append(imp)
        clicks_list.append(clk)
        ctr_list.append(ctr)
        clicks_metadata.append(st["click_details"])

    total_imp = sum(impressions_list)
    total_clk = sum(clicks_list)
    avg_ctr = round((total_clk / total_imp * 100), 2) if total_imp > 0 else 0.0

    return {
        "success": True,
        "labels": dates_label,
        "impressions": impressions_list,
        "clicks": clicks_list,
        "ctr": ctr_list,
        "clickMetadata": clicks_metadata,
        "totalImpressions": total_imp,
        "totalClicks": total_clk,
        "totalScreentime": sum(st["screentime"] for st in daily_stats.values()),
        "averageCtr": avg_ctr
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if raw_input.strip():
            data = json.loads(raw_input)
        else:
            data = {"ads": [], "trackings": []}
        result = process_ad_telemetry(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
