#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var AWS = require('../lib/aws');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var minimist = require('minimist');
var route53PolicyStatements = require('../lib/route53PolicyStatements');
var s3location = require('../lib/s3location');
var s3PolicyStatements = require('../lib/s3PolicyStatements');

var iam = new AWS.IAM();
var route53 = new AWS.Route53();

var argv = require('minimist')(process.argv.slice(2));
if (_.keys(argv).length < 2)  {
    console.log('Create a policy for route53 controller.');
    console.log('Usage: ' + process.argv.slice(0, 2).join(' ') + ' --s3location location.json --createPolicy policyName --userPolicy userName --rolePolicy roleName');
    console.log('  If --s3location is provided, the policy will include access to the specified s3 location.');
    console.log('  If --createPolicy is provided, a policy will be created with the given name which can be attached to existing roles and entities.');
    console.log('  If --userPolicy is provided, the policy will be created inline for the given user name.');
    console.log('  If --rolePolicy is provided, the policy will be created inline for the given role name.');
}

var getPolicyStatements;
if (argv.hasOwnProperty('s3location')) {
    getPolicyStatements = s3location.read(argv.s3location)
    .then(function (s3Location) {
        return route53PolicyStatements().concat(s3PolicyStatements(s3Location));
    });
} else {
    getPolicyStatements = Promise.resolve(route53PolicyStatements());
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
        console.log('Policy: ', policyDocument);
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
