"use strict";

var test = require('tape');
var m = require('../../bin/uploadResource');
var _ = require('lodash');
var pathlib = require('path');
var fs = require('fs');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testResource = JSON.parse(fs.readFileSync(testResourceFile));

var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');
var testS3Location = JSON.parse(fs.readFileSync(testS3LocationFile));

var mockAWS = function (mockParams) {
    return {
        S3: {
            upload: function (params, cb) {
                if (params && params.onUpload) {
                    params.onUpload(params, cb);
                }
                return cb(null, {});
            }
        }
    };
};

test('uploadResource', function (t) {
    t.test('Rejects with no arguments', function (s) {
        s.plan(1);
        m(mockAWS(), [])
        .catch(function () {
            s.pass('rejected with no arguments');
        });
    });

    t.test('Rejects given only resource', function (s) {
        s.plan(1);
        m(mockAWS(), ['--resource', testResourceFile])
        .catch(function () {
            s.pass('rejected only resource');
        });
    });

    t.test('Rejects given only s3location', function (s) {
        s.plan(1);
        m(mockAWS(), ['--s3location', testS3LocationFile])
        .catch(function () {
            s.pass('rejected only s3location');
        });
    });

    t.test('Runs given s3location and resource', function (s) {
        s.plan(1);
        m(mockAWS(), ['--resource', testResourceFile, '--s3location', testS3LocationFile])
        .then(function () {
            s.pass('Executed successfully');
        });
    });

    t.test('Provides upload bucket from s3location', function (s) {
        s.plan(1);
        m(mockAWS({
            onUpload: function (params, cb) {
                s.equal(params.Bucket, 'foo', 'Did not contain bucket from test data');
            }
        }), ['--resource', testResourceFile, '--s3location', testS3LocationFile]);
    });

    t.test('Provides upload key from s3location', function (s) {
        s.plan(1);
        m(mockAWS({
            onUpload: function (params, cb) {
                s.equal(params.Key, 'bar', 'Did not contain bucket from test data');
            }
        }), ['--resource', testResourceFile, '--s3location', testS3LocationFile]);
    });

    t.test('Provides data from testResource', function (s) {
        s.plan(1);
        m(mockAWS({
            onUpload: function (params, cb) {
                s.deepEqual(JSON.parse(params.Body.toString()), testResource, 'Uploaded expected resource JSON.');
            }
        }), ['--resource', testResourceFile, '--s3location', testS3LocationFile]);
    });

    t.test('Rejects on uplaod error.', function (s) {
        s.plan(1);
        m(mockAWS({
            onUpload: function (params, cb) {
                cb('error');
            }
        }), ['--resource', testResourceFile, '--s3location', testS3LocationFile])
        .catch(function (err) {
            s.pass('Rejected upload error');
        });
    });
});

