"use strict";

var test = require('tape');
var m = require('../lambda-index');
var pathlib = require('path');
var fs = require('fs');

var testResourceFile = pathlib.join(__dirname, '/data/resource.json');
var testResource = JSON.parse(fs.readFileSync(testResourceFile));

var testS3LocationFile = pathlib.join(__dirname, '/data/s3location.json');
var testS3Location = JSON.parse(fs.readFileSync(testS3LocationFile));

var mockAWS = function (mockParams) {
    var nop = function () {};
    return {
        EC2: function () {
            return {
                describeInstances: mockParams.describeInstances || function (params, cb) {
                    cb(null, {
                        Reservations: [{
                            Instances: [{
                                PublicIpAddress: '192.1.2.3'
                                , PrivateIpAddress: '127.1.2.3'
                            }]
                        }]
                    });
                }
            };
        }
        , Route53: function () {
            return {
                changeResourceRecordSets: mockParams.changeResourceRecordSets || function (params, cb) {
                    return cb();
                }
            };
        }
        , S3: function () {
            return {
                getObject: mockParams.getObject || function (location, cb) {
                    return cb(null, {
                        Body: JSON.stringify(testResource)
                    });
                }
            };
        }
    };
};

var testPaths = function () {
    return {
        resourcePath: testResourceFile
        , s3LocationPath: testS3LocationFile
    };
};

test('lambda-index', function (t) {

    t.test('module fetches instance information', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.AWS = mockAWS({
            describeInstances: function () {
                s.pass('Described instances');
            }
        });
        m.handler();
    });

    t.test('module updates fetches s3location information', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.AWS = mockAWS({
            getObject: function () {
                s.pass('Got object');
            }
        });
        m.handler();
    });

    t.test('module updates record sets', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.AWS = mockAWS({
            changeResourceRecordSets: function () {
                s.pass('updated record sets');
            }
        });
        m.handler();
    });

    t.test('resolves on success', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.AWS = mockAWS({
            changeResourceRecordSets: function (params, cb) {
                return cb();
            }
        });
        m.handler({}, {
            succeed: function () {
                s.pass('Resolved');
            }
            , fail: function () {
                s.fail('rejected');
            }
        });
    });

    t.test('resolves even if s3location path is not present', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.paths.s3LocationPath = '/not/exist';
        m.AWS = mockAWS({});
        m.handler({}, {
            succeed: function () {
                s.pass('Resolved');
            }
            , fail: function () {
                s.fail('rejected');
            }
        });
    });

    t.test('resolves even if resource path is not present', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.paths.resourcePath = '/not/exist';
        m.AWS = mockAWS({});
        m.handler({}, {
            succeed: function () {
                s.pass('Resolved');
            }
            , fail: function () {
                s.fail('rejected');
            }
        });
    });

    t.test('rejects on error', function (s) {
        s.plan(1);
        m.paths = testPaths();
        m.AWS = mockAWS({
            changeResourceRecordSets: function (params, cb) {
                return cb(true);
            }
        });
        m.handler({}, {
            succeed: function () {
                s.fail('resolved');
            }
            , fail: function () {
                s.pass('rejected');
            }
        });
    });
});
