import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '../../src/engine';

describe('engine package', () => {
    it('exports a semver version', () => {
        expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
