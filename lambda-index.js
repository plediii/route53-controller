/*jslint node: true */
"use strict";

var r53controller = require('./index');
var fs = require('fs');

exports.paths = {
    resourcePath: './resource.json'
    , s3LocationPath: './s3Location.json'
};

exports.AWS = require('./lib/aws');

exports.handler = function (event, context) {
    var paths = {
        resourcePath: (fs.existsSync(exports.paths.resourcePath) && exports.paths.resourcePath)
        , s3LocationPath: (fs.existsSync(exports.paths.s3LocationPath) && exports.paths.s3LocationPath)
    };
    return r53controller(exports.AWS, paths)
        .then(function (data) {
            context.succeed(data);
        })
        .catch(function (err) {
            context.fail('Error: ' + JSON.stringify(err, null, 4) + JSON.stringify(err.stack, null, 4));
        });
};
