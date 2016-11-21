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
    if (!data.results.length) {
      console.error('No google places data found for banks.');
      res.sendStatus(500);
      return;
    }
    log(data);
    data.results.forEach(place => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 25); 
    log(shortList);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      if (data.error_message) {
        console.error(`Not able to get distance data for banks [${data.error_message}]`);
        res.sendStatus(500);
        return;
      }
      if (!data.rows || !data.rows.length) {
        console.error('Not able to get distance data for banks (reached quota?).');
        res.sendStatus(500);
        return;
      }
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
    })
    .catch(err => {
      console.error(`Not able to get distance data for banks [${err}]`);
      res.sendStatus(500);
    });
  })
  .catch(err => {
    console.error(err);
    res.sendStatus(500);
  });
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
    if (!data.results.length) {
      console.error('No google places data found for health.');
      res.sendStatus(500);
      return;
    }
    log(data);
    data.results.forEach(place => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 25);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      if (data.error_message) {
        console.error(`Distance data API request returned an error for health [${data.error_message}]`);
        res.sendStatus(500);
        return;
      }
      if (!data.rows || !data.rows.length) {
        console.error('Not able to get distance data for health (reached quota?).');
        res.sendStatus(500);
        return;
      }
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
    })
    .catch(err => {
      console.error(`Not able to get distance data for health [${err}]`);
      res.sendStatus(500);
    });
  })
  .catch(err => {
    console.error(err);
    res.sendStatus(500);
  });
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
    if (!data.results.length) {
      console.error('No google places data found for transit.');
      res.sendStatus(500);
      return;
    }
    log(data);
    data.results.forEach(place => {
      idList.push(place.place_id);
      coordinates.push(place.geometry.location);
    });
    //can only use 25 destinations at a time for Google distance matrix
    let shortList = idList.splice(0, 25); 
    log(shortList);
    placesController.getDistanceData(shortList, lat, long)
    .then(data => {
      if (data.error_message) {
        console.error(`Not able to get distance data for transit [${data.error_message}]`);
        res.sendStatus(500);
        return;
      }
      if (!data.rows || !data.rows.length) {
        console.error('Not able to get distance data for transit (reached quota?).');
        res.sendStatus(500);
        return;
      }
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
    })
    .catch(err => {
      console.error(`Not able to get distance data for transit [${err}]`);
      res.sendStatus(500);
    });
  })
  .catch(err => {
    console.error(err);
    res.sendStatus(500);
  });
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
