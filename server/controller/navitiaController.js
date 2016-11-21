//controller for all Navitia API requests
const axios = require('axios');

// debug ====================================================================
const debug = require('debug');
//debug.enable('navitiaController:*');
const log = debug('navitiaController:log');
const info = debug('navitiaController:info');
const error = debug('navitiaController:error');

const getIso = (url, auth) => {
  log('navitia', url);
  return axios({
    method: 'get',
    url: url,
    headers: { Authorization: auth }
  })
  .then(response => {
    log('navitia response', response.data);
    return response.data;
  })
  .catch(error => error(error));
};

module.exports = {
  getIso
};
