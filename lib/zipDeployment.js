/* global -Promise */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var pathlib = require('path');
var zipAssemble = require('./zipAssemble');
 
var rootPath = pathlib.join(__dirname, '..');

module.exports = function (zip, params) {
    zipAssemble(zip, pathlib.join(__dirname, '..'), [
        { file: 'lambda-index.js' }
        , { file: 'index.js' }
        , { folder: 'lib' }
        , { folder: 'node_modules/aws-sdk' }
        , { folder: 'node_modules/bluebird' }
        , { folder: 'node_modules/lodash' }
        , { folder: 'node_modules/moment' }
    ]);
    if (params) {
        if (params.s3Location) {
            zip.file('s3Location.json', JSON.stringify(params.s3Location, null, 4));
        }
        if (params.resource) {
            zip.file('resource.json', JSON.stringify(params.resource, null, 4));
        }
    }
    return Promise.resolve(zip.generate({ type: 'nodebuffer' }));
};



