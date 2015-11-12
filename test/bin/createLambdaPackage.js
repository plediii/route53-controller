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
        , generate: params.generate || nop
    };
};


test('createLambda', function (t) {
    t.test('Creates a zip, and returns the result', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                return 'result';
            }
        }), [])
        .then(function (result) {
            s.equal(result, 'result');
        });
    });

    t.test('Reads and zips resource.json if provided', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === testResourceFile) {
                    s.deepEqual(JSON.parse(data), testResource);
                }
            }
        }), ['--resource', testResourceFile]);
    });
});


