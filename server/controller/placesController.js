//controller for all Google API requests
//api guide https://developers.google.com/maps/documentation/javascript/places#place_search_requests
//keyword guide https://developers.google.com/places/supported_types
const axios = require('axios');
//1609 meters = 1 mile
//4827 meters = 3 miles

// debug ====================================================================
const debug = require('debug');
//debug.enable('placesController:*');
const log = debug('placesController:log');
const info = debug('placesController:info');
const error = debug('placesController:error');

const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=1609';
const radar = 'https://maps.googleapis.com/maps/api/place/radarsearch/json?';
const distance = 'https://maps.googleapis.com/maps/api/distancematrix/json?';

const key = process.env.GOOGLE_KEY || GOOGLE_KEY;

//how to use google places nearby
const getData = (place, lat, long) => {
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  return axios({
    method: 'get',
    url: `${url}&type=${place}&location=${lat},${long}&key=${key}`
  })
  .then(response => response.data)
  .catch(error => error(error));
};

//how to use google radar search -searching in a 10 mile area
const getRadarData = (place, lat, long) => {
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  return axios({
    method: 'get',
    url: `${radar}location=${lat},${long}&radius=50000&type=${place}&key=${key}` // FIXME: distance needs to be sent by client
  })
  .then(response =>response.data)
  .catch(error => error(error));
};

//google distance matrix 
const getDistanceData = (arrayOfPlaces, lat, long) => {
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  let destinationString = 'place_id:';
  for (var i = 0; i < arrayOfPlaces.length; i++) {
    destinationString += arrayOfPlaces[i];
    if (i !== arrayOfPlaces.length - 1 ) {
      destinationString += '|place_id:';
    }
  }
  return axios({
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${lat},${long}&destinations=${destinationString}&key=${key}&mode=transit&departure_time=now&transit_mode=bus|rail`
  })
  .then(response => response.data)
  .catch(error => error(error));
};

module.exports = {
  getData, getRadarData, getDistanceData
};
