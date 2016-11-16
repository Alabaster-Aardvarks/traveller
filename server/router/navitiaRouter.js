// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const navitiaController = require('../controller/navitiaController');
const navitiaRouter = express.Router(); 

navitiaRouter.get('*', (req, res) => {
  navitiaController.getIso(req.query.url, req.headers.authorization)
  .then(data => res.status(200).json(data))
  .catch(err => res.sendStatus(500));
});

module.exports = navitiaRouter;