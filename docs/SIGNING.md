# Code Signing Guide

This document explains how to set up code signing for Simple Password Manager to ensure that installers are recognized as trusted by operating systems.

## Why Code Signing?

Without code signing, operating systems will display security warnings:
- **Windows**: SmartScreen will block or warn users
- **macOS**: Gatekeeper will prevent the application from running
- **Linux**: Some desktop environments show security warnings

Code signing cryptographically verifies that:
1. The software comes from a known, verified publisher
2. The software hasn't been tampered with since it was signed

## Platform-Specific Requirements

### Windows Code Signing

Windows uses **Authenticode** for code signing. You'll need a code signing certificate from a trusted Certificate Authority (CA).

#### Obtaining a Certificate

You can obtain code signing certificates from:
- **DigiCert** (recommended for EV certificates)
- **Sectigo** (formerly Comodo)
- **GlobalSign**
- **SSL.com**

**Certificate Types:**
- **Standard Code Signing Certificate** (~$200-400/year): Requires building SmartScreen reputation over time
- **Extended Validation (EV) Certificate** (~$400-600/year): Immediate SmartScreen trust, hardware token required

#### Azure Trusted Signing (Alternative)

Microsoft offers [Azure Trusted Signing](https://azure.microsoft.com/en-us/products/trusted-signing/) as a cloud-based alternative that provides immediate SmartScreen reputation.

#### GitHub Actions Setup for Windows

1. Export your certificate as a `.pfx` file
2. Base64 encode the certificate:
   ```bash
   base64 -i certificate.pfx -o certificate.txt
   ```
3. Add the following secrets to your GitHub repository:
   - `TAURI_SIGNING_PRIVATE_KEY`: The base64-encoded certificate content
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: The certificate password

### macOS Code Signing and Notarization

macOS requires both **code signing** and **notarization** for applications distributed outside the App Store.

#### Prerequisites

1. **Apple Developer Program membership** ($99/year)
2. **Developer ID Application certificate**
3. **App-specific password** for notarization

#### Step 1: Create Developer ID Certificate

1. Sign in to [Apple Developer](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles**
3. Click **+** to create a new certificate
4. Select **Developer ID Application**
5. Follow the instructions to create a Certificate Signing Request (CSR)
6. Download and install the certificate in your Keychain

#### Step 2: Export Certificate

1. Open **Keychain Access**
2. Find your "Developer ID Application" certificate
3. Right-click → **Export**
4. Save as `.p12` file with a strong password

#### Step 3: Create App-Specific Password

1. Sign in to [appleid.apple.com](https://appleid.apple.com)
2. Go to **Sign-In and Security** → **App-Specific Passwords**
3. Click **Generate an app-specific password**
4. Name it (e.g., "GitHub Actions Notarization")
5. Save the generated password

#### Step 4: Find Your Team ID

1. Sign in to [Apple Developer](https://developer.apple.com)
2. Go to **Membership**
3. Note your **Team ID** (10-character alphanumeric)

#### GitHub Actions Setup for macOS

Add the following secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
| `KEYCHAIN_PASSWORD` | Any strong password (for temp keychain) |
| `APPLE_SIGNING_IDENTITY` | Certificate name, e.g., `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | App-specific password (from Step 3) |
| `APPLE_TEAM_ID` | Your Team ID (from Step 4) |

To base64 encode your certificate:
```bash
base64 -i certificate.p12 -o certificate.txt
```

### Linux

Linux doesn't have a centralized code signing system like Windows or macOS. However, you can improve trust by:

1. **GPG Signing**: Sign your releases with a GPG key
2. **Package Repository**: Distribute via official repositories (requires maintainer approval)
3. **Checksums**: Provide SHA-256 checksums for verification

#### GPG Signing for Releases

1. Generate a GPG key:
   ```bash
   gpg --full-generate-key
   ```

2. Export your public key:
   ```bash
   gpg --armor --export your@email.com > public-key.asc
   ```

3. Sign release files:
   ```bash
   gpg --detach-sign --armor filename.deb
   ```

## GitHub Repository Secrets Setup

To enable code signing in the GitHub Actions workflow, add the following secrets to your repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret

### Required Secrets Summary

#### Windows (if using certificate-based signing)
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

#### macOS
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `KEYCHAIN_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## Verifying Signed Applications

### Windows

```powershell
# Check digital signature
Get-AuthenticodeSignature ".\installer.exe"
```

### macOS

```bash
# Verify code signature
codesign --verify --verbose=4 "/Applications/Simple Password Manager.app"

# Check notarization
spctl --assess --verbose=4 --type execute "/Applications/Simple Password Manager.app"
```

### Linux

```bash
# Verify GPG signature (if provided)
gpg --verify installer.deb.asc installer.deb
```

## Troubleshooting

### Windows SmartScreen Still Warns

- **Standard certificates** need to build reputation over time (typically 2-4 weeks of downloads)
- Consider upgrading to an **EV certificate** for immediate trust
- Ensure timestamping is enabled in signing

### macOS "App is damaged" Error

This usually means:
1. The app wasn't signed correctly
2. Notarization failed
3. The signature was invalidated after download

Try:
```bash
xattr -cr "/Applications/Simple Password Manager.app"
```

### Certificate Expired

- Purchase and install a new certificate
- Update GitHub secrets with the new certificate
- Re-run the release workflow

## Cost Considerations

| Platform | Cost | Notes |
|----------|------|-------|
| Windows (Standard) | $200-400/year | SmartScreen reputation builds over time |
| Windows (EV) | $400-600/year | Immediate SmartScreen trust, requires hardware token |
| Azure Trusted Signing | $9.99/month | Cloud-based, immediate reputation |
| macOS | $99/year | Apple Developer Program membership |
| Linux | Free | GPG signing is free |

## Additional Resources

- [Tauri Code Signing Documentation](https://v2.tauri.app/distribute/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Microsoft Authenticode](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Azure Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/)
