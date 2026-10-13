/**
 * DPGNotes Solutions NLP & Gemini AI Search Engine
 * Version 1.0.0
 * 
 * Provides resilient, order-independent, case-insensitive, typo-tolerant,
 * and sense-based academic search for Assignment and Practical Solutions.
 */
(function(window) {
  'use strict';

  // ==========================================
  // 1. NLP STOPWORDS & ACADEMIC SYNONYM MAP
  // ==========================================
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'more', 'most', 'my', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'out', 'over', 'own',
    'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
    'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
    'why', 'with', 'would', 'you', 'your', 'yours', 'give', 'show', 'find', 'get', 'list', 'please',
    'want', 'need', 'tell', 'looking'
  ]);

  // Concept & Academic Synonym Clusters
  const ACADEMIC_SYNONYMS = {
    'dsa': ['data', 'structure', 'structures', 'algorithm', 'algorithms', 'stack', 'queue', 'tree', 'linked list', 'sorting', 'searching'],
    'algo': ['algorithm', 'algorithms', 'dsa'],
    'algorithm': ['algo', 'algorithms', 'dsa'],
    'wad': ['web', 'application', 'development', 'html', 'css', 'javascript', 'frontend', 'dom'],
    'webdev': ['web', 'application', 'development', 'html', 'css', 'javascript', 'wad'],
    'web': ['web', 'application', 'development', 'html', 'css', 'javascript', 'wad'],
    'os': ['operating', 'system', 'systems', 'linux', 'process', 'scheduling', 'deadlock', 'semaphore', 'thread'],
    'dbms': ['database', 'management', 'system', 'systems', 'sql', 'relational', 'query', 'tables', 'erd', 'normalization'],
    'sql': ['database', 'dbms', 'query', 'table', 'relational'],
    'cn': ['computer', 'networks', 'network', 'networking', 'tcp', 'ip', 'lan', 'wan', 'osi', 'protocol'],
    'network': ['computer', 'networks', 'networking', 'cn', 'tcp', 'ip'],
    'networking': ['computer', 'networks', 'network', 'cn', 'tcp', 'ip'],
    'oops': ['object', 'oriented', 'programming', 'cpp', 'c++', 'classes', 'inheritance', 'polymorphism'],
    'cpp': ['c++', 'object', 'oriented', 'programming', 'oops'],
    'c': ['c', 'programming', 'pointers', 'structures'],
    'py': ['python', 'programming', 'script'],
    'python': ['py', 'python', 'programming', 'script'],
    'js': ['javascript', 'web', 'dom', 'frontend'],
    'javascript': ['js', 'web', 'dom', 'frontend', 'script'],
    'se': ['software', 'engineering', 'sdlc', 'agile', 'testing', 'lifecycle'],
    'math': ['discrete', 'mathematics', 'maths', 'logic', 'sets', 'matrix'],
    'maths': ['discrete', 'mathematics', 'math', 'logic', 'sets', 'matrix'],
    'stats': ['numerical', 'analysis', 'statistics', 'probability', 'regression'],
    'bca': ['bca', 'bachelor', 'computer', 'applications'],
    'mca': ['mca', 'master', 'computer', 'applications'],
    'btech': ['btech', 'engineering', 'cs'],
    'faculty': ['faculty', 'prof', 'professor', 'dr', 'teacher', 'instructor', 'sir', 'maam'],
    'prof': ['faculty', 'professor', 'dr', 'teacher', 'sir', 'maam'],
    'dr': ['faculty', 'prof', 'professor', 'dr'],
    'sir': ['faculty', 'prof', 'professor', 'teacher'],
    'maam': ['faculty', 'prof', 'professor', 'teacher'],
    'assignment': ['assignment', 'assignments', 'homework', 'question', 'questions', 'solution', 'submission', 'doc'],
    'practical': ['practical', 'practicals', 'lab', 'laboratory', 'experiment', 'experiments', 'code', 'program', 'sandbox', 'testcase'],
    'lab': ['practical', 'practicals', 'laboratory', 'experiment', 'experiments', 'code', 'program', 'sandbox']
  };

  // ==========================================
  // 2. STRING NORMALIZATION & TOKENIZATION
  // ==========================================

  // Strips accents, lowers case, replaces non-alphanumeric punctuation with space
  function cleanText(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalizes academic subject/course codes (e.g. 'BCA - FSD - 5A' -> 'bcafsd5a')
  function normalizeCode(codeStr) {
    if (!codeStr) return '';
    return String(codeStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Splits code into constituent alphanumeric tokens (e.g. 'BCA-301' -> ['bca', '301'])
  function splitCodeTokens(codeStr) {
    if (!codeStr) return [];
    const cleaned = String(codeStr).toLowerCase().replace(/[^a-z0-9]/g, ' ');
    return cleaned.split(/\s+/).filter(Boolean);
  }

  // Lightweight English stemmer
  function stemWord(word) {
    if (!word || word.length <= 3) return word;
    let w = word.toLowerCase();

    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
    if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
    if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('tion') && w.length > 5) return w.slice(0, -4);
    if (w.endsWith('tions') && w.length > 6) return w.slice(0, -5);
    if (w.endsWith('ment') && w.length > 5) return w.slice(0, -4);
    if (w.endsWith('ments') && w.length > 6) return w.slice(0, -5);

    return w;
  }

  // Levenshtein Distance for fuzzy typo tolerance
  function levenshtein(a, b) {
    if (a === b) return 0;
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    if (Math.abs(lenA - lenB) > 2) return 999; // Bailout early

    const matrix = [];
    for (let i = 0; i <= lenB; i++) matrix[i] = [i];
    for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenB; i++) {
      for (let j = 1; j <= lenA; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[lenB][lenA];
  }

  // Checks whether word 'a' matches word 'b' tolerating character typos
  function isTypoMatch(a, b) {
    if (a === b) return true;
    const lenA = a.length;
    const lenB = b.length;
    if (Math.abs(lenA - lenB) > 2) return false;
    if (lenA <= 3 || lenB <= 3) return a === b;
    if (lenA <= 5) return levenshtein(a, b) <= 1;
    return levenshtein(a, b) <= 2;
  }

  // Extracts word tokens from string excluding non-essential stopwords
  function tokenize(str, keepStopwords) {
    const cleaned = cleanText(str);
    if (!cleaned) return [];
    const words = cleaned.split(/\s+/);
    if (keepStopwords) return words;
    const filtered = words.filter(w => {
      if (STOP_WORDS.has(w)) return false;
      if (/^\d+$/.test(w)) return true; // keep numbers like 1, 2, 3
      if (w === 'c' || w === 'r') return true; // keep programming languages
      return w.length > 1;
    });
    return filtered.length > 0 ? filtered : words;
  }

  // Generates semantic expansion tokens for a set of query tokens (including typo-tolerance on keys)
  function expandSynonyms(tokens) {
    const expanded = new Set(tokens);
    for (const token of tokens) {
      // Direct dictionary lookup
      const directSyns = ACADEMIC_SYNONYMS[token];
      if (Array.isArray(directSyns)) {
        directSyns.forEach(s => expanded.add(s));
      }
      // Typo-tolerant lookup on dictionary keys (e.g. 'pratical' matches 'practical')
      for (const [key, syns] of Object.entries(ACADEMIC_SYNONYMS)) {
        if (isTypoMatch(token, key)) {
          expanded.add(key);
          if (Array.isArray(syns)) {
            syns.forEach(s => expanded.add(s));
          }
        }
      }
    }
    return Array.from(expanded);
  }

  // ==========================================
  // 3. NLP SEARCH & SENSE SCORING ENGINE
  // ==========================================

  /**
   * Executes order-independent, typo-tolerant, sense-based scoring on candidate documents.
   * 
   * @param {string} rawQuery - The user query (e.g. 'web dev assignment 1', 'bca-301 dsa', 'pyhton lab')
   * @param {Array<Object>} candidates - List of solution items
   * @returns {Array<Object>} Scored & ranked documents with semantic metadata
   */
  function executeNlpSearch(rawQuery, candidates) {
    if (!Array.isArray(candidates)) return [];
    const qTrimmed = (rawQuery || '').trim();
    if (!qTrimmed) {
      return candidates.map(doc => ({
        ...doc,
        _searchScore: 100,
        _matchPercentage: 100,
        _matchType: 'all',
        _matchedConcepts: []
      }));
    }

    const cleanedQuery = cleanText(qTrimmed);
    const queryTokens = tokenize(cleanedQuery, false);
    const queryCodeNormalized = normalizeCode(cleanedQuery);
    const queryStems = queryTokens.map(stemWord);
    const expandedQueryTokens = expandSynonyms(queryTokens);

    const scoredResults = [];

    for (const item of candidates) {
      let score = 0;
      let matchedTokensCount = 0;
      const matchedTokens = new Set();
      const matchedConcepts = new Set();
      let hasExactCodeMatch = false;

      // Extract field values
      const subCode = item.subjectCode || '';
      const subName = item.subjectName || '';
      const course = item.course || item.courseSec || '';
      const prof = item.profName || '';
      const student = item.studentName || '';
      const contrib = item.contributorName || '';
      
      // Determine document type (Assignment vs Practical)
      const isAssignmentDoc = Array.isArray(item.questions) || (item.docPath && item.docPath.includes('assignment_solutions'));
      const isPracticalDoc = Array.isArray(item.practicals) || (item.docPath && item.docPath.includes('practical_solutions'));

      // Questions / practicals titles
      const itemsList = Array.isArray(item.questions) ? item.questions : (Array.isArray(item.practicals) ? item.practicals : []);
      const itemTitles = itemsList.map(it => (it.title || '') + ' ' + (it.code || '')).join(' ');

      // Normalized field representations
      const normSubCode = normalizeCode(subCode);
      const subCodeTokens = splitCodeTokens(subCode);
      const normCourse = normalizeCode(course);
      const courseTokens = splitCodeTokens(course);

      const fieldTokens = {
        code: subCodeTokens,
        title: tokenize(subName, true),
        course: courseTokens,
        faculty: tokenize(prof, true),
        student: tokenize(student, true),
        contrib: tokenize(contrib, true),
        content: tokenize(itemTitles, false)
      };

      const fieldStems = {
        code: subCodeTokens.map(stemWord),
        title: fieldTokens.title.map(stemWord),
        course: fieldTokens.course.map(stemWord),
        faculty: fieldTokens.faculty.map(stemWord),
        student: fieldTokens.student.map(stemWord),
        contrib: fieldTokens.contrib.map(stemWord),
        content: fieldTokens.content.map(stemWord)
      };

      // 1. Direct Code Matching (e.g. BCA-301, bca 301, BCA301)
      if (normSubCode && queryCodeNormalized) {
        if (normSubCode === queryCodeNormalized) {
          score += 120;
          hasExactCodeMatch = true;
          matchedConcepts.add(subCode);
        } else if (normSubCode.includes(queryCodeNormalized) || queryCodeNormalized.includes(normSubCode)) {
          score += 60;
          matchedConcepts.add(subCode);
        }
      }

      // Course section matching (e.g. BCA-FSD-5A vs bcafsd5a)
      if (normCourse && queryCodeNormalized) {
        if (normCourse === queryCodeNormalized || normCourse.includes(queryCodeNormalized) || queryCodeNormalized.includes(normCourse)) {
          score += 50;
          matchedConcepts.add(course);
        }
      }

      // 2. Full Query Phrase Matching in Title / Code (Bonus for consecutive phrasing)
      const cleanSubName = cleanText(subName);
      if (cleanSubName.includes(cleanedQuery)) {
        score += 80;
        matchedConcepts.add(subName);
      }

      // 3. Order-Independent Bag-of-Words Multi-Field Scoring
      for (let i = 0; i < queryTokens.length; i++) {
        const qToken = queryTokens[i];
        const qStem = queryStems[i];
        let tokenMatchedInDoc = false;

        // A. Match in Subject Code
        if (fieldTokens.code.includes(qToken) || fieldStems.code.includes(qStem)) {
          score += 40;
          tokenMatchedInDoc = true;
          matchedConcepts.add(subCode);
        }

        // B. Match in Subject Title (High weight)
        if (fieldTokens.title.includes(qToken)) {
          score += 35;
          tokenMatchedInDoc = true;
          matchedConcepts.add(qToken);
        } else if (fieldStems.title.includes(qStem)) {
          score += 30;
          tokenMatchedInDoc = true;
          matchedConcepts.add(qToken);
        } else {
          // Typo fuzzy match in title
          for (const tToken of fieldTokens.title) {
            if (isTypoMatch(qToken, tToken)) {
              score += 24;
              tokenMatchedInDoc = true;
              matchedConcepts.add(tToken);
              break;
            }
          }
        }

        // C. Match in Course / Section
        if (fieldTokens.course.includes(qToken) || fieldStems.course.includes(qStem)) {
          score += 25;
          tokenMatchedInDoc = true;
          matchedConcepts.add(course);
        }

        // D. Match in Questions / Practicals Content
        if (fieldTokens.content.includes(qToken)) {
          score += 20;
          tokenMatchedInDoc = true;
        } else if (fieldStems.content.includes(qStem)) {
          score += 16;
          tokenMatchedInDoc = true;
        } else {
          for (const cToken of fieldTokens.content) {
            if (isTypoMatch(qToken, cToken)) {
              score += 12;
              tokenMatchedInDoc = true;
              break;
            }
          }
        }

        // E. Match in Faculty Name
        if (fieldTokens.faculty.includes(qToken) || fieldStems.faculty.includes(qStem)) {
          score += 25;
          tokenMatchedInDoc = true;
          matchedConcepts.add(prof);
        }

        // F. Match in Student / Contributor Name
        if (fieldTokens.student.includes(qToken) || fieldTokens.contrib.includes(qToken)) {
          score += 18;
          tokenMatchedInDoc = true;
        }

        // G. Match in Document Category Type ('assignment' for assignment docs, 'practical' for lab docs)
        if (isAssignmentDoc && (qToken === 'assignment' || qStem === 'assign' || qToken === 'hw' || qToken === 'homework')) {
          score += 20;
          tokenMatchedInDoc = true;
        }
        if (isPracticalDoc && (qToken === 'practical' || qToken === 'lab' || qToken === 'experiment' || qStem === 'practic' || isTypoMatch(qToken, 'practical'))) {
          score += 20;
          tokenMatchedInDoc = true;
        }

        if (tokenMatchedInDoc) {
          matchedTokensCount++;
          matchedTokens.add(qToken);
        }
      }

      // 4. Semantic / Concept / Synonym Matching
      for (const sToken of expandedQueryTokens) {
        if (matchedTokens.has(sToken)) continue;
        const sStem = stemWord(sToken);

        if (fieldTokens.title.includes(sToken) || fieldStems.title.includes(sStem)) {
          score += 20;
          matchedConcepts.add(sToken);
        } else if (fieldTokens.content.includes(sToken) || fieldStems.content.includes(sStem)) {
          score += 14;
        } else if (isPracticalDoc && (sToken === 'lab' || sToken === 'practical' || sToken === 'experiment')) {
          score += 14;
        } else if (isAssignmentDoc && (sToken === 'assignment' || sToken === 'question')) {
          score += 14;
        }
      }

      // 5. Token Coverage Percentage & Confidence Calculation
      const tokenCoverage = queryTokens.length > 0 ? (matchedTokensCount / queryTokens.length) : 1;
      
      // Coverage boost: If all query tokens matched somewhere in the document, massive boost!
      if (tokenCoverage === 1 && queryTokens.length > 1) {
        score += 50;
      } else if (tokenCoverage >= 0.75) {
        score += 25;
      }

      // Calculate confidence percentage (capped at 100%)
      let matchPercentage = 0;
      if (hasExactCodeMatch) {
        matchPercentage = 100;
      } else if (score > 0) {
        const baseNorm = (queryTokens.length * 35) + 30;
        matchPercentage = Math.min(100, Math.round((score / baseNorm) * 100));
        matchPercentage = Math.max(matchPercentage, Math.round(tokenCoverage * 85));
      }

      // Determine match classification
      let matchType = 'semantic';
      if (hasExactCodeMatch || cleanSubName === cleanedQuery) matchType = 'exact';
      else if (tokenCoverage === 1) matchType = 'topic_match';
      else if (matchPercentage >= 70) matchType = 'high_sense';
      else matchType = 'partial';

      // Keep results that have relevant match
      if (score > 12 || hasExactCodeMatch || tokenCoverage >= 0.5) {
        scoredResults.push({
          ...item,
          _searchScore: score,
          _tokenCoverage: tokenCoverage,
          _matchPercentage: matchPercentage,
          _matchType: matchType,
          _matchedConcepts: Array.from(matchedConcepts).slice(0, 4)
        });
      }
    }

    // Sort: highest score first, then views as tie-breaker
    scoredResults.sort((a, b) => {
      if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
      return (Number(b.views) || 0) - (Number(a.views) || 0);
    });

    return scoredResults;
  }

  // ==========================================
  // 4. GEMINI API AI SENSE INTEGRATION
  // ==========================================

  // Retrieves available Gemini API Key (User custom localStorage -> window config)
  function getGeminiApiKey() {
    return (
      localStorage.getItem('dpgnotes_gemini_key') ||
      localStorage.getItem('gemini_api_key') ||
      window.GEMINI_API_KEY ||
      ''
    ).trim();
  }

  // Sets user custom Gemini API Key
  function setGeminiApiKey(key) {
    if (!key) {
      localStorage.removeItem('dpgnotes_gemini_key');
      localStorage.removeItem('gemini_api_key');
    } else {
      localStorage.setItem('dpgnotes_gemini_key', key.trim());
    }
  }

  /**
   * Calls Gemini Generative Language API or Render backend fallback to perform
   * deep semantic sense analysis and generate an academic SERP overview.
   * 
   * @param {string} rawQuery - The user query
   * @param {Array<Object>} candidates - Scored candidate solutions (top 4)
   * @param {string} solutionType - 'assignment' | 'practical'
   * @returns {Promise<Object>} Academic AI Sense Overview
   */
  async function fetchGeminiAiSense(rawQuery, candidates, solutionType) {
    const qTrimmed = (rawQuery || '').trim();
    if (!qTrimmed) return null;

    const topCandidates = (candidates || []).slice(0, 4).map(c => ({
      id: c.id,
      code: c.subjectCode,
      subject: c.subjectName,
      course: c.course || c.courseSec,
      faculty: c.profName,
      preview: Array.isArray(c.questions) 
        ? c.questions.slice(0, 2).map(q => q.title).join('; ')
        : (Array.isArray(c.practicals) ? c.practicals.slice(0, 2).map(p => p.title).join('; ') : '')
    }));

    const typeLabel = solutionType === 'practical' ? 'Practical Laboratory Experiments' : 'Assignment Solutions';

    const prompt = 'You are DPGNotes Academic AI Search Intelligence for DPG College.\n' +
      'Analyze this academic student query for ' + typeLabel + ':\n' +
      'Query: "' + qTrimmed + '"\n\n' +
      'Top candidate documents from our academic database:\n' +
      JSON.stringify(topCandidates, null, 2) + '\n\n' +
      'Return a strict JSON object with NO markdown ticks, exactly matching this schema:\n' +
      '{\n' +
      '  "interpretedIntent": "One clear sentence explaining what specific academic topic or subject the user is looking for",\n' +
      '  "concepts": ["Concept 1", "Concept 2", "Concept 3"],\n' +
      '  "aiSummary": "2 short sentences explaining why the top matched solution fits this query and what syllabus units/concepts it addresses.",\n' +
      '  "recommendedCode": "' + (topCandidates[0] ? topCandidates[0].code : '') + '",\n' +
      '  "studyTip": "A brief 1-sentence tip or viva focus related to this topic"\n' +
      '}';

    const apiKey = getGeminiApiKey();

    // 1. Try Direct Gemini Generative Language API if Key is present
    if (apiKey) {
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const model of models) {
        try {
          const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 600
              }
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanedJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);
            return {
              ...parsed,
              source: 'Direct Gemini (' + model + ')',
              isCustomKey: true
            };
          }
        } catch (err) {
          console.warn('Gemini model ' + model + ' failed:', err.message);
        }
      }
    }

    // 2. Try Render Backend AI Endpoint (/api/ai/chat)
    try {
      const apiBase = (window.API_BASE_URL || 'https://dpgnotes.onrender.com').replace(/\/+$/, '');
      const backendResp = await fetch(apiBase + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemInstruction: 'Respond only with strict valid JSON. Do not include markdown or backticks.'
        })
      });

      if (backendResp.ok) {
        const bData = await backendResp.json();
        const text = bData.answer || bData.reply || bData.response || '';
        if (text) {
          const cleanedJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);
          return {
            ...parsed,
            source: 'DPGNotes Cloud AI (Gemini)',
            isCustomKey: false
          };
        }
      }
    } catch (bErr) {
      console.warn('Backend AI chat fallback failed:', bErr.message);
    }

    // 3. Resilient Local NLP Semantic Synthesis Fallback (0ms, 100% offline uptime)
    const matchedConcepts = [];
    const qLower = qTrimmed.toLowerCase();
    for (const [key, syns] of Object.entries(ACADEMIC_SYNONYMS)) {
      if (qLower.includes(key) || syns.some(s => qLower.includes(s))) {
        matchedConcepts.push(key.toUpperCase());
      }
    }

    const firstDoc = topCandidates[0];
    return {
      interpretedIntent: 'Inquiry for ' + (firstDoc ? (firstDoc.subject + ' (' + firstDoc.code + ')') : 'academic solutions') + ' covering "' + qTrimmed + '"',
      concepts: matchedConcepts.length > 0 ? matchedConcepts.slice(0, 4) : [qTrimmed.toUpperCase(), 'CURRICULUM'],
      aiSummary: firstDoc 
        ? 'Matched ' + firstDoc.subject + ' (' + firstDoc.code + ') verified curriculum solutions. Contents include structured answers and test suites.'
        : 'Academic query processed using DPGNotes NLP Semantic Engine across course solutions.',
      recommendedCode: firstDoc ? firstDoc.code : '',
      studyTip: 'Review the problem statements and test with the built-in Sandbox engine for hands-on practice.',
      source: 'DPGNotes NLP Semantic Engine',
      isCustomKey: false
    };
  }

  // ==========================================
  // 5. GEMINI API KEY MANAGEMENT MODAL UI
  // ==========================================
  function openApiKeyModal() {
    const existing = document.getElementById('solGeminiKeyModal');
    if (existing) existing.remove();

    const currentKey = getGeminiApiKey();
    const hasKey = !!currentKey;

    const modalHtml = `
      <div id="solGeminiKeyModal" class="sol-gemini-modal-backdrop">
        <div class="sol-gemini-modal-card">
          
          <div class="sol-gemini-modal-header">
            <div class="sol-gemini-modal-title-group">
              <div class="sol-gemini-modal-icon">
                <i class="ri-sparkling-fill"></i>
              </div>
              <div>
                <h3 class="sol-gemini-modal-title">Gemini AI Settings</h3>
                <span class="sol-gemini-modal-subtitle">Semantic Search Intelligence</span>
              </div>
            </div>
            <button type="button" class="sol-gemini-modal-close" onclick="document.getElementById('solGeminiKeyModal').remove()">
              <i class="ri-close-line"></i>
            </button>
          </div>

          <p class="sol-gemini-modal-desc">
            DPGNotes provides instant NLP semantic search automatically. You can optionally supply your personal <strong>Google Gemini API Key</strong> for enhanced real-time query sense generation, or rely on DPGNotes Cloud AI.
          </p>

          <div class="sol-gemini-modal-body">
            <label class="sol-gemini-modal-label">
              Google Gemini API Key (Optional)
            </label>
            <div class="sol-gemini-input-wrap">
              <input type="password" id="geminiKeyModalInput" class="sol-gemini-modal-input" value="${escapeHtml(currentKey)}" placeholder="AIzaSy...">
              <button type="button" class="sol-gemini-eye-btn" onclick="window.DPGNotesAI.toggleKeyVisibility()">
                <i class="ri-eye-line" id="geminiKeyEyeIcon"></i>
              </button>
            </div>
            <div class="sol-gemini-status-row">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="sol-gemini-link">
                <i class="ri-external-link-line"></i> Get free Gemini API key
              </a>
              <span id="geminiKeyStatusBadge" class="sol-gemini-badge ${hasKey ? 'active' : ''}">
                ${hasKey ? '✓ Custom Key Active' : '● Using Cloud AI'}
              </span>
            </div>
          </div>

          <div id="geminiTestStatus" class="sol-gemini-test-status" style="display:none; padding:8px 12px; border-radius:8px; font-size:0.82rem; margin-bottom:1.2rem;"></div>

          <div class="sol-gemini-actions">
            ${hasKey ? `
              <button type="button" onclick="window.DPGNotesAI.clearKey()" class="sol-gemini-btn-clear">
                Clear Key
              </button>
            ` : ''}
            <button type="button" onclick="window.DPGNotesAI.testAndSaveKey()" id="btnSaveGeminiKey" class="sol-gemini-btn-save">
              <i class="ri-save-line"></i> Save &amp; Apply
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function toggleKeyVisibility() {
    const input = document.getElementById('geminiKeyModalInput');
    const icon = document.getElementById('geminiKeyEyeIcon');
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'ri-eye-off-line';
    } else {
      input.type = 'password';
      icon.className = 'ri-eye-line';
    }
  }

  async function testAndSaveKey() {
    const input = document.getElementById('geminiKeyModalInput');
    const statusDiv = document.getElementById('geminiTestStatus');
    const saveBtn = document.getElementById('btnSaveGeminiKey');
    if (!input || !statusDiv) return;

    const key = input.value.trim();
    if (!key) {
      setGeminiApiKey('');
      document.getElementById('solGeminiKeyModal')?.remove();
      if (typeof window.executeSolutionSearch === 'function') {
        window.executeSolutionSearch(document.getElementById('serpSearchInput')?.value || '');
      } else if (typeof window.executePracticalSearch === 'function') {
        window.executePracticalSearch(document.getElementById('serpSearchInput')?.value || '');
      }
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 1s linear infinite;"></i> Verifying...';
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(56,189,248,0.1)';
    statusDiv.style.color = '#38bdf8';
    statusDiv.innerHTML = 'Connecting to Google Generative AI API...';

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });

      if (res.ok) {
        setGeminiApiKey(key);
        statusDiv.style.background = 'rgba(16,185,129,0.15)';
        statusDiv.style.color = '#10b981';
        statusDiv.innerHTML = '✓ Gemini API Key successfully verified and saved!';
        setTimeout(() => {
          document.getElementById('solGeminiKeyModal')?.remove();
          if (typeof window.executeSolutionSearch === 'function') {
            window.executeSolutionSearch(document.getElementById('serpSearchInput')?.value || '');
          } else if (typeof window.executePracticalSearch === 'function') {
            window.executePracticalSearch(document.getElementById('serpSearchInput')?.value || '');
          }
        }, 800);
      } else {
        const errData = await res.json();
        throw new Error(errData?.error?.message || 'Invalid API Key');
      }
    } catch (err) {
      statusDiv.style.background = 'rgba(239,68,68,0.15)';
      statusDiv.style.color = '#f87171';
      statusDiv.innerHTML = '✕ Verification Failed: ' + escapeHtml(err.message);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="ri-save-line"></i> Try Again';
    }
  }

  function clearKey() {
    setGeminiApiKey('');
    document.getElementById('solGeminiKeyModal')?.remove();
    if (typeof window.executeSolutionSearch === 'function') {
      window.executeSolutionSearch(document.getElementById('serpSearchInput')?.value || '');
    } else if (typeof window.executePracticalSearch === 'function') {
      window.executePracticalSearch(document.getElementById('serpSearchInput')?.value || '');
    }
  }

  // ==========================================
  // 6. SERP AI OVERVIEW RENDERER
  // ==========================================
  function renderAiOverview(containerEl, queryStr, aiData, isPending) {
    if (!containerEl) return;
    if (!queryStr || !queryStr.trim()) {
      containerEl.style.display = 'none';
      containerEl.innerHTML = '';
      return;
    }

    containerEl.style.display = 'block';

    if (isPending && !aiData) {
      containerEl.innerHTML = `
        <div class="sol-ai-overview-card">
          <div class="sol-ai-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="sol-ai-icon-badge" style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg, #a855f7, #38bdf8); display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:0.95rem;">
                <i class="ri-sparkling-fill" style="animation:spin 2s linear infinite;"></i>
              </div>
              <strong class="sol-ai-title" style="font-size:0.98rem; font-family:'Outfit', sans-serif;">Gemini AI Search Intelligence</strong>
              <span class="sol-ai-badge" style="font-size:0.75rem; background:rgba(168,85,247,0.2); color:#c084fc; border:1px solid rgba(168,85,247,0.4); padding:2px 8px; border-radius:999px;">
                Synthesizing Sense...
              </span>
            </div>
            <button type="button" class="sol-ai-btn-config" onclick="window.DPGNotesAI.openApiKeyModal()" style="background:transparent; border:1px solid rgba(255,255,255,0.15); color:#94a3b8; padding:4px 10px; border-radius:8px; font-size:0.75rem; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <i class="ri-key-2-line"></i> Gemini Key
            </button>
          </div>
          <p class="sol-ai-desc" style="font-size:0.86rem; margin:0; display:flex; align-items:center; gap:8px;">
            <i class="ri-brain-line" style="color:#38bdf8;"></i> Analyzing query context, semantic intent, syllabus matches &amp; test cases for <em>"${escapeHtml(queryStr)}"</em>...
          </p>
        </div>
      `;
      return;
    }

    if (!aiData) return;

    const concepts = Array.isArray(aiData.concepts) ? aiData.concepts : [];
    const sourceLabel = aiData.source || 'Gemini AI';
    const isCustom = !!aiData.isCustomKey;

    containerEl.innerHTML = `
      <div class="sol-ai-overview-card">
        <!-- Top Title & Badge Bar -->
        <div class="sol-ai-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="sol-ai-icon-badge" style="width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg, #a855f7, #38bdf8); display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:1rem; box-shadow:0 0 12px rgba(168,85,247,0.4);">
              <i class="ri-sparkling-fill"></i>
            </div>
            <strong class="sol-ai-title" style="font-size:1.02rem; font-family:'Outfit', sans-serif; letter-spacing:0.2px;">
              Gemini AI Semantic Overview
            </strong>
            <span class="sol-ai-badge" style="font-size:0.74rem; background:${isCustom ? 'rgba(16,185,129,0.18)' : 'rgba(168,85,247,0.2)'}; color:${isCustom ? '#10b981' : '#c084fc'}; border:1px solid ${isCustom ? 'rgba(16,185,129,0.35)' : 'rgba(168,85,247,0.35)'}; padding:2px 8px; border-radius:999px; font-weight:600;">
              ✨ ${escapeHtml(sourceLabel)}
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="sol-ai-btn-config" onclick="window.DPGNotesAI.openApiKeyModal()" style="border-radius:8px; font-size:0.75rem; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:500;">
              <i class="ri-key-2-line" style="color:#38bdf8;"></i> Gemini Key
            </button>
          </div>
        </div>

        <!-- Interpreted Intent -->
        <div class="sol-ai-intent-row" style="font-size:0.92rem; font-weight:600; margin-bottom:0.6rem; display:flex; align-items:flex-start; gap:8px;">
          <i class="ri-focus-2-line" style="color:#38bdf8; font-size:1.1rem; margin-top:2px;"></i>
          <span class="sol-ai-intent-text">${escapeHtml(aiData.interpretedIntent || 'Academic Search Query')}</span>
        </div>

        <!-- AI Summary -->
        <p class="sol-ai-desc" style="font-size:0.87rem; line-height:1.6; margin:0 0 0.85rem 0; padding-left:1.7rem;">
          ${escapeHtml(aiData.aiSummary || '')}
        </p>

        <!-- Concept Chips & Study Tip Row -->
        <div class="sol-ai-footer-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:0.75rem;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="sol-ai-concepts-label" style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Concepts:</span>
            ${concepts.map(c => `
              <span class="sol-ai-concept-chip" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; border-radius:999px; padding:2px 8px; font-weight:500;">
                <i class="ri-hashtag" style="font-size:0.7rem; opacity:0.7;"></i>${escapeHtml(c)}
              </span>
            `).join('')}
          </div>

          ${aiData.studyTip ? `
            <div class="sol-ai-tip-box" style="font-size:0.78rem; display:inline-flex; align-items:center; gap:5px; border-radius:8px; padding:3px 8px;">
              <i class="ri-lightbulb-line"></i> <span><strong>Study Tip:</strong> ${escapeHtml(aiData.studyTip)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // 7. GLOBAL EXPORT
  // ==========================================
  window.DPGNotesAI = {
    cleanText,
    normalizeCode,
    splitCodeTokens,
    stemWord,
    levenshtein,
    isTypoMatch,
    tokenize,
    expandSynonyms,
    executeNlpSearch,
    fetchGeminiAiSense,
    getGeminiApiKey,
    setGeminiApiKey,
    openApiKeyModal,
    toggleKeyVisibility,
    testAndSaveKey,
    clearKey,
    renderAiOverview,
    escapeHtml
  };

})(window);
