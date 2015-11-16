"use strict";

var test = require('tape');
var m = require('../../bin/createLambdaPackage');
var _ = require('lodash');
var pathlib = require('path');
var fs = require('fs');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testResource = JSON.parse(fs.readFileSync(testResourceFile));

var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');
var testS3Location = JSON.parse(fs.readFileSync(testS3LocationFile));

var mockAWS = function (mockParams) {
    var nop = function () {};
    return {
        IAM: function () {
            return {
                createPolicy: mockParams.createPolicy || nop
                , putUserPolicy: mockParams.putUserPolicy || nop
                , putRolePolicy: mockParams.putRolePolicy || nop
            };
        }
        , S3: function () {
            return {
                getObject: function (location, cb) {
                    if (mockParams && mockParams.getObject) {
                        return mockParams.getObject(location, cb);
                    } else {
                        return cb(null, {
                            Body: JSON.stringify(testResource)
                        });
                    }
                }
            };
        }
    };
};

var mockZip = function (params) {
    var nop = function () {};
    return {
        file: params.file ||  nop
        , folder: params.folder || nop
        , generate: params.generate || function () {
            return 'test';
        }
    };
};


test('createLambda', function (t) {

    t.test('rejects on no arguments', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), [])
        .catch(function () {
            s.pass('no arguments rejected');
        });
    });


    t.test('Creates a zip when given an output file', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), ['lambda.zip'])
        .then(function () {
            s.equal(fs.readFileSync(process.cwd() + '/lambda.zip').toString(), 'result');
        });
    });

    t.test('Writes result to specificied given file name', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), ['result.zip'])
        .then(function () {
            s.equal(fs.readFileSync(process.cwd() + '/result.zip').toString(), 'result', 'writes expected output');
        });
    });

    t.test('declares the output file', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), ['result.zip'])
        .then(function (out) {
            s.ok(out.match(/result.zip/), 'mentions custom output path');
        });
    });

    t.test('Reads and zips resource.json if provided', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 'resource.json') {
                    s.deepEqual(JSON.parse(data.toString()), testResource);
                }
            }
        }), ['lambda.zip', '--resource', testResourceFile]);
    });

    t.test('Reads and zips s3location.json if provided', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 's3Location.json') {
                    s.deepEqual(JSON.parse(data), testS3Location);
                }
            }
        }), ['lambda.zip', '--s3location', testS3LocationFile]);
    });
});


