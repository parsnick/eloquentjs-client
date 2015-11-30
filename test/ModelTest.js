import {expect} from 'chai';
import sinon from 'sinon';
import Model from '../src/Eloquent/Model';
import EloquentBuilder from '../src/Eloquent/Builder';

/** @test {Model} */
describe('Model', function () {

    let Person;
    let person;
    let attributes = {
        name: 'Dave',
        email: 'dave@example.com'
    };

    beforeEach(function () {
        Person = class extends Model {};
        person = new Person(attributes);
        person.exists = true;
    });

    it('exposes attributes as public properties', function () {
        expect(person.name).to.equal('Dave');
    });

    /** @test {Model#getAttributes} */
    it('gets all its attributes', function () {
        expect(person.getAttributes()).to.eql(attributes)
    });

    /** @test {Model#setAttributes} */
    it('can have its attributes changed', function () {
        person.setAttribute('name', 'Dorothy');
        expect(person.name).to.equal('Dorothy');

        person.name = 'Doris';
        expect(person.getAttribute('name')).to.equal('Doris');
    });

    /** @test {Model#getDirty} */
    it('gets the changed attributes', function () {
        person.name = 'Donna';
        expect(person.getDirty()).to.eql({
            name: 'Donna'
        });
    });

    context('when a column is date', function () {
        it('is casts to a Date object', function () {
            let person = new Person({ created_at: '2015-11-23T12:11:03+0000'});
            expect(person.created_at).to.be.an.instanceOf(Date);
        });

        it('can be configured on the class object', function () {
            let Dog = class extends Model {};
            Dog.dates = ['birthday'];
            let buster = new Dog({ birthday: '2015-11-23T12:11:03+0000'});
            expect(buster.birthday).to.be.an.instanceOf(Date);
        });
    });

    /** @test {Model#fill} */
    it('fills the model from an attributes object', function () {
        person.fill({ name: 'Bob' });
        expect(person.name).to.equal('Bob');
    });

    /** @test {Model#newQuery} */
    it('gets a new query builder from a model instance', function () {
        let builder = person.newQuery();
        expect(builder).to.be.an.instanceOf(EloquentBuilder);
        expect(builder._getModel()).to.equal(person);
    });

    /** @test {Model#query} */
    it('gets a new query builder statically', function () {
        let builder = Person.query();
        expect(builder).to.be.an.instanceOf(EloquentBuilder);
        expect(builder._getModel()).to.be.an.instanceOf(Person);
    });

    describe('query builder', function () {
        it('proxies query methods to a new builder instance', function () {
            expect(person.where('a', '=', 'b')).to.be.an.instanceOf(EloquentBuilder);
        });

        it('can be called statically', function () {
            expect(Person.where('a', '=', 'b')).to.be.an.instanceOf(EloquentBuilder);
        });
    });

    describe('hydrate()', function () {
        /** @test {Model#hydrate} */
        it('creates an array of models from an array of plain objects', function () {
            let person1 = attributes;
            let person2 = { name: 'Donald', email: 'donald@example.com' };

            let hydrated = person.hydrate([person1, person2]);

            expect(hydrated).to.have.length(2);
            expect(hydrated[0]).to.be.an.instanceOf(Person);
            expect(hydrated[1]).to.be.an.instanceOf(Person);
            expect(hydrated[0].name).to.equal('Dave');
            expect(hydrated[1].name).to.equal('Donald');
        });
    });

    describe('all()', function () {
        /** @test {Model#all} */
        it('fetches all models', function () {
            sinon.stub(EloquentBuilder.prototype, 'get').returns('ALL');
            expect(Person.all()).to.equal('ALL');
        });
    });

    describe('boot()', function () {
        /** @test {Model#boot} */
        it('is called once per model', function () {
            let Dog = class extends Model {};
            let spy = sinon.spy(Dog, 'boot');
            new Dog();
            new Dog();
            expect(spy).to.have.been.calledOnce;
        });

        describe('scoped method', function () {
            let Dog;

            beforeEach(function () {
                Dog = class extends Model {};
                Dog.scopes = ['ofBreed'];
                Dog.boot();
            });

            it('is added to the class', function () {
                expect(Dog.ofBreed).to.be.a('function');
            });

            it('is added to the prototype', function () {
                let rover = new Dog({ name: 'rover' });
                expect(rover.ofBreed).to.be.a('function');
            });

            it('returns a builder object', function () {
                expect(Dog.ofBreed('terrier')).to.be.an.instanceOf(EloquentBuilder);
            });

            it('calls scope() on the builder', function () {
                let spy = sinon.spy(EloquentBuilder.prototype, 'scope');
                Dog.ofBreed('terrier');
                expect(spy).to.have.been.calledWith('ofBreed', ['terrier']);
            });
        });
    });

    describe('create()', function () {
        /** @test {Model#create} */
        it('news up an instance with the given attributes and saves it', function () {
            let stub = sinon.stub(Person.prototype, 'save').resolves();
            let saveRequest = Person.create({ name: 'Flibble' });
            expect(stub).to.have.been.called;
            return expect(saveRequest).to.eventually.be.an.instanceOf(Person);
        });
    });

    /** @test {Model#save} */
    describe('save()', function () {

        let builder;

        beforeEach(function stubBuilder() {
            builder = Person.query();
            sinon.stub(Person.prototype, 'newQuery').returns(builder);
        });

        context('on a non-existing model', function () {

            let model;

            beforeEach(function stubInsert() {
                sinon.stub(builder, 'insert').resolves({ id: 2, name: 'Cat' });
                model = new Person({ name: 'Cat' });
            });

            it('calls insert() on the query builder', function () {
                model.save();
                expect(builder.insert).to.have.been.calledWith(model.getAttributes());
            });

            it('updates the instance with the new attributes from the server', function () {
                return model.save().then(() => expect(model.id).to.equal(2));
            });
        });

        context('on an existing model', function () {

            let model;

            beforeEach(function stubUpdate() {
                sinon.stub(builder, 'update').resolves({ id: 2, name: 'Cat', updated_at: Date.now() });
                model = new Person({ name: 'Cat' });
                model.exists = true;
            });

            it('calls update() on the query builder', function () {
                model.save();
                expect(builder.update).to.have.been.calledWith(model.getAttributes());
            });

            it('uses restful convention for the endpoint', function() {
                model.endpoint = 'api/people';
                model.id = 2;
                model.save();
                expect(builder.endpoint).to.equal('api/people/2');
            });

            it('updates the instance with the new attributes from the server', function () {
                return model.save().then(() => expect(model.id).to.equal(2));
            });
        });
    });

    /** @test {Model#update} */
    it('updates the model attributes and saves it', function() {
        sinon.stub(person, 'save');
        person.update({ name: 'Delia' });
        expect(person.save).to.have.been.called;
        expect(person.name).to.equal('Delia');
    });

    /** @test {Model#delete} */
    it('deletes the model', function() {
        let builder = person.newQuery();
        sinon.stub(person, 'newQuery').returns(builder);
        sinon.stub(builder, 'delete').resolves(true);
        return person.delete().then(response => {
            expect(person.exists).to.equal(false);
            expect(builder.delete).to.have.been.called;
        });
    });

    describe('eventing', function() {
        [
            'creating', 'created', 'updating', 'updated',
            'saving', 'saved', 'deleting', 'deleted'
        ].forEach(observable => {
            it(`registers a ${observable} event handler`, function() {
                let handler = function () {};
                Person[observable](handler);
                expect(Person.events[observable]).to.contain(handler);
            });
        })

        let builder;

        beforeEach(() => {
            builder = stubNewQuery(Person.prototype);
            builder.insert = sinon.stub().resolves();
            builder.update = sinon.stub().resolves();
            builder.delete = sinon.stub().resolves();
        });

        context('when a new model is created', function () {

            it('fires the creating event beforehand', function() {
                let observer = sinon.spy();
                Person.creating(observer);

                Person.create({ name: 'Dave' });

                expect(observer).to.have.been.called;
                expect(observer.args[0][0]).to.be.an.instanceOf(Person);
                expect(observer.args[0][0].exists).to.equal(false);
            });

            it('cancels the creation if event handler returns false', function() {
                let observer = sinon.stub().returns(false);
                Person.creating(observer);

                let request = Person.create({ name: 'Dave' });

                expect(builder.insert).not.to.have.been.called;
                expect(observer.args[0][0].exists).to.equal(false);
                return expect(request).to.eventually.be.rejectedWith('cancelled');
            });

            it('can have any number of observers', function() {
                let observer1 = sinon.spy();
                let observer2 = sinon.spy();
                Person.creating(observer1);
                Person.creating(observer2);

                Person.create({ name: 'Dave' });

                expect(observer1).to.have.been.called.once;
                expect(observer2).to.have.been.called.once;
            });

            it('fires the created event afterwards', function() {
                let observer = sinon.spy();
                Person.created(observer);

                let request = Person.create({ name: 'Dave' });

                expect(observer).not.to.have.been.called; // yet
                return request.then(person => {
                    expect(person.exists).to.be.true;
                    expect(observer).to.have.been.called.once;
                    expect(observer.args[0][0]).to.be.an.instanceOf(Person);
                })
            });
        });

        context('whenever a model is saved', function () {

            it('fires the saving event beforehand', function() {
                let observer = sinon.spy();
                let person = new Person({ name: 'Dave' });
                Person.saving(observer);

                person.save();

                expect(observer).to.have.been.called;
                expect(observer.args[0][0]).to.equal(person);
                expect(observer.args[0][0].exists).to.equal(false);
            });

            it('fires the saved event afterwards', function() {
                let observer = sinon.spy();
                let person = new Person({ name: 'Dave' });
                Person.saved(observer);

                return person.save().then(success => {
                    expect(observer).to.have.been.called;
                    expect(observer.args[0][0]).to.equal(person);
                    expect(observer.args[0][0].exists).to.equal(true);
                })
            });

        });

        context('when a model is updated', function () {

            let person;

            beforeEach(() => {
                person = new Person({ name: 'Dave' });
                person.exists = true;
            })

            it('fires the updating event beforehand', function() {
                let observer = sinon.spy();
                Person.updating(observer);

                person.update({ name: 'Not Dave' });

                expect(observer).to.have.been.called;
                expect(observer.args[0][0]).to.equal(person);
            });

            it('fires the updated event afterwards', function() {
                let observer = sinon.spy();
                Person.updated(observer);

                return person.update({ name: 'Not Dave' }).then(success => {
                    expect(observer).to.have.been.called;
                    expect(observer.args[0][0]).to.equal(person);
                    expect(observer.args[0][0].exists).to.equal(true);
                })
            });
        });

        context('when a model is deleted', function () {

            let person;

            beforeEach(() => {
                person = new Person({ name: 'Dave' });
                person.exists = true;
            })

            it('fires the deleting event beforehand', function() {
                let observer = sinon.spy();
                Person.deleting(observer);

                person.delete();

                expect(observer).to.have.been.called;
                expect(observer.args[0][0]).to.equal(person);
            });

            it('fires the deleted event afterwards', function() {
                let observer = sinon.spy();
                Person.deleted(observer);
                builder.delete.resolves(true);

                return person.delete().then(success => {
                    expect(observer).to.have.been.called;
                    expect(observer.args[0][0]).to.equal(person);
                    expect(observer.args[0][0].exists).to.equal(false);
                })
            });
        });
    });
});

function stubNewQuery(model)
{
    let builder = model.newQuery();
    sinon.stub(model, 'newQuery').returns(builder);
    return builder;
}