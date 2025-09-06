const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
// const deepSanitize = require('./utils/deepSanitize');
const { deepSanitize, DEFAULT_POLICY } = require('./utils/deepSanitize');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

app.set('view engine', 'pug');
// we use path.join to ensure the correct path is set regardless of the operating system
// example: Windows uses backslashes (\) while Unix-based systems use forward slashes (/)
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
// To be able to see the query parameters in req.query in a middleware
// because in Express 5, req.query is read-only by default
app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    ...Object.getOwnPropertyDescriptor(req, 'query'),
    value: req.query,
    writable: true,
  });
  next();
});

// Set security HTTP headers
app.use(helmet()); // set security HTTP headers

// -------------------------------------------------------------

// Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// -------------------------------------------------------------

// Limit requests from same API
const limiter = rateLimit({
  max: 150, // max number of requests from same IP
  windowMs: 60 * 60 * 1000, // in one hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter); // apply to all requests that start with /api

// Limit login attempts to prevent brute-force attacks
// app.use('/api/login', rateLimit({
//   max: 5, // فقط 5 محاولات في الساعة
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many login attempts. Try again after an hour!',
// }));

// -------------------------------------------------------------

// Middleware to parse incoming JSON request bodies
// Allows Express to automatically parse JSON data in request bodies

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb', // limit body to 10 kilobytes
  }),
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // noSQL injection

// XSS sanitize (body/query/params)
const fieldPolicies = {
  // مثال لو لاحقًا تبغى تسمح بتاجات في حقل معيّن:
  // 'content': { allowedTags: ['b','i','a'], allowedAttributes: { a: ['href','target','rel'] } }
};
app.use((req, _res, next) => {
  if (req.body)
    req.body = deepSanitize(req.body, {
      fieldPolicies,
      defaultPolicy: DEFAULT_POLICY,
    });
  if (req.query)
    req.query = deepSanitize(req.query, {
      fieldPolicies,
      defaultPolicy: DEFAULT_POLICY,
    });
  if (req.params)
    req.params = deepSanitize(req.params, {
      fieldPolicies,
      defaultPolicy: DEFAULT_POLICY,
    });
  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      // 'duration',
      // 'ratingsQuantity',
      // 'ratingsAverage',
      // 'maxGroupSize',
      // 'difficulty',
      // 'price'
    ],
  }),
);

// Middleware for all requests
// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.get('/', (req, res) => {
  res.status(200).render('base');
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} not found`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

//? this is for generating random string
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// https://documenter.getpostman.com/view/10984381/2sB3Hkqfvp#c24d1899-11e3-40c4-bf9f-aa117bb316e2
