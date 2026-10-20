import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MIN_DEVICE_MEMORY,
  probeWebGL2,
  readWebGLEnvironment,
  REDUCED_DATA_QUERY,
  resetWebGL2Support,
  SMALL_TOUCH_SCREEN_QUERY,
  supportsWebGL2,
  type WebGLEnvironment,
  webglBlockReason,
} from '@/lib/motion/webgl-policy';

const capable: WebGLEnvironment = {
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  smallTouchScreen: false,
  webgl2: true,
};

/** A fake window: matchMedia answers from `matching`, navigator carries the hints. */
function fakeWindow({
  matching = [],
  saveData,
  deviceMemory,
}: {
  matching?: string[];
  saveData?: boolean;
  deviceMemory?: number;
} = {}) {
  return {
    matchMedia: (query: string) => ({ matches: matching.includes(query) }),
    navigator: {
      ...(saveData === undefined ? {} : { connection: { saveData } }),
      ...(deviceMemory === undefined ? {} : { deviceMemory }),
    },
    document,
  } as unknown as Window;
}

afterEach(() => {
  resetWebGL2Support();
});

describe('webglBlockReason', () => {
  it('lets the effect run on a capable device', () => {
    expect(webglBlockReason(capable)).toBeNull();
  });

  it.each([
    ['reduced-motion', { reducedMotion: true }],
    ['save-data', { saveData: true }],
    ['low-memory', { deviceMemory: MIN_DEVICE_MEMORY - 2 }],
    ['small-touch-screen', { smallTouchScreen: true }],
    ['no-webgl2', { webgl2: false }],
  ] as const)('shows the poster for %s', (reason, change) => {
    expect(webglBlockReason({ ...capable, ...change })).toBe(reason);
  });

  it('treats unknown memory as enough, and 4 GB as enough', () => {
    expect(webglBlockReason({ ...capable, deviceMemory: undefined })).toBeNull();
    expect(webglBlockReason({ ...capable, deviceMemory: MIN_DEVICE_MEMORY })).toBeNull();
  });

  it('reports reduced motion before anything else', () => {
    expect(
      webglBlockReason({
        reducedMotion: true,
        saveData: true,
        deviceMemory: 1,
        smallTouchScreen: true,
        webgl2: false,
      }),
    ).toBe('reduced-motion');
  });
});

describe('readWebGLEnvironment', () => {
  it('reads Save-Data from the connection and from prefers-reduced-data', () => {
    const probe = vi.fn(() => true);
    expect(
      readWebGLEnvironment(fakeWindow({ saveData: true }), { reducedMotion: false, probe }).saveData,
    ).toBe(true);
    expect(
      readWebGLEnvironment(fakeWindow({ matching: [REDUCED_DATA_QUERY] }), {
        reducedMotion: false,
        probe,
      }).saveData,
    ).toBe(true);
  });

  it('reads device memory and touch-first small screens', () => {
    const env = readWebGLEnvironment(
      fakeWindow({ deviceMemory: 2, matching: [SMALL_TOUCH_SCREEN_QUERY] }),
      { reducedMotion: false, probe: () => true },
    );
    expect(env.deviceMemory).toBe(2);
    expect(env.smallTouchScreen).toBe(true);
    expect(webglBlockReason(env)).toBe('low-memory');
  });

  it('only probes WebGL2 when nothing else blocks the effect', () => {
    const probe = vi.fn(() => false);
    readWebGLEnvironment(fakeWindow({ deviceMemory: 1 }), { reducedMotion: false, probe });
    readWebGLEnvironment(fakeWindow(), { reducedMotion: true, probe });
    expect(probe).not.toHaveBeenCalled();

    const env = readWebGLEnvironment(fakeWindow({ deviceMemory: 8 }), {
      reducedMotion: false,
      probe,
    });
    expect(probe).toHaveBeenCalledTimes(1);
    expect(webglBlockReason(env)).toBe('no-webgl2');
  });

  it('works without matchMedia', () => {
    const win = { navigator: {}, document } as unknown as Window;
    const env = readWebGLEnvironment(win, { reducedMotion: false, probe: () => true });
    expect(env).toEqual({ ...capable, deviceMemory: undefined });
  });
});

describe('probeWebGL2', () => {
  it('is true when a WebGL2 context can be created, and releases it', () => {
    const loseContext = vi.fn();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getExtension: () => ({ loseContext }) } as unknown as RenderingContext);
    expect(probeWebGL2(document)).toBe(true);
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(loseContext).toHaveBeenCalled();
  });

  it('is false without WebGL2 or when the browser throws', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(probeWebGL2(document)).toBe(false);
    getContext.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(probeWebGL2(document)).toBe(false);
  });

  it('probes once per page', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    supportsWebGL2(document);
    supportsWebGL2(document);
    expect(getContext).toHaveBeenCalledTimes(1);
  });
});
