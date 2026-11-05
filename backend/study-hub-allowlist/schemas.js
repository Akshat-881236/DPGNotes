/** DPGNotes NOVA - Argument Schemas & Lightweight Validator */
const SCHEMAS = {
  search_resources: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', minLength: 1, maxLength: 200 },
      tab: {
        type: 'string',
        enum: ['all', 'ai', 'website', 'videos', 'solutions', 'quizzes', 'contributors', 'notes', 'papers']
      },
      tag: { type: 'string', maxLength: 50 }
    }
  },
  generate_quiz_url: {
    type: 'object',
    required: ['subName', 'quizTitle'],
    properties: {
      subName: { type: 'string', minLength: 2, maxLength: 100 },
      subCode: { type: 'string', maxLength: 30 },
      topicTags: { type: 'string', maxLength: 150 },
      quizTitle: { type: 'string', minLength: 3, maxLength: 150 },
      desc: { type: 'string', maxLength: 500 },
      timeMinutes: { type: 'integer', enum: [15, 20, 30, 45, 60, 90, 120, 150, 180] },
      questionCount: { type: 'integer', minimum: 1, maximum: 100 },
      visibility: { type: 'string', enum: ['public', 'private'] },
      correctScore: { type: 'number', minimum: 0.5, maximum: 10 },
      wrongScore: { type: 'number', minimum: 0, maximum: 5 },
      unattemptScore: { type: 'number', minimum: 0, maximum: 2 },
      strictMode: { type: 'boolean' },
      questions: { type: 'array', maxLength: 50 }
    }
  },
  get_legal_section: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        enum: [
          'all',
          'index',
          'privacy-policy',
          'terms-conditions',
          'cookie-policy',
          'dmca-policy',
          'copyright-policy',
          'quiz-policy',
          'disclaimer',
          'drasa-policy',
          'advertising-policy',
          'analytics-policy',
          'security-policy',
          'retention-policy',
          'links-policy',
          'native-ads-monetization-policy'
        ]
      },
      sectionId: { type: 'string', maxLength: 60 },
      query: { type: 'string', maxLength: 150 }
    }
  },
  query_academic_resources: {
    type: 'object',
    properties: {
      query: { type: 'string', maxLength: 150 },
      category: { type: 'string', maxLength: 80 },
      discipline: { type: 'string', maxLength: 80 },
      limit: { type: 'integer', minimum: 1, maximum: 20 }
    }
  },
  get_contributor_telemetry: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', minLength: 3, maxLength: 128 }
    }
  },
  navigate_platform: {
    type: 'object',
    required: ['destination'],
    properties: {
      destination: { type: 'string', minLength: 1, maxLength: 150 },
      params: { type: 'object' }
    }
  }
};
/**
 * Validates input data against a defined schema.
 * @param {string} schemaName 
 * @param {object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSchema(schemaName, data) {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Unrecognized schema: ${schemaName}`] };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, errors: ['Input must be a valid non-null object.'] };
  }
  const errors = [];
  if (schema.required) {
    for (const reqKey of schema.required) {
      if (data[reqKey] === undefined || data[reqKey] === null || data[reqKey] === '') {
        errors.push(`Missing required property '${reqKey}'`);
      }
    }
  }
  for (const [key, val] of Object.entries(data)) {
    const propRule = schema.properties && schema.properties[key];
    if (!propRule) {
      continue; // Allow non-strict additional properties if not explicitly defined
    }
    if (val === undefined || val === null) continue;
    if (propRule.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Property '${key}' must be a string.`);
      } else {
        if (propRule.minLength !== undefined && val.length < propRule.minLength) {
          errors.push(`Property '${key}' length must be at least ${propRule.minLength}.`);
        }
        if (propRule.maxLength !== undefined && val.length > propRule.maxLength) {
          errors.push(`Property '${key}' length must be at most ${propRule.maxLength}.`);
        }
        if (propRule.enum && !propRule.enum.includes(val)) {
          errors.push(`Property '${key}' must be one of: ${propRule.enum.join(', ')}.`);
        }
      }
    } else if (propRule.type === 'integer') {
      const num = Number(val);
      if (!Number.isInteger(num)) {
        errors.push(`Property '${key}' must be an integer.`);
      } else {
        if (propRule.minimum !== undefined && num < propRule.minimum) {
          errors.push(`Property '${key}' must be >= ${propRule.minimum}.`);
        }
        if (propRule.maximum !== undefined && num > propRule.maximum) {
          errors.push(`Property '${key}' must be <= ${propRule.maximum}.`);
        }
        if (propRule.enum && !propRule.enum.includes(num)) {
          errors.push(`Property '${key}' must be one of: ${propRule.enum.join(', ')}.`);
        }
      }
    } else if (propRule.type === 'number') {
      const num = Number(val);
      if (isNaN(num)) {
        errors.push(`Property '${key}' must be a number.`);
      } else {
        if (propRule.minimum !== undefined && num < propRule.minimum) {
          errors.push(`Property '${key}' must be >= ${propRule.minimum}.`);
        }
        if (propRule.maximum !== undefined && num > propRule.maximum) {
          errors.push(`Property '${key}' must be <= ${propRule.maximum}.`);
        }
      }
    } else if (propRule.type === 'boolean') {
      if (typeof val !== 'boolean') {
        errors.push(`Property '${key}' must be a boolean.`);
      }
    } else if (propRule.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`Property '${key}' must be an array.`);
      } else if (propRule.maxLength && val.length > propRule.maxLength) {
        errors.push(`Property '${key}' item count cannot exceed ${propRule.maxLength}.`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
module.exports = {
  SCHEMAS,
  validateSchema
};
