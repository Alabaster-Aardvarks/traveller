// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const navitiaController = require('../controller/navitiaController');
const navitiaRouter = express.Router(); 
const redis = require('../service/redis');

// debug ====================================================================
const debug = require('debug');
//debug.enable('navitiaRouter:*');
const log = debug('navitiaRouter:log');
const info = debug('navitiaRouter:info');
const error = debug('navitiaRouter:error');

navitiaRouter.setKey = key => {
  navitiaController.setKey(key);
};

navitiaRouter.get('*', (req, res) => {
  redis.getRedisIso(req.query.url)
  .then(result => {
    if (result !== null) {
      log('found in redis');
      res.status(200).json(JSON.parse(result));
    } else {
      navitiaController.getIso(req.query.url, req.headers.authorization)
      .then(data => {
        log('saving to redis');
        redis.setRedisIso(req.query.url, data);
        res.status(200).json(data);
      }).catch(err => res.sendStatus(500).send({error: 'error parsing navitia or redis data'}));
    }
  }).catch(err => res.sendStatus(500).send({error: 'error reaching navitia server' }));   
});

module.exports = navitiaRouter;
