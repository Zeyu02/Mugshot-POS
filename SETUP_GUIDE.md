# MugShots Cafe POS - Quick Setup Guide

## 📋 What You Need
- A tablet (iPad or Android tablet recommended)
- Web browser (Chrome, Safari, Firefox, or Edge)
- Your MugShots Cafe logo image

## 🚀 Quick Start (3 Easy Steps)

### Step 1: Add Your Logo
1. Save your MugShots Cafe logo as `logo.png` in this folder
2. Recommended size: 500x500 pixels
3. PNG format with transparent background works best

### Step 2: Open the POS System
1. Double-click `index.html` to open in your browser
2. The system will load with all your menu items already added!

### Step 3: Add to Home Screen (Optional but Recommended)
This makes it work like a real app:

**On iPad/iPhone:**
1. Open `index.html` in Safari
2. Tap the Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Now you have a POS app icon on your home screen!

**On Android Tablet:**
1. Open `index.html` in Chrome
2. Tap the Menu button (three dots)
3. Tap "Add to Home Screen"
4. Tap "Add"
5. Now you have a POS app icon!

## ✅ Testing the System

### Test a Sale:
1. Click on any coffee item (e.g., "Americano")
2. It will appear in the cart on the right
3. Click "Complete Order"
4. You'll see a receipt!
5. Click "New Order" to start fresh

### Add a New Product:
1. Click "📦 Products" at the top
2. Click "+ Add New Product"
3. Upload an image of the item
4. Enter name, category, and price
5. Click "Save Product"

### View Sales:
1. Click "📊 Dashboard" to see today's sales
2. Click "💰 Sales" to see transaction history

## 📱 Tablet Setup Tips

### Best Settings:
- Use **Landscape orientation** for best layout
- Set **brightness to 80%** for easy viewing
- Enable **Do Not Disturb** during business hours
- Keep tablet **plugged in** at the counter

### Browser Tips:
- Use **Full Screen mode** (F11 on most browsers)
- **Bookmark** the page for quick access
- Clear cache if you need to reset data

## 🎨 Customizing Your POS

### Change Colors:
Open `styles.css` and find these lines near the top:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
Replace the color codes with your brand colors!

### Add Tax (if needed):
Open `script.js` and find:
```javascript
const tax = 0; // No tax
```
Change to:
```javascript
const tax = subtotal * 0.12; // 12% tax
```

### Add Your Store Info to Receipts:
Open `script.js` and search for "MUGSHOTS CAFE" in the receipt section to add your address, contact info, etc.

## 💾 Data & Backup

### Where is data stored?
- All products and sales are saved in your browser's LocalStorage
- Data stays even when you close the browser
- Each browser has its own data (Chrome vs Safari)

### Backup Your Data:
1. Open Browser Developer Tools (F12)
2. Go to "Console" tab
3. Type: `copy(localStorage.getItem('mugshotSales'))`
4. Paste into a text file and save

### Reset Everything:
If you need to start fresh:
1. Open Browser Developer Tools (F12)
2. Go to "Console" tab
3. Type: `localStorage.clear()`
4. Refresh the page

## 🍽️ Your Menu is Ready!

The system comes pre-loaded with ALL your menu items:
- ✅ 101 products already added
- ✅ All categories set up
- ✅ Prices from your menu images
- ✅ Ready to use immediately!

You can:
- Add product images as you go
- Edit any prices if they change
- Add seasonal items
- Remove discontinued items

## 📊 Understanding the Dashboard

**Today's Sales**: Total revenue from today's orders  
**This Week**: Sales from Sunday to today  
**This Month**: Sales from the 1st to today  
**Top Selling Items**: Your most popular products today  
**Recent Transactions**: Last 10 orders

## 🛠️ Troubleshooting

**Q: Products disappeared!**  
A: You might have switched browsers. Use the same browser always.

**Q: Images not showing?**  
A: Check that your image files are in the same folder, or use the built-in upload feature.

**Q: Can't add new products?**  
A: Make sure you filled in all required fields (name, category, price).

**Q: Need to change a price?**  
A: Go to Products section, click Edit on the item, change price, and Save.

**Q: Want to delete old sales?**  
A: Currently all sales are kept. You can clear all data using browser tools if needed.

## 📞 Daily Use Checklist

**Morning Setup:**
1. ✅ Open POS system
2. ✅ Check dashboard shows correct date
3. ✅ Verify all products are showing
4. ✅ Do a test transaction

**During Service:**
1. ✅ Add items to cart
2. ✅ Verify total before checkout
3. ✅ Complete order
4. ✅ Show/print receipt

**End of Day:**
1. ✅ Check Dashboard for today's total
2. ✅ Review top-selling items
3. ✅ Count cash and match with sales total
4. ✅ Note any out-of-stock items

## 🎯 Pro Tips

1. **Speed**: Memorize where popular items are located
2. **Accuracy**: Always verify the order with customer before checkout
3. **Images**: Take nice photos of your actual products and upload them
4. **Organization**: Keep categories organized for faster service
5. **Training**: Let new staff practice with fake orders first

## 🆘 Need Help?

If something's not working:
1. Refresh the page (F5)
2. Clear browser cache
3. Try a different browser
4. Restart the tablet
5. Check the README.md file for more details

## 🎉 You're Ready!

Your MugShots Cafe POS system is ready to use. All 101 menu items are loaded, and you can start selling immediately!

**Remember:**
- Save your logo as `logo.png`
- Add product images over time
- Check the dashboard daily
- Keep the tablet charged

**Enjoy your new POS system! ☕**

---

*For detailed information, see README.md*
