import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Script } from 'vm';

describe('Config', () => {
  beforeAll(() => {
    const code = readFileSync(join(__dirname, '../js/config.js'), 'utf-8');
    // The file uses `var Config = (function(){ ... })();` (IIFE pattern).
    // We use vm.Script.runInThisContext to execute it so `var` declares
    // on the global scope, just like a browser <script> tag would.
    const script = new Script(code, { filename: 'config.js' });
    script.runInThisContext();
  });

  it('should expose SUPABASE_URL', () => {
    expect(globalThis.Config).toBeDefined();
    expect(globalThis.Config.SUPABASE_URL).toBeTruthy();
    expect(globalThis.Config.SUPABASE_URL).toMatch(/^https:\/\//);
  });

  it('should expose SUPABASE_ANON_KEY', () => {
    expect(globalThis.Config.SUPABASE_ANON_KEY).toBeTruthy();
    expect(globalThis.Config.SUPABASE_ANON_KEY.length).toBeGreaterThan(10);
  });
});
