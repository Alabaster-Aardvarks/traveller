//for API keys - create a .env file for google API
require('dotenv').config();

//middleware
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const betterErrors = require('better-express-errors');
const bodyParser = require('body-parser');
const placesRouter = require('./router/placesRouter');
const navitiaRouter = require('./router/navitiaRouter');
const Redis = require('redisng');
const app = express();

// Don't enable CORS in production.
if (/^(dev|test)$/.test(process.env.NODE_ENV)) {
  app.use(cors());
}

if (process.env.NODE_ENV !== 'test') {
  // Don't log requests during testing
  app.use(morgan('dev'));
}

app.use(bodyParser.json());

// /api should be the home for all of our API endpoints
app.use('/places', placesRouter);
app.use('/navitia', navitiaRouter);
//404 all other routes
app.use('*', (req, res) => {
  res.status(404).send();
});

const port = process.env.PORT || 3000;

app.listen(port);
app.use(betterErrors(app));

console.log(`Server listening on port: ${port}`);
module.exports = app;