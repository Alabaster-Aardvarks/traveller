//controller for all Google API requests
//api guide https://developers.google.com/maps/documentation/javascript/places#place_search_requests
//keyword guide https://developers.google.com/places/supported_types
const axios = require('axios');
//1609 meters = 1 mile
//4827 meters = 3 miles

//radar search # step 1
const radar = "https://maps.googleapis.com/maps/api/place/radarsearch/json?"
const distance = "https://maps.googleapis.com/maps/api/distancematrix/json?units=metric"

const key = process.env.GOOGLE_KEY || GOOGLE_KEY;

const getRadarData = (typeOfPlace, userLat, userLong) => {
  userLat = userLat || 37.7825177;
  userLong = userlong || -122.4106772;
  return axios({
    method: 'get',
    url: `${radar}location=${userLat,userLong}&radius=4827&type=${typeOfPlace}&key=${key}`
  .then(response => response.data)
  .catch(error => console.error(error));
};

const getDistanceData = (arrayofPlaces, userLat,userLong) => {
  userLat = userLat || 37.7825177;
  userLong = userLong || -122.4106772;
  //place_id:ChIJ53I1Yn2AhYAR_Vl1vNygfMg|
  destinationString = 
  return axios({
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${userLat,userlong}&destinations=${destinationString}&key=${key}mode=transit&departure_time=now&transit_mode=bus|rail`
  .then(response => response.data)
  .catch(error => console.error(error));
};

module.exports = {
  getData
};