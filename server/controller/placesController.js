//controller for all Google API requests
//api guide https://developers.google.com/maps/documentation/javascript/places#place_search_requests
//keyword guide https://developers.google.com/places/supported_types

const request = require('request');
//1609 meters = 1 mile
const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=1609';

const getData = (place, lat, long, callback) => {
  request(`${url}&type=${place}&location=${lat},${long}&key=${process.env.GOOGLEKEY}`, (err, res, body) => {
    if (err) {
      //no places found by google
      return callback(err, null);
    }
    //google has responded
    console.log(body);
    const data = JSON.parse(body);
    return callback(err, data.results);
  });
};

module.exports = {
  getData
};