/** DPGNotes NOVA - Central Action Registry */
const { validateSchema } = require('./schemas');
const { isRoleAllowed } = require('./permissions');
const { buildSafePlatformUrl } = require('./navigationAllowlist');
const { buildValidatedQuizUrl } = require('./quizAllowlist');
const ACTION_REGISTRY = {
  search_resources: {
    name: 'search_resources',
    description: 'Search verified DPGNotes academic notes, question papers, solutions, and contributor materials.',
    permission: 'public',
    requiresConfirmation: false,
    schemaName: 'search_resources',
    parameters: {
      query: { type: 'string', description: 'The academic search query, subject, topic, or paper type.' },
      tab: {
        type: 'string',
        enum: ['all', 'ai', 'website', 'videos', 'solutions', 'quizzes', 'contributors'],
        description: 'Specific SERP tab to focus results.'
      },
      tag: { type: 'string', description: 'Optional exam filter: SE, SP, UE, etc.' }
    }
  },
  generate_quiz_url: {
    name: 'generate_quiz_url',
    description: 'Prepare a complete prefilled quiz configuration URL for the DPGNotes Quiz Studio.',
    permission: 'public',
    requiresConfirmation: false,
    schemaName: 'generate_quiz_url',
    parameters: {
      subName: { type: 'string', description: 'Subject Name (e.g. Database Management Systems).' },
      subCode: { type: 'string', description: 'Subject Code (e.g. BCA-302).' },
      quizTitle: { type: 'string', description: 'Title of the quiz examination.' },
      topicTags: { type: 'string', description: 'Comma-separated topic keywords.' },
      desc: { type: 'string', description: 'Brief quiz overview and student instructions.' },
      timeMinutes: { type: 'integer', description: 'Time in minutes (15, 20, 30, 45, 60, 90, 120, 150, 180).' },
      questionCount: { type: 'integer', description: 'Number of questions to prepare.' },
      visibility: { type: 'string', enum: ['public', 'private'], description: 'Quiz visibility.' }
    }
  },
  get_legal_section: {
    name: 'get_legal_section',
    description: 'Retrieve verified policy, privacy, copyright, or exam integrity sections from DPGNotes Legal Center.',
    permission: 'public',
    requiresConfirmation: false,
    schemaName: 'get_legal_section',
    parameters: {
      documentId: {
        type: 'string',
        description: 'Document identifier: privacy-policy, terms-conditions, cookie-policy, dmca-policy, quiz-policy, etc.'
      },
      sectionId: { type: 'string', description: 'Specific section heading or topic.' },
      query: { type: 'string', description: 'The question or topic regarding DPGNotes legal guidelines.' }
    }
  },
  query_academic_resources: {
    name: 'query_academic_resources',
    description: 'Query verified academic materials in the DPGNotes document library.',
    permission: 'public',
    requiresConfirmation: false,
    schemaName: 'query_academic_resources',
    parameters: {
      query: { type: 'string', description: 'Subject or keyword to search in library.' },
      category: { type: 'string', description: 'Filter category (e.g. Computer Science, Physical Education).' },
      discipline: { type: 'string', description: 'Filter discipline or degree level.' },
      limit: { type: 'integer', description: 'Maximum resources to fetch (1-20).' }
    }
  },
  get_contributor_telemetry: {
    name: 'get_contributor_telemetry',
    description: 'Retrieve upload analytics and engagement performance for an authorized contributor.',
    permission: 'contributor',
    requiresConfirmation: false,
    schemaName: 'get_contributor_telemetry',
    parameters: {
      userId: { type: 'string', description: 'The contributor user ID.' }
    }
  },
  navigate_platform: {
    name: 'navigate_platform',
    description: 'Navigate the student or contributor to an approved DPGNotes platform page or module.',
    permission: 'public',
    requiresConfirmation: false,
    schemaName: 'navigate_platform',
    parameters: {
      destination: { type: 'string', description: 'Destination key or relative path (e.g. quiz_portal, dashboard, serp).' },
      params: { type: 'object', description: 'Optional query parameters for the destination.' }
    }
  }
};
/**
 * Validates whether an action is registered and permissible for the user context.
 * @param {string} actionName 
 * @param {object} args 
 * @param {object} userContext 
 * @returns {{ valid: boolean, error?: string, actionDef?: object }}
 */
function validateActionRequest(actionName, args = {}, userContext = { role: 'public' }) {
  const actionDef = ACTION_REGISTRY[actionName];
  if (!actionDef) {
    return {
      valid: false,
      error: `Action '${actionName}' is not registered in the DPGNotes NOVA Allowlist.`
    };
  }
  if (!isRoleAllowed(userContext.role, actionDef.permission)) {
    return {
      valid: false,
      error: `Access Denied: Action '${actionName}' requires '${actionDef.permission}' role, but user has '${userContext.role}'.`
    };
  }
  const schemaCheck = validateSchema(actionDef.schemaName, args);
  if (!schemaCheck.valid) {
    return {
      valid: false,
      error: `Invalid parameters for '${actionName}': ${schemaCheck.errors.join('; ')}`
    };
  }
  return {
    valid: true,
    actionDef
  };
}
module.exports = {
  ACTION_REGISTRY,
  validateActionRequest
};
