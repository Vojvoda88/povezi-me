#!/usr/bin/env node
/**
 * Generiše siguran JWT_SECRET za produkciju (min. 32 znaka).
 * Pokretanje: node scripts/generate-jwt-secret.js
 * Kopiraj output u .env kao JWT_SECRET=...
 */
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('base64');
console.log('\n# Kopiraj u .env (JWT_SECRET):');
console.log('JWT_SECRET="' + secret + '"\n');
