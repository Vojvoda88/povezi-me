import { describe, it, expect } from 'vitest';
import {
  getAllowedFilterKeysForSubcategory,
  isSpecParamForSubcategory,
  getSpecFilterKeys,
  SPEC_FILTER_KEYS_BY_SUBCATEGORY,
  COMMON_VEHICLE_FILTER_KEYS,
  type VehicleSubcategoryId,
} from '../src/config/vehicleTaxonomy';

describe('vehicleTaxonomy', () => {
  describe('getAllowedFilterKeysForSubcategory', () => {
    it('returns common + spec keys for automobili', () => {
      const keys = getAllowedFilterKeysForSubcategory('automobili');
      expect(keys).toContain('make');
      expect(keys).toContain('model');
      expect(keys).toContain('priceMin');
      expect(keys).toContain('karoserija');
      expect(keys).toContain('pogon');
    });

    it('returns common + spec keys for kamioni', () => {
      const keys = getAllowedFilterKeysForSubcategory('kamioni');
      expect(keys).toContain('make');
      expect(keys).toContain('tip');
      expect(keys).toContain('klasaNosivosti');
      expect(keys).toContain('brojOsovina');
    });

    it('returns common + spec keys for traktori', () => {
      const keys = getAllowedFilterKeysForSubcategory('traktori');
      expect(keys).toContain('radniSati');
      expect(keys).toContain('kabina');
      expect(keys).toContain('gorivo');
    });

    it('returns common + spec keys for cetvorotockasi', () => {
      const keys = getAllowedFilterKeysForSubcategory('cetvorotockasi');
      expect(keys).toContain('kubikaza');
      expect(keys).toContain('tip');
    });
  });

  describe('isSpecParamForSubcategory', () => {
    it('brojOsovina is spec only for kamioni', () => {
      expect(isSpecParamForSubcategory('brojOsovina', 'kamioni')).toBe(true);
      expect(isSpecParamForSubcategory('brojOsovina', 'automobili')).toBe(false);
      expect(isSpecParamForSubcategory('brojOsovina', 'traktori')).toBe(false);
      expect(isSpecParamForSubcategory('brojOsovina', 'cetvorotockasi')).toBe(false);
    });

    it('radniSati is spec only for traktori', () => {
      expect(isSpecParamForSubcategory('radniSati', 'traktori')).toBe(true);
      expect(isSpecParamForSubcategory('radniSati', 'kamioni')).toBe(false);
    });

    it('kubikaza is spec for motocikli and cetvorotockasi', () => {
      expect(isSpecParamForSubcategory('kubikaza', 'motocikli')).toBe(true);
      expect(isSpecParamForSubcategory('kubikaza', 'cetvorotockasi')).toBe(true);
      expect(isSpecParamForSubcategory('kubikaza', 'kamioni')).toBe(false);
    });

    it('karoserija is spec only for automobili', () => {
      expect(isSpecParamForSubcategory('karoserija', 'automobili')).toBe(true);
      expect(isSpecParamForSubcategory('karoserija', 'kamioni')).toBe(false);
    });
  });

  describe('getSpecFilterKeys', () => {
    it('kamioni have osovine, nosivost, euro', () => {
      const spec = getSpecFilterKeys('kamioni');
      expect(spec).toContain('brojOsovina');
      expect(spec).toContain('klasaNosivosti');
      expect(spec).toContain('emisioniStandard');
    });

    it('traktori have radniSati, kabina', () => {
      const spec = getSpecFilterKeys('traktori');
      expect(spec).toContain('radniSati');
      expect(spec).toContain('kabina');
    });

    it('cetvorotockasi have kubikaza', () => {
      const spec = getSpecFilterKeys('cetvorotockasi');
      expect(spec).toContain('kubikaza');
    });
  });
});
