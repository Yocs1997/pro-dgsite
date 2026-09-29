// Usage: node scripts/hash-password.mjs
//   Asks for the password (so it isn't saved in your command history) and
//   prints a hash to paste into PORTAL_USERS ("hash" field).
// Also works as: node scripts/hash-password.mjs "the-password"
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";

let pw = process.argv[2];
if (!pw) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  pw = (await rl.question("Contraseña nueva (8+ caracteres): ")).trim();
  rl.close();
}
if (!pw || pw.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, 64);
console.log(`\nscrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
