import { describe, expect, it } from 'vitest';
import { distanceKm, parseCoordinates } from './coordinates';

const CALGARY = { latitude: 51.0447, longitude: -114.0719 };

describe('parseCoordinates', () => {
  it.each([
    ['51.0447, -114.0719'],
    ['51.0447 -114.0719'],
    ['  51.0447,-114.0719  '],
    ['https://www.google.com/maps/@51.0447,-114.0719,15z'],
    ['https://www.google.com/maps/place/Calgary/@51.0447,-114.0719,12z/data=!3m1'],
    ['https://maps.google.com/?q=51.0447,-114.0719'],
    ['https://maps.apple.com/?ll=51.0447,-114.0719&z=10'],
    ['https://www.google.com/maps/place/x/data=!3d51.0447!4d-114.0719'],
    ['https://www.openstreetmap.org/#map=15/51.0447/-114.0719'],
  ])('reads %s', (text) => {
    const c = parseCoordinates(text)!;
    expect(c.latitude).toBeCloseTo(CALGARY.latitude, 4);
    expect(c.longitude).toBeCloseTo(CALGARY.longitude, 4);
  });

  it('reads degrees, minutes and seconds with compass letters', () => {
    const c = parseCoordinates(`51°02'41"N 114°04'19"W`)!;
    expect(c.latitude).toBeCloseTo(51.0447, 3);
    expect(c.longitude).toBeCloseTo(-114.0719, 3);
    expect(parseCoordinates(`33°52'08"S 151°12'33"E`)!.latitude).toBeLessThan(0);
  });

  it.each([[''], ['the old harbour'], ['91, 10'], ['10, 181'], ['51.0'], ['https://www.google.com/maps/place/Calgary'], ['12 Harbor Rd']])(
    'finds none in %j', (text) => { expect(parseCoordinates(text)).toBeNull(); },
  );
});

describe('distanceKm', () => {
  it('Calgary to Banff is about 105 km', () => {
    expect(Math.abs(distanceKm(CALGARY, { latitude: 51.1784, longitude: -115.5708 }) - 105)).toBeLessThanOrEqual(2);
  });

  it('a place is no distance from itself', () => {
    expect(distanceKm(CALGARY, CALGARY)).toBe(0);
  });
});
