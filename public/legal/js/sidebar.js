export function initSidebar(onSectionChangeCallback) {
  const sidebar = document.getElementById('legalSidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('sidebarBackdrop');
  const navLinks = document.querySelectorAll('.nav-link');
  const currentCrumb = document.getElementById('currentCrumb');
  const actionTitle = document.getElementById('actionTitle');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }
  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('active');
      if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
      backdrop.classList.remove('active');
    });
  }
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHash = link.getAttribute('href');
      const sectionName = link.getAttribute('data-section');
      window.history.pushState(null, null, targetHash);
      switchActiveSection(sectionName);
      if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
      }
    });
  });
  function switchActiveSection(sectionName) {
    const activeSection = document.getElementById(`${sectionName}Section`);
    if (!activeSection) return;
    document.querySelectorAll('.policy-section').forEach(sec => {
      sec.classList.remove('active-section');
    });
    activeSection.classList.add('active-section');
    navLinks.forEach(link => {
      if (link.getAttribute('data-section') === sectionName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    const linkObj = Array.from(navLinks).find(l => l.getAttribute('data-section') === sectionName);
    const friendlyName = linkObj ? linkObj.textContent.trim() : sectionName;
    if (currentCrumb) currentCrumb.textContent = friendlyName;
    if (actionTitle) actionTitle.textContent = friendlyName;
    generateTOC(activeSection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onSectionChangeCallback) {
      onSectionChangeCallback(sectionName);
    }
  }
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
      if (!header.id) {
        header.id = `header-${activeSection.id}-${index}`;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${header.id}`;
      a.className = 'toc-link';
      a.textContent = header.textContent;
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
    setupScrollSpy(headers);
  }
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
  const initialHash = window.location.hash.substring(1);
  const validSections = Array.from(navLinks).map(l => l.getAttribute('data-section'));
  if (initialHash && validSections.includes(initialHash)) {
    switchActiveSection(initialHash);
  } else {
    switchActiveSection('overview');
  }
  return {
    navigateToSection: switchActiveSection
  };
}
