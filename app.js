var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
const userRoutes = require('./routes/user_routes/userRoutes')
const loginRoute =  require('./routes/user_routes/loginRoute')
const adminRoutes =  require('./routes/user_routes/adminRoutes')
var productRouter=require("./routes/product_routes/productRoutes")
const bookingRoutes = require('./routes/booking_routes/booking')
const fs = require('fs');
const logRequest = require('./middlewares/logRequest')
const cors = require('cors');

// const formData =require("express-form-data");
var app = express();

require('./db/db');

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
// app.use(logRequest);  //commented this because of /image route giving error because of response

// const log = (req, res, next) => {
//   console.log("Request Body:", req.body);
//   next();
// }


app.use(express.urlencoded({ extended: true }));
// app.use(log);
app.use(express.static(path.join(__dirname, 'public')));
// console.log(path.join(__dirname, 'public', 'images','product'));
app.use('/images/', express.static(path.join(__dirname, 'public', 'images','product')));
app.use('/userImages/', express.static(path.join(__dirname, 'public', 'images','user')));
app.use('/', loginRoute)
app.use('/user', userRoutes)
app.use('/admin', adminRoutes)
app.use('/product',productRouter);
app.use('/booking' , bookingRoutes)


// console.log(body);
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
    Status:false,
    msg:"Invalid URL OR Internal Server Error",
    error: {
      message: err.message || 'Internal Server Error',
      stack: req.app.get('env') === 'development' ? err.stack : undefined
    }
  });
});


// Define a function to handle unhandled errors
function logUnhandledError(err, req) {
  // Get current timestamp in Indian time zone
  const now = new Date();
  const utcOffset = 5.5 * 60 * 60 * 1000; // Convert 5 hours 30 minutes to milliseconds
  const indianTime = new Date(now.getTime() + utcOffset);
  const timestamp = indianTime.toISOString();
    const errorDetails = {
    
        timestamp: timestamp,
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            params: req.params, // Assuming you're using Express.js
            // Add any other relevant request data here
        },
        error: {
            message: err.message,
            errorQuery:err.sql,
            stack: err.stack,
        },
    };

    // Log error details to a file
    const logFilePath = path.join(__dirname, 'error.log');
    fs.appendFileSync(logFilePath, JSON.stringify(errorDetails) + '\n');

    // Exit the process
    process.exit(1);
}

// Set up uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logUnhandledError(err, {});
});

// Set up unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.log(reason.sql)
    // Log the reason (error) and stack trace
    logUnhandledError(reason, {});
});


const PORT = process.env.APP_PORT || 5000;
console.log(process.env.APP_PORT)
app.listen(PORT, () => {
    console.log(`App is listening on http://localhost:${PORT}`);
})