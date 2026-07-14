// Legal Documentation Center Client Application Orchestrator
import { initTheme } from './theme.js';
import { initSidebar } from './sidebar.js';
import { initSearch } from './search.js';

// Import Firebase dependencies for state checks
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = getApps().find(a => a.name === "dpgnotes") || initializeApp(firebaseConfig, "dpgnotes");
const auth = getAuth(app);

// Actual PDF filenames uploaded to legal/docs
const pdfFileMapping = {
  analytics: 'DOC_ANH_06_2026_001_DOC_ANH_06_2026_001_20260714_130156.pdf',
  cookies: 'DOC_ANH_06_2026_002_DOC_ANH_06_2026_002_20260714_130555.pdf',
  copyright: 'DOC_ANH_06_2026_003_DOC_ANH_06_2026_003_20260714_130927.pdf',
  disclaimer: 'DOC_ANH_06_2026_004_DOC_ANH_06_2026_004_20260714_131118.pdf',
  dmca: 'DOC_ANH_06_2026_005_DOC_ANH_06_2026_005_20260714_131342.pdf',
  faq: 'DOC_ANH_06_2026_006_DOC_ANH_06_2026_006_20260714_131844.pdf',
  privacy: 'DOC_ANH_06_2026_007_DOC_ANH_06_2026_007_20260714_132144.pdf',
  retention: 'DOC_ANH_06_2026_008_DOC_ANH_06_2026_008_20260714_132349.pdf',
  security: 'DOC_ANH_06_2026_009_DOC_ANH_06_2026_009_20260714_132558.pdf',
  terms: 'DOC_ANH_06_2026_010_DOC_ANH_06_2026_010_20260714_132730.pdf',
  drasa: 'DOC_ANH_06_2026_011_DOC_ANH_06_2026_010_20260714_140930.pdf'
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme Engine
  initTheme();

  // PDF Viewer reference
  const pdfWrapper = document.getElementById('pdfWrapper');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const printBtn = document.getElementById('printBtn');
  const shareBtn = document.getElementById('shareBtn');

  // Active section track
  let currentSection = 'overview';
  let watermarkText = '';
  let lastWatermarkText = '';
  let renderSessionId = 0;

  // Get or Generate unique Guest ID
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'GST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('guestId', guestId);
  }

  // Parse redirection origin parameters and referrers
  const urlParams = new URLSearchParams(window.location.search);
  const fromParam = urlParams.get('from');
  const referrer = document.referrer;

  let userContext = 'guest';
  if (fromParam === 'contributor' || referrer.includes('dashboard.html')) {
    userContext = 'contributor';
  } else if (fromParam === 'admin' || referrer.includes('admin.html') || referrer.includes('report.html')) {
    userContext = 'admin';
  } else if (referrer.includes('index.html')) {
    userContext = 'guest';
  }

  // Setup Dynamic Watermark based on User Authentication state
  onAuthStateChanged(auth, (user) => {
    const adminToken = localStorage.getItem('adminToken');
    let newWatermark = '';
    let isGuestUser = true;

    if (userContext === 'admin' && adminToken) {
      isGuestUser = false;
      const loginTime = localStorage.getItem('adminLoginTime') || new Date().toLocaleString();
      newWatermark = `Admin-${loginTime}`;
    } else if (user) {
      isGuestUser = true; // Contributor cannot download PDFs in Legal Center
      const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Contributor');
      newWatermark = `${name}-${user.uid}`;
    } else {
      isGuestUser = true;
      newWatermark = `Guest-${guestId}`;
    }

    // Block Download feature for Guest Users
    if (downloadPdfBtn) {
      if (isGuestUser) {
        downloadPdfBtn.style.display = 'none';
      } else {
        if (!['overview', 'updates', 'contact'].includes(currentSection)) {
          downloadPdfBtn.style.display = 'inline-flex';
        }
      }
    }

    if (newWatermark !== lastWatermarkText) {
      watermarkText = newWatermark;
      lastWatermarkText = newWatermark;
      
      // Refresh viewer if showing a PDF
      if (pdfWrapper && !['overview', 'updates', 'contact'].includes(currentSection)) {
        updatePdfViewer(currentSection);
      }
    }
  });

  // Section Change callback handler
  const handleSectionChange = (sectionName) => {
    currentSection = sectionName;
    updatePdfViewer(sectionName);
  };

  // Initialize Nav Sidebar
  const sidebarController = initSidebar(handleSectionChange);

  // Initialize Search Modal
  initSearch((sectionName) => {
    if (sidebarController) {
      sidebarController.navigateToSection(sectionName);
      window.location.hash = `#${sectionName}`;
    }
  });

  // Dynamic Custom PDF Viewer using PDF.js & Canvas Watermark Overlay
  function updatePdfViewer(sectionName) {
    if (!pdfWrapper) return;
    
    renderSessionId++;
    const localSessionId = renderSessionId;

    pdfWrapper.innerHTML = `
      <div class="pdf-loading-spinner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem; color:var(--text-muted); width:100%;">
        <i class="ri-loader-4-line ri-spin" style="font-size:3rem; color:#6366f1; margin-bottom:1rem;"></i>
        <p style="font-family:var(--font-heading); font-weight:600; font-size:1.1rem; color:#f8fafc;">Loading secure document stream...</p>
      </div>
    `;
    pdfWrapper.style.display = 'flex';

    const noPdfSections = ['overview', 'updates', 'contact'];
    if (noPdfSections.includes(sectionName)) {
      pdfWrapper.innerHTML = `
        <div class="pdf-coming-soon">
          <i class="ri-file-info-line"></i>
          <h3>Overview Section</h3>
          <p>Please select a specific policy from the sidebar to view its official PDF version.</p>
        </div>
      `;
      if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
      return;
    }

    const adminToken = localStorage.getItem('adminToken');
    let isGuestUser = true;
    if (userContext === 'admin' && adminToken) {
      isGuestUser = false;
    }
    if (downloadPdfBtn) downloadPdfBtn.style.display = isGuestUser ? 'none' : 'inline-flex';

    const pdfName = pdfFileMapping[sectionName];
    if (!pdfName) {
      showPdfPlaceholder(sectionName);
      return;
    }

    const pdfPath = `docs/${pdfName}`;

    // PDF.js Canvas Rendering with Watermark
    pdfWrapper.style.display = 'block';
    pdfWrapper.style.height = 'auto';
    pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
      if (localSessionId !== renderSessionId) return;

      // Clear the loading spinner right before rendering the viewer container
      pdfWrapper.innerHTML = '';

      let currentPageNum = 1;
      const totalPages = pdf.numPages;

      const viewerDiv = document.createElement('div');
      viewerDiv.style.width = '100%';
      viewerDiv.style.minHeight = '500px';
      viewerDiv.style.background = '#0e111d';
      viewerDiv.style.padding = '20px 0';
      viewerDiv.style.display = 'block';
      viewerDiv.style.position = 'relative';
      pdfWrapper.appendChild(viewerDiv);

      // Create Page Container
      const pageContainer = document.createElement('div');
      pageContainer.style.width = '100%';
      pageContainer.style.display = 'flex';
      pageContainer.style.justifyContent = 'center';
      viewerDiv.appendChild(pageContainer);

      // Create Controls Overlay
      const controlsDiv = document.createElement('div');
      controlsDiv.style.display = 'flex';
      controlsDiv.style.alignItems = 'center';
      controlsDiv.style.justifyContent = 'center';
      controlsDiv.style.gap = '1.5rem';
      controlsDiv.style.marginTop = '15px';
      controlsDiv.style.padding = '10px';
      controlsDiv.style.background = 'var(--bg-secondary)';
      controlsDiv.style.borderRadius = '12px';
      controlsDiv.style.border = '1px solid var(--border-color)';
      viewerDiv.appendChild(controlsDiv);

      const prevBtn = document.createElement('button');
      prevBtn.className = 'action-btn';
      prevBtn.style.padding = '8px 16px';
      prevBtn.style.borderRadius = '8px';
      prevBtn.style.display = 'inline-flex';
      prevBtn.style.alignItems = 'center';
      prevBtn.style.gap = '6px';
      prevBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i> Prev';
      controlsDiv.appendChild(prevBtn);

      const pageIndicator = document.createElement('span');
      pageIndicator.style.fontWeight = '600';
      pageIndicator.style.fontFamily = 'var(--font-heading)';
      pageIndicator.innerText = `Page 1 of ${totalPages}`;
      controlsDiv.appendChild(pageIndicator);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'action-btn';
      nextBtn.style.padding = '8px 16px';
      nextBtn.style.borderRadius = '8px';
      nextBtn.style.display = 'inline-flex';
      nextBtn.style.alignItems = 'center';
      nextBtn.style.gap = '6px';
      nextBtn.innerHTML = 'Next <i class="ri-arrow-right-s-line"></i>';
      controlsDiv.appendChild(nextBtn);

      function renderPage(pageNum) {
        pageContainer.innerHTML = '';
        pdf.getPage(pageNum).then(page => {
          if (localSessionId !== renderSessionId) return;

          const viewport = page.getViewport({ scale: 1.1 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.display = 'block';
          canvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
          canvas.style.background = 'white';
          canvas.style.borderRadius = '8px';
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          pageContainer.appendChild(canvas);

          page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
            if (localSessionId !== renderSessionId) return;
            // Apply Watermark Overlay
            ctx.save();
            ctx.font = 'bold 22px Outfit';
            ctx.fillStyle = 'rgba(100, 100, 100, 0.12)';
            ctx.translate(viewport.width / 2, viewport.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.textAlign = 'center';
            ctx.fillText(watermarkText, 0, 0);
            ctx.fillText(watermarkText, -150, -100);
            ctx.fillText(watermarkText, 150, 100);
            ctx.restore();
          });

          pageIndicator.innerText = `Page ${pageNum} of ${totalPages}`;
          prevBtn.disabled = (pageNum === 1);
          nextBtn.disabled = (pageNum === totalPages);
        });
      }

      // Initial render
      renderPage(currentPageNum);

      // Prev Page Action
      prevBtn.addEventListener('click', () => {
        if (currentPageNum > 1) {
          currentPageNum--;
          renderPage(currentPageNum);
        }
      });

      // Next Page Action
      nextBtn.addEventListener('click', () => {
        if (currentPageNum < totalPages) {
          currentPageNum++;
          renderPage(currentPageNum);
        }
      });

      // Touch / Hand Swipe gestures support
      let touchStartX = 0;
      let touchEndX = 0;

      viewerDiv.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      viewerDiv.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
      }, { passive: true });

      function handleSwipeGesture() {
        const threshold = 55; // swipe distance threshold in pixels
        if (touchEndX < touchStartX - threshold) {
          // Swipe Left -> Next Page
          if (currentPageNum < totalPages) {
            currentPageNum++;
            renderPage(currentPageNum);
          }
        } else if (touchEndX > touchStartX + threshold) {
          // Swipe Right -> Prev Page
          if (currentPageNum > 1) {
            currentPageNum--;
            renderPage(currentPageNum);
          }
        }
      }
    }).catch(() => {
      showPdfPlaceholder(sectionName);
    });
  }

  function showPdfPlaceholder(sectionName) {
    pdfWrapper.style.display = 'flex';
    pdfWrapper.innerHTML = `
      <div class="pdf-coming-soon">
        <i class="ri-file-warning-line"></i>
        <h3>PDF Version Coming Soon</h3>
        <p>The signed, printable PDF version of the <strong>${sectionName.toUpperCase()} POLICY</strong> is currently being prepared. The full HTML version is available above.</p>
      </div>
    `;
  }

  // Watermark PDF using PDF-Lib and download
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
      const adminToken = localStorage.getItem('adminToken');
      let isGuestUser = true;
      if (userContext === 'admin' && adminToken) {
        isGuestUser = false;
      }
      if (isGuestUser) {
        alert("Downloads are restricted to administrators only.");
        return;
      }
      const pdfName = pdfFileMapping[currentSection];
      if (!pdfName) return alert('PDF not found.');

      const pdfPath = `docs/${pdfName}`;
      downloadPdfBtn.innerText = 'Watermarking...';
      downloadPdfBtn.disabled = true;

      try {
        const existingPdfBytes = await fetch(pdfPath).then(res => res.arrayBuffer());
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        
        // Standard built-in font
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        // Watermark all pages
        pages.forEach(page => {
          const { width, height } = page.getSize();
          
          // Draw watermark
          page.drawText(watermarkText, {
            x: width / 3,
            y: height / 2,
            size: 24,
            font: font,
            color: PDFLib.rgb(0.5, 0.5, 0.5),
            opacity: 0.12,
            rotate: PDFLib.degrees(45)
          });
        });

        // Write Disclaimer on last page: Subject to Copyright in exactly 10 words
        const lastPage = pages[pages.length - 1];
        const { width: pageW } = lastPage.getSize();
        lastPage.drawText("Subject to copyright: Unauthorized replication of this material is prohibited.", {
          x: 50,
          y: 25,
          size: 7.5,
          font: font,
          color: PDFLib.rgb(0.4, 0.4, 0.4),
          opacity: 0.8
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentSection}_watermarked.pdf`;
        link.click();
      } catch (e) {
        alert("Failed to compile watermarked download.");
      } finally {
        downloadPdfBtn.innerText = 'Download PDF';
        downloadPdfBtn.disabled = false;
      }
    });
  }

  // Print Action
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Share link action handler
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const pdfName = pdfFileMapping[currentSection];
      const originalText = shareBtn.innerHTML;
      shareBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Generating...';
      shareBtn.disabled = true;

      try {
        const res = await fetch(window.API_BASE_URL + "/api/share/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            docId: `legal_${currentSection}`, 
            title: `${currentSection.toUpperCase()} Policy`, 
            category: "Legal", 
            discipline: "Compliance", 
            uploader: "DPGNotes System", 
            pdfUrl: pdfName ? `${window.location.origin}/legal/docs/${pdfName}` : "", 
            description: `Official DPGNotes Compliance Policy for ${currentSection}`, 
            tags: "legal, policy, compliance",
            originalUrl: window.location.origin + "/index.html?share=",
            uploaderUid: (auth.currentUser) ? auth.currentUser.uid : ""
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        const shareUrl = data.shareUrl;
        if (navigator.share) {
          await navigator.share({
            title: `Check out ${currentSection.toUpperCase()} Policy on DPGNotes`,
            url: shareUrl
          });
        } else {
          navigator.clipboard.writeText(shareUrl);
          alert("Smart Link copied to clipboard:\n" + shareUrl);
        }
      } catch (err) {
        alert("Failed to generate share link: " + err.message);
      } finally {
        shareBtn.innerHTML = originalText;
        shareBtn.disabled = false;
      }
    });
  }

  // Reading Progress Tracker
  window.addEventListener('scroll', () => {
    const readingProgress = document.getElementById('readingProgress');
    if (!readingProgress) return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    if (docHeight > 0) {
      const scrolled = (scrollTop / docHeight) * 100;
      readingProgress.style.width = `${scrolled}%`;
    } else {
      readingProgress.style.width = '0%';
    }
  });

  // =========================================
  // STRICT SECURITY POLICIES
  // =========================================
  const securityOverlay = document.getElementById('securityOverlay');

  function triggerSecurityBreach() {
    if (securityOverlay) {
      securityOverlay.style.display = 'flex';
    }
    // Prevent interaction
    document.body.style.overflow = 'hidden';
  }

  // 1. Block Context Menu (Inspect Element Right Click)
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    triggerSecurityBreach();
  });

  // 2. Block Keyboard Shortcuts (F12, Inspect, Screenshots)
  window.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      triggerSecurityBreach();
    }
    // Ctrl + Shift + I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      triggerSecurityBreach();
    }
    // Ctrl + Shift + C (Inspect element select)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      triggerSecurityBreach();
    }
    // Ctrl + P (Block native print shortcut to enforce our watermark print flow)
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      alert("Please use the official 'Print' button on the portal header to generate compliance outputs.");
    }
    // Screen Capture keys (PrintScreen/Meta+Shift+S)
    if (e.key === 'PrintScreen') {
      navigator.clipboard.writeText(''); // Clear clipboard immediately
      triggerSecurityBreach();
    }
  });

  // 3. Block Tab Switching (Visibility API) & Screen Recording
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerSecurityBreach();
    }
  });

  // 4. Blur page when window loses focus (Screenshot/Recorder overlay intercept)
  window.addEventListener('blur', () => {
    triggerSecurityBreach();
  });
});
