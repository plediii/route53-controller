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

var mockS3 = function (params) {
    return function () {
        return {
            getObject: function (location, cb) {
                if (params.onGetObject) {
                    params.onGetObject(location, cb);
                }
                return cb(null, {
                    Body: JSON.stringify(testResource)
                });
            }
        };
    };
};

test('createPolicy', function (t) {

    var statementHasAction = function (statement, expectedAction) {
        return _.some(statement.Action, function (action) {
            return expectedAction === action;
        });
    };

    var statementHasResource = function (statement, expectedResource) {
        return _.some(statement.Resource, function (resource) {
            return expectedResource === resource;
        });
    };

    var isChangeResourceRecordSetsStatement = function (statement) {
        return statementHasAction(statement, "route53:ChangeResourceRecordSets")
            && statementHasResource(statement, "arn:aws:route53:::hostedzone/Z148QEXAMPLE8V");
    };

    var isDescribeInstancesStatement = function (statement) {
        return statementHasAction(statement, "ec2:DescribeInstances")
            && statementHasResource(statement, "*");
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
            r.plan(2);
            m({}, {
                resource: testResource
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, isChangeResourceRecordSetsStatement));
                    r.ok(_.some(data.policy.Statement, isDescribeInstancesStatement));
                });
        });
    });

    t.test('Policy for s3 location', function (s) {
        s.test('Creates statement for accessing specific resource', function (r) {
            r.plan(1);
            m({
                S3: mockS3()
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, function (statement) {
                        return statementHasAction(statement, "s3:Get*")
                            && statementHasResource(statement, "arn:aws:s3:::foo/bar");
                    }));
                });
        });

        s.test('Attempts to download specific resource if not provided', function (r) {
            r.plan(1);
            m({
                S3: mockS3({
                    onGetObject: function () {
                        r.pass('Downloaded resource');
                    }
                })
            }, {
                s3location: testS3Location
            });
        });

        s.test('Creates policy for resource at s3location', function (r) {
            r.plan(2);
            m({
                S3: mockS3
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.policy.Statement, isChangeResourceRecordSetsStatement));
                    r.ok(_.some(data.policy.Statement, isDescribeInstancesStatement));
                });
        });

        s.test('Does not download resource if specific resource is provided as parameter', function (r) {
            r.plan(1);
            m({
                S3: mockS3({
                    onGetObject: function () {
                        r.fail('Unnecessary download.');
                    }
                })
            }, {
                s3location: testS3Location
                , resource: testResource
            })
            .then(function () {
                r.pass('Done');
            });
        });
    });
});

