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

var run = module.exports = Promise.method(function (AWS, args) {
    var iam = new AWS.IAM();

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
    return 'ok';
});

if (!module.parent) {
    run(require('../lib/aws'), process.argv.slice(2))
        .catch(function (err) {
            process.exit(1);
        });
}


