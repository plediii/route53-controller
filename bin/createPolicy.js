#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs'));
var minimist = require('minimist');
var createPolicy = require('../lib/createPolicy');
var getResourceDefinition = require('../lib/getResourceDefinition');
var s3location = require('../lib/s3location');

var readParams = function (AWS, params) {
    return getResourceDefinition(AWS, params)
        .then(function (resource) {

            if (params.hasOwnProperty('s3location')) {
                return s3location.read(params.s3location)
                    .then(function (s3location) {
                        return {
                            s3location: s3location
                            , resource: resource
                        };
                    });
            } else {
                return {
                    resource: resource
                };
            }
        });
};

var run = module.exports = Promise.method(function (AWS, args) {
    var argv = require('minimist')(args);
    if (!argv.hasOwnProperty('s3location') && !argv.hasOwnProperty('resource'))  {
        console.error([
            '',
            'Create a policy for route53 controller.  You must provide either --resource or --s3location',
            '',
            'Usage: createPolicy [options]',
            '',
            '',
            'Options: ',
            ' --s3location s3location.json        Add policy permissions to access the resources at a specific s3 location.',
            ' --resource resource.json            If s3location is not provided, resource.json is required for the HostedZoneId.',
            ' --createPolicy policyName           Create an IAM policy with the given name.',
            ' --userPolicy userName               Attach the policy inline to the given IAM user.',
            ' --rolePolicy roleName               Attach the policy inline to the given IAM role.',
            ''
        ].join('\n'));
        throw new Error('Invalid arguments');
    }


    return readParams(AWS, argv)
        .then(function (resourceParams) {
            if (!argv.hasOwnProperty('createPolicy')) {
                return {
                    PolicyDocument: createPolicy.policyBody(AWS, resourceParams)
                };
            } else {
                
            }
        });
});

if (!module.parent) {
    run(require('../lib/aws'), process.argv.slice(2))
        .catch(function (err) {
            process.exit(1);
        });
}


