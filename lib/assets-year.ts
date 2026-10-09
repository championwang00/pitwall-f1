/**
 * Year-aware ASSET LIBRARY — one import for every picture of an object in a season (picture rule: exact, else a
 * captioned representative only without a year, else F1's captioned placeholder; never another car / year / person
 * passed off as this one). Every helper returns { url, caption, exact } and has a sync `…Known` twin that answers
 * from the prebuilt manifests (data/car-images.json, data/period-faces.json, data/team-logos-year.json) without
 * touching the network — use those in page renders; unknown entries are looked up in the background.
 * Manifests: `node --experimental-strip-types --import ./scripts/lib/ts-register.mjs scripts/build-car-images.mjs`.
 */
export { carImage, carImageKnown, carImageFast, teamYearImage as teamCarAt, teamYearKnown as teamCarAtKnown, teamImage, teamImageKnown, F1_FALLBACK_CAR, type Pic } from "./carImage";
export { teamLogoAt, teamLogoAtKnown, type LogoPic } from "./teamLogo";
export { driverPhotoAt, driverPhotoKnown, driverHeroKnown, F1_FALLBACK_DRIVER, type FacePic } from "./periodFace";
export { teamColorAt } from "./assets";
export { circuitImage, layoutOf, layoutSvg, type CircuitPic } from "./circuitImage";
