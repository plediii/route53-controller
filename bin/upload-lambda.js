#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var zipDeployment = require('../lib/zipDeployment');

var functionName = 'route53-controller';

var argv = require('minimist')(process.argv.slice(2));
if (!((argv.hasOwnProperty('resource') || argv.hasOwnProperty('s3location')) 
      && argv.hasOwnProperty('role'))) {
    console.error('Upload route53-controller Lambda function.');
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' [options]');
    console.error('');
    console.error(' You must provide the resource definitions either in a local file (via --resource), or at an s3 location  (--s3location)');
    console.error('');
    console.error('Options: ');
    console.error(' --resource   resource.json       Provide the resource definition as a component as part of the lambda package.');
    console.error(' --s3location s3location.json     Download the resource defintion from an s3location for each invocation.');
    console.error(' --role roleARN                   (required) ARN of invocation role for the lambda function.');
    console.error(' --name functionName              The unique name of the Lambda function (default: '+ functionName + ')');
    console.error(' --region region                  The AWS region to upload to if different from default.');
    console.error('');
    process.exit(1);
}

functionName = argv.functionName || functionName;

var createFunction = function (params) {
    return new Promise(function (resolve, reject) {
        return lambda.createFunction(params, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

var updateFunctionCode = function (params) {
    return new Promise(function (resolve, reject) {
        return lambda.updateFunctionCode(params, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

var AWS = require('../lib/aws');
if (argv.hasOwnProperty('region')) {
    AWS.config.update({ region: argv.region });
}

var lambda = new AWS.Lambda();
var roleARN = argv.role;

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
        return createFunction({
            Code: {  ZipFile: zipContent }
            , FunctionName: functionName
            , Handler: 'lambda-index.handler'
            , Role: roleARN
            , Description: 'route53-controller Lambda function'
            , Runtime: 'nodejs'
            , Timeout: 10
        })
        .catch(function (err) {
            if (err.code === 'ResourceConflictException') {
                return updateFunctionCode({ 
                    FunctionName: functionName
                    , ZipFile: zipContent 
                });
            } else {
                throw err;
            }
        });
    })
    .then(function (data) {
        console.log('Done.', data);
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });
