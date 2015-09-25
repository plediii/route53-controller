#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var minimist = require('minimist');
var updateRecordSets = require('../lib/updateRecordSets');
var getResourceDefinition = require('../lib/getResourceDefinition');

var run = module.exports = function (AWS, args) {
    var argv = require('minimist')(args);
    if (!(argv.hasOwnProperty('resource') || argv.hasOwnProperty('s3location'))) {
        console.error([
            '',
            'Usage: updateRecordSets [--resource resource.json] [--s3location location.json]',
            '',
            '  You must provide the resource definitions either in a local file (via --resource), ',
            '  or at an s3 location  (--s3location)',
            ''
        ].join('\n'));
        return Promise.reject(new Error('Invalid argument'));
    }

    return getResourceDefinition(AWS, {
        s3location: argv.s3location
        , resource: argv.resource
    })
        .then(function (resource) {
            return updateRecordSets(AWS, resource);
        })
        .then(function (data) {
            console.log('Done.', data);
        })
        .catch(function (err) {
            console.error('Error: ', err, err.stack);
            throw err;
        });
};

if (!module.parent) {
    run(require('../lib/aws'), process.argv.slice(2))
        .catch(function (err) {
            process.exit(1);
        });
}
