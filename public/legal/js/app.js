// Legal Documentation Center Client Application Orchestrator
import { initTheme } from './theme.js';
import { initSidebar } from './sidebar.js';
import { initSearch } from './search.js';

// Import Firebase dependencies for state checks
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsJ_8V_rFf08H5517J881238",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.appspot.com",
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

  // Get or Generate unique Guest ID
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'GST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('guestId', guestId);
  }

  // Setup Dynamic Watermark based on User Authentication state
  onAuthStateChanged(auth, (user) => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      // Admin Watermark
      const loginTime = localStorage.getItem('adminLoginTime') || new Date().toLocaleString();
      watermarkText = `Admin-${loginTime}`;
    } else if (user) {
      // Contributor Watermark
      const name = user.displayName || user.email.split('@')[0];
      watermarkText = `${name}-${user.uid}`;
    } else {
      // Guest Watermark
      watermarkText = `Guest-${guestId}`;
    }
    
    // Refresh viewer if showing a PDF
    if (pdfWrapper && !['overview', 'updates', 'contact'].includes(currentSection)) {
      updatePdfViewer(currentSection);
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
    pdfWrapper.innerHTML = '';

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

    if (downloadPdfBtn) downloadPdfBtn.style.display = 'inline-flex';

    const pdfName = pdfFileMapping[sectionName];
    if (!pdfName) {
      showPdfPlaceholder(sectionName);
      return;
    }

    const pdfPath = `docs/${pdfName}`;

    // PDF.js Canvas Rendering with Watermark
    pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
      const viewerDiv = document.createElement('div');
      viewerDiv.style.width = '100%';
      viewerDiv.style.height = '600px';
      viewerDiv.style.overflowY = 'auto';
      viewerDiv.style.background = '#e2e8f0';
      viewerDiv.style.padding = '20px 0';
      pdfWrapper.appendChild(viewerDiv);

      // Render all pages sequentially
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then(page => {
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 20px auto';
          canvas.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
          canvas.style.background = 'white';
          viewerDiv.appendChild(canvas);

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };

          page.render(renderContext).promise.then(() => {
            // Apply Watermark Overlay
            ctx.save();
            ctx.font = 'bold 24px Outfit';
            ctx.fillStyle = 'rgba(100, 100, 100, 0.15)';
            ctx.translate(viewport.width / 2, viewport.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.textAlign = 'center';
            ctx.fillText(watermarkText, 0, 0);
            ctx.fillText(watermarkText, -150, -100);
            ctx.fillText(watermarkText, 150, 100);
            ctx.restore();
          });
        });
      }
    }).catch(() => {
      showPdfPlaceholder(sectionName);
    });
  }

  function showPdfPlaceholder(sectionName) {
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
    shareBtn.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}#${currentSection}`;
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          alert(`Link copied to clipboard: ${shareUrl}`);
        })
        .catch(() => {
          alert('Could not copy link.');
        });
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
