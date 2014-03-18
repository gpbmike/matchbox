Matchbox
=======
Matchbox is an [Ember Data adapter](http://emberjs.com/api/data/classes/DS.Adapter.html) for [Firebase](http://www.firebase.com) based on [EmberFire](https://github.com/firebase/emberFire). The goal is to have a seemless Ember Data experience. Other than data being updated automatically, you should not notice any other significant differences between a vanilla `DS.Adapter` and `DS.FirebaseAdapter`.

Usage
-----
```javascript
App.MyAdapter = DS.FirebaseAdapter.extend({
  firebase: new Firebase("https://<my-firebase>.firebaseio.com/")
});
```

Features
--------
* Data will flow to Firebase on `Model.save()`
* Changes in Firebase will flow into Ember for records that are in the store using `store.find()` and `store.findAll()`.
