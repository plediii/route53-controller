"use strict";

var test = require('tape');
var m = require('../../lib/getResourceDefinition');
var _ = require('lodash');
var pathlib = require('path');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');

test('getResourceDefinition', function (t) {
    t.test('Should read resource definition', function (s) {
        s.plan(1);
        m({}, {
            resource: testResourceFile
        })
        .then(function (resource) {
            s.equal(resource.HostedZone, "Z148QEXAMPLE8V");
        });
    });

    t.test('Should download resource definion from s3', function (s) {
        s.plan(1);
        m({
            S3: function () {
                return {
                    getObject: function (location, cb) {
                        return cb(null, {
                            Body: JSON.stringify({
                                "HostedZone": "Z148QEXAMPLE8V",
                                "Resources": {
                                }
                            })
                        });
                    }
                };
            }
        }, {
            s3location: testS3LocationFile
        })
        .then(function (resource) {
            s.equal(resource.HostedZone, "Z148QEXAMPLE8V");
        });
    });

    t.test('Should prefer s3 location when both available', function (s) {
        s.plan(1);
        m({
            S3: function () {
                return {
                    getObject: function (location, cb) {
                        return cb(null, {
                            Body: JSON.stringify({
                                "HostedZone": "s3",
                                "Resources": {
                                }
                            })
                        });
                    }
                };
            }
        }, {
            s3location: testS3LocationFile
            , resource: testResourceFile
        })
        .then(function (resource) {
            s.equal(resource.HostedZone, "s3");
        });
    });

    t.test('Should reject when neither are available', function (s) {
        s.plan(2);
        m({}, {})
        .catch(function (err) {
            s.ok(err.message.match(/s3location/), 'should mention available s3location parameter');
            s.ok(err.message.match(/resource/), 'should mention available resource parameter');
        });
    });
});
