// backend/scripts/check-db.js
// Run with:  npm run check-db
// Diagnoses MongoDB Atlas connection problems WITHOUT ever printing your password.
// (It prints the cluster host, username length/mask, password LENGTH only.)

const path = require('path');
const fs = require('fs');

const ENV_PATH = path.join(__dirname, '..', '.env');
const dotenv = require('dotenv');
dotenv.config({ path: ENV_PATH, quiet: true });

const { MongoClient } = require('mongodb');
const { connectionHint } = require('../utils/dbErrorHint');

let failures = 0;
const ok = (msg) => console.log(`  [ OK ]  ${msg}`);
const warn = (msg) => console.log(`  [WARN]  ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.log(`  [FAIL]  ${msg}`);
};

function mask(text) {
  if (!text) return '(empty)';
  if (text.length <= 2) return '*'.repeat(text.length);
  return text[0] + '*'.repeat(Math.min(text.length - 2, 8)) + text[text.length - 1];
}

// Breaks the URI into parts and reports problems. Returns the parts (never prints the password).
function inspectUri(uri) {
  const match = /^(mongodb(?:\+srv)?):\/\/(.*)$/.exec(uri);
  if (!match) {
    fail('MONGODB_URI must start with mongodb+srv:// or mongodb://');
    return null;
  }
  const scheme = match[1];
  const rest = match[2];

  // The host starts after the LAST "@" (so an un-encoded "@" in the password is detected).
  const at = rest.lastIndexOf('@');
  if (at === -1) {
    fail('No credentials found. Expected mongodb+srv://USER:PASSWORD@HOST/...');
    return null;
  }
  const creds = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);
  const colon = creds.indexOf(':');
  const user = colon === -1 ? creds : creds.slice(0, colon);
  const pass = colon === -1 ? '' : creds.slice(colon + 1);
  const host = hostPart.split(/[/?]/)[0];

  console.log(`  Scheme: ${scheme}`);
  console.log(`  Host:   ${host || '(missing)'}`);
  console.log(`  User:   ${mask(user)} (${user.length} characters)`);
  console.log(`  Password length: ${pass.length} characters\n`);

  if (/\s/.test(uri)) fail('The URI contains a space or line break. Remove it.');
  if (/[<>]/.test(creds) || /db_password|<password>|yourpassword/i.test(pass)) {
    fail('Placeholder text like <db_password> is still in the URI. Replace it INCLUDING the < > brackets.');
  }
  if (!user) fail('Username is empty.');
  if (!pass) fail('Password is empty.');
  if (/[\/?#\[\]@]/.test(user)) fail('Username contains characters that must be URL-encoded.');
  if (/[:\/?#\[\]@]/.test(pass)) {
    fail('Password contains characters (: / ? # [ ] @) that break the URI unless URL-encoded. ' +
      'Easiest fix: reset the Atlas password to letters and digits only.');
  }
  if (/%(?![0-9A-Fa-f]{2})/.test(creds)) {
    fail('Username/password contains a "%" that is not a valid URL-encoding (like %40).');
  }
  if (!host) fail('Host is missing.');
  if (host && /[<>]/.test(host)) fail('Host still contains placeholder text like <cluster-host>.');
  if (scheme === 'mongodb+srv' && /:\d+$/.test(host)) fail('mongodb+srv:// URIs must not include a port number.');
  if (host && !/\.mongodb\.net$/i.test(host) && scheme === 'mongodb+srv') {
    warn('Host does not end in .mongodb.net - is this the Atlas host from "Connect > Drivers"?');
  }

  return { user, pass };
}

async function main() {
  console.log('\nCivicConnect - database connection check\n');

  // 1. Does the .env file exist (and is it really named .env)?
  console.log('1) .env file');
  if (fs.existsSync(ENV_PATH)) {
    ok('Found backend/.env');
  } else {
    fail('backend/.env was not found.');
    if (fs.existsSync(ENV_PATH + '.txt')) {
      fail('Found ".env.txt" - Windows hid the real extension. Rename it to exactly ".env".');
    }
    console.log('       Create it by copying .env.example, then fill in your values.');
    process.exitCode = 1;
    return;
  }

  // 2. Is a different MONGODB_URI overriding the file?
  const fileText = fs.readFileSync(ENV_PATH, 'utf8');
  const fileValues = dotenv.parse(fileText);
  const lineCount = (fileText.match(/^\s*MONGODB_URI\s*=/gm) || []).length;
  if (lineCount > 1) warn(`MONGODB_URI appears ${lineCount} times in .env. Keep only one line.`);
  if (process.env.MONGODB_URI && fileValues.MONGODB_URI && process.env.MONGODB_URI !== fileValues.MONGODB_URI) {
    fail('A MONGODB_URI already set in your terminal/Windows environment is OVERRIDING .env. ' +
      'In PowerShell run: Remove-Item Env:MONGODB_URI   (and check Windows "Environment Variables" settings).');
  }

  // 3. Is the URI there and well-formed?
  console.log('\n2) MONGODB_URI');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    fail('MONGODB_URI is missing or empty in .env.');
    process.exitCode = 1;
    return;
  }
  ok('MONGODB_URI is set');
  const parts = inspectUri(uri.trim());
  if (!parts) {
    process.exitCode = 1;
    return;
  }

  // 4. Try a real connection.
  console.log('3) Connecting to Atlas (up to 8 seconds)...');
  const dbName = process.env.DB_NAME || 'civicconnect';
  let client;

  try {
    client = new MongoClient(uri.trim(), { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    ok('Connected and logged in successfully');

    try {
      await client.db(dbName).listCollections().toArray();
      ok(`User can read database "${dbName}"`);
    } catch (error) {
      fail(`Logged in, but cannot read "${dbName}". In Atlas > Database Access, give the user "Read and write to any database".`);
    }
  } catch (error) {
    // Remove the password from the message if the driver echoes it (it normally doesn't).
    let message = String(error.message || '');
    for (const secret of [parts.pass, encodeURIComponent(parts.pass)]) {
      if (secret && secret.length >= 3) message = message.split(secret).join('***');
    }
    fail('Connection failed. Safe-to-share details:');
    console.log(`          name:    ${error.name}`);
    console.log(`          code:    ${error.code ?? '(none)'}`);
    console.log(`          message: ${message}\n`);
    console.log(connectionHint(error));
  } finally {
    if (client) await client.close().catch(() => {});
  }

  console.log(failures === 0 ? '\nAll checks passed. You can run: npm run dev\n' : `\n${failures} problem(s) found - see [FAIL] lines above.\n`);
  if (failures > 0) process.exitCode = 1;
}

main();
