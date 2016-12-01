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
  .catch(error => console.error(error));
};

//how to use google radar search -searching in a 50 mile area
const getRadarData = (place, lat, long, radius) => {
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  radius = radius || 50000;
  return axios({
    method: 'get',
    url: `${radar}location=${lat},${long}&radius=${radius}&type=${place}&key=${key}` // FIXME: distance needs to be sent by client
  })
  .then(response => {
    //log('getRadarData response', response.data);
    return response.data;
  })
  .catch(error => console.error(error));
};

//converting client mode of transportation query to google api mode terms
const modeKeys = {
  car: 'driving',
  bike: 'cycling',
  walk: 'walking',
  transit: 'transit'
};

const getDetailData = (req, res, placeID) =>{
  let results = [];
  let placeInfo = {};
  return axios({
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeID}&key=${key}`
  })
  .then(response => {
    placeInfo = {
      name: response.data.result.name,
      url: response.data.result.url,
    };
    log('getDistanceData response', response.data);
    return res.status(200).json(placeInfo);
  })
  .catch(error => console.error(error));
};
////experimental code here
const getDetailDataTwo = (placeID) =>{
  let results = [];
  let placeInfo = {};
  return axios({
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeID}&key=${key}`
  })
  .then(response => {
    placeInfo = {
      name: response.data.result.name,
      url: response.data.result.url,
    };
    log('getDistanceData response', response.data);
    return placeInfo;
  })
  .catch(error => console.error(error));
};
////end of experiemental code
//google distance matrix 
const getDistanceData = (arrayOfPlaces, lat, long, mode, start, end) => {
  
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  mode = modeKeys[mode] || 'transit';
  let destinationString = 'place_id:';
  for (let i = 0; i < arrayOfPlaces.length; i++) {
    destinationString += arrayOfPlaces[i].id;
    if (i !== arrayOfPlaces.length - 1 ) {
      destinationString += '|place_id:';
    }
  }
  log('getDistanceData destinationString', destinationString);

  return axios({
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${lat},${long}&destinations=${destinationString}&key=${key}&mode=${mode}&departure_time=now`
  })
  .then(response => {
    log('getDistanceData response', response.data);
    response.data.start = start;
    response.data.end = end;
    return response.data;
  })
  .catch(error => console.error(error));
};

const getGoogleData = (req, res, keyword) => {
  lat = req.query.lat || 37.7825177;
  long = req.query.long || -122.4106772;
  radius = req.query.radius || 50000;
  mode = req.query.mode || 'transit';
  date = req.query.date || 'now';
  size = req.query.size || 200;   
  let result = [];
  let counter = 0;
  //grab radar ids     
  getRadarData(keyword, lat, long, radius)
  .then(data => {
    let radarResults = [];
    if (!data.results.length) {
      console.error(`No google places data found for ${keyword}`);
      res.sendStatus(500).send({error: 'no data found by Google'});
      return;
    }
    data.results.forEach(place => {
      radarResults.push({
        id: place.place_id,
        coordinates: place.geometry.location
      });
    }); 
    radarResults = radarResults.splice(0, size);
    return radarResults;
  })
  .then(results => {
    Promise.all(results).then(values => {
      let currentPosition = 0;
      let currentEnd = 24;
      while (currentPosition < values.length) {
        console.log('looping, currenty on', currentPosition, currentEnd);
        let test = values.slice(currentPosition, currentEnd);
         getDistanceData(test, lat, long, mode, currentPosition, currentEnd)
        .then(data => {
          console.log(`parse this###${data.start}-${data.end}###########`, data);
        })
        .catch(error => console.error(error));
        currentPosition = currentEnd;
        currentEnd = (currentEnd + 25 > values.length) ? values.length : currentEnd + 25;
      }
    })
    .then(() => res.sendStatus(200).json(result))
    .catch(err => console.error(error));
  })
  .catch(err => console.error(error));
};

module.exports = {
  getData, getRadarData, getDistanceData, getGoogleData, getDetailData
};
    
   