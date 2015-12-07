"use strict";

var test = require('tape');
var m = require('../../bin/lambdaFunction');
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
        , Lambda: function () {
            return {
                createFunction: function (params, cb) {
                    if (mockParams && mockParams.createFunction) {
                        return mockParams.createFunction(params, cb);
                    } else {
                        return cb(null, {});
                    }
                }
                , updateFunctionCode: function (params, cb) {
                    if (mockParams && mockParams.updateFunctionCode) {
                        return mockParams.updateFunctionCode(params, cb);
                    } else {
                        return cb(null, {});
                    }
                }
            };
        }
        , config: {
            update: function (params) {
                if (mockParams && mockParams.configUpdate) {
                    return mockParams.configUpdate(params);
                } else {
                    return;
                }
            }
        }
    };
};

var mockZip = function (params) {
    params = params || {};
    var nop = function () {};
    return {
        file: params.file ||  nop
        , folder: params.folder || nop
        , generate: params.generate || function () {
            return 'test';
        }
    };
};


test('lambdaFunction create', function (t) {

    t.test('rejects on no arguments', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), [])
        .catch(function () {
            s.pass('no arguments rejected');
        });
    });

    t.test('rejects given only create argument', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), ['create'])
        .catch(function () {
            s.pass('create argument only rejected');
        });
    });

    t.test('rejects given only role ARN', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), ['create', '--role', 'roleARN'])
        .catch(function () {
            s.pass('no create arguments rejected');
        });
    });

    t.test('rejects given only resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), ['create', '--resource', testResourceFile])
        .catch(function () {
            s.pass('no create arguments rejected');
        });
    });

    t.test('Creates a zip when "creating" and given rolename, resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                s.pass('Generated a zip');
            }
        }), ['create', '--role', 'roleName', '--resource', testResourceFile]);
    });

    t.test('rejects given an unrecognized verb', function (s) {
        s.plan(1);
        console.log('whatwhat');
        m(mockAWS(), mockZip({}), ['whatwhat', '--role', 'roleARN', '--resource', testResourceFile])
        .catch(function (err) {
            console.log(err);
            s.pass('unrecognized verb rejected');
        });
    });

    t.test('Creates a with the expected resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 'resource.json') {
                    s.deepEqual(JSON.parse(data.toString()), testResource);
                }
            }
        }), ['create', '--role', 'roleName', '--resource', testResourceFile]);
    });

    t.test('Creates a lambda function when "creating" and given rolename, resource', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                s.pass('Created lambda function');
            }
        }), mockZip(), ['create', '--role', 'roleName', '--resource', testResourceFile]);
    });

    t.test('rejectds on createfunction error', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                cb('error');
            }
        }), mockZip(), ['create', '--role', 'roleName', '--resource', testResourceFile])
        .catch(function () {
            s.pass('Rejected createFunction error');
        });
    });

    t.test('Creates a lambda function a default name of route53-controller', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                s.equal(params.FunctionName, 'route53-controller');
            }
        }), mockZip(), ['create', '--role', 'roleName', '--resource', testResourceFile]);
    });

    t.test('Creates a lambda function with given role arn', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                s.equal(params.Role, 'roleARN');
            }
        }), mockZip(), ['create', '--role', 'roleARN', '--resource', testResourceFile]);
    });

    t.test('Creates a lambda function with created zip file', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                s.equal(params.Code.ZipFile, 'zippy');
            }
        }), mockZip({
            generate: function (param) {
                return 'zippy';
            }
        }), ['create', '--role', 'roleARN', '--resource', testResourceFile]);
    });

    t.test('Creates a lambda function with given name', function (s) {
        s.plan(1);
        m(mockAWS({
            createFunction: function (params, cb) {
                s.equal(params.FunctionName, 'functionName');
            }
        }), mockZip(), ['create', '--name', 'functionName', '--role', 'roleName', '--resource', testResourceFile]);
    });

    t.test('Creates a lambda function after settng requested region', function (s) {
        s.plan(2);
        var regionSet = false;
        m(mockAWS({
            configUpdate: function (params) {
                s.equal(params.region, 'australia');
                regionSet = true;
            }
            , createFunction: function (params, cb) {
                s.ok(regionSet, 'region set before creating function');
            }
        }), mockZip({
            generate: function (param) {
                return 'zippy';
            }
        }), ['create', '--role', 'roleARN', '--resource', testResourceFile, '--region', 'australia']);
    });

    t.test('Creates a zip file with s3location if provided ', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 's3Location.json') {
                    s.deepEqual(JSON.parse(data.toString()), testS3Location);
                }
            }
        }), ['create', '--role', 'roleName', '--s3location', testS3LocationFile]);
    });
});

