Matchbox
=======
Matchbox is an [Ember Data adapter](http://emberjs.com/api/data/classes/DS.Adapter.html) for [Firebase](http://www.firebase.com) based on [EmberFire](https://github.com/firebase/emberFire). The goal is to have a seemless Ember Data experience. Other than data being updated automatically, you should not notice any other significant differences between a vanilla `DS.Adapter` and `DS.FirebaseAdapter`.

Usage
-----
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/gpbmike/matchbox/master/dist/matchbox.min.js
[max]: https://raw.github.com/gpbmike/matchbox/master/dist/matchbox.js

Include in your web page after [Ember](http://emberjs.com/builds/#/release) and [Ember Data](http://emberjs.com/builds/#/beta):

```html
<script src="ember.js"></script>
<script src="ember-data.js"></script>
<script src="matchbox.js"></script>
```

Use the adapter in your application:

```javascript
App.MyAdapter = DS.FirebaseAdapter.extend({
  firebase: new Firebase("https://<my-firebase>.firebaseio.com/")
});
```

Features
--------
* Data will flow to Firebase on `Model.save()`
* Changes in Firebase will flow into Ember for records that are in the store using `store.find()` and `store.findAll()`.

Developing
----------
In order to run the tests against Matchbox you will need to add a `firebase-config.js` file to the `tests` directory. The file only needs to define `window.firebaseURL` which should be a writable Firebase endpoint.

```javascript
window.firebaseURL = "https://<my-firebase>.firebaseio.com/";
```
