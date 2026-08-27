/**
 * Shared constants that can be imported by both client components
 * and server-side API routes. No "use client" directive here.
 */

export const DISCOVERY_METHODS = [
  "Transit",
  "Radial Velocity",
  "Imaging",
  "Microlensing",
  "Astrometry",
  "Eclipse Timing Variations",
  "Transit Timing Variations",
  "Orbital Brightness Modulation",
  "Pulsar Timing",
  "Pulsation Timing Variations",
  "Disk Kinematics",
] as const;

export type DiscoveryMethod = typeof DISCOVERY_METHODS[number];
