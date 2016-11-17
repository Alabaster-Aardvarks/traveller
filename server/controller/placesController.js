//controller for all Google API requests
//api guide https://developers.google.com/maps/documentation/javascript/places#place_search_requests
//keyword guide https://developers.google.com/places/supported_types
const axios = require('axios');
//1609 meters = 1 mile
const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=1609';

const getData = (place, lat, long) => {
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  return axios({
    method: 'get',
    // url: `${url}&type=${place}&location=${lat},${long}&key=${process.env.GOOGLE_KEY}`
    url: `${url}&type=${place}&location=${lat},${long}&key=${process.env.GOOGLE_KEY}`
  })
  .then(response => response.data)
  .catch(error => console.error(error));
};

module.exports = {
  getData
};