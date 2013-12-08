var assert = require('assert');
var crypto = require('crypto');
var express = require('express');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var mongodb_url = process.env.MONGODB_URL || 'mongodb://localhost:27017/socialcmsdb_test';
var SCB = require('../lib/index.js');
var port = process.env.PORT || 27891;

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
    var app = express();
    app.use(SCB.middleware({
      mongodb_url: mongodb_url,
      passport_strategy: 'digest',
      auth_digest: {
        realm: 'digest_test_realm'
      }
    }));
    server = app.listen(port);
    //wait a while for the mongodb connection to be ready
    setTimeout(done, 300);
  });
});

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

var user001_id;

describe('adduser test for digest', function() {
  it('should fail to create user without passhash', function(done) {
    request.post('http://localhost:' + port + '/adduser/digest', {
      form: {
        username: 'user001'
      }
    }, function(error, response) {
      assert.equal(response.statusCode, 500);
      done();
    });
  });

  it('should create a user', function(done) {
    request.post('http://localhost:' + port + '/adduser/digest', {
      json: true,
      form: {
        username: 'user001',
        passhash: md5('user001:digest_test_realm:pass001')
      }
    }, function(error, response) {
      assert.equal(response.statusCode, 200);
      assert.ok(response.body.user_id);
      user001_id = response.body.user_id;
      done();
    });
  });

  it('should fail to login as unknown user', function(done) {
    request.get('http://localhost:' + port + '/login/digest', {
      auth: {
        user: 'xxx',
        pass: 'yyy',
        sendImmediately: false
      }
    }, function(error, response) {
      assert.equal(response.statusCode, 401);
      done();
    });
  });

  it('should fail to login with wrong password', function(done) {
    request.get('http://localhost:' + port + '/login/digest', {
      auth: {
        user: 'user001',
        pass: 'wrongone',
        sendImmediately: false
      }
    }, function(error, response) {
      assert.equal(response.statusCode, 401);
      done();
    });
  });

  it('should login as a user', function(done) {
    request.get('http://localhost:' + port + '/login/digest', {
      json: true,
      auth: {
        user: 'user001',
        pass: 'pass001',
        sendImmediately: false
      }
    }, function(error, response) {
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.body.user_id, user001_id);
      done();
    });
  });


});

describe('shutdown server', function() {
  it('should stop the server', function(done) {
    server.close();
    done();
  });
});