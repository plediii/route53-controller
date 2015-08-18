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

var getPolicyStatements;
if (argv.hasOwnProperty('s3location')) {
    getPolicyStatements = s3location.read(argv.s3location)
    .then(function (s3Location) {
        return route53PolicyStatements().concat(s3PolicyStatements(s3Location));
    });
} else {
    getPolicyStatements = Promise.resolve(route53PolicyStatements());
}

getPolicyStatements
    .then(function (statements) {
        console.log(JSON.stringify({
            "Version": "2012-10-17",
            "Statement": statements
        }, null, 4));
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
        process.exit(1);
    });
