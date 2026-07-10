const API_URL = window.API_BASE_URL + "/api";

async function initReport() {
  const overlay = document.getElementById("authCheckOverlay");
  const container = document.getElementById("reportContainer");
  const statusTxt = document.getElementById("authStatusText");
  const subTxt = document.getElementById("authSubText");
  
  // 1. Check Admin Session
  const token = localStorage.getItem("adminToken");
  if (!token) {
    statusTxt.innerText = "Access Denied";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "No active admin session found. Redirecting to Admin Portal...";
    setTimeout(() => { window.location.href = "admin.html"; }, 2500);
    return;
  }
  
  // 2. Check Param Logic
  const urlParams = new URLSearchParams(window.location.search);
  const shareCode = urlParams.get('code');
  
  if (!shareCode) {
    statusTxt.innerText = "Invalid Request";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Missing share code parameter. Redirecting...";
    setTimeout(() => { window.location.href = "admin.html"; }, 2500);
    return;
  }
  
  // 3. Content Access from Server (Secure Fetch)
  try {
    const res = await fetch(`${API_URL}/admin/share-report/${shareCode}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        statusTxt.innerText = "Session Expired";
        statusTxt.style.color = "var(--report-danger)";
        subTxt.innerText = "Your admin session is invalid or expired. Redirecting...";
        localStorage.removeItem("adminToken");
        setTimeout(() => { window.location.href = "admin.html"; }, 2500);
        return;
      }
      throw new Error("Failed to fetch report data");
    }
    
    const data = await res.json();
    overlay.style.display = "none";
    container.style.display = "block";
    renderReport(data);
    
  } catch (err) {
    console.error(err);
    statusTxt.innerText = "Data Retrieval Failed";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Unable to securely fetch report data from server.";
  }
}

function renderReport(data) {
  const { shareInfo, engagements } = data;
  
  document.getElementById("resourceTitle").innerText = shareInfo.title || "Unknown Document";
  document.getElementById("totalOpens").innerText = engagements.length;
  
  const uniqueIps = new Set(engagements.map(e => e.ipAddress)).size;
  document.getElementById("uniqueVisitors").innerText = uniqueIps;
  
  const unusualCount = engagements.filter(e => e.status === "Unusual").length;
  document.getElementById("unusualActivity").innerText = unusualCount;
  
  const tbody = document.getElementById("engagementsBody");
  if (engagements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No engagement data yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = "";
  engagements.forEach(e => {
    let timeStr = "Unknown";
    if (e.timestamp && e.timestamp._seconds) {
      timeStr = new Date(e.timestamp._seconds * 1000).toLocaleString();
    }
    
    const badgeClass = e.status === "Unusual" ? "badge-unusual" : "badge-usual";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color:var(--report-muted);">${timeStr}</td>
      <td style="font-family:monospace;">${e.ipAddress || "Unknown"}</td>
      <td><span class="badge ${badgeClass}">${e.status || "Usual"}</span></td>
      <td style="font-size:0.85rem; color:var(--report-muted); max-width: 300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${e.userAgent}">
        ${e.userAgent || "Unknown"}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", initReport);
