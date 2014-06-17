/*! matchbox - v0.0.0 - 2014-06-17
* https://github.com/gpbmike/matchbox
* Copyright (c) 2014 Mike Horn; Licensed MIT */
(function() {

  "use strict";

  DS.FirebaseSerializer = DS.JSONSerializer.extend();

  /**
    The Firebase adapter allows your store to communicate with the Firebase
    realtime service. To use the adapter in your app, extend DS.FirebaseAdapter
    and customize the endpoint to point to the Firebase URL where you want this
    data to be stored.

    The adapter will automatically communicate with Firebase to persist your
    records as neccessary. Importantly, the adapter will also update the store
    in realtime when changes are made to the Firebase by other clients or
    otherwise.
  */
  DS.FirebaseAdapter = DS.Adapter.extend({
    /**
      Endpoint paths can be customized by setting the Firebase property on the
      adapter:

      ```js
      DS.FirebaseAdapter.reopen({
        firebase: new Firebase("https://<my-firebase>.firebaseio.com/")
      });
      ```

      Requests for `App.Post` would now target `/post`.

      @property firebase
      @type {Firebase}
    */

    init: function() {
      if (!this.firebase || typeof this.firebase != "object") {
        throw new Error("Please set the `firebase` property on the adapter.");
      }
      // If provided Firebase reference was a query (eg: limits), make it a ref.
      this._ref = this.firebase.ref();
      // Keep track of what types `.findAll()` has been called for
      this._findAllMapForType = {};
      // Keep track of what types `.findQuery()` has been called for
      this._findQueryMapForType = {};
    },

    // Uses push() to generate chronologically ordered unique IDs.
    generateIdForRecord: function() {
      return this._ref.push().name();
    },

    /**
      Use the Firebase snapshot.name() as the record id

      @param {Object} snapshot - A Firebase snapshot
      @param {Object} payload - The payload that will be pushed into the store
      @return {Object} payload
    */
    _assignIdToPayload: function(snapshot) {
      var payload = snapshot.val();
      if (payload !== null && typeof payload === 'object' && typeof payload.id === 'undefined') {
        payload.id = snapshot.name();
      }
      return payload;
    },

    /**
      Called by the store to retrieve the JSON for a given type and ID. The
      method will return a promise which will resolve when the value is
      successfully fetched from Firebase.

      Additionally, from this point on, the object's value in the store will
      also be automatically updated whenever the remote value changes.
    */
    find: function(store, type, id) {
      var adapter = this;
      var resolved = false;
      var ref = this._getRef(type, id);
      var serializer = store.serializerFor(type);

      return new Ember.RSVP.Promise(function(resolve, reject) {
        ref.on("value", function(snapshot) {
          var payload = adapter._assignIdToPayload(snapshot);
          var record = store.getById(type, snapshot.name());

          if (!resolved) {
            resolved = true;
            // If this is the first event, resolve the promise.
            if (payload === null) {
              if (store.hasRecordForId(type, id)) {
                Ember.run(function () {
                  store.dematerializeRecord(record);
                });
              }

              Ember.run(null, reject, 'no record was found at %@' + ref.toString());
            }
            else {
              Ember.run(null, resolve, payload);
            }

          } else {

            // Otherwise, update the store.

            // If the snapshot is null, delete the record from the store
            if (payload === null && record && !record.get('isDeleted')) {
              Ember.run(function () {
                record.destroyRecord();
              });
            }
            // Otherwise push it into the store
            else if (payload !== null) {
              Ember.run(function () {
                // store.push(type, serializer.extractSingle(store, type, payload));
                record.setProperties(serializer.extractSingle(store, type, payload)).save();
              });
            }

          }
        }, function(error) {
          // Only called in cases of permission related errors.
          if (!resolved) {
            Ember.run(null, reject, error);
          }
        });
      }, "DS: FirebaseAdapter#find " + type + " to " + ref.toString());
    },

    /**
      Called by the store to retrieve the JSON for all of the records for a
      given type. The method will return a promise which will resolve when the
      value is successfully fetched from Firebase.

      Additionally, from this point on, any records of this type that are added,
      removed or modified from Firebase will automatically be reflected in the
      store.
    */
    findAll: function(store, type) {
      var resolved = false;
      var ref = this._getRef(type);
      var serializer = store.serializerFor(type);
      var self = this;

      function _addChild(snapshot) {
        if (resolved) {
          var obj = snapshot.val();
          obj.id = snapshot.name();
          store.push(type, serializer.extractSingle(store, type, obj));
        }
      }

      function _updateChild(snapshot) {
        var record = store.getById(type, snapshot.name());
        if (resolved && record && !record.get('isDeleted')) {
          record.setProperties(serializer.extractSingle(store, type, snapshot.val())).save();
        }
      }

      function _removeChild(snapshot) {
        var record = store.getById(type, snapshot.name());
        if (resolved && record && !record.get('isDeleted')) {
          record.destroyRecord();
        }
      }

      return new Ember.RSVP.Promise(function(resolve, reject) {

        function _handleError(err) {
          if (!resolved) {
            resolved = true;
            Ember.run(null, reject, err);
          }
        }

        function _value(snapshot) {
          resolved = true;

          var results = Ember.A([]);

          snapshot.forEach(function(child) {
            var record = child.val();
            record.id = child.name();
            results.push(record);
          });

          Ember.run(null, resolve, results);
        }

        // Only add listeners to a type once
        if (Ember.isNone(self._findAllMapForType[type])) {
          self._findAllMapForType[type] = true;
          ref.on("child_added", _addChild, _handleError);
          ref.on("child_changed", _updateChild, _handleError);
          ref.on("child_removed", _removeChild, _handleError);
        }

        ref.once("value", _value, _handleError);

      }, "DS: FirebaseAdapter#findAll " + type + " to " + ref.toString());
    },

    findQuery: function(store, type, query) {
      var resolved = false;
      var ref = this._getRef(type);
      var serializer = store.serializerFor(type);
      var self = this;

      query = query || {};
      if (query.limit) {
        ref = ref.limit(query.limit);
      }
      if (query.startAt) {
        ref = query.startAt === true ? ref.startAt() : ref.startAt(query.startAt);
      }
      if (query.endAt) {
        ref = query.endAt === true ? ref.endAt() : ref.endAt(query.endAt);
      }

      function _addChild(snapshot) {
        if (resolved) {
          var obj = snapshot.val();
          obj.id = snapshot.name();
          store.push(type, serializer.extractSingle(store, type, obj));
        }
      }

      function _updateChild(snapshot) {
        if (resolved && store.hasRecordForId(type, snapshot.name())) {
          store.getById(type, snapshot.name()).setProperties(serializer.extractSingle(store, type, snapshot.val())).save();
        }
      }

      function _removeChild(snapshot) {
        var record = store.getById(type, snapshot.name());
        if (resolved && record) {
          record.destroyRecord();
        }
      }

      return new Ember.RSVP.Promise(function(resolve, reject) {

        function _handleError(err) {
          if (!resolved) {
            resolved = true;
            Ember.run(null, reject, err);
          }
        }

        function _value(snapshot) {
          resolved = true;

          var results = Ember.A([]);

          snapshot.forEach(function(child) {
            var record = child.val();
            record.id = child.name();
            results.push(record);
          });

          Ember.run(null, resolve, results);
        }

        // Only add listeners to a type once
        var typeQuery = type;
        Object.keys(query).forEach(function (key) {
          typeQuery = typeQuery + key + query[key];
        });
        if (Ember.isNone(self._findQueryMapForType[typeQuery])) {
          self._findQueryMapForType[typeQuery] = true;
          ref.on("child_added", _addChild, _handleError);
          ref.on("child_changed", _updateChild, _handleError);
          ref.on("child_removed", _removeChild, _handleError);
        }

        ref.once("value", _value, _handleError);

      }, "DS: FirebaseAdapter#findAll " + type + " to " + ref.toString());
    },

    /**
      Called by the store when a newly created record is saved via the `save`
      method on a model record instance.

      The `createRecord` method serializes the record and send it to Firebase.
      The method will return a promise which will be resolved when the data has
      been successfully saved to Firebase.
    */
    createRecord: function(store, type, record) {
      var data = record.serialize({ includeId: false });
      var ref = this._getRef(type, record.id);
      return new Ember.RSVP.Promise(function(resolve, reject) {
        ref.set(data, function(err) {
          if (err) {
            Ember.run(null, reject, err);
          } else {
            Ember.run(null, resolve);
          }
        });
      }, "DS: FirebaseAdapter#createRecord " + type + " to " + ref.toString());
    },

    /**
      Update is the same as create for this adapter, since the number of
      attributes for a given model does not change.
    */
    updateRecord: function (store, type, record) {
      return this.createRecord.apply(this, arguments);
    },

    // Called by the store when a record is deleted.
    deleteRecord: function(store, type, record) {
      var ref = this._getRef(type, record.id);
      return new Ember.RSVP.Promise(function(resolve, reject) {
        ref.remove(function(err) {
          if (err) {
            Ember.run(null, reject, err);
          } else {
            Ember.run(null, resolve);
          }
        });
      }, "DS: FirebaseAdapter#deleteRecord " + type + " to " + ref.toString());
    },

    /**
      Determines a path fo a given type. To customize, override the method:

      ```js
      DS.FirebaseAdapter.reopen({
        pathForType: function(type) {
          var decamelized = Ember.String.decamelize(type);
          return Ember.String.pluralize(decamelized);
        }
      });
      ```
    */
    pathForType: function(type) {
      var camelized = Ember.String.camelize(type);
      return Ember.String.pluralize(camelized);
    },

    /**
      Returns a Firebase reference for a given type and optional ID.

      By default, it pluralizes the type's name ('post' becomes 'posts'). To
      override the pluralization, see [pathForType](#method_pathForType).

      @method _getRef
      @private
      @param {String} type
      @param {String} id
      @returns {Firebase} ref
    */
    _getRef: function(type, id) {
      var ref = this._ref;
      if (type) {
        ref = ref.child(this.pathForType(type.typeKey));
      }
      if (id) {
        ref = ref.child(id);
      }
      return ref;
    },

    /**
      Keep track of what types `.findAll()` has been called for
      so duplicate listeners aren't added
    */
    _findAllMapForType: undefined,

    /**
      Keep track of what types `.findQuery()` has been called for
      so duplicate listeners aren't added
    */
    _findQueryMapForType: undefined

  });

})();
