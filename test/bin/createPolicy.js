"use strict";

var test = require('tape');
var m = require('../../bin/createPolicy');
var _ = require('lodash');
var pathlib = require('path');
var fs = require('fs');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');
var testResource = fs.readFileSync(testResourceFile);

var mockS3 = function (params) {
    return function () {
        return {
            getObject: function (location, cb) {
                if (params && params.onGetObject) {
                    params.onGetObject(location, cb);
                }
                return cb(null, {
                    Body: JSON.stringify(testResource)
                });
            }
        };
    };
};

var mockAWS = function (params) {
    return {
        IAM: function () {
            return {};
        }
        , S3: mockS3(params)
    };
};

test('createPolicy', function (t) {
    t.test('Rejects with no arguments', function (s) {
        s.plan(1);
        m(mockAWS(), [])
        .catch(function () {
            s.pass('rejected with no arguments');
        });
    });

    t.test('Runs given the path to a resource definition ', function (s) {
        s.plan(1);
        m(mockAWS(), ['--resource', testResourceFile])
        .then(function () {
            s.pass('Resolve successfully');
        });
    });

    t.test('Returns a policy when provided just resource body ', function (s) {
        s.plan(1);
        m(mockAWS(), ['--resource', testResourceFile])
        .then(function (data) {
            s.ok(data.hasOwnProperty('PolicyDocument'));
        });
    });

    t.test('Downloads a resource body when provided s3 location ', function (s) {
        s.plan(1);
        m(mockAWS(), ['--s3location', testS3LocationFile])
        .then(function () {
            s.pass('Resolved given only s3location');
        });
    });

    t.test('Downloads a resource body when provided s3 location ', function (s) {
        s.plan(1);
        m(mockAWS(), ['--s3location', testS3LocationFile])
        .then(function (data) {
            s.ok(data.hasOwnProperty('PolicyDocument'), 'Resolved with the policy document');
        });
    });
});
