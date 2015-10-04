"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var s3locationlib = require('./s3location');
var route53PolicyStatements = require('./route53PolicyStatements');
var ec2PolicyStatements = require('./ec2PolicyStatements');
var s3PolicyStatements = require('./s3PolicyStatements');

var m = module.exports = function (params) {
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
            if (s3location) {
                return s3locationlib.download(AWS, {
                    s3location: s3location
                })
                    .then(function (resource) {
                        return resolve([resource, s3location]);
                    });
            } else {
                if (!resource) {
                    return reject(new Error('resource or s3location is required for createPolicy.'));
                } else {
                    return resolve([resource]);
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

