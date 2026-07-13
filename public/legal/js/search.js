// Keyboard shortcuts and search query parser engine module
export function initSearch(onResultSelectCallback) {
  const searchTrigger = document.getElementById('searchTrigger');
  const searchModal = document.getElementById('searchModal');
  const closeSearchBtn = document.getElementById('closeSearchBtn');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  if (!searchTrigger || !searchModal || !searchInput) return;

  // Toggle modal visibility
  searchTrigger.addEventListener('click', openSearch);
  if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearch);

  // Close search on clicking background overlay
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) closeSearch();
  });

  // Global Ctrl + K / Cmd + K keyboard listener
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
      closeSearch();
    }
  });

  function openSearch() {
    searchModal.classList.add('active');
    setTimeout(() => searchInput.focus(), 50);
  }

  function closeSearch() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '<p class="no-results">Type keywords to search...</p>';
  }

  // Key event navigation inside modal
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 2) {
      searchResults.innerHTML = '<p class="no-results">Type keywords to search...</p>';
      return;
    }

    performSearch(query);
  });

  // Perform search by scanning sections
  function performSearch(query) {
    const sections = document.querySelectorAll('.policy-section');
    const matches = [];

    sections.forEach(sec => {
      const sectionId = sec.id.replace('Section', '');
      const sectionTitle = sec.querySelector('h1')?.textContent || sectionId;
      const textContent = sec.textContent.toLowerCase();
      
      const idx = textContent.indexOf(query);
      if (idx !== -1) {
        // Build a snippet around the match
        const start = Math.max(0, idx - 40);
        const end = Math.min(textContent.length, idx + query.length + 50);
        let snippet = sec.textContent.substring(start, end).replace(/\s+/g, ' ');
        
        // Highlight matched keyword
        const regex = new RegExp(`(${query})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');

        matches.push({
          sectionId,
          title: sectionTitle,
          snippet: `...${snippet.trim()}...`
        });
      }
    });

    displayResults(matches);
  }

  function displayResults(results) {
    if (results.length === 0) {
      searchResults.innerHTML = '<p class="no-results">No matches found.</p>';
      return;
    }

    searchResults.innerHTML = '';
    results.forEach((res, index) => {
      const a = document.createElement('a');
      a.href = `#${res.sectionId}`;
      a.className = 'search-result-item';
      if (index === 0) a.classList.add('selected');

      a.innerHTML = `
        <div class="search-result-title">${res.title}</div>
        <div class="search-result-snippet">${res.snippet}</div>
      `;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        closeSearch();
        if (onResultSelectCallback) {
          onResultSelectCallback(res.sectionId);
        }
      });

      searchResults.appendChild(a);
    });
  }
}
