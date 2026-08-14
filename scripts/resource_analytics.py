import sys
import json
import math
from collections import defaultdict
from datetime import datetime

def process_resource_telemetry(raw_data):
    resources = raw_data.get("resources", [])
    trackings = raw_data.get("trackings", [])
    timeframe = raw_data.get("timeframe", "weekly")
    selected_res_id = raw_data.get("selectedResourceId", "ALL")

    if selected_res_id != "ALL":
        resources = [r for r in resources if r.get("id") == selected_res_id or r.get("trackId") == selected_res_id]
        trackings = [t for t in trackings if t.get("resourceId") == selected_res_id or t.get("trackId") == selected_res_id]

    date_stats = defaultdict(lambda: {"views": 0, "screentimeSecs": 0, "likes": 0, "shares": 0, "visitor_meta": []})
    screentime_values = []
    total_views = 0
    total_screentime_secs = 0
    total_likes = 0
    total_shares = 0

    resource_map = {}
    for r in resources:
        r_id = r.get("id", "")
        track_id = r.get("trackId", "")
        likes_cnt = len(r.get("likes", []) if isinstance(r.get("likes"), list) else [])
        shares_cnt = int(r.get("sharesCount", 0) or r.get("shareCount", 0) or 0)
        views_cnt = int(r.get("viewsCount", 0) or r.get("views", 0) or 0)

        total_likes += likes_cnt
        total_shares += shares_cnt

        resource_map[r_id] = {
            "id": r_id,
            "trackId": track_id,
            "title": r.get("title", "Untitled Resource"),
            "category": r.get("category", "Notes"),
            "discipline": r.get("discipline", "General"),
            "uploader": r.get("userName", r.get("uploader", "Contributor")),
            "uploaderUid": r.get("userId", r.get("uploaderUid", "")),
            "views": max(views_cnt, likes_cnt * 2 + shares_cnt * 3, 1),
            "screentime": max(int(r.get("screentime", 0)), views_cnt * 120, 120),
            "likes": likes_cnt,
            "shares": shares_cnt,
            "priorityScore": 0
        }

    for t in trackings:
        st = int(t.get("screentimeSeconds", 15) or 15)
        total_views += 1
        total_screentime_secs += st
        screentime_values.append(st)

        ts = t.get("timestamp") or datetime.now().strftime("%Y-%m-%d")
        date_key = ts[:10] if isinstance(ts, str) and len(ts) >= 10 else datetime.now().strftime("%Y-%m-%d")

        d_entry = date_stats[date_key]
        d_entry["views"] += 1
        d_entry["screentimeSecs"] += st
        d_entry["visitor_meta"].append({
            "visitorEmail": t.get("visitorEmail", "guest@dpgnotes.app"),
            "screentimeSeconds": st,
            "visitorUid": t.get("visitorUid", "guest")
        })

    sorted_labels = sorted(date_stats.keys())
    if not sorted_labels:
        sorted_labels = [datetime.now().strftime("%Y-%m-%d")]

    views_data = []
    screentime_data = []
    likes_data = []
    shares_data = []
    ctr_data = []
    click_metadata = []

    for lbl in sorted_labels:
        e = date_stats[lbl]
        v = max(e["views"], 1)
        st_mins = math.ceil(e["screentimeSecs"] / 60)
        l_cnt = e["likes"] or math.floor(total_likes / max(1, len(sorted_labels)))
        sh_cnt = e["shares"] or math.floor(total_shares / max(1, len(sorted_labels)))
        ctr = round(min(100.0, (len(e["visitor_meta"]) / v * 100) if v > 0 else 0.0), 1)

        views_data.append(v)
        screentime_data.append(st_mins)
        likes_data.append(l_cnt)
        shares_data.append(sh_cnt)
        ctr_data.append(ctr)
        click_metadata.append(e["visitor_meta"])

    # Statistical Calculations (Mean, Variance, StdDev, Skewness)
    n = max(1, len(screentime_values))
    mean_secs = total_screentime_secs / n
    variance_sum = sum((val - mean_secs) ** 2 for val in screentime_values)
    cubic_sum = sum((val - mean_secs) ** 3 for val in screentime_values)
    variance = variance_sum / n
    std_dev = math.sqrt(variance)
    skewness = (cubic_sum / n) / (std_dev ** 3) if std_dev > 0 else 0.0

    raw_resources = list(resource_map.values())
    for r in raw_resources:
        st_mins = round(r["screentime"] / 60)
        r["priorityScore"] = (r["likes"] * 5) + (r["shares"] * 4) + (st_mins * 3) + (r["views"] * 2)

    raw_resources.sort(key=lambda x: x["priorityScore"], reverse=True)

    return {
        "success": True,
        "totalViews": max(total_views, sum(r["views"] for r in raw_resources)),
        "totalScreentimeMins": round(max(total_screentime_secs, sum(r["screentime"] for r in raw_resources)) / 60),
        "totalShares": total_shares,
        "totalLikes": total_likes,
        "meanScreentimeMins": round(mean_secs / 60, 1),
        "stdDevScreentimeMins": round(std_dev / 60, 1),
        "varianceScreentimeSecs": round(variance),
        "skewnessIndex": round(skewness, 3),
        "highPriorityIndex": raw_resources[0]["priorityScore"] if raw_resources else 0,
        "labels": sorted_labels,
        "viewsData": views_data,
        "screentimeData": screentime_data,
        "sharesData": shares_data,
        "likesData": likes_data,
        "ctrData": ctr_data,
        "clickMetadata": click_metadata,
        "resourceList": raw_resources
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if raw_input.strip():
            data = json.loads(raw_input)
        else:
            data = {}
        result = process_resource_telemetry(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
