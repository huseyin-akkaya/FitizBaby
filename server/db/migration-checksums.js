import { createHash } from 'node:crypto';

// Git on Windows may convert LF to CRLF. Accept only those byte-equivalent
// newline variants of the same SQL, without changing stored history.
export function migrationChecksums(sql) {
  const canonical = sql.replace(/\r\n/g, '\n');
  return [...new Set([canonical, canonical.replace(/\n/g, '\r\n'), sql].map(value => createHash('sha256').update(value).digest('hex')))];
}
