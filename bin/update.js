#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var minimist = require('minimist');
var updateRecordSets = require('../lib/updateRecordSets');

var argv = require('minimist')(process.argv.slice(2));
if (!(argv.hasOwnProperty('resource') || argv.hasOwnProperty('s3location'))) {
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' [--resource resource.json] [--s3location location.json]');
    console.error(' Provide the resource definitions either in a local file (via --resource), or at an s3 location  (--s3location)');
    process.exit(1);
}

updateRecordSets({
    s3Location: argv.s3location
    , resource: argv.resource
})
    .then(function (data) {
        console.log('Done.', data);
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });
