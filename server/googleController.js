//controller for all Google API requests

const request = require('request');

const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=500';

const getMuseumData = (lat, long, callback) => {
  request(`${url}&type=museum&location=${lat},${long}&key=${process.env.GOOGLEKEY}`, (err, res, body) => {
    if (err) {
      //no places found by google
      return callback(err, null);
    }
    //google has responded
    const data = JSON.parse(body);
    return callback(err, data.results);
  });
};

module.exports = {
  getMuseumData
};