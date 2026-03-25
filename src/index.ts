import { NativeModules, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

const { BiometricModule } = NativeModules;

type BiometryType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'None';

type BiometricError =
  | 'USER_CANCEL'
  | 'USER_FALLBACK'
  | 'BIOMETRIC_NOT_ENROLLED'
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'BIOMETRIC_LOCKOUT'
  | 'AUTHENTICATION_FAILED'
  | 'SYSTEM_CANCEL';

interface BiometricStatus {
  available: boolean;
  biometryType: BiometryType;
  enrolled: boolean;
  error?: string;
}

interface AuthOptions {
  reason: string;
  fallbackLabel?: string;
  allowDeviceCredentials?: boolean;
  confirmationRequired?: boolean;
  cancelLabel?: string;
}

interface AuthResult {
  success: boolean;
  error?: BiometricError;
}

export class BiometricAuth {
  private cachedStatus: BiometricStatus | null = null;

  async isAvailable(): Promise<BiometricStatus> {
    if (this.cachedStatus) {
      return this.cachedStatus;
    }

    try {
      const result = await BiometricModule.checkAvailability();
      this.cachedStatus = {
        available: result.available,
        biometryType: this.normalizeBiometryType(result.biometryType),
        enrolled: result.enrolled,
      };
      return this.cachedStatus;
    } catch (error) {
      return {
        available: false,
        biometryType: 'None',
        enrolled: false,
        error: (error as Error).message,
      };
    }
  }

  async getBiometryType(): Promise<BiometryType> {
    const status = await this.isAvailable();
    return status.biometryType;
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    const status = await this.isAvailable();

    if (!status.available) {
      return {
        success: false,
        error: 'BIOMETRIC_NOT_AVAILABLE',
      };
    }

    if (!status.enrolled) {
      return {
        success: false,
        error: 'BIOMETRIC_NOT_ENROLLED',
      };
    }

    try {
      const config = this.buildConfig(options);
      await BiometricModule.authenticate(config);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.mapError(error as Error),
      };
    }
  }

  clearCache(): void {
    this.cachedStatus = null;
  }

  private normalizeBiometryType(type: string): BiometryType {
    const typeMap: Record<string, BiometryType> = {
      'TouchID': 'TouchID',
      'FaceID': 'FaceID',
      'Fingerprint': 'Fingerprint',
      'Face': 'Face',
      'Iris': 'Iris',
      'FINGERPRINT': 'Fingerprint',
      'FACE': 'Face',
      'IRIS': 'Iris',
    };

    return typeMap[type] || 'None';
  }

  private buildConfig(options: AuthOptions): Record<string, unknown> {
    const config: Record<string, unknown> = {
      reason: options.reason,
    };

    if (Platform.OS === 'ios') {
      config.fallbackLabel = options.fallbackLabel ?? 'Use Passcode';
      config.cancelLabel = options.cancelLabel ?? 'Cancel';
    }

    if (Platform.OS === 'android') {
      config.allowDeviceCredentials = options.allowDeviceCredentials ?? false;
      config.confirmationRequired = options.confirmationRequired ?? true;
      config.negativeButtonText = options.cancelLabel ?? 'Cancel';
    }

    return config;
  }

  private mapError(error: Error): BiometricError {
    const message = error.message.toLowerCase();

    if (message.includes('cancel') || message.includes('user cancel')) {
      return 'USER_CANCEL';
    }
    if (message.includes('fallback') || message.includes('password')) {
      return 'USER_FALLBACK';
    }
    if (message.includes('lockout') || message.includes('locked')) {
      return 'BIOMETRIC_LOCKOUT';
    }
    if (message.includes('not enrolled') || message.includes('no biometrics')) {
      return 'BIOMETRIC_NOT_ENROLLED';
    }
    if (message.includes('not available') || message.includes('unavailable')) {
      return 'BIOMETRIC_NOT_AVAILABLE';
    }
    if (message.includes('system')) {
      return 'SYSTEM_CANCEL';
    }

    return 'AUTHENTICATION_FAILED';
  }
}

// React Hook
interface UseBiometricResult {
  available: boolean;
  biometryType: BiometryType;
  enrolled: boolean;
  isAuthenticating: boolean;
  authenticate: (options: AuthOptions) => Promise<AuthResult>;
  checkAvailability: () => Promise<void>;
}

export function useBiometric(): UseBiometricResult {
  const [status, setStatus] = useState<BiometricStatus>({
    available: false,
    biometryType: 'None',
    enrolled: false,
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const biometricAuth = new BiometricAuth();

  const checkAvailability = useCallback(async () => {
    const result = await biometricAuth.isAvailable();
    setStatus(result);
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const authenticate = useCallback(async (options: AuthOptions): Promise<AuthResult> => {
    setIsAuthenticating(true);
    try {
      return await biometricAuth.authenticate(options);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  return {
    available: status.available,
    biometryType: status.biometryType,
    enrolled: status.enrolled,
    isAuthenticating,
    authenticate,
    checkAvailability,
  };
}

export default BiometricAuth;
export type { BiometryType, BiometricStatus, AuthOptions, AuthResult, BiometricError };

// Convenience method to check if device supports any biometrics
export async function isBiometricSupported(): Promise<boolean> {
  const auth = new BiometricAuth();
  const status = await auth.isAvailable();
  return status.available && status.enrolled;
}

// Get human-readable biometry name
export function getBiometryDisplayName(type: BiometryType): string {
  const names: Record<BiometryType, string> = {
    FaceID: 'Face ID',
    TouchID: 'Touch ID',
    Fingerprint: 'Fingerprint',
    Face: 'Face Recognition',
    Iris: 'Iris Scanner',
    None: 'None',
  };
  return names[type] || 'Biometric';
}

// Check if biometric type is face-based
export function isFaceBiometry(type: BiometryType): boolean {
  return type === 'FaceID' || type === 'Face';
}

// Check if biometric type is fingerprint-based
export function isFingerprintBiometry(type: BiometryType): boolean {
  return type === 'TouchID' || type === 'Fingerprint';
}

// Check if any biometric method is available on the device
export function hasBiometricSupport(type: BiometryType): boolean {
  return type !== 'None';
}
