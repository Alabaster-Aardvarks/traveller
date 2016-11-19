// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const placesController = require('../controller/placesController');
const placesRouter = express.Router(); 


placesRouter.get('/museum', (req, res) => {
  lat = req.body.lat || 37.7825177;
  long = req.body.long || -122.4106772;
  let bundle = [];
  let result = {}; 
  let counter = 0;      
  placesController.getData('museum', lat, long)
  .then(data => {
    data.results.forEach((place) => bundle.push(place.place_id));  
    placesController.getDistanceData(bundle.splice(0, 24), 37.7825177, -122.4106772)
    .then(data => {
      data.destination_addresses.forEach(place => {
        result[place] = data.rows[0].elements[counter].duration.text;
        counter++;
      });
      res.status(200).json(result);
    })
    .catch(err => res.sendStatus(500));
  })
  .catch(err => res.sendStatus(500));
});


//DEV Testing 
// const testArray = ["ChIJCdSUgO-AhYARuk0zTH3lyvU","ChIJ82ZgT_GAhYAR4rJh5-mnw9I","ChIJnbTAq--AhYAReI41AUmRd1w","ChIJtfiHddh_j4ARAjjq3GVQZdI"];
//this places nearby search
placesRouter.get('/devTest1', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getData('museum', 37.7825177, -122.4106772)
  .then(data => {
    console.log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//places in a radar radius
placesRouter.get('/devTest2', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getRadarData('museum', 37.7825177, -122.4106772)
  .then(data => {
    console.log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//how to get to an array of places, maximum of 25 in array
placesRouter.get('/devTest3', (req, res) =>{
  // console.log('look for coordinates in here', req);
  placesController.getDistanceData(testArray, 37.7825177, -122.4106772)
  .then(data => {
    console.log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//404 all other routes
placesRouter.use('*', (req, res) => res.status(404).send());

module.exports = placesRouter;