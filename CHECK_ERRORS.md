# How to Check Errors on Android Tablet

If the cart is still not working after installing the new APK, follow these steps to see the error messages:

## Method 1: Connect USB Cable and View Logs

1. **Enable Developer Mode on Tablet:**
   - Go to Settings → About Tablet
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect to Computer:**
   - Connect tablet to computer with USB cable
   - Accept the "Allow USB Debugging" prompt on tablet

3. **View Logs in PowerShell:**
   ```powershell
   cd "C:\Users\zeuel\OneDrive\Desktop\Mugshot test\android"
   .\gradlew installDebug
   
   # Then view logs filtered for the app
   adb logcat | Select-String "chromium|Console|MugShots"
   ```

4. **Look for Error Messages:**
   - Click a product in the app
   - Watch the PowerShell output for console.log and console.error messages
   - Look for lines starting with "addToCartNew called" or "Error in"

## Method 2: Use Chrome Remote Debugging

1. **Enable USB Debugging** (same as above)

2. **Open Chrome on Computer:**
   - Open Google Chrome browser
   - Go to: `chrome://inspect/#devices`
   - Wait for your device to appear

3. **Inspect the App:**
   - Click "inspect" under your app
   - Go to the Console tab
   - Click a product and watch for errors

## What to Look For:

The new APK has detailed logging that will show:
- "addToCartNew called with productId: X"
- "Product found: ..."
- "Cart after adding: ..."
- "updateCart called"
- "Cart items built, updating summary..."

If you see errors like:
- "Product not found"
- "cartItems div not found"
- "Error in updateCart"

Please send me a screenshot or copy the error message!
