/**
 * Offline, opt-in JSON summary for authorized creator feedback exports.
 * Reads only the explicitly specified local file. Prints aggregate output only.
 * No network requests, raw-record output, or file writes.
 */
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { aggregateCreatorFeedback } from './aggregate.mjs';

const MAX_INPUT_BYTES = 1024 * 1024;

export function summarizeFile(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('Input path required');
  const size = statSync(path).size;
  if (size > MAX_INPUT_BYTES) throw new Error('Input too large');
  const records = JSON.parse(readFileSync(path, 'utf8'));
  return aggregateCreatorFeedback(records);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Do not echo paths, file contents, or parsing errors that may expose private data.
  if (process.argv.length !== 4 || process.argv[2] !== '--input') {
    process.stderr.write('Usage: node operations/feedback/summary-cli.mjs --input <authorized-local-json>\n');
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(JSON.stringify(summarizeFile(process.argv[3]), null, 2) + '\n');
    } catch {
      process.stderr.write('Unable to summarize input. Check JSON array format and file permissions.\n');
      process.exitCode = 1;
    }
  }
}
