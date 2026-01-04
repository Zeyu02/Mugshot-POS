// Open browser console and run this to fix category names
let categories = JSON.parse(localStorage.getItem('mugshotCategories') || '[]');
let products = JSON.parse(localStorage.getItem('mugshotProducts') || '[]');

// Standardize category names
const categoryMapping = {
    "Flavored tea": "Flavored Tea",
    "FreshFruit Shake": "Fresh Fruit Shake",
    "Fruity Slush": "Fruit Slush",
    "Liter": "Liter",
    "Solo Meals": "Solo Meals",
    "SOLO MEALS": "Solo Meals",
    "MilkTea Series": "MilkTea Series",
    "Mugshots Pasta": "Mugshots Pasta",
    "Mugshot Rice Bowl": "Mugshot Rice Bowl",
    "Mugshot Silog": "Mugshot Silog",
    "Ala Carte": "Ala Carte",
    "Hot Coffee": "Hot Coffee",
    "Iced Coffee": "Iced Coffee",
    "Non-Coffee": "Non-Coffee",
    "Smoothie": "Smoothie",
    "Fruity Coolers": "Fruity Coolers",
    "Burger": "Burger",
    "Snacks": "Snacks",
    "Salads": "Salads",
    "Pizza": "Pizza",
    "Fruit Tea": "Fruit Tea",
    "Fruit Slush": "Fruit Slush"
};

// Fix products
products.forEach(p => {
    if (categoryMapping[p.category]) {
        p.category = categoryMapping[p.category];
    }
});

// Fix categories
categories.forEach(c => {
    if (categoryMapping[c.name]) {
        c.name = categoryMapping[c.name];
    }
});

localStorage.setItem('mugshotProducts', JSON.stringify(products));
localStorage.setItem('mugshotCategories', JSON.stringify(categories));

console.log("Categories fixed! Reload the page.");
