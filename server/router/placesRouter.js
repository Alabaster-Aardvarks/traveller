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

placesRouter.get('/bank', (req, res) => {
  lat = req.query.lat || 37.7825177;
  long = req.query.long || -122.4106772;
  //take results of nearby search and get their place ides
  let idList = [];
  //in case we end up with another hundred
  let idList2 = [];
  let coordinates = [];
  //holder for response object
  let result = []; 
  //to iterate over results
  let counter = 0;      
  placesController.getRadarData('bank', lat, long)
  .then(data => {
    //log(data.results.length);
    data.results.forEach((place) => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 99); 
    //log(shortList);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      console.log(data.rows[0].distance);
      data.destination_addresses.forEach(place => {
        result.push({
          'name': place, 
          'time': data.rows[0].elements[counter].duration.text,
          'location': coordinates[counter],
          'distance': data.rows[0].elements[counter].distance.text,
          'metric distance': data.rows[0].elements[counter].distance.value 
        });
        counter++;
      });
      //log(result);
      res.status(200).json(result);
    });
  })
  .catch(err => res.sendStatus(500));
});

placesRouter.get('/health', (req, res) => {
  lat = req.query.lat || 37.7825177;
  long = req.query.long || -122.4106772;
  //take results of nearby search and get their place ides
  let idList = [];
  //in case we end up with another hundred
  let idList2 = [];
  let coordinates = [];
  //holder for response object
  let result = []; 
  //to iterate over results
  let counter = 0;      
  placesController.getRadarData('health', lat, long)
  .then(data => {
    // console.log(data);
    data.results.forEach((place) => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 99); 
    console.log(idList.length);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      console.log(data.rows[0].distance);
      data.destination_addresses.forEach(place => {
        result.push({
          'name': place, 
          'time': data.rows[0].elements[counter].duration.text,
          'location': coordinates[counter],
          'distance': data.rows[0].elements[counter].distance.text,
          'metric distance': data.rows[0].elements[counter].distance.value 
        });
        counter++;
      });
      res.status(200).json(result);
    });
  })
  .catch(err => res.sendStatus(500));
});

placesRouter.get('/transit', (req, res) => {
  lat = req.query.lat || 37.7825177;
  long = req.query.long || -122.4106772;
  //take results of nearby search and get their place ides
  let idList = [];
  //in case we end up with another hundred
  let idList2 = [];
  let coordinates = [];
  //holder for response object
  let result = []; 
  //to iterate over results
  let counter = 0;      
  placesController.getRadarData('transit_station', lat, long)
  .then(data => {
    // console.log(data);
    data.results.forEach((place) => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 99); 
    console.log(idList.length);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      console.log(data.rows[0].distance);
      data.destination_addresses.forEach(place => {
        result.push({
          'name': place, 
          'time': data.rows[0].elements[counter].duration.text,
          'location': coordinates[counter],
          'distance': data.rows[0].elements[counter].distance.text,
          'metric distance': data.rows[0].elements[counter].distance.value 
        });
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
  //log('look for coordinates in here', req);
  placesController.getData('museum', 37.7825177, -122.4106772)
  .then(data => {
    //log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//places in a radar radius
placesRouter.get('/devTest2', (req, res) =>{
  //log('look for coordinates in here', req);
  placesController.getRadarData('museum', 37.7825177, -122.4106772)
  .then(data => {
    //log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//how to get to an array of places, maximum of 25 in array
placesRouter.get('/devTest3', (req, res) =>{
  //log('look for coordinates in here', req);
  placesController.getDistanceData(testArray, 37.7825177, -122.4106772)
  .then(data => {
    //log(data);
    res.status(200).json(data);
  })
  .catch(err => res.sendStatus(500));
});

//404 all other routes
placesRouter.use('*', (req, res) => res.status(404).send());

module.exports = placesRouter;
