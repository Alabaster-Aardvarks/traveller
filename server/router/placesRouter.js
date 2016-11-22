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

//actual working routes

placesRouter.get('/transit', (req, res) => {
  placesController.getGoogleData(req, res, 'transit_station');
});

placesRouter.get('/bank', (req, res) => {
  placesController.getGoogleData(req, res, 'bank');
});

placesRouter.get('/health', (req, res) => {
  placesController.getGoogleData(req, res, 'health');
});

//404 all other routes
placesRouter.use('*', (req, res) => res.status(404).send({error: 'places/endpoint not found'}));

module.exports = placesRouter;
