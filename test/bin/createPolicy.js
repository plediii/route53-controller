"use strict";

var test = require('tape');
var m = require('../../bin/createPolicy');
var _ = require('lodash');
var pathlib = require('path');
var fs = require('fs');

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

var mockAWS = function (params) {
    return {
        IAM: function () {
            return {};
        }
        , S3: mockS3(params)
    };
};

test('createPolicy', function (t) {
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

/*
test('createPolicy', function (t) {
    t.test('Requires resource parameter', function (s) {
        s.plan(1);
        m({}, 'test-name', {})
            .catch(function (err) {
                s.ok(err.message.match(/resource/), 'Reject references expected parameter');
            });
    });

    t.test('Uploads policy for resource', function (s) {
        s.plan(3);
        m({
            IAM: function () {
                return {
                    createPolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name', "the policy name should be the provided argument");
                        m.policyBody({}, { resource: testResource })
                            .then(function (body) {
                                s.deepEqual(body
                                            , JSON.parse(params.PolicyDocument), "the policy document should be the exepcted body");
                            });
                        return cb();
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
        })
            .then(function () {
                s.pass('resolved');
            });
    });

    t.test('Returns policy ARN', function (s) {
        s.plan(1);
        m({
            IAM: function () {
                return {
                    createPolicy: function (params, cb) {
                        return cb(null, { Policy: { Arn: 'arn:aws:iam::XXXXXXXXXXXX:role/lambda_basic_execution'}});
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
        })
            .then(function (data) {
                s.ok(_.isString(data.Policy.Arn));
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
        s.plan(4);
        m({
            IAM: function () {
                return {
                    putUserPolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name');
                        s.equal(params.UserName, 'test-user');
                        m.policyBody({}, { resource: testResource })
                            .then(function (body) {
                                s.deepEqual(body
                                            , JSON.parse(params.PolicyDocument));
                            });
                        return cb();
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , userName: 'test-user'
        })
            .then(function () {
                s.pass('resolved');
            });
    });

    t.test('Creates userPolicy when given userPolicy param', function (s) {
        s.plan(4);
        m({
            IAM: function () {
                return {
                    putUserPolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name');
                        s.equal(params.UserName, 'test-user');
                        m.policyBody({}, { resource: testResource })
                            .then(function (body) {
                                s.deepEqual(body
                                            , JSON.parse(params.PolicyDocument));
                            });
                        return cb();
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , userName: 'test-user'
        })
            .then(function () {
                s.pass('resolved');
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
        s.plan(4);
        m({
            IAM: function () {
                return {
                    putRolePolicy: function (params, cb) {
                        s.equal(params.PolicyName, 'test-name');
                        s.equal(params.RoleName, 'test-role');
                        m.policyBody({}, { resource: testResource })
                            .then(function (body) {
                                s.deepEqual(body
                                            , JSON.parse(params.PolicyDocument));
                            });
                        return cb();
                    }
                };
            }
        }, 'test-name', {
            resource: testResource
            , roleName: 'test-role'
        })
            .then(function () {
                s.pass('resolved');
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

*/
