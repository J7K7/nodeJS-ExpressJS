var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
require('dotenv').config();
var productRouter=require("./routes/product_routes/productRoutes")

var app = express();


require('./db/db');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/api/product',productRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // Log the error for debugging purposes
  console.error(err);

  // Send a JSON response with error details
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      stack: req.app.get('env') === 'development' ? err.stack : undefined
    }
  });
});

const PORT = process.env.APP_PORT || 5000;
console.log(process.env.APP_PORT)
app.listen(PORT, () => {
    console.log(`App is listening on http://localhost:${PORT}`);
})
