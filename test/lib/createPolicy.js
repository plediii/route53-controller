"use strict";

var test = require('tape');
var m = require('../../lib/createPolicy');
var _ = require('lodash');
var pathlib = require('path');

var testResource = {
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        "bar.example": {
            "Instances": [
                {
                    "PrivateIP": true,
                    "Filters": [
                        {
                            "Name": "tag:Name",
                            "Values": [
                                "bar.example"
                            ]
                        }
                    ]
                }
            ],
            "ResourceRecordSet": {
                "Name": "bar.example.com",
                "TTL": 30
            }
        }
    }
};

var testS3Location = {
    "Bucket": "foo",
    "Key": "bar"
};

var mockS3 = function () {
    return {
        getObject: function (location, cb) {
            return cb(null, {
                Body: JSON.stringify(testResource)
            });
        }
    };
};

test('createPolicy', function (t) {

    var isChangeResourceRecordSetsStatement = function (statement) {
        return _.some(statement.Action, function (action) {
            return action === "route53:ChangeResourceRecordSets";
        })
            && _.some(statement.Resource, function (resource) {
                return resource === "arn:aws:route53:::hostedzone/Z148QEXAMPLE8V";
            });
    };

    t.test('Policy for resource object', function (s) {
        s.test('Requires resource or s3location', function (r) {
            r.plan(1);
            m({}, {})
                .catch(function (err) {
                    r.ok(err.message.match('/resource/'), 'Reject references expected parameter');
                });
        });

        s.test('Creates policy to changeRecordSets given resource', function (r) {
            r.plan(1);
            m({}, {
                resource: testResource
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, isChangeResourceRecordSetsStatement));
                });
        });
    });

    t.test('Policy for s3 location', function (s) {
        s.test('Creates statement for accessing specific resource', function (r) {
            r.plan(1);
            m({
                S3: mockS3
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, function (statement) {
                        return _.some(statement.Action, function (action) {
                            return action === "s3:Get*";
                        })
                            && _.some(statement.Resource, function (resource) {
                                return resource === "arn:aws:s3:::foo/bar";
                            });
                    }));
                });
        });

        s.test('Creates policy for resource at s3location', function (r) {
            r.plan(1);
            m({
                S3: mockS3
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, isChangeResourceRecordSetsStatement));
                });
        });
    });
});

