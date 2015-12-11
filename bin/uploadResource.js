#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var minimist = require('minimist');

var run = module.exports = Promise.method(function (AWS, args) {
    var argv = require('minimist')(args);
    if (!argv.hasOwnProperty('s3location') || !argv.hasOwnProperty('resource'))  {
        console.error([
            '',
            'Upload resource.json to s3location.',
            '',
            'Usage: uploadResource --resource resource.json --s3location s3location.json',
            '',
            '',
        ].join('\n'));
        throw new Error('Invalid arguments, s3location and resource required.');
    }
    return Promise.join(require('../lib/resourceDefinition').read(argv.resource)
                 , require('../lib/s3location').read(argv.s3location)
                 , function (resource, s3location) {
                     return new Promise(function (resolve, reject) {
                         return (new AWS.S3()).upload({
                             Bucket: s3location.Bucket
                             , Key: s3location.Key
                             , Body: JSON.stringify(resource)
                         }, function (err, data) {
                             if (err) {
                                 return reject(err);
                             } else {
                                 return resolve(data);
                             }
                         });
                     });
                 });
});

if (!module.parent) {
    run(require('../lib/aws'), process.argv.slice(2))
    .then(function(data) {
        console.log('Success.', data);
    })
        .catch(function (err) {
            console.error('Error: ', err, err.stack);
            process.exit(1);
        });
}
