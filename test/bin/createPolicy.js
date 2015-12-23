"use strict";

var test = require('tape');
var m = require('../../bin/createPolicy');
var _ = require('lodash');
var pathlib = require('path');
var fs = require('fs');
var lambdaPolicy = require('../../lib/lambdaPolicy');

var testResourceFile = pathlib.join(__dirname, '/../data/resource.json');
var testS3LocationFile = pathlib.join(__dirname, '/../data/s3location.json');
var testResource = JSON.parse(fs.readFileSync(testResourceFile));

var mockS3 = function (params) {
    return function () {
        return {
            getObject: function (location, cb) {
                if (params && params.onGetObject) {
                    params.onGetObject(location, cb);
                }
                console.log('resolve test resource ', testResource);
                return cb(null, {
                    Body: JSON.stringify(testResource)
                });
            }
        };
    };
};

var mockAWS = function (mockParams) {
    return {
        IAM: function () {
            return {
                createPolicy: mockParams.createPolicy
                , putUserPolicy: mockParams.putUserPolicy
                , putRolePolicy: mockParams.putRolePolicy
            };
        }
        , S3: mockS3(mockParams)
    };
};

var testPolicy = lambdaPolicy(mockAWS(), { resource: testResource });


test('createPolicy body', function (t) {
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
            s.ok(data.hasOwnProperty('PolicyDocument'), 'Resolved with policy document');
        });
    });

    t.test('Returns expected JSON PolicyDocument ', function (s) {
        s.plan(2);
        m(mockAWS(), ['--resource', testResourceFile])
        .then(function (data) {
            var doc = JSON.parse(data.PolicyDocument);
            s.pass('Parsed PolicyDocument JSON');
            testPolicy
            .then(function (policy) {
                s.deepEqual(doc, policy, 'Returned expected policy structure');
            });
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

test('createPolicy', function (t) {
    t.test('Requires resource parameter', function (s) {
        s.plan(1);
        m(mockAWS(), ['--createPolicy', 'touch'])
            .catch(function (err) {
                s.ok(err.message.match(/resource/), 'Reject references expected parameter');
            });
    });

    t.test('Uploads policy for resource', function (s) {
        s.plan(2);
        m(mockAWS({
            createPolicy: function (params, cb) {
                s.pass('Called createPolicy');
                return cb(null, { Policy: { Arn: 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution'}});
            }
        }), ['--createPolicy', 'touch', '--resource', testResourceFile])
            .then(function () {
                s.pass('resolved');
            });
    });

    t.test('Creates policy with expected parameters', function (s) {
        s.plan(3);
        m(mockAWS({
            createPolicy: function (params, cb) {
                s.equal(params.PolicyName, 'touch', 'policy name should be as provided');
                var doc = JSON.parse(params.PolicyDocument);
                s.pass('policyDocument is JSON parseable');
                testPolicy
                    .then(function (policy) {
                        s.deepEqual(doc, policy, 'Returned expected policy structure');
                    });
            }
        }), ['--createPolicy', 'touch', '--resource', testResourceFile]);
    });

    t.test('Returns policy ARN', function (s) {
        s.plan(1);
        var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
        m(mockAWS({
            createPolicy: function (params, cb) {
                return cb(null, { Policy: { Arn: Arn}});
            }
        }), ['--createPolicy', 'touch', '--resource', testResourceFile])
            .then(function (data) {
                s.equal(data.Policy.Arn, Arn);
            });
    });

    t.test('Returns policy document', function (s) {
        s.plan(1);
        var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
        m(mockAWS({
            createPolicy: function (params, cb) {
                return cb(null, { Policy: { Arn: Arn}});
            }
        }), ['--createPolicy', 'touch', '--resource', testResourceFile])
            .then(function (data) {
                s.ok(data.hasOwnProperty('PolicyDocument'), 'Resolved with policy document');
            });
    });


    t.test('Rejects on createPolicy error', function (s) {
        s.plan(1);
        m(mockAWS({
            createPolicy: function (params, cb) {
                return cb('fail');
            }
        }), ['--createPolicy', 'touch', '--resource', testResourceFile])
            .catch(function (err) {
                s.pass('Rejected on error');
            });
    });
});

test('createPolicy user policy', function (t) {
    t.test('Requires resource parameter', function (s) {
        s.plan(1);
        m(mockAWS(), ['--createPolicy', 'touch', '--userPolicy', 'username'])
            .catch(function (err) {
                s.ok(err.message.match(/resource/), 'Reject references expected parameter');
            });
    });

    t.test('Uploads policy for resource', function (s) {
        s.plan(2);
        m(mockAWS({
            putUserPolicy: function (params, cb) {
                s.pass('Called createPolicy');
                return cb(null, { Policy: { Arn: 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution'}});
            }
        }), ['--createPolicy', 'touch', '--userPolicy', 'username', '--resource', testResourceFile])
            .then(function () {
                s.pass('resolved');
            });
    });

    t.test('Creates policy with expected parameters', function (s) {
        s.plan(4);
        m(mockAWS({
            putUserPolicy: function (params, cb) {
                s.equal(params.PolicyName, 'touch', 'PolicyName should be as expected');
                s.equal(params.UserName, 'username', 'user policy should be as expected');
                var doc = JSON.parse(params.PolicyDocument);
                s.pass('policyDocument is JSON parseable');
                testPolicy
                    .then(function (policy) {
                        s.deepEqual(doc, policy, 'Returned expected policy structure');
                    });

            }
        }), ['--createPolicy', 'touch', '--userPolicy', 'username', '--resource', testResourceFile]);
    });

    // t.test('Returns policy ARN', function (s) {
    //     s.plan(1);
    //     var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
    //     m(mockAWS({
    //         putUserPolicy: function (params, cb) {
    //             return cb(null, { Policy: { Arn: Arn}});
    //         }
    //     }), ['--createPolicy', 'touch', '--userPolicy', 'username', '--resource', testResourceFile])
    //         .then(function (data) {
    //             s.equal(data.Policy.Arn, Arn);
    //         });
    // });

    t.test('Returns policy document', function (s) {
        s.plan(1);
        var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
        m(mockAWS({
            putUserPolicy: function (params, cb) {
                return cb(null, { Policy: { Arn: Arn}});
            }
        }), ['--createPolicy', 'touch', '--userPolicy', 'username', '--resource', testResourceFile])
            .then(function (data) {
                s.ok(data.hasOwnProperty('PolicyDocument'), 'Resolved with policy document');
            });
    });

    t.test('Rejects on createPolicy error', function (s) {
        s.plan(1);
        m(mockAWS({
            putUserPolicy: function (params, cb) {
                return cb('fail');
            }
        }), ['--createPolicy', 'touch', '--userPolicy', 'username', '--resource', testResourceFile])
            .catch(function (err) {
                s.pass('Rejected on error');
            });
    });
});


test('createPolicy role policy', function (t) {
    t.test('Requires resource parameter', function (s) {
        s.plan(1);
        m(mockAWS(), ['--createPolicy', 'touch', '--rolePolicy', 'rolename'])
            .catch(function (err) {
                s.ok(err.message.match(/resource/), 'Reject references expected parameter');
            });
    });

    t.test('Uploads policy for resource', function (s) {
        s.plan(2);
        m(mockAWS({
            putRolePolicy: function (params, cb) {
                s.pass('Called createPolicy');
                return cb(null, { Policy: { Arn: 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution'}});
            }
        }), ['--createPolicy', 'touch', '--rolePolicy', 'rolename', '--resource', testResourceFile])
            .then(function () {
                s.pass('resolved');
            });
    });

    t.test('Creates policy with expected parameters', function (s) {
        s.plan(4);
        m(mockAWS({
            putRolePolicy: function (params, cb) {
                s.equal(params.PolicyName, 'touch');
                s.equal(params.RoleName, 'rolename');
                var doc = JSON.parse(params.PolicyDocument);
                s.pass('policyDocument is JSON parseable');
                testPolicy
                    .then(function (policy) {
                        s.deepEqual(doc, policy, 'Returned expected policy structure');
                    });
            }
        }), ['--createPolicy', 'touch', '--rolePolicy', 'rolename', '--resource', testResourceFile]);
    });

    // t.test('Returns policy ARN', function (s) {
    //     s.plan(1);
    //     var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
    //     m(mockAWS({
    //         putRolePolicy: function (params, cb) {
    //             return cb(null, { Policy: { Arn: Arn}});
    //         }
    //     }), ['--createPolicy', 'touch', '--rolePolicy', 'rolename', '--resource', testResourceFile])
    //         .then(function (data) {
    //             s.equal(data.Policy.Arn, Arn);
    //         });
    // });

    t.test('Returns policy document', function (s) {
        s.plan(1);
        var Arn  = 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution';
        m(mockAWS({
            putRolePolicy: function (params, cb) {
                return cb(null, { Policy: { Arn: Arn}});
            }
        }), ['--createPolicy', 'touch', '--rolePolicy', 'rolename', '--resource', testResourceFile])
            .then(function (data) {
                s.ok(data.hasOwnProperty('PolicyDocument'), 'Resolved with policy document');
            });
    });

    t.test('Rejects on createPolicy error', function (s) {
        s.plan(1);
        m(mockAWS({
            putRolePolicy: function (params, cb) {
                return cb('fail');
            }
        }), ['--createPolicy', 'touch', '--rolePolicy', 'rolename', '--resource', testResourceFile])
            .catch(function (err) {
                s.pass('Rejected on error');
            });
    });
});

