"use strict";

var test = require('tape');
var route53PolicyStatements = require('../lib/route53PolicyStatements');

test('route53 statements', function (t) {

    t.test('HostedZone', function (s) {
        s.plan(6);
        var testZone = 'XXX';
        var statements = route53PolicyStatements({
            HostedZone: testZone
        });
        s.equal(1, statements.length);
        var statement = statements[0];
        var effect = statement.Effect;
        s.equal('Allow', effect);
        var actions = statement.Action;
        s.equal(1, actions.length);
        var action = actions[0];
        s.equal("route53:ChangeResourceRecordSets", action);
        var resources = statement.Resource;
        s.equal(1, resources.length);
        var resource = resources[0];
        s.equal('arn:aws:route53:::hostedzone/' + testZone, resource);
    });
});
