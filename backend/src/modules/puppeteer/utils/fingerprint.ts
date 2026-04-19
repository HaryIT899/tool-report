/**
 * Browser fingerprinting utilities
 * Patches WebGL, Canvas, AudioContext to avoid detection
 */

import { Page } from 'puppeteer';

export interface FingerprintConfig {
  timezone?: string;
  locale?: string;
  webglVendor?: string;
  webglRenderer?: string;
  canvasNoise?: boolean;
}

/**
 * Apply comprehensive fingerprint patches to page
 */
export async function applyFingerprint(page: Page, config: FingerprintConfig = {}): Promise<void> {
  const {
    timezone = 'America/New_York',
    locale = 'en-US',
    webglVendor = 'Intel Inc.',
    webglRenderer = 'Intel Iris OpenGL Engine',
    canvasNoise = true,
  } = config;

  await page.evaluateOnNewDocument((tz, loc, vendor, renderer, noise) => {
    // 1. Override timezone
    Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
      value: function() {
        return {
          ...Intl.DateTimeFormat.prototype.resolvedOptions.call(this),
          timeZone: tz,
        };
      },
    });

    // 2. Override locale
    Object.defineProperty(navigator, 'language', {
      get: () => loc,
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => [loc, loc.split('-')[0]],
    });

    // 3. Override WebDriver flag (stealth plugin should do this, but double-check)
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // 4. Mock plugins (realistic list)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format',
          length: 1,
        },
        {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: '',
          length: 1,
        },
        {
          name: 'Native Client',
          filename: 'internal-nacl-plugin',
          description: '',
          length: 2,
        },
      ],
    });

    // 5. WebGL fingerprint
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
      if (parameter === 37445) {
        return vendor; // UNMASKED_VENDOR_WEBGL
      }
      if (parameter === 37446) {
        return renderer; // UNMASKED_RENDERER_WEBGL
      }
      return getParameter.call(this, parameter);
    };

    // 6. Canvas fingerprinting - add noise
    if (noise) {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
        const context = this.getContext('2d');
        if (context) {
          // Add minimal noise (1-2 pixel variation)
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            if (Math.random() < 0.001) { // 0.1% of pixels
              imageData.data[i] = imageData.data[i] ^ 1; // XOR with 1
            }
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.call(this, type);
      };
    }

    // 7. AudioContext fingerprinting
    const audioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (audioContext) {
      const OriginalAnalyser = audioContext.prototype.createAnalyser;
      audioContext.prototype.createAnalyser = function() {
        const analyser = OriginalAnalyser.call(this);
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
        analyser.getFloatFrequencyData = function(array: Float32Array) {
          originalGetFloatFrequencyData.call(this, array);
          // Add minimal noise
          for (let i = 0; i < array.length; i++) {
            array[i] += (Math.random() - 0.5) * 0.0001;
          }
        };
        return analyser;
      };
    }

    // 8. Battery API (if exists)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 0.8 + Math.random() * 0.15, // 80-95%
      });
    }

    // 9. Hardware concurrency (randomize slightly)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => Math.max(2, Math.min(16, Math.floor(Math.random() * 8) + 4)),
    });

    // 10. DeviceMemory (if supported)
    if ('deviceMemory' in navigator) {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
      });
    }
  }, timezone, locale, webglVendor, webglRenderer, canvasNoise);
}

/**
 * Get consistent fingerprint config based on proxy location
 */
export function getFingerprintForLocation(country: string): FingerprintConfig {
  const configs: Record<string, FingerprintConfig> = {
    US: {
      timezone: 'America/New_York',
      locale: 'en-US',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel Iris Plus Graphics 640',
    },
    GB: {
      timezone: 'Europe/London',
      locale: 'en-GB',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel(R) HD Graphics 630',
    },
    DE: {
      timezone: 'Europe/Berlin',
      locale: 'de-DE',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel(R) UHD Graphics 620',
    },
    FR: {
      timezone: 'Europe/Paris',
      locale: 'fr-FR',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel(R) Iris(TM) Graphics 6100',
    },
    CA: {
      timezone: 'America/Toronto',
      locale: 'en-CA',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel Iris Pro Graphics 5200',
    },
    AU: {
      timezone: 'Australia/Sydney',
      locale: 'en-AU',
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Intel(R) Iris(TM) Plus Graphics 655',
    },
  };

  return configs[country] || configs.US;
}

/**
 * Generate random but realistic viewport
 */
export function getRandomViewport() {
  const commonResolutions = [
    { width: 1920, height: 1080 },
    { width: 1680, height: 1050 },
    { width: 1600, height: 900 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1280, height: 720 },
  ];

  const resolution = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];
  
  return {
    width: resolution.width,
    height: resolution.height,
    deviceScaleFactor: Math.random() < 0.5 ? 1 : 2,
    isMobile: false,
    hasTouch: false,
  };
}
