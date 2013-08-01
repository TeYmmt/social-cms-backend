var assert = require('assert');
var express = require('express');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var mongodb_url = process.env.MONGODB_URL || 'mongodb://localhost:27017/socialcmsdb_test';
var facebook_app_id = process.env.FACEBOOK_APP_ID;
var facebook_app_secret = process.env.FACEBOOK_APP_SECRET;
var facebook_login_id = process.env.FACEBOOK_LOGIN_ID;
var facebook_login_pass = process.env.FACEBOOK_LOGIN_PASS;
var test_ready = facebook_app_id && facebook_app_secret && facebook_login_id && facebook_login_pass && true;
var SCB = require('../lib/index.js');
var port = process.env.PORT || 27891;
var cheerio = require('cheerio');

describe('initialize database', function() {
  it('should clear the test database', function(done) {
    MongoClient.connect(mongodb_url, function(err, db) {
      if (err) return done(err);
      db.dropDatabase(done);
    });
  });
});

var server;

describe('initialize server', function() {
  it('should start the server', function(done) {
    if (!test_ready) return done();
    var app = express();
    app.use(SCB.middleware({
      mongodb_url: mongodb_url,
      passport_strategy: 'facebook',
      facebook_app_id: facebook_app_id,
      facebook_app_secret: facebook_app_secret
    }));
    server = app.listen(port);
    //wait a while for the mongodb connection to be ready
    setTimeout(done, 300);
  });
});


describe('authorization with facebook', function() {
  it('should login in with a facebook account', function(done) {
    if (!test_ready) return done();
    request.get('http://localhost:' + port + '/login/facebook',

    function(error, response) {
      var dom = cheerio.load(response.body);
      //request.post('https://www.facebook.com/login.php', {
      request.post('https://www.facebook.com/login.php?login_attempt=1', {
        lsd: dom('input[name=lsd]').val(),
        email: facebook_login_id,
        pass: facebook_login_pass
      }, function(error, response) {
        assert.equal(response.statusCode, 302);
        assert.ok(response.socket.authorized);

        //TODO check if it redirected to callback page or not
        done();
      });
    });
  });
});
