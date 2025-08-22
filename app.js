const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Middleware to parse incoming JSON request bodies
// Allows Express to automatically parse JSON data in request bodies
app.use(express.json());

app.use(express.static(`${__dirname}/public`));

// Middleware for all requests
// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/tours', tourRouter);

app.use('/api/v1/users', userRouter);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} not found`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

//? this is for generating random string
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
