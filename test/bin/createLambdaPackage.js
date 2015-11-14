"use strict";

var test = require('tape');
var m = require('../../bin/createLambda');
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
    t.test('Creates a zip', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), [])
        .then(function () {
            s.equal(fs.readFileSync(process.cwd() + '/lambda.zip'), 'result');
        });
    });

    t.test('Writes the result to lambda.zip by default', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), [])
        .then(function () {
            s.equal(fs.readFileSync(process.cwd() + '/lambda.zip'), 'result');
        });
    });

    t.test('declares the output file', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), [])
        .then(function (out) {
            s.ok(out.match(/lambda.zip/));
        });
    });

    t.test('Writes result to specificied given file name', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), ['--out', 'result.zip'])
        .then(function () {
            s.equal(fs.readFileSync(process.cwd() + '/result.zip'), 'result');
        });
    });

    t.test('declares the output file', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), ['--out', 'result.zip'])
        .then(function (out) {
            s.ok(out.match(/result.zip/));
        });
    });

    t.test('Reads and zips resource.json if provided', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 'resource.json') {
                    s.deepEqual(JSON.parse(data), testResource);
                }
            }
        }), ['--resource', testResourceFile]);
    });

    t.test('Reads and zips s3location.json if provided', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 's3location.json') {
                    s.deepEqual(JSON.parse(data), testS3Location);
                }
            }
        }), ['--s3location', testResourceFile]);
    });
});


