/**
 * Default filter values shared between the client FilterControls component
 * and server-side API routes. No "use client" directive.
 */

export interface FilterValues {
  yearMin: number;
  yearMax: number;
  radiusMin: number;
  radiusMax: number;
  discoveryMethod: string;
  distanceMin: number;
  distanceMax: number;
}

export const DEFAULT_FILTERS: FilterValues = {
  yearMin: 1992,
  yearMax: new Date().getFullYear(),
  radiusMin: 0,
  radiusMax: 30,
  discoveryMethod: "",
  distanceMin: 0,
  distanceMax: 3000,
};
