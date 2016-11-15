// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const base64 = require('base-64');
const qs = require('qs');
const navitiaController = require('../controller/navitiaController');
const navitiaRouter = express.Router(); 

navitiaRouter.get('*', (req, res) => {
  const uri = base64.decode(req.query.url);
  uri = qs.parse(uri);
  console.log(uri);
  navitiaController.getIso(uri, (err, data) =>{
    if (err) {
      //navitia contact error
      res.send(err).end();
    } else {
      if (data === null) {
        res.sendStatus(204).end();
      } else {
        res.status(200).json(data);
      }
    }
  });
});

module.exports = navitiaRouter;