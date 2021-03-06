import {expect} from 'chai';
import RestConnection from '../src/Connection/RestConnection';
import mock from './helpers/mockServer';

describe('RestConnection', () => {

    let connection;
    let fixtures = {
        item: { id: 5, name: 'Test' },
        endpoint: mock.url('test/posts')
    };

    beforeEach('setup connection', () => {
        connection = new RestConnection(fixtures.endpoint);
    });

    it('requires an endpoint (URL)', () => {
        expect(() => new RestConnection().url()).to.throw('Endpoint must be set');
        expect(() => connection.url()).not.to.throw();
    });

    /** @test {RestConnection#read} */
    describe('read', () => {

        it('sends GET requests to the endpoint', () => {
            mock({ status: "ok" }, 'test/posts');
            return expect(connection.read()).to.eventually.eql({ status: "ok" });
        });

        it('can fetch by id', () => {
            mock(fixtures.item, 'test/posts/5');
            return expect(connection.read(5)).to.eventually.eql(fixtures.item);
        });

        it('passes the current query in a JSON-encoded query-string parameter', () => {
            mock([], 'test/posts?query=[%22stack%22]');
            return expect(connection.read(['stack'])).to.eventually.eql([]);
        });

    });

    /** @test {RestConnection#create} */
    describe('create()', function () {

        it('makes a POST request with a body of JSONified data', () => {
            mock({ id: 1 }, request => {
                expect(request.method).to.equal('POST');
                expect(request.body).to.eql(JSON.stringify(fixtures.item));
                return true;
            });

            return expect(connection.create(fixtures.item)).to.eventually.eql({ id: 1 });
        });

    });

    /** @test {RestConnection#update} */
    describe('update()', function () {

        let attributes = { age: 50, color: 'green' };

        it('makes a PUT request', function() {
            mock({ updated: true }, request => {
                expect(request.method).to.equal('PUT');
                expect(request.body).to.eql(JSON.stringify(attributes));
                return true;
            });
            return expect(connection.update([], attributes)).to.eventually.eql({ updated: true });
        });

        it('can update by id', () => {
            mock({ updated: 5 }, 'test/posts/5');
            return expect(connection.update(5, attributes)).to.eventually.eql({ updated: 5 });
        });

        it('passes the current query in a JSON-encoded GET parameter', function() {
            mock({ updated: 5 }, 'test/posts?query=[%22stack%22]');
            return expect(connection.update(['stack'], attributes)).to.eventually.eql({ updated: 5 });
        });
    });

    /** @test {RestConnection#delete} */
    describe('delete()', function () {

        it('makes a DELETE request', function() {
            mock({ deleted: 52 }, { DELETE: 'test/posts' });
            return expect(connection.delete(null)).to.eventually.equal(true);
        });

        it('can delete by id', () => {
            mock({ deleted: 1 }, 'test/posts/5');
            return expect(connection.delete(5)).to.eventually.equal(true);
        });

        it('passes the current query in a JSON-encoded GET parameter', function() {
            mock({ deleted: 5 }, 'test/posts?query=[%22stack%22]');
            return expect(connection.delete(['stack'])).to.eventually.equal(true);
        });
    });

});
