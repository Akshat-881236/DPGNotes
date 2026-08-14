import sys
import json
import math
from collections import defaultdict
from datetime import datetime

def process_website_telemetry(raw_data):
    websites = raw_data.get("websites", [])
    telemetry = raw_data.get("telemetry", [])
    timeframe = raw_data.get("timeframe", "weekly")
    selected_web_id = raw_data.get("selectedWebId", "ALL")

    if selected_web_id != "ALL":
        websites = [w for w in websites if w.get("id") == selected_web_id]
        telemetry = [t for t in telemetry if t.get("websiteId") == selected_web_id]

    date_stats = defaultdict(lambda: {"views": 0, "screentimeSecs": 0, "clicks": 0, "ips": set()})
    total_views = 0
    total_screentime_secs = 0
    total_clicks = 0
    unique_ips = set()
    visitor_telemetry_list = []

    for t in telemetry:
        total_views += 1
        st = int(t.get("screentimeSeconds", 15) or 15)
        total_screentime_secs += st
        if t.get("action") == "outbound_click":
            total_clicks += 1
        
        ip = t.get("visitorIp", "127.0.0.1")
        unique_ips.add(ip)

        ts = t.get("timestamp") or datetime.now().strftime("%Y-%m-%d")
        date_key = ts[:10] if isinstance(ts, str) and len(ts) >= 10 else datetime.now().strftime("%Y-%m-%d")

        d_entry = date_stats[date_key]
        d_entry["views"] += 1
        d_entry["screentimeSecs"] += st
        if t.get("action") == "outbound_click":
            d_entry["clicks"] += 1
        d_entry["ips"].add(ip)

        visitor_telemetry_list.append({
            "visitorId": t.get("visitorId", "Guest"),
            "visitorIp": ip,
            "domain": t.get("domain", "External Website"),
            "screentimeSeconds": st,
            "geolocation": "Global Network",
            "timezone": t.get("timezone", "UTC"),
            "gmtOffset": t.get("gmtOffset", "GMT+0"),
            "phishingAlert": bool(t.get("phishingAlert", False))
        })

    sorted_labels = sorted(date_stats.keys())
    if not sorted_labels:
        sorted_labels = [datetime.now().strftime("%Y-%m-%d")]

    views_data = []
    screentime_data = []
    clicks_data = []
    ctr_data = []

    for lbl in sorted_labels:
        e = date_stats[lbl]
        v = max(e["views"], 1)
        st_mins = math.ceil(e["screentimeSecs"] / 60)
        c = e["clicks"]
        ctr = round(min(100.0, (c / v * 100) if v > 0 else 0.0), 1)

        views_data.append(v)
        screentime_data.append(st_mins)
        clicks_data.append(c)
        ctr_data.append(ctr)

    # Contributor Performance Ranking
    contributor_map = defaultdict(lambda: {"siteCount": 0, "totalViews": 0, "totalClicks": 0, "userUid": ""})
    for w in websites:
        c_name = w.get("contributorName", "Contributor")
        c_entry = contributor_map[c_name]
        c_entry["siteCount"] += 1
        c_entry["totalViews"] += int(w.get("viewsCount", 1) or 1)
        c_entry["totalClicks"] += math.round(int(w.get("viewsCount", 1) or 1) * 0.4)
        c_entry["userUid"] = w.get("contributorUid", "")

    contributor_performance_list = []
    for name, stats in contributor_map.items():
        v = max(stats["totalViews"], 1)
        ctr = round((stats["totalClicks"] / v * 100), 2)
        rank_score = (stats["siteCount"] * 20) + (stats["totalClicks"] * 10) + (v * 2)
        contributor_performance_list.append({
            "contributorName": name,
            "siteCount": stats["siteCount"],
            "totalViews": stats["totalViews"],
            "totalClicks": stats["totalClicks"],
            "averageCtrPct": ctr,
            "rankScore": max(10, rank_score),
            "userUid": stats["userUid"]
        })

    return {
        "success": True,
        "totalViews": max(total_views, sum(w.get("viewsCount", 1) for w in websites)),
        "totalScreentimeMins": round(max(total_screentime_secs, sum(w.get("screentime", 60) for w in websites)) / 60),
        "totalClicks": total_clicks,
        "uniqueIps": max(1, len(unique_ips)),
        "labels": sorted_labels,
        "viewsData": views_data,
        "screentimeData": screentime_data,
        "clicksData": clicks_data,
        "ctrData": ctr_data,
        "websiteList": websites,
        "visitorTelemetryList": visitor_telemetry_list[:20],
        "contributorPerformanceList": contributor_performance_list
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if raw_input.strip():
            data = json.loads(raw_input)
        else:
            data = {}
        result = process_website_telemetry(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
