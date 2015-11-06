"use strict";

var test = require('tape');
var fs = require('fs');
var m = require('../../lib/zipAssemble');
var _ = require('lodash');
var pathlib = require('path');

test('zipAssemble', function (t) {

    var mockZip = function (params) {
        var nop = function () {};
        return {
            file: params.file ||  nop
            , folder: params.folder || nop
            , generate: params.generate || nop
        };
    };

    var testPath = pathlib.join(__dirname, '..', 'data');

    t.test('Zips a file', function (s) {
        s.plan(1);
        m(mockZip({
            file: function () {
                s.pass('called zip.file');
            }
        }), testPath, [{ file: 'resource.json' }]);
    });


    t.test('Zips multiple files', function (s) {
        s.plan(3);
        m(mockZip({
            file: function () {
                s.pass('called zip.file');
            }
        }), testPath, [
            { file: 'resource.json' }
            , { file: 's3location.json' }
            , { file: 'subdir/test.txt' }
        ]);
    });

    t.test('Places file in root path', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path) { 
                s.equal(path, 'resource.json');
            }
        }), testPath, [{ file: 'resource.json' }]);
    });

    t.test('Places subdir file in appropriate path', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path) { 
                s.equal(path, 'subdir/test.txt');
            }
        }), testPath, [{ file: 'subdir/test.txt' }]);
    });

    t.test('Zips a folder recursively', function (s) {
        s.plan(4);
        m(mockZip({
            file: function (path) {
                if (path === 'subdir/test.txt') {
                    s.pass('found folder file');
                }
                if (path === 'subdir/subsubdir/subtest.txt') {
                    s.pass('found folder file');
                }
            }
            , folder: function (path) {
                if (path === 'subdir') {
                    s.pass('added subdir');
                }
                if (path === 'subdir/subsubdir') {
                    s.pass('added subsubdir');
                }
            }
        }), testPath, [{ folder: 'subdir' }]);
    });

    t.test('Places file with expected contents', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path, data) { 
                s.equal(fs.readFileSync(testPath + '/resource.json'), data);
            }
        }), testPath, [{ file: 'resource.json' }]);
    });

    t.test('Allows overriding contents with custom data', function (s) {
        s.plan(1);
        m(mockZip({
            file: function (path, data) { 
                s.equal('custom', data);
            }
        }), testPath, [{
            file: 'resource.json'
            , data: 'custom'
        }]);
    });

    t.test('Throws exception if file does not exist', function (s) {
        s.plan(1);
        s.throws(function () {
            m(mockZip({}), testPath, [{ file: 'notexist.json' }]);
        });
    });

    // t.test('Resolves to zip after adding file', function (s) {
    //     s.plan(1);
    //     var fileAdded = false;
    //     var zip = mockZip({
    //         file: function (path, data) { 
    //             fileAdded = true;
    //         }
    //     });
    //     m(zip, testPath, [{ file: 'resource.json' }])
    //     s.equal(zip, );
    // });

    // t.test('Generates zip after adding file', function (s) {
    //     s.plan(1);
    //     var fileAdded = false;
    //     m(mockZip({
    //         file: function (path, data) { 
    //             fileAdded = true;
    //         }
    //         , generate: function () {
    //             s.ok(fileAdded);
    //         }
    //     }), testPath, [{ file: 'resource.json' }]);
    // });

    // t.test('Generates nodebuffer', function (s) {
    //     s.plan(1);
    //     m(mockZip({
    //         generate: function (param) {
    //             s.equal(param.type, 'nodebuffer');
    //         }
    //     }), testPath, [{ file: 'resource.json' }]);
    // });

    // t.test('Returns the generated result', function (s) {
    //     s.plan(1);
    //     var result = m(mockZip({
    //         generate: function (param) {
    //             return 'result';
    //         }
    //     }), testPath, [{ file: 'resource.json' }]);
    //     s.equal(result, 'result');
    // });


    
});

