"use strict";

var test = require('tape');
var fs = require('fs');
var m = require('../../lib/zipDeployment');
var _ = require('lodash');
var pathlib = require('path');

test('zipDeployment', function (t) {

    var mockZip = function (params) {
        var nop = function () {};
        return {
            file: params.file ||  nop
            , folder: params.folder || nop
            , generate: params.generate || nop
        };
    };

    t.test('Zips lambda-index', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path, data) {
                if (path === 'lambda-index.js') {
                    s.pass('Zipped lambda-index');
                }
            }
        }, {}));
    });

    t.test('Zips lib folder', function (s) {
        s.plan(1);
        m(mockZip({
            folder: function (path, data) {
                if (path === 'lib') {
                    s.pass('Zipped lib folder');
                }
            }
        }, {}));
    });

    // t.test('Zips node_modules folder', function (s) {
    //     s.plan(1);
    //     m(mockZip({
    //         folder: function (path, data) {
    //             if (path === 'lib') {
    //                 s.pass('Zipped lib folder');
    //             }
    //         }
    //     }, {}));
    // });

    t.test('Zips s3Location with provided data', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path, data) {
                if (path === 's3Location.json') {
                    s.equal(data, JSON.stringify('s3-data'));
                }
            }
        }), {
            s3Location: 's3-data'
        });
    });

    t.test('Zips resource with provided data', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path, data) {
                if (path === 'resource.json') {
                    s.equal(data, JSON.stringify('resource-data'));
                }
            }
        }), {
            resource: 'resource-data'
        });
    });

    t.test('Generates nodebuffer', function (s) {
        s.plan(1);
        m(mockZip({
            generate: function (param) {
                s.equal(param.type, 'nodebuffer');
            }
        }), {});
    });

    t.test('Returns the generated nodebuffer', function (s) {
        s.plan(1);
        m(mockZip({
            generate: function (param) {
                return 'result';
            }
        }, {}))
        .then(function (result) {
            s.equal(result, 'result', 'returned the generated nodebuffer');
        });
    });
});

