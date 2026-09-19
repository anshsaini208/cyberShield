import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CyberShield Security Boundary — API Key Leakage Test', () => {
  it('verifies API keys are not present in extension source code', () => {
    const srcDir = path.resolve(__dirname, '..');
    const filesToScan: string[] = [];

    function walkDir(dir: string) {
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (
          (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.html')) &&
          !fullPath.includes('securityCheck.test.ts')
        ) {
          filesToScan.push(fullPath);
        }
      }
    }

    walkDir(srcDir);

    const forbiddenKeyName = 'GEMINI_' + 'API_KEY';
    const googleKeyPattern = 'AIza' + 'Sy';

    filesToScan.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain(forbiddenKeyName);
      expect(content).not.toContain(googleKeyPattern);
    });
  });
});
