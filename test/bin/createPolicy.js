"use strict";

var test = require('tape');
var m = require('../../bin/createPolicy');
var _ = require('lodash');
var pathlib = require('path');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');

test('createPolicy', function (t) {
    t.test('Rejects with no arguments', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {};
            }
        }, [])
        .catch(function () {
            s.pass('rejected with no arguments');
        });
    });

    t.test('Runs given the path to a resource definition ', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {};
            }
        }, ['--resource', testResourceFile])
        .then(function () {
            s.pass('Resolve successfully');
        });
    });
});
