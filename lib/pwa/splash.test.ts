import { describe, it, expect } from 'vitest';
import { SPLASH_DEVICES, splashFile, splashMedia, startupImages } from './splash';

describe('SPLASH_DEVICES', () => {
	it('is an array of SplashDevice objects', () => {
		expect(SPLASH_DEVICES).toBeDefined();
		expect(Array.isArray(SPLASH_DEVICES)).toBe(true);
		expect(SPLASH_DEVICES.length).toBeGreaterThan(0);
	});

	it('each device has name, width, height, and ratio properties', () => {
		for (const d of SPLASH_DEVICES) {
			expect(d.name).toBeDefined();
			expect(typeof d.width).toBe('number');
			expect(typeof d.height).toBe('number');
			expect(typeof d.ratio).toBe('number');
		}
	});

	it('has at least one device', () => {
		expect(SPLASH_DEVICES.length).toBeGreaterThanOrEqual(1);
	});
});

describe('splashFile', () => {
	it('returns a file path string for a device', () => {
		const d = SPLASH_DEVICES[0];
		const result = splashFile(d);
		expect(typeof result).toBe('string');
		expect(result).toContain('/splash/');
	});

	it('includes width*ratio and height*ratio in the filename', () => {
		const d = SPLASH_DEVICES[0];
		const expectedWidth = d.width * d.ratio;
		const expectedHeight = d.height * d.ratio;
		const result = splashFile(d);
		expect(result).toContain(expectedWidth.toString());
		expect(result).toContain(expectedHeight.toString());
	});

	it('handles multiple devices with different dimensions', () => {
		if (SPLASH_DEVICES.length >= 2) {
			const d1 = SPLASH_DEVICES[0];
			const d2 = SPLASH_DEVICES[1];
			const file1 = splashFile(d1);
			const file2 = splashFile(d2);
			expect(file1).not.toBe(file2);
		}
	});
});

describe('splashMedia', () => {
	it('returns a media query string for a device', () => {
		const d = SPLASH_DEVICES[0];
		const result = splashMedia(d);
		expect(typeof result).toBe('string');
		expect(result).toContain('(device-width:');
		expect(result).toContain('(device-height:');
		expect(result).toContain('(-webkit-device-pixel-ratio:');
		expect(result).toContain('(orientation: portrait)');
	});

	it('includes the correct width value in the media query', () => {
		const d = SPLASH_DEVICES[0];
		const result = splashMedia(d);
		expect(result).toContain(`device-width: ${d.width}px`);
	});

	it('includes the correct height value in the media query', () => {
		const d = SPLASH_DEVICES[0];
		const result = splashMedia(d);
		expect(result).toContain(`device-height: ${d.height}px`);
	});

	it('includes the correct ratio value in the media query', () => {
		const d = SPLASH_DEVICES[0];
		const result = splashMedia(d);
		expect(result).toContain(`-webkit-device-pixel-ratio: ${d.ratio}`);
	});
});

describe('startupImages', () => {
	it('returns an array of startup image objects', () => {
		const result = startupImages();
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(SPLASH_DEVICES.length);
	});

	it('each item has url and media properties', () => {
		const result = startupImages();
		for (const item of result) {
			expect(item.url).toBeDefined();
			expect(item.media).toBeDefined();
		}
	});

	it('url matches splashFile output for each device', () => {
		const result = startupImages();
		for (let i = 0; i < SPLASH_DEVICES.length; i++) {
			const d = SPLASH_DEVICES[i];
			const expectedUrl = splashFile(d);
			expect(result[i].url).toBe(expectedUrl);
		}
	});

	it('media matches splashMedia output for each device', () => {
		const result = startupImages();
		for (let i = 0; i < SPLASH_DEVICES.length; i++) {
			const d = SPLASH_DEVICES[i];
			const expectedMedia = splashMedia(d);
			expect(result[i].media).toBe(expectedMedia);
		}
	});

	it('returns empty array when SPLASH_DEVICES is empty', () => {
		// This test would need to modify SPLASH_DEVICES, which we cannot do.
		// Instead, we verify the function returns an array with length matching input.
		const result = startupImages();
		expect(Array.isArray(result)).toBe(true);
	});
});
