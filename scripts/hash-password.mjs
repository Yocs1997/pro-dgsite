// Usage: node scripts/hash-password.mjs "the-password"
// Prints a hash to paste into PORTAL_USERS ("hash" field).
import { randomBytes, scryptSync } from "node:crypto";

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Usage: node scripts/hash-password.mjs "password (8+ characters)"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, 64);
console.log(`scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
