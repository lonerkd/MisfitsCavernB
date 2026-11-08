// The cave takes its light from the album cover: the most colourful, middling-bright part of the picture, as an RGB triple.
export type Rgb = [number, number, number];
export const WARM: Rgb = [232, 120, 52];

/** From RGBA pixels (a canvas's getImageData): the average of the pixels that are neither near black, near white nor grey. */
export function dominantColour(data: ArrayLike<number>): Rgb {
  let r = 0, g = 0, b = 0, weight = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
    if (A < 200) continue;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    const light = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(2 * light - 255) || 1);
    if (light < 40 || light > 225 || sat < 0.25) continue;
    const w = sat * (1 - Math.abs(light - 128) / 128 + 0.2);
    r += R * w; g += G * w; b += B * w; weight += w;
  }
  return weight < 1e-3 ? WARM : [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight)];
}

/** Lifts a colour so it reads as light in a dark cave: at least this bright, keeping its hue. */
export function asLight([r, g, b]: Rgb, floor = 170): Rgb {
  const max = Math.max(r, g, b) || 1;
  const k = max < floor ? floor / max : 1;
  return [Math.min(255, Math.round(r * k)), Math.min(255, Math.round(g * k)), Math.min(255, Math.round(b * k))];
}
