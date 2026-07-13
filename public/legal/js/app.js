// Legal Documentation Center Client Application Orchestrator
import { initTheme } from './theme.js';
import { initSidebar } from './sidebar.js';
import { initSearch } from './search.js';

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
      // Update hash in browser
      window.location.hash = `#${sectionName}`;
    }
  });

  // Dynamic PDF Viewer Update
  function updatePdfViewer(sectionName) {
    if (!pdfWrapper) return;
    
    // Clear wrapper
    pdfWrapper.innerHTML = '';

    // If overview or contact or updates, PDF is coming soon / not applicable
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

    const pdfPath = `docs/${sectionName}.pdf`;
    
    // We will attempt to fetch or load the PDF in an iframe.
    // If the PDF file is missing, the browser iframe will trigger an error or load a 404.
    // To gracefully show "PDF Coming Soon" if the file is not yet uploaded in /legal/docs/:
    // We can do a quick head fetch check.
    fetch(pdfPath, { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          // PDF exists - Embed in iframe
          const iframe = document.createElement('iframe');
          iframe.src = pdfPath;
          iframe.style.width = '100%';
          iframe.style.height = '600px';
          iframe.style.border = 'none';
          iframe.title = `${sectionName} PDF Document`;
          pdfWrapper.appendChild(iframe);
        } else {
          // PDF is missing (404) - Show graceful placeholder
          showPdfPlaceholder(sectionName);
        }
      })
      .catch(() => {
        // Network error or fetch blocked - Fallback to placeholder
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

  // Download PDF Action handler
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const pdfPath = `docs/${currentSection}.pdf`;
      // Verify if PDF exists before redirecting to download
      fetch(pdfPath, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            window.open(pdfPath, '_blank');
          } else {
            alert(`The PDF version for ${currentSection} is coming soon!`);
          }
        })
        .catch(() => {
          alert(`The PDF version for ${currentSection} is coming soon!`);
        });
    });
  }

  // Print Action handler
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
          // Custom dialog notification
          if (window.customConfirm) {
            window.customConfirm(`Share link copied to clipboard:\n${shareUrl}`, false);
          } else {
            alert(`Link copied to clipboard: ${shareUrl}`);
          }
        })
        .catch(() => {
          alert('Could not copy link to clipboard.');
        });
    });
  }

  // Reading Progress Scroll tracker
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
});
