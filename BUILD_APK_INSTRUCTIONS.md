# Build APK Instructions for MugShots Cafe POS

## Prerequisites
✅ Android Studio (already installed)
✅ Node.js (required - install from https://nodejs.org if not installed)

## Step-by-Step Build Process

### 1. Install Node.js Dependencies
Open PowerShell in this folder and run:
```powershell
npm install
```

### 2. Initialize Capacitor Android Project
```powershell
npx cap add android
```

### 3. Sync Your Web Files to Android
```powershell
npx cap sync android
```

### 4. Open in Android Studio
```powershell
npx cap open android
```

This will open the Android project in Android Studio.

### 5. Build APK in Android Studio

Once Android Studio opens:

1. **Wait for Gradle sync** to complete (bottom right corner)

2. **Build > Build Bundle(s) / APK(s) > Build APK(s)**

3. Wait for build to complete (notification will appear)

4. Click **"locate"** in the notification to find your APK

**APK Location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 6. Install APK on Android Device

#### Option A: USB Cable
- Enable Developer Options on your phone
- Enable USB Debugging
- Connect phone via USB
- Run: `adb install app-debug.apk`

#### Option B: Transfer File
- Copy `app-debug.apk` to your phone
- Open the file on your phone
- Tap Install (may need to allow "Unknown Sources")

## Building Release APK (For Production)

### Generate Signing Key
```powershell
cd android/app
keytool -genkey -v -keystore mugshots-release-key.keystore -alias mugshots -keyalg RSA -keysize 2048 -validity 10000
```

### Create android/key.properties
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mugshots
storeFile=mugshots-release-key.keystore
```

### Build Release APK
In Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Click **Finish**

**Release APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting

### "npm not recognized"
- Install Node.js from https://nodejs.org
- Restart PowerShell after installation

### Gradle Build Failed
- In Android Studio: **File > Invalidate Caches > Invalidate and Restart**
- Update Android SDK tools if prompted

### App Crashes on Launch
- Check Android Logcat in Android Studio
- Ensure all permissions are granted in AndroidManifest.xml

### IndexedDB Not Working
- This is normal - some browser features don't work in WebView
- The app uses localStorage as fallback (already implemented)

## App Permissions

If you need camera/file access in the future, add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Updating the App

When you make changes to HTML/CSS/JS:

1. Save your changes
2. Run: `npx cap sync android`
3. Rebuild APK in Android Studio

---

**Quick Command Summary:**
```powershell
# First time setup
npm install
npx cap add android
npx cap sync android
npx cap open android

# After making changes
npx cap sync android
# Then rebuild in Android Studio
```
