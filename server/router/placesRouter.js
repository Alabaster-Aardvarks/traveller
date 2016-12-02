// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const placesController = require('../controller/placesController');
const placesRouter = express.Router(); 

// debug ====================================================================
const debug = require('debug');
//debug.enable('placesRouter:*');
const log = debug('placesRouter:log');
const info = debug('placesRouter:info');
const error = debug('placesRouter:error');

placesRouter.setKey = key => {
  placesController.setKey(key);
};

placesRouter.get('/:places', (req, res) => {
  placesController.getGoogleData(req, res, `${req.params.places}`);
});

module.exports = placesRouter;