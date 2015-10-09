"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var s3locationlib = require('./s3location');
var route53PolicyStatements = require('./route53PolicyStatements');
var ec2PolicyStatements = require('./ec2PolicyStatements');
var s3PolicyStatements = require('./s3PolicyStatements');
var resourceDefinition = require('./resourceDefinition');

var createPolicy = Promise.method(function (iam, document, name, description) {
    return new Promise(function (resolve, reject) {
        return iam.createPolicy({
            PolicyDocument: document
            , PolicyName: name
            , Description: description
        }, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
});

var putUserPolicy = Promise.method(function (iam, user, document, name) {
    return new Promise(function (resolve, reject) {
        return iam.putUserPolicy({
            PolicyDocument: document
            , PolicyName: name
            , UserName: user
        }, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
});

var putRolePolicy = Promise.method(function (iam, role, document, name) {
    return new Promise(function (resolve, reject) {
        return iam.putUserPolicy({
            PolicyDocument: document
            , PolicyName: name
            , RoleName: role
        }, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
});

var m = module.exports = function (AWS, policyName, params) {
    if (!params.hasOwnProperty('resource')) {
        return Promise.reject(new Error('resource parameter required.'));
    }
    return m.policyBody(AWS, params)
    .then(function (policyBody) {
        var iam = new AWS.IAM();
        var policyDocument = JSON.stringify(policyBody, null, 4);
        if (params.hasOwnProperty('userName')) {
            return putUserPolicy(iam, params.userName, policyDocument, policyName, params.description);
        } else {
            return createPolicy(iam, policyDocument, policyName, params.description);
        }
    });
};

_.extend(m, {
    policyBody: Promise.method(function (AWS, params) {
        return new Promise(function (resolve, reject) {
            var resource;
            var s3location;
            if (params.hasOwnProperty('s3location')) {
                s3location = params.s3location;
            } 
            if (params.hasOwnProperty('resource')) {
                resource = params.resource;
            }
            if (s3location && !resource) {
                return s3locationlib.download(AWS, {
                    s3location: s3location
                })
                    .then(function (rawresource) {
                        return resolve([resourceDefinition.parse(rawresource), s3location]);
                    });
            } else {
                if (!resource) {
                    return reject(new Error('resource or s3location is required for createPolicy.'));
                } else {
                    return resolve([resource, s3location]);
                }
            }
        })
            .spread(function (resource, s3location) {
                var statements = ec2PolicyStatements()
                    .concat(route53PolicyStatements({ HostedZone: resource.HostedZone }));
                if (s3location) {
                    statements = statements.concat(s3PolicyStatements(s3location));
                }
                return {
                    "Version": "2012-10-17",
                    "Statement": statements
                };
            });
    })
});

