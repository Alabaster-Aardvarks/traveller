// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const navitiaController = require('../controller/navitiaController');
const navitiaRouter = express.Router(); 
const redis = require('../service/redis');

navitiaRouter.get('*', (req, res) => {
  redis.getRedisIso(req.query.url)
  .then(result => {
    if (result !== null) {
      console.log('found in redis');
      res.status(200).json(JSON.parse(result));
    } else {
      navitiaController.getIso(req.query.url, req.headers.authorization)
      .then(data => {
        console.log('saving to redis');
        redis.setRedisIso(req.query.url, data);
        res.status(200).json(data);
      }).catch(err => res.sendStatus(500));
    }
  }).catch(err =>res.sendStatus(500));
   
});

module.exports = navitiaRouter;