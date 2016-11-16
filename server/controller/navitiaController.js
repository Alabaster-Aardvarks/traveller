//controller for all Navitia API requests
const axios = require('axios');

const getIso = (url, auth) => {
  return axios({
    method: 'get',
    url: url,
    headers: { Authorization: auth }
  })
  .then(response => response.data)
  .catch(error => console.error(error));
};

module.exports = {
  getIso
};