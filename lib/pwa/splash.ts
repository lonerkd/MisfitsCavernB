// iPhone launch screens for the installed web app. iOS shows an
// apple-touch-startup-image while the app starts; it picks one only on an
// exact match of the device's size and pixel ratio, so there's one per
// screen. The images are made from the mark by scripts/brand-export.mjs
// (public/splash/), from the same device list.
import devices from './splash-devices.json';

export interface SplashDevice { name: string; width: number; height: number; ratio: number }

export const SPLASH_DEVICES: SplashDevice[] = devices;

/** The file for a device (portrait), in pixels. */
export const splashFile = (d: SplashDevice) => `/splash/splash-${d.width * d.ratio}x${d.height * d.ratio}.png`;

/** The media query iOS matches the image on. */
export const splashMedia = (d: SplashDevice) =>
  `(device-width: ${d.width}px) and (device-height: ${d.height}px) and (-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: portrait)`;

/** For Next's metadata.appleWebApp.startupImage. */
export const startupImages = () => SPLASH_DEVICES.map((d) => ({ url: splashFile(d), media: splashMedia(d) }));
