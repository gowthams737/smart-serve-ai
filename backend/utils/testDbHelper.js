import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

/**
 * Returns an isolated test MongoDB URI.
 * Strictly guarantees that test scripts and automated test suites never connect to the live production database ('smartserve').
 */
export function getTestMongoUri() {
  const testUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/smartserve_test';

  // Strict isolation check: Verify URI targets an isolated test database
  const isTargetingProduction = 
    testUri.includes('/smartserve') && 
    !testUri.includes('_test') && 
    !testUri.includes('-test');

  if (isTargetingProduction) {
    throw new Error(
      `[SECURITY ERROR] Attempted to connect automated test suite to the production database (${testUri}). ` +
      `Automated tests must only run against an isolated test database (e.g. MONGODB_URI_TEST=mongodb://localhost:27017/smartserve_test).`
    );
  }

  return testUri;
}
