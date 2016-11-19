// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const placesController = require('../controller/placesController');
const placesRouter = express.Router(); 


placesRouter.get('/bank', (req, res) => {
  lat = req.query.lat || 37.7825177;
  long = req.query.long || -122.4106772;
  //take results of nearby search and get their place ides
  let idList = [];
  //need to get the coordinates of nearby search results as well
  let coordinates = [];
  //holder for response object
  let result = {}; 
  //to iterate over results
  let counter = 0;      
  placesController.getRadarData('bank', lat, long)
  .then(data => {
    // console.log(data);
    data.results.forEach((place) => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 24);  
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      console.log(data.rows[0].distance);
      data.destination_addresses.forEach(place => {
        result[place] = {
          'time': data.rows[0].elements[counter].duration.text,
          'location': coordinates[counter],
          'distance': data.rows[0].elements[counter].distance.text,
          'metric distance': data.rows[0].elements[counter].distance.value 
        };
        counter++;
      });
      res.status(200).json(result);
    });
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