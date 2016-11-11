require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const betterErrors = require('better-express-errors');
const bodyParser = require('body-parser');
const app = express();
const router = require('./server/api');

// Don't enable CORS in production.
if (/^(dev|test)$/.test(process.env.NODE_ENV)) {
  app.use(cors());
}
if (process.env.NODE_ENV !== 'test') {
  // Don't log requests during testing
  app.use(morgan('dev'));
}
app.use(bodyParser.json());
app.use('/api', router);

const port = process.env.PORT || 3000;

app.listen(port);
app.use(betterErrors(app));

console.log(`Server listening on port: ${port}`);
module.exports = app;