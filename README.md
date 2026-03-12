# React Native Biometric Auth

![React Native](https://img.shields.io/badge/React_Native-0.72-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Unified biometric authentication for React Native. Supports Face ID, Touch ID, and Android fingerprint/face unlock.

## Features

- **Face ID** - iOS facial recognition
- **Touch ID** - iOS fingerprint
- **Android Biometrics** - Fingerprint, face, iris
- **Fallback Options** - PIN/password fallback
- **Availability Check** - Detect biometric capabilities
- **Secure Enclave** - Hardware-backed security

## Installation

```bash
npm install @marwantech/react-native-biometric-auth
```

### iOS Setup
```ruby
# ios/Podfile
pod 'react-native-biometric-auth', :path => '../node_modules/@marwantech/react-native-biometric-auth'
```

Add to `Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Authenticate to access your account</string>
```

### Android Setup
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

## Quick Start

```typescript
import { BiometricAuth } from '@marwantech/react-native-biometric-auth';

const biometric = new BiometricAuth();

// Check availability
const available = await biometric.isAvailable();
console.log(available);
// { available: true, biometryType: 'FaceID', enrolled: true }

// Authenticate
const result = await biometric.authenticate({
  reason: 'Confirm your identity',
  fallbackLabel: 'Use Passcode',
});

if (result.success) {
  console.log('Authenticated!');
} else {
  console.log('Failed:', result.error);
}
```

## API Reference

### Check Availability

```typescript
const status = await biometric.isAvailable();

// Response
interface BiometricStatus {
  available: boolean;
  biometryType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'None';
  enrolled: boolean;          // User has registered biometrics
  error?: string;
}
```

### Authenticate

```typescript
const result = await biometric.authenticate({
  reason: 'Access secure data',           // Shown to user
  fallbackLabel: 'Use Password',          // iOS fallback button
  allowDeviceCredentials: true,           // Allow PIN/password
  confirmationRequired: false,            // Android explicit confirmation
  cancelLabel: 'Cancel',                  // Cancel button text
});

// Response
interface AuthResult {
  success: boolean;
  error?: BiometricError;
}

type BiometricError =
  | 'USER_CANCEL'
  | 'USER_FALLBACK'
  | 'BIOMETRIC_NOT_ENROLLED'
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'BIOMETRIC_LOCKOUT'
  | 'AUTHENTICATION_FAILED'
  | 'SYSTEM_CANCEL';
```

### Get Biometry Type

```typescript
const type = await biometric.getBiometryType();
// 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'None'

// Use for dynamic UI
const icon = type === 'FaceID' ? '👤' : '👆';
const label = type === 'FaceID' ? 'Sign in with Face ID' : 'Sign in with Touch ID';
```

## React Hook

```typescript
import { useBiometric } from '@marwantech/react-native-biometric-auth';

function LoginScreen() {
  const {
    available,
    biometryType,
    authenticate,
    isAuthenticating
  } = useBiometric();

  const handleBiometricLogin = async () => {
    const result = await authenticate({
      reason: 'Sign in to your account',
    });

    if (result.success) {
      navigation.navigate('Home');
    }
  };

  if (!available) {
    return <PasswordLogin />;
  }

  return (
    <TouchableOpacity onPress={handleBiometricLogin} disabled={isAuthenticating}>
      <Text>Sign in with {biometryType}</Text>
    </TouchableOpacity>
  );
}
```

## Secure Token Storage

Combine with secure storage for token protection:

```typescript
import { BiometricAuth } from '@marwantech/react-native-biometric-auth';
import { SecureStorage } from '@marwantech/react-native-secure-storage';

const biometric = new BiometricAuth();
const storage = new SecureStorage();

// Save token with biometric protection
async function saveToken(token: string) {
  await storage.set('auth_token', token, {
    requireBiometric: true,
  });
}

// Retrieve token (triggers biometric prompt)
async function getToken(): Promise<string | null> {
  const auth = await biometric.authenticate({
    reason: 'Access your saved credentials',
  });

  if (auth.success) {
    return storage.get('auth_token');
  }
  return null;
}
```

## Error Handling

```typescript
const result = await biometric.authenticate({ reason: 'Verify identity' });

if (!result.success) {
  switch (result.error) {
    case 'USER_CANCEL':
      // User tapped cancel
      break;
    case 'USER_FALLBACK':
      // User chose password/PIN
      showPasswordInput();
      break;
    case 'BIOMETRIC_LOCKOUT':
      // Too many failed attempts
      showLockoutMessage();
      break;
    case 'BIOMETRIC_NOT_ENROLLED':
      // No biometrics registered
      promptEnrollBiometrics();
      break;
    default:
      showGenericError();
  }
}
```

## Platform Differences

| Feature | iOS | Android |
|---------|-----|---------|
| Face ID | ✅ | ✅ (Android 10+) |
| Fingerprint | ✅ Touch ID | ✅ |
| Iris | ❌ | ✅ (Samsung) |
| Device Credentials | ✅ | ✅ |
| Confirmation Required | N/A | ✅ |
| Lockout | 5 attempts | Varies |

## License

MIT
