// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const hereController = require('../controller/hereController');
const hereRouter = express.Router(); 
const redis = require('../service/redis');

// debug ====================================================================
const debug = require('debug');
//debug.enable('hereRouter:*');
const log = debug('hereRouter:log');
const info = debug('hereRouter:info');
const error = debug('hereRouter:error');

hereRouter.setKey = (code, id) => {
  hereController.setKey(code, id);
};

hereRouter.get('*', (req, res) => {
  redis.getRedisIso(req.query.url)
  .then(result => {
    if (result !== null) {
      log('found in redis');
      res.status(200).json(JSON.parse(result));
    } else {
      hereController.getIso(req.query.url)
      .then(data => {
        log('saving to redis');
        redis.setRedisIso(req.query.url, data);
        res.status(200).json(data);
      }).catch(err => res.sendStatus(500).send({error: 'error parsing here or redis data'}));
    }
  }).catch(err => res.sendStatus(500).send({error: 'error reaching here server' }));   
});

module.exports = hereRouter;
