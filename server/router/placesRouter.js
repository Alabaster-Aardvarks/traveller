// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const placesController = require('../controller/placesController');
const placesRouter = express.Router(); 

placesRouter.get('/museum', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getData('museum', 37.7825177, -122.4106772)
  .then(data => res.status(200).json(data))
  .catch(err => res.sendStatus(500));
});

placesRouter.get('/park', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getData('park', 37.7825177, -122.4106772)
  .then(data => res.status(200).json(data))
  .catch(err => res.sendStatus(500));
});

placesRouter.get('/bank', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getData('bank', 37.7825177, -122.4106772)
  .then(data => res.status(200).json(data))
  .catch(err => res.sendStatus(500));
});

//404 all other routes
placesRouter.use('*', (req, res) => res.status(404).send());

module.exports = placesRouter;