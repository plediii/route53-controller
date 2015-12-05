/*jslint node: true */
"use strict";

var r53controller = require('.');

exports.paths = {
    resourcePath: './resource.json'
    , s3LocationPath: './s3Location.json'
};

exports.AWS = require('./lib/aws');

exports.handler = function (event, context) {
    return r53controller(exports.AWS, exports.paths)
        .then(function (data) {
            context.succeed(data);
        })
        .catch(function (err) {
            context.fail('Error: ' + JSON.stringify(err, null, 4) + JSON.stringify(err.stack, null, 4));
        });
};
