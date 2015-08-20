#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var zipDeployment = require('../lib/zipDeployment');

var outputPath = './lambda.zip';

var argv = require('minimist')(process.argv.slice(2));
if (!(argv.hasOwnProperty('resource') || argv.hasOwnProperty('s3location'))) {
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' --resource resource.json --s3location location.json');
    console.error(' Provide the resource definitions either in a local file (via --resource), or at an s3 location  (--s3location)');
    process.exit(1);
}

var getS3Location = Promise.resolve(false);
var getResource = Promise.resolve(false);
if (argv.hasOwnProperty('resource')) {
    getResource = require('../lib/resourceDefinition').read(argv.resource);
} else {
    getS3Location = require('../lib/s3location').read(argv.s3location);
}


console.log('Zipping...');
Promise.join(getS3Location, getResource
             , function (s3Location, resource) {
                 return zipDeployment({
                     s3Location: s3Location
                     , resource: resource
                 });
             })
    .then(function (zipContent) {
        return fs.writeFileSync(outputPath, zipContent);
    })
    .then(function () {
        console.log('Done.');
        console.log('Created ' + outputPath + '.');
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });




