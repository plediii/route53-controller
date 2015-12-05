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

test('lambda-index', function (t) {
    m.paths = {
        resourcePath: testResourceFile
        , s3LocationPath: testS3LocationFile
    };

    t.test('module fetches instance information', function (s) {
        s.plan(1);
        m.AWS = mockAWS({
            describeInstances: function () {
                s.pass('Described instances');
            }
        });
        m.handler();
    });

    t.test('module updates fetches s3location information', function (s) {
        s.plan(1);
        m.AWS = mockAWS({
            getObject: function () {
                s.pass('Got object');
            }
        });
        m.handler();
    });

    t.test('module updates record sets', function (s) {
        s.plan(1);
        m.AWS = mockAWS({
            changeResourceRecordSets: function () {
                s.pass('updated record sets');
            }
        });
        m.handler();
    });
});
