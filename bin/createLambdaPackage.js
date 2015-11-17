#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var zipDeployment = require('../lib/zipDeployment');

var outputPath = './lambda.zip';

var run = module.exports =  Promise.method(function (aws, zip, args) {
    var argv = require('minimist')(args);
    if (argv._.length !== 1) {
        console.error([
            '',
            'Create a lambda deloyment package.',
            '',
            'Usage: createLambdaPackage out.zip [options]',
            '',
            '',
            'Options: ',
            ' --s3location s3location.json        Include the s3 location file from the this path.',
            ' --resource resource.json            Include the resource.json from this path.',
            ''
        ].join('\n'));
        throw new Error('output location required.');
    }
    var outputPath = argv._[0];
    return zipDeployment(zip, {
        resource: argv.resource && JSON.parse(fs.readFileSync(argv.resource))
        , s3Location: argv.s3location && JSON.parse(fs.readFileSync(argv.s3location))
    })
        .then(function () {
            return fs.writeFileAsync(outputPath, zip.generate({ type: 'nodebuffer' }));
        })
        .then(function () {
            return outputPath;
        });
});

if (!module.parent) {
    run(require('../lib/aws'), require('jszip')(), process.argv.slice(2))
    .then(function (out) {
        console.log('Created ', out);
    });
}
