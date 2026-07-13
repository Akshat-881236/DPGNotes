// Sidebar, mobile toggling, and Table of Contents (TOC) ScrollSpy module
export function initSidebar(onSectionChangeCallback) {
  const sidebar = document.getElementById('legalSidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.querySelectorAll('.nav-link');
  const currentCrumb = document.getElementById('currentCrumb');
  const actionTitle = document.getElementById('actionTitle');

  // Mobile menu button toggle
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
    });
  }

  // Sidebar navigation click handler
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHash = link.getAttribute('href');
      const sectionName = link.getAttribute('data-section');
      
      // Update browser URL hash quietly
      window.history.pushState(null, null, targetHash);
      
      // Switch active section
      switchActiveSection(sectionName);
      
      // Close mobile menu if active
      if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
      }
    });
  });

  // Switch Active Section Helper
  function switchActiveSection(sectionName) {
    const activeSection = document.getElementById(`${sectionName}Section`);
    if (!activeSection) return;

    // Remove active class from all sections
    document.querySelectorAll('.policy-section').forEach(sec => {
      sec.classList.remove('active-section');
    });
    // Add active class to target section
    activeSection.classList.add('active-section');

    // Update active nav link
    navLinks.forEach(link => {
      if (link.getAttribute('data-section') === sectionName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Breadcrumbs & Titles
    const linkObj = Array.from(navLinks).find(l => l.getAttribute('data-section') === sectionName);
    const friendlyName = linkObj ? linkObj.textContent.trim() : sectionName;
    if (currentCrumb) currentCrumb.textContent = friendlyName;
    if (actionTitle) actionTitle.textContent = friendlyName;

    // Generate Table of Contents for the active section
    generateTOC(activeSection);
    
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger parent callback
    if (onSectionChangeCallback) {
      onSectionChangeCallback(sectionName);
    }
  }

  // Generate Table of Contents (TOC)
  function generateTOC(activeSection) {
    const tocList = document.getElementById('tocList');
    if (!tocList) return;
    tocList.innerHTML = '';

    const headers = activeSection.querySelectorAll('h2, h3');
    if (headers.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.innerHTML = '<span class="toc-link disabled">No sections</span>';
      tocList.appendChild(emptyLi);
      return;
    }

    headers.forEach((header, index) => {
      // Add unique IDs to headers if they don't have one
      if (!header.id) {
        header.id = `header-${activeSection.id}-${index}`;
      }

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${header.id}`;
      a.className = 'toc-link';
      a.textContent = header.textContent;
      
      // Indentation for h3
      if (header.tagName.toLowerCase() === 'h3') {
        a.style.paddingLeft = '1.5rem';
        a.style.fontSize = '0.8rem';
      }

      a.addEventListener('click', (e) => {
        e.preventDefault();
        header.scrollIntoView({ behavior: 'smooth' });
      });

      li.appendChild(a);
      tocList.appendChild(li);
    });

    // Set up ScrollSpy for TOC links
    setupScrollSpy(headers);
  }

  // ScrollSpy Helper
  function setupScrollSpy(headers) {
    const tocLinks = document.querySelectorAll('.toc-link');
    
    const spyHandler = () => {
      let currentHeaderId = '';
      const scrollPos = window.scrollY + 100;

      headers.forEach(header => {
        if (scrollPos >= header.offsetTop) {
          currentHeaderId = header.id;
        }
      });

      tocLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${currentHeaderId}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    };

    window.removeEventListener('scroll', spyHandler);
    window.addEventListener('scroll', spyHandler);
    spyHandler(); // Run initial spy pass
  }

  // Load section based on initial URL hash
  const initialHash = window.location.hash.substring(1);
  const validSections = Array.from(navLinks).map(l => l.getAttribute('data-section'));
  if (initialHash && validSections.includes(initialHash)) {
    switchActiveSection(initialHash);
  } else {
    // Default to overview
    switchActiveSection('overview');
  }

  return {
    navigateToSection: switchActiveSection
  };
}
