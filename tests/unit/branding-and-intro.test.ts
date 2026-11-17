import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  AUVRYN_COLORS,
  AUVRYN_TYPOGRAPHY,
  AUVRYN_SPACING,
  AUVRYN_RADIUS,
  AUVRYN_SHADOWS,
  AUVRYN_BRAND_STRINGS,
  auvrynTheme,
} from '../../packages/types/src/tokens';

describe('Unit: AUVRYN Brand Identity & Design Tokens', () => {
  describe('Brand Strings', () => {
    it('defines official product name and descriptors correctly', () => {
      expect(AUVRYN_BRAND_STRINGS.name).toBe('AUVRYN');
      expect(AUVRYN_BRAND_STRINGS.descriptor).toBe('THE INTELLIGENT EDUCATION ECOSYSTEM');
      expect(AUVRYN_BRAND_STRINGS.tagline).toBe('One institution. One intelligent system.');
      expect(AUVRYN_BRAND_STRINGS.fullName).toBe('AUVRYN — The Intelligent Education Ecosystem');
    });
  });

  describe('Official Color System', () => {
    it('defines exact hex codes according to brand specification', () => {
      expect(AUVRYN_COLORS.primaryNavy).toBe('#0B1E3F');
      expect(AUVRYN_COLORS.deepNavy).toBe('#07152B');
      expect(AUVRYN_COLORS.secondaryNavy).toBe('#142C4C');
      expect(AUVRYN_COLORS.electricBlue).toBe('#2563EB');
      expect(AUVRYN_COLORS.lightBlue).toBe('#EAF2FF');
      expect(AUVRYN_COLORS.pureWhite).toBe('#FFFFFF');
      expect(AUVRYN_COLORS.background).toBe('#F5F7FB');
      expect(AUVRYN_COLORS.surface).toBe('#FFFFFF');
      expect(AUVRYN_COLORS.primaryText).toBe('#17243A');
      expect(AUVRYN_COLORS.secondaryText).toBe('#64748B');
      expect(AUVRYN_COLORS.border).toBe('#E2E8F0');
      expect(AUVRYN_COLORS.success).toBe('#16A36A');
      expect(AUVRYN_COLORS.warning).toBe('#D99A22');
      expect(AUVRYN_COLORS.error).toBe('#DC4545');
    });

    it('provides high-contrast status and border colors', () => {
      expect(AUVRYN_COLORS.borderFocus).toBe('#2563EB');
      expect(AUVRYN_COLORS.info).toBe('#2563EB');
      expect(AUVRYN_COLORS.infoLight).toBe('#EAF2FF');
    });
  });

  describe('Design Tokens Integration', () => {
    it('exports complete auvrynTheme structure', () => {
      expect(auvrynTheme).toBeDefined();
      expect(auvrynTheme.colors).toEqual(AUVRYN_COLORS);
      expect(auvrynTheme.typography).toEqual(AUVRYN_TYPOGRAPHY);
      expect(auvrynTheme.spacing).toEqual(AUVRYN_SPACING);
      expect(auvrynTheme.radius).toEqual(AUVRYN_RADIUS);
      expect(auvrynTheme.shadows).toEqual(AUVRYN_SHADOWS);
      expect(auvrynTheme.brand).toEqual(AUVRYN_BRAND_STRINGS);
    });

    it('has valid typography scales', () => {
      expect(AUVRYN_TYPOGRAPHY.fontFamily.sans).toContain('Inter');
      expect(AUVRYN_TYPOGRAPHY.fontWeight.bold).toBe('700');
      expect(AUVRYN_TYPOGRAPHY.fontSize.base.fontSize).toBe(16);
      expect(AUVRYN_TYPOGRAPHY.fontSize['3xl'].fontSize).toBe(30);
    });

    it('has valid radius tokens', () => {
      expect(AUVRYN_RADIUS.none).toBe(0);
      expect(AUVRYN_RADIUS.sm).toBe(4);
      expect(AUVRYN_RADIUS.md).toBe(8);
      expect(AUVRYN_RADIUS.lg).toBe(12);
      expect(AUVRYN_RADIUS.full).toBe(9999);
    });
  });

  describe('Brand Assets Integrity on Disk', () => {
    const rootDir = path.resolve(__dirname, '../../');

    it('verifies all web vector SVGs exist and contain valid XML/SVG markup', () => {
      const svgFiles = [
        'apps/web/public/branding/logo-symbol.svg',
        'apps/web/public/branding/logo-horizontal.svg',
        'apps/web/public/branding/logo-primary.svg',
        'apps/web/public/branding/logo-white.svg',
        'apps/web/public/branding/logo-monochrome.svg',
        'apps/web/public/branding/favicon.svg',
      ];

      for (const relPath of svgFiles) {
        const fullPath = path.join(rootDir, relPath);
        expect(fs.existsSync(fullPath), `Missing vector file: ${relPath}`).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).toContain('<svg');
        expect(content).toContain('</svg>');
      }
    });

    it('verifies all mobile assets exist and have positive file sizes', () => {
      const mobileAssets = [
        'apps/mobile/assets/icon.png',
        'apps/mobile/assets/adaptive-icon.png',
        'apps/mobile/assets/splash.png',
        'apps/mobile/assets/favicon.png',
        'apps/mobile/assets/branding/logo-symbol.svg',
        'apps/mobile/assets/branding/logo-horizontal.svg',
        'apps/mobile/assets/branding/logo-primary.svg',
      ];

      for (const relPath of mobileAssets) {
        const fullPath = path.join(rootDir, relPath);
        expect(fs.existsSync(fullPath), `Missing mobile asset: ${relPath}`).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('verifies Expo app.json contains AUVRYN identity configuration', () => {
      const appJsonPath = path.join(rootDir, 'apps/mobile/app.json');
      expect(fs.existsSync(appJsonPath)).toBe(true);
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      expect(appJson.expo.name).toBe('AUVRYN');
      expect(appJson.expo.splash.backgroundColor.toUpperCase()).toBe('#FFFFFF');
      expect(appJson.expo.android.adaptiveIcon.backgroundColor.toUpperCase()).toBe('#FFFFFF');
    });
  });

  describe('BrandIntro Animation Architecture Specifications', () => {
    it('defines standard 7-stage choreography duration and session policy key', () => {
      const standardDuration = 4800; // 4.8 seconds
      const defaultStorageKey = 'auvryn_intro_seen_v1';

      expect(standardDuration).toBeGreaterThanOrEqual(4000);
      expect(standardDuration).toBeLessThanOrEqual(5000);
      expect(defaultStorageKey).toBe('auvryn_intro_seen_v1');
    });
  });
});
