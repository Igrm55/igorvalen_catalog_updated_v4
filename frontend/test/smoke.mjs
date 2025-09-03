import assert from 'assert';

const base = process.env.VITE_API_URL || 'http://localhost:5000/api';
assert.ok(base.startsWith('http'));
console.log('frontend smoke test ok:', base);
