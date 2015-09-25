"use strict";

var test = require('tape');
var m = require('../../bin/updateRecordSets');
var _ = require('lodash');
var pathlib = require('path');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');


test('updateRecordSets', function (t) {
    t.test('Rejects on no arguments', function (s) {
        s.plan(1);
        m({}, [])
        .catch(function () {
            s.pass('Rejected lack of argument');
        });
    });

    t.test('Downloads from s3 when given s3Location file', function (s) {
        s.plan(1);
        m({
            S3: function () {
                return {
                    getObject: function (location, cb) {
                        s.pass('Downloaded from s3');
                    }
                };
            }
        }, ['--s3location', testS3LocationFile]);
    });

    t.test('Reads local resources and updates record sets when given local resource definition', function (s) {
        s.plan(2);
        m({
            EC2: function () {
                return {
                    describeInstances: function (params, cb) {
                        s.pass('described instances');
                        cb(null, {
                            Reservations: [{
                                Instances: [{
                                    PublicIpAddress: '192.1.1.1'
                                    , PrivateIpAddress: '127.1.1.1'
                                }]
                            }]
                        });
                    }
                };
            }
            , Route53: function () {
                return {
                    changeResourceRecordSets: function (params, cb) {
                        s.pass('updated resource records');
                    }
                };
            }
        }, ['--resource', testResourceFile]);
    });
});