test('lambdaFunction update', function (t) {

    t.test('rejects given only update argument', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({}), ['update'])
        .catch(function () {
            s.pass('no create arguments rejected');
        });
    });

    t.test('Generates a zip when "updating" and given resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            generate: function (param) {
                s.pass('Generated a zip');
            }
        }), ['update', '--resource', testResourceFile]);
    });

    t.test('Rejects when given role when "updating" and given resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip(), ['update', '--role', 'roleARN', '--resource', testResourceFile])
        .catch(function (err) {
            s.ok(err.message.match(/role/), 'Role can not be updated');
        });
    });

    t.test('Creates zip with the expected resource', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 'resource.json') {
                    s.deepEqual(JSON.parse(data.toString()), testResource);
                }
            }
        }), ['update', '--resource', testResourceFile]);
    });

    t.test('Updates a lambda function when "updating" and given resource', function (s) {
        s.plan(1);
        m(mockAWS({
            updateFunctionCode: function (params, cb) {
                s.pass('Updated lambda function');
            }
        }), mockZip(), ['update', '--resource', testResourceFile]);
    });

    t.test('rejects on updateFunctionCode error', function (s) {
        s.plan(1);
        m(mockAWS({
            updateFunctionCode: function (params, cb) {
                return cb('error');
            }
        }), mockZip(), ['update', '--resource', testResourceFile])
        .catch(function (err) {
            s.pass('Rejected on updatedFunctionCode error');
        });
    });

    t.test('Updates a lambda function with a default name of route53-controller', function (s) {
        s.plan(1);
        m(mockAWS({
            updateFunctionCode: function (params, cb) {
                s.equal(params.FunctionName, 'route53-controller');
            }
        }), mockZip(), ['update', '--resource', testResourceFile]);
    });

    t.test('Updates a lambda function with created zip file', function (s) {
        s.plan(1);
        m(mockAWS({
            updateFunctionCode: function (params, cb) {
                s.equal(params.ZipFile, 'zippy');
            }
        }), mockZip({
            generate: function (param) {
                return 'zippy';
            }
        }), ['update', '--resource', testResourceFile]);
    });

    t.test('Updates a lambda function with given name', function (s) {
        s.plan(1);
        m(mockAWS({
            updateFunctionCode: function (params, cb) {
                s.equal(params.FunctionName, 'functionName');
            }
        }), mockZip(), ['update', '--name', 'functionName', '--resource', testResourceFile]);
    });

    t.test('Updates a lambda function after settng requested region', function (s) {
        s.plan(2);
        var regionSet = false;
        m(mockAWS({
            configUpdate: function (params) {
                s.equal(params.region, 'australia');
                regionSet = true;
            }
            , updateFunctionCode: function (params, cb) {
                s.ok(regionSet, 'region set before creating function');
            }
        }), mockZip(), ['update', '--resource', testResourceFile, '--region', 'australia']);
    });

    t.test('Creates a zip file with s3location if provided ', function (s) {
        s.plan(1);
        m(mockAWS(), mockZip({
            file: function (path, data) {
                if (path === 's3Location.json') {
                    s.deepEqual(JSON.parse(data.toString()), testS3Location);
                }
            }
        }), ['update', '--s3location', testS3LocationFile]);
    });
});


