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

test('createPolicy.policyBody', function (t) {

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
            m.policyBody({}, {})
                .catch(function (err) {
                    r.ok(err.message.match(/resource/), 'Reject references resource parameter');
                });
        });

        s.test('Creates policy to changeRecordSets given resource', function (r) {
            r.plan(2);
            m.policyBody({}, {
                resource: testResource
            })
                .then(function (data) {
                    r.ok(_.some(data.Statement, isChangeResourceRecordSetsStatement), "Some statement should authorize changeResourceRecord");
                    r.ok(_.some(data.Statement, isDescribeInstancesStatement), "Some statement should authorize describing instances ");
                });
        });
    });

    t.test('Policy for s3 location', function (s) {
        s.test('Creates statement for accessing specific resource', function (r) {
            r.plan(1);
            m.policyBody({
                S3: mockS3()
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.Statement, function (statement) {
                        return statementHasAction(statement, "s3:Get*")
                            && statementHasResource(statement, "arn:aws:s3:::foo/bar");
                    }), 'Some statement allows accessing s3location');
                });
        });

        s.test('Attempts to download specific resource if not provided', function (r) {
            r.plan(1);
            m.policyBody({
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
            m.policyBody({
                S3: mockS3()
            }, {
                s3location: testS3Location
            })
                .then(function (data) {
                    r.ok(_.some(data.Statement, isChangeResourceRecordSetsStatement), "Some statement should authorize changeResourceRecord");
                    r.ok(_.some(data.Statement, isDescribeInstancesStatement), "Some statement should authorize describing instances ");
                });
        });

        s.test('Does not download resource if specific resource is provided as parameter', function (r) {
            r.plan(1);
            m.policyBody({
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

test('createPolicy', function (t) {
    t.test('Requires resource parameter', function (s) {
        s.plan(1);
        m({}, 'test-name', {})
        .catch(function (err) {
            s.ok(err.message.match(/resource/), 'Reject references expected parameter');
        });
    });

    t.test('Uploads policy for resource', function (s) {
        s.plan(2);
        m({
            IAM: function () {
                return {
                    createPolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name', "the policy name should be the provided argument");
                        s.deepEqual(m.policyBody({}, { resource: testResource })
                                    , JSON.parse(params.PolicyDocument), "the policy document should be the exepcted body");
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
        });
    });

    t.test('Rejects on createPolicy error', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {
                    createPolicy: function (params, cb) {
                        return cb('fail');
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
        })
        .catch(function (err) {
            s.pass('Rejected on error');
        });
    });

    t.test('Creates userPolicy when given userPolicy param', function (s) {
        s.plan(3);
        m({
            IAM: function () {
                return {
                    putUserPolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name');
                        s.equal(params.UserName, 'test-user');
                        s.deepEqual(m.policyBody({}, { resource: testResource })
                                    , JSON.parse(params.PolicyDocument));
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , userName: 'test-user'
        });
    });

    t.test('Rejects on putUserPolicy error', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {
                    putUserPolicy: function (params, cb) {
                        cb('fail');
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , userName: 'test-user'
        })
        .catch(function () {
            s.pass('Rejected on error');
        });
    });

    t.test('Creates rolePolicy when given rolePolicy param', function (s) {
        s.plan(3);
        m({
            IAM: function () {
                return {
                    putRolePolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name');
                        s.equal(params.RoleName, 'test-role');
                        s.deepEqual(m.policyBody({}, { resource: testResource })
                                    , JSON.parse(params.PolicyDocument));
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , roleName: 'test-role'
        });
    });

    t.test('Rejects on putRolePolicy error', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {
                    putRolePolicy: function (params, cb) {
                        cb('fail');
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , roleName: 'test-role'
        })
        .catch(function () {
            s.pass('Rejected on error');
        });
    });
});
