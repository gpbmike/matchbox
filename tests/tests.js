var env, store, adapter, Post, Person, Comment, SuperUser;
var firebase = new Firebase(window.firebaseURL);

module("Firebase Adapter", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    SuperUser = DS.Model.extend();

    env = setupStore({
      post      : Post,
      comment   : Comment,
      superUser : SuperUser,
      adapter   : DS.FirebaseAdapter.extend({ firebase: firebase }),
      serializer: DS.FirebaseSerializer.extend()
    });

    store   = env.store;
    adapter = env.adapter;

  },
  teardown: function () {
    firebase.off();
    firebase.remove();
  }
});

asyncTest("adapter#createRecord - saves to [firebaseURL]/[pathForType]/[id]/", function() {
  var id = adapter.generateIdForRecord();

  firebase.once('child_added', function (snapshot) {
    var data = snapshot.val();
    equal(snapshot.name(), "posts", "proper pathForType");
    ok(data[id], "proper ID saved");
    equal(data[id].name, "The Parley Letter", "data saved");
    start();
  });

  store.createRecord('post', { id: id, name: "The Parley Letter" }).save();
});

asyncTest("adapter#find - retrieve data from firebase", function() {
  var id = adapter.generateIdForRecord();

  firebase.child(adapter.pathForType('post')).child(id).set({ name: "The Parley Letter" }, function () {
    store.find('post', id).then(function (post) {
      equal(post.get('id'), id, "ID property retrieved");
      equal(post.get('name'), "The Parley Letter", "name property retrieved");
      start();
    });
  });
});

asyncTest("adapter#find - rejects promise on no data", function() {
  var id = adapter.generateIdForRecord();

  expect(1);

  store.find('post', id).catch(function (reason) {
    ok(reason, 'Failed to find made up ID and gave a reason');
    start();
  });
});

asyncTest("adapter#find - update store on firebase update", function() {
  var id = adapter.generateIdForRecord();

  expect(2);

  Post.reopen({
    didUpdate: function () {
      equal(this.get('name'), "The Fish Letter", "name property updated");
      start();
    }
  });

  var postRef = firebase.child(adapter.pathForType('post')).child(id);
  postRef.set({ name: "The Parley Letter" }, function () {
    store.find('post', id).then(function (post) {
      equal(post.get('name'), "The Parley Letter", "original name set");
      postRef.set({ name: "The Fish Letter" });
    });
  });
});

asyncTest("adapter#find - update store on firebase update (delete)", function() {
  var id = adapter.generateIdForRecord();

  expect(2);

  Post.reopen({
    didDelete: function () {
      ok(this.get('isDeleted'), "post deleted");
      start();
    }
  });

  var postRef = firebase.child(adapter.pathForType('post')).child(id);
  postRef.set({ name: "The Parley Letter" }, function () {
    store.find('post', id).then(function (post) {
      ok(post, "post exists");
      postRef.remove();
    });
  });
});

asyncTest("adapter#findAll - find all records of type in firebase", function() {

  var postRef = firebase.child(adapter.pathForType('post'));

  var data = {};

  ["The Parley Letter", "The Fishy Letter"].forEach(function (name) {
    data[adapter.generateIdForRecord()] = { name: name };
  });

  postRef.update(data, function () {
    store.find('post').then(function (posts) {
      equal(posts.get('length'), 2, "found all posts");
      start();
    });
  });

});

asyncTest("adapter#findAll - update store on firebase update", function() {

  expect(2);

  Post.reopen({
    didUpdate: function () {
      equal(this.get('name'), "The Fishiest Letter", "Store updated");
      start();
    }
  });

  var postRef = firebase.child(adapter.pathForType('post'));

  var data = {};

  ["The Parley Letter", "The Fishy Letter"].forEach(function (name) {
    data[adapter.generateIdForRecord()] = { name: name };
  });

  postRef.update(data, function () {
    store.find('post').then(function (posts) {
      equal(posts.get('length'), 2, "found all posts");
      postRef.child(posts.get('lastObject.id')).set({ name: "The Fishiest Letter" });
    });
  });

});

asyncTest("adapter#findAll - update store on firebase update (add)", function() {

  expect(2);

  var postRef = firebase.child(adapter.pathForType('post'));

  var data = {};

  ["The Parley Letter", "The Fishy Letter"].forEach(function (name) {
    data[adapter.generateIdForRecord()] = { name: name };
  });

  postRef.update(data, function () {
    store.find('post').then(function (posts) {
      equal(posts.get('length'), 2, "found all posts");
      postRef.push({ name: "The Fishiest Letter" }, function () {
        equal(posts.get('lastObject.name'), "The Fishiest Letter", "added post in firebase reflected in store");
        start();
      });
    });
  });

});

asyncTest("adapter#findAll - update store on firebase update (delete)", function() {

  expect(2);

  var postRef = firebase.child(adapter.pathForType('post'));

  var data = {};

  ["The Parley Letter", "The Fishy Letter"].forEach(function (name) {
    data[adapter.generateIdForRecord()] = { name: name };
  });

  postRef.update(data, function () {
    store.find('post').then(function (posts) {
      equal(posts.get('length'), 2, "found all posts");
      postRef.child(posts.get('firstObject.id')).remove(function () {
        equal(posts.get('firstObject.name'), "The Fishy Letter", "removed post in firebase reflected in store");
        start();
      });
    });
  });

});
