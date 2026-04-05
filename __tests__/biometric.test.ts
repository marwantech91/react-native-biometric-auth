import { getBiometryDisplayName, isFaceBiometry, isFingerprintBiometry, hasBiometricSupport } from '../src/index';

// Mock React Native
jest.mock('react-native', () => ({
  NativeModules: {
    BiometricModule: {
      checkAvailability: jest.fn(),
      authenticate: jest.fn(),
    },
  },
  Platform: { OS: 'ios' },
}));

jest.mock('react', () => ({
  useState: jest.fn((init) => [typeof init === 'function' ? init() : init, jest.fn()]),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn),
}));

describe('getBiometryDisplayName', () => {
  it('returns Face ID for FaceID type', () => {
    expect(getBiometryDisplayName('FaceID')).toBe('Face ID');
  });

  it('returns Touch ID for TouchID type', () => {
    expect(getBiometryDisplayName('TouchID')).toBe('Touch ID');
  });

  it('returns Fingerprint for Fingerprint type', () => {
    expect(getBiometryDisplayName('Fingerprint')).toBe('Fingerprint');
  });

  it('returns None for None type', () => {
    expect(getBiometryDisplayName('None')).toBe('None');
  });
});

describe('isFaceBiometry', () => {
  it('returns true for FaceID', () => {
    expect(isFaceBiometry('FaceID')).toBe(true);
  });

  it('returns true for Face', () => {
    expect(isFaceBiometry('Face')).toBe(true);
  });

  it('returns false for TouchID', () => {
    expect(isFaceBiometry('TouchID')).toBe(false);
  });

  it('returns false for Fingerprint', () => {
    expect(isFaceBiometry('Fingerprint')).toBe(false);
  });
});

describe('isFingerprintBiometry', () => {
  it('returns true for TouchID', () => {
    expect(isFingerprintBiometry('TouchID')).toBe(true);
  });

  it('returns true for Fingerprint', () => {
    expect(isFingerprintBiometry('Fingerprint')).toBe(true);
  });

  it('returns false for FaceID', () => {
    expect(isFingerprintBiometry('FaceID')).toBe(false);
  });
});

describe('hasBiometricSupport', () => {
  it('returns true for FaceID', () => {
    expect(hasBiometricSupport('FaceID')).toBe(true);
  });

  it('returns true for Fingerprint', () => {
    expect(hasBiometricSupport('Fingerprint')).toBe(true);
  });

  it('returns false for None', () => {
    expect(hasBiometricSupport('None')).toBe(false);
  });
});

describe('BiometricAuth class', () => {
  const { NativeModules } = require('react-native');
  const { BiometricAuth } = require('../src/index');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached status on second call', async () => {
    NativeModules.BiometricModule.checkAvailability.mockResolvedValueOnce({
      available: true,
      biometryType: 'FaceID',
      enrolled: true,
    });

    const auth = new BiometricAuth();
    await auth.isAvailable();
    await auth.isAvailable();

    expect(NativeModules.BiometricModule.checkAvailability).toHaveBeenCalledTimes(1);
  });

  it('clears cache when clearCache is called', async () => {
    NativeModules.BiometricModule.checkAvailability.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
      enrolled: true,
    });

    const auth = new BiometricAuth();
    await auth.isAvailable();
    auth.clearCache();
    await auth.isAvailable();

    expect(NativeModules.BiometricModule.checkAvailability).toHaveBeenCalledTimes(2);
  });

  it('returns not available when module throws', async () => {
    NativeModules.BiometricModule.checkAvailability.mockRejectedValueOnce(
      new Error('Module not found')
    );

    const auth = new BiometricAuth();
    const status = await auth.isAvailable();

    expect(status.available).toBe(false);
    expect(status.biometryType).toBe('None');
  });

  it('returns BIOMETRIC_NOT_AVAILABLE when not available', async () => {
    NativeModules.BiometricModule.checkAvailability.mockResolvedValueOnce({
      available: false,
      biometryType: 'None',
      enrolled: false,
    });

    const auth = new BiometricAuth();
    const result = await auth.authenticate({ reason: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('BIOMETRIC_NOT_AVAILABLE');
  });

  it('returns BIOMETRIC_NOT_ENROLLED when not enrolled', async () => {
    NativeModules.BiometricModule.checkAvailability.mockResolvedValueOnce({
      available: true,
      biometryType: 'FaceID',
      enrolled: false,
    });

    const auth = new BiometricAuth();
    const result = await auth.authenticate({ reason: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('BIOMETRIC_NOT_ENROLLED');
  });
});
