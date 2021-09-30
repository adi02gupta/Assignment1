// Import the dependencies
const express = require('express');
const { check, validationResult } = require('express-validator');
const path = require('path');

// setup the db connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/foodstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// setup model for the order
const Order = mongoose.model('Order', {
    name: String,
    address: String,
    city: String,
    province: String,
    postCode: String,
    phoneNumber: String,
    email: String,
    qtyBurger: Number,
    unitPriceBurger: Number,
    qtyCoffee: Number,
    unitPriceCoffee: Number,
    total: Number,
    salesTax: Number,
    grandTotal: Number
});

var myApp = express();

myApp.use(express.urlencoded({ extended: false }));

// setup views and public folder
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public'));

// set templating engine
myApp.set('view engine', 'ejs');

var phoneRegex = /^[\d]{10}$/;
var positiveNumberRegex = /^[1-9][0-9]*$/;
const salesTaxPct = .05;
const burgerPrice = 3.5;
const coffeePrice = 8;
const minOrder = 10;
var totalPrice = 0;

// routes
myApp.get('/', function(req, res) {
    res.render('home');
});

function checkRegex(userInput, regex) {
    if (regex.test(userInput)) {
        return true;
    } else {
        return false;
    }
}

function burgerQtyValidation(value, { req }) {
    totalPrice = 0;
    var qtyBurger = parseInt(req.body.qtyBurger);
    if (isNaN(qtyBurger)) {
        return true;
    }
    if (!checkRegex(qtyBurger, positiveNumberRegex)) {
        throw new Error('Please enter valid quantity');
    }
    totalPrice += qtyBurger * burgerPrice;
    return true;
}

function coffeeQtyValidation(value, { req }) {
    var qtyCoffee = parseInt(req.body.qtyCoffee);
    if (isNaN(qtyCoffee)) {
        return true;
    }
    if (!checkRegex(qtyCoffee, positiveNumberRegex)) {
        throw new Error('Please enter valid quantity');
    }
    totalPrice += qtyCoffee * coffeePrice;
    return true;
}

function receiptValidation(value, { req }) {
    if (totalPrice < minOrder) {
        throw new Error('Please shop for a minimum $10 or more to generate receipt');
    }
    return true;
}

// Post form
myApp.post('/order', [
    check('fullName', "FullName is mandatory").notEmpty(),
    check('address', "Address is mandatory").notEmpty(),
    check('city', "City is mandatory").notEmpty(),
    check('province', "Province is mandatory").notEmpty(),
    check('postCode', "Post Code is mandatory").notEmpty(),
    check('email', "Email should be in format test@test.com").isEmail(),
    check('phoneNumber', "PhoneNumber should be in format 5198201234").matches(phoneRegex),
    check('qtyBurger').custom(burgerQtyValidation),
    check('qtyCoffee').custom(coffeeQtyValidation),
    check('minPurchase').custom(receiptValidation)
], function(req, res) {
    // check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('home', { er: errors.array() });
    } else {
        //fetch all the form fields
        var fullName = req.body.fullName;
        var address = req.body.address;
        var city = req.body.city;
        var province = req.body.province;
        var postCode = req.body.postCode;
        var phoneNumber = req.body.phoneNumber;
        var email = req.body.email;
        var qtyBurger = parseInt(req.body.qtyBurger);
        var qtyCoffee = parseInt(req.body.qtyCoffee);
        var salesTax = totalPrice * salesTaxPct;
        var grandTotal = totalPrice + salesTax;

        // create an object with the fetched data to send to the view
        var pageData = {
            name: fullName,
            address: address,
            city: city,
            province: province,
            postCode: postCode,
            phoneNumber: phoneNumber,
            email: email,
            qtyBurger: isNaN(qtyBurger) == true ? 0 : qtyBurger,
            unitPriceBurger: burgerPrice,
            qtyCoffee: isNaN(qtyCoffee) == true ? 0 : qtyCoffee,
            unitPriceCoffee: coffeePrice,
            total: totalPrice,
            salesTax: salesTax,
            grandTotal: grandTotal
        }

        //save the order object to the database.
        var newOrder = new Order(pageData);
        newOrder.save().then(function() {
            console.log("saved to DB");
        });

        // send the data to the view and render it
        res.render('bill', pageData);
    }
});

// Get all orders route
myApp.get('/allorders', function(req, res) {
    Order.find({}).exec(function(err, orders) {
        res.render('allorders', { orders: orders });
    });

});

myApp.listen(8080);

console.log('Everything executed fine');