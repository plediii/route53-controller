#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var minimist = require('minimist');
var route53PolicyStatements = require('../lib/route53PolicyStatements');
var ec2PolicyStatements = require('../lib/ec2PolicyStatements');
var s3location = require('../lib/s3location');
var s3PolicyStatements = require('../lib/s3PolicyStatements');
var getResourceDefinition = require('../lib/getResourceDefinition');

var run = module.exports = function (AWS, args) {
    var iam = new AWS.IAM();

    var argv = require('minimist')(process.argv.slice(2));
    if (!argv.hasOwnProperty('s3location') && !argv.hasOwnProperty('resource'))  {
        console.log('Create a policy for route53 controller.');
        console.log('Usage: ' + process.argv.slice(0, 2).join(' ') + ' [options]');
        console.log('');
        console.log('Options: ');
        console.log(' --s3location s3location.json        Add policy permissions to access the resources at a specific s3 location.');
        console.log(' --resource resource.json            If s3location is not provided, resource.json is required for the HostedZoneId.');
        console.log(' --createPolicy policyName           Create an IAM policy with the given name.');
        console.log(' --userPolicy userName               Attach the policy inline to the given IAM user.');
        console.log(' --rolePolicy roleName               Attach the policy inline to the given IAM role.');
        console.log('');
        return Promise.reject();
    }

    var getResourceParams;
    if (argv.hasOwnProperty('resource')) {
        // prefer to read from local copy
        getResourceParams = {
            resource: argv.resource
        };
    } else {
        getResourceParams = {
            s3Location: argv.s3location
        };
    }

    var getPolicyStatements = getResourceDefinition(getResourceParams)
        .then(function (resource) {
            return route53PolicyStatements(resource).concat(ec2PolicyStatements());
        });

    if (argv.hasOwnProperty('s3location')) {
        getPolicyStatements = getPolicyStatements.then(function (statements) {
            return s3location.read(argv.s3location)
                .then(function (s3Location) {
                    return statements.concat(s3PolicyStatements(s3Location));
                });
        });
    }
    var policyDescription = 'Policy for modifying route53 record sets created by route53-controller';

    getPolicyStatements
        .then(function (statements) {
            return {
                "Version": "2012-10-17",
                "Statement": statements
            };
        })
        .then(function (policy) {
            var policyDocument = JSON.stringify(policy, null, 4);
            console.log('Policy:');
            console.log(policyDocument);
            var policyName = 'route53-controller';
            if (argv.hasOwnProperty('createPolicy')) {
                policyName = argv.createPolicy;
                return new Promise(function (resolve, reject) {
                    return iam.createPolicy({
                        PolicyDocument: policyDocument
                        , PolicyName: policyName
                        , Description: policyDescription
                    }, function (err, data) {
                        if (err) {
                            return reject(err);
                        } else {
                            console.log('Created policy ', policyName);
                            return data;
                        }
                    });
                });
            } else if (argv.hasOwnProperty('userPolicy')) {
                var userName = argv.userPolicy;
                policyName = 'route53-controller';
                return new Promise(function (resolve, reject) {
                    return iam.putUserPolicy({
                        PolicyDocument: policyDocument
                        , PolicyName: policyName
                        , UserName: userName
                    }, function (err, data) {
                        if (err) {
                            return reject(err);
                        } else {
                            console.log('Created policy named ' + policyName + ' for user ' + userName + '.');
                            return data;
                        }
                    });
                });
            } else if (argv.hasOwnProperty('rolePolicy')) {
                var roleName = argv.rolePolicy;
                policyName = 'route53-controller';
                return new Promise(function (resolve, reject) {
                    return iam.putRolePolicy({
                        PolicyDocument: policyDocument
                        , PolicyName: policyName
                        , RoleName: roleName
                    }, function (err, data) {
                        if (err) {
                            return reject(err);
                        } else {
                            console.log('Created policy named ' + policyName + ' for role ' + roleName + '.');
                            return data;
                        }
                    });
                });
            } else {

            }
        })
        .catch(function (err) {
            console.error('Error: ', err, err.stack);
            process.exit(1);
        });
};

if (!module.parent) {
    run(require('../lib/aws'), process.argv.slice(2))
        .catch(function (err) {
            process.exit(1);
        });
}


