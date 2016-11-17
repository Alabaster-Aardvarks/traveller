const request = require('supertest');
const express = require('express');
const expect = require('chai').expect;
const app = require('../server.js');

describe('', function() {

  describe('GET /places/museum', () => {

    //activate this test when we are accepting lat and long, set it for antartica or something  
    xit('should respond with a 204 when no results are found', (done) =>{
      request(app)
        .get('/places/museum')
        .expect(204, done);
    });

    it('should respond to a proper request with json', (done) => {
      request(app)
        .get('/places/museum')
        .expect(200, done);
    });
  });

});