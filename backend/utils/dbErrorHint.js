// backend/utils/dbErrorHint.js
// Turns a MongoDB connection error into a plain-English hint.
// Used by both server.js and scripts/check-db.js. It never prints your connection string.

function connectionHint(err) {
  const msg = String((err && err.message) || '');
  const code = err && err.code;

  // Atlas reports wrong user/password as "bad auth" (code 8000); self-hosted uses code 18.
  if (/bad auth|authentication failed/i.test(msg) || code === 18 || code === 8000) {
    return (
      'AUTHENTICATION FAILED: Atlas reached your cluster but rejected the username/password.\n' +
      '  Most common causes:\n' +
      '   1. Wrong Database User password (this is NOT your Atlas website login).\n' +
      '   2. Password contains special characters (@ : / ? # % etc.) that are not URL-encoded.\n' +
      '   3. The <db_password> placeholder (with the < > brackets) was left in the URI.\n' +
      '   4. The password was changed in Atlas but .env still has the old one.\n' +
      '   5. A MONGODB_URI set in your Windows/PowerShell environment is overriding .env.\n' +
      '  Run: npm run check-db   (it checks all of these without showing your password)'
    );
  }

  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return (
      'DNS PROBLEM: the cluster host name could not be found.\n' +
      '  Check the host part of MONGODB_URI for typos. Some college/ISP networks block the\n' +
      '  DNS lookups that mongodb+srv:// needs - try a mobile hotspot to confirm.'
    );
  }

  if (/Server selection timed out|ReplicaSetNoPrimary|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return (
      'CANNOT REACH THE CLUSTER (timeout).\n' +
      '  Check Atlas > Network Access: your current IP address must be on the list.\n' +
      '  Also check the cluster is not paused, and that no VPN/firewall is blocking port 27017.'
    );
  }

  if (err && (err.name === 'MongoParseError' || /Invalid scheme|connection string|unescaped/i.test(msg))) {
    return (
      'BAD CONNECTION STRING FORMAT.\n' +
      '  It must look like mongodb+srv://USER:PASSWORD@HOST/?options and special characters in\n' +
      '  the password must be URL-encoded. Run: npm run check-db'
    );
  }

  if (/not authorized|requires authentication|Unauthorized/i.test(msg)) {
    return (
      'NOT AUTHORIZED: login worked, but this user lacks permission.\n' +
      '  In Atlas > Database Access, give the user "Read and write to any database".'
    );
  }

  return 'Unrecognised error. Run: npm run check-db for a step-by-step check.';
}

module.exports = { connectionHint };
