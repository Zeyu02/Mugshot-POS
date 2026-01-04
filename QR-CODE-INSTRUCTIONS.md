# 📱 Access Your POS on Tablet via QR Code

## Quick Setup (3 Steps)

### Step 1: Start the Server
Double-click **`start-server.bat`** in this folder

### Step 2: Get the QR Code
The server will show you a link like:
```
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://192.168.100.156:8080
```

Open that link in your browser to see the QR code.

### Step 3: Scan on Your Tablet
1. Open your tablet's camera or QR scanner
2. Scan the QR code
3. Your POS app will open on the tablet!

## ✨ Real-Time Updates

**Any changes you make on your PC will automatically appear on the tablet when you refresh!**

- Edit files on PC → Save
- On tablet: Pull down to refresh or press F5
- Changes appear instantly!

## 📌 Important Notes

✅ **PC and Tablet must be on the SAME Wi-Fi network**

✅ **Keep the server running** (don't close the command window)

✅ **Your IP:** 192.168.100.156 (shown when server starts)

✅ **Port:** 8080

## 🔗 Manual Access

If QR code doesn't work, type this in your tablet browser:
```
http://192.168.100.156:8080
```

## ⚠️ Firewall Issues?

If tablet can't connect, allow Python through Windows Firewall:
1. Windows Security → Firewall → Allow an app
2. Find "Python" → Check both Private and Public
3. Click OK

## 🛑 Stop the Server

Press **CTRL+C** in the command window

---

## Alternative: Use Node.js Server (Faster)

If you have Node.js installed:

1. Run: `npm install -g http-server`
2. Run: `http-server -p 8080`
3. Use same QR code method above
