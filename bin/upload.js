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

// AWS.config.update({region: 'us-east-1'});
// AWS.config.update({region: 'us-west-1'});
var s3 = new AWS.S3();

var argv = require('minimist')(process.argv.slice(2));
if (argv._.length !== 2) {
    console.error('Upload a route resource defintion to a location described by an s3location file.');
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' s3location.json resource.json');
    process.exit(1);
}
var s3Path = argv._[0];
var resourcePath = argv._[1];
Promise.join(require('../lib/resourceDefinition').read(resourcePath)
             , require('../lib/s3location').read(s3Path)
             , function (resource, s3location) {
                 return new Promise(function (resolve, reject) {
                     return s3.upload({
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
             })
            .then(function (data) {
                console.log('Done.', data);
            })
            .catch(function (err) {
                console.error('Error: ', err, err.stack);
            });


