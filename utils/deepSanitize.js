// // Recursive function to sanitize all string values in an object
// const sanitizeHtml = require('sanitize-html');

// function deepSanitize(value) {
//   if (typeof value === 'string') {
//     return sanitizeHtml(value, {
//       allowedTags: [],
//       allowedAttributes: {},
//     });
//   }
//   if (Array.isArray(value)) {
//     return value.map(deepSanitize);
//   }
//   if (typeof value === 'object' && value !== null) {
//     return Object.keys(value).reduce((acc, key) => {
//       acc[key] = deepSanitize(value[key]);
//       return acc;
//     }, {});
//   }
//   return value;
// }

// module.exports = deepSanitize;

// utils/deepSanitize.js
const sanitizeHtml = require('sanitize-html');

const DEFAULT_POLICY = {
  allowedTags: [],
  allowedAttributes: {},
};

function isPlainObject(val) {
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * deepSanitize(value, opts)
 * opts:
 *   - fieldPolicies: { [fieldPath: string]: sanitizeHtml.Options }
 *   - defaultPolicy: sanitizeHtml.Options
 */
function deepSanitize(value, opts = {}, _seen = new WeakSet(), _path = '') {
  const { fieldPolicies = {}, defaultPolicy = DEFAULT_POLICY } = opts;

  if (value == null) return value;

  if (typeof value === 'string') {
    const policy = fieldPolicies[_path] || defaultPolicy;
    return sanitizeHtml(value, policy);
  }

  if (typeof value !== 'object') return value;

  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (!Array.isArray(value) && !isPlainObject(value)) return value;

  if (_seen.has(value)) return value;
  _seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item, idx) =>
      deepSanitize(item, opts, _seen, `${_path}[${idx}]`),
    );
  }

  const out = {};
  for (const key of Object.keys(value)) {
    const childPath = _path ? `${_path}.${key}` : key;
    out[key] = deepSanitize(value[key], opts, _seen, childPath);
  }
  return out;
}

module.exports = { deepSanitize, DEFAULT_POLICY };
