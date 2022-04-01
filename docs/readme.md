# AEgis/TQR Framework

AEgis implements *anonymous engagement* as the base capability for TQR. 




## Design

AEgis uses web sockets implemented by Socket.IO to communicate between javascript client and nodejs server.

The server handles calls to Redis Streams directly using ioredis.

### Folder Structure

Files are distributed across appropriate [folders](tqr file structure.drawio).

Beginning with /tests/tests.js, we have method names that refer to an intent prefixed with a 'test' identifier. Each method dereferences the appropriate module with a method name that uses the 'on' prefix instead of the 'test' prefix.

All module methods called by tests.js (or any other client software such as Vue) are Promises.

#### Example: testAddConnections

Here is the code to test adding connections to Redis Streams:

```js
const testAddConnctions = (connections) => {
  log(`Testing onAddConnection with ${connections.length} connections`);
  connections.forEach((connection) => {
    jLog(connection, 'connection');
    app
      .onAddConnection(connection)
      .then((result) => printResults(`Test Passed: new connection`, result))
      .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
  });
  // interesting...adding connections is orthogonal to add promos
  // so to enable the next step in tests, we can pass on the connectionsWithPromos
  // while we are adding connections
  return db.getConnectionsWithPromos();
};
```

> NOTE:
> Our test code uses functional composition partly because it complements Promise chains. For example, `testAddConnections()` gets its input from the `db.getAllConnections()` function (taken from the testData.json file) that precedes it in `testAdds()`:
>
> ```js
> const testAdds = compose(
>   testAddAnon,       // add anonymous connection(s)
>   testAddPromotions, // add promotions to Redis, and pass nothing
>   testAddConnctions, // add connections and pass promotions simultaneously
>   db.getConnections  // first, get data, then pass connections
> );
> ```

The `app.onAddConnection()` function wraps each `connection` in a Promise. The Promise emits an event on `Socket.IO` along with the `country` and `nonce` values from the `connection`. The Promise's `resolve()` function provides thee server with a callback function included in the `socket.emit` function.

```js
const onAddConnection = ({ country, nonce }) =>
  new Promise((resolve) =>
    socket.emit('addConnection', country, nonce, newConn =>
      resolve(newConn)
    )
  );
```

#### Server Code

The `index.js` file manages `Socket.IO` and communicates directly with `Redis Streams`.

The `app.js` connects to `index.js` by resolving this Promise:

```js
const connectMe = () => Promise.resolve(socket.connect());
```

The `index.js` file handles the `socket` in the `io.on('connection')` event handler.

```js
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    jLog(args, event);

    const methods = {
      addConnection: onAddConnection,
      getCountries: onGetCountries,
      getConnections: onGetConnections,
      test: onTest,
      addPromo: onAddPromo,
      getPromos: onGetPromos,
    };

    methods[event](args, socket, io);
  });
  ```

The event handler maps event names (e.g., `addConnection`) to functions inside `index.js` with the methods object. The handler than calls the appropriate function in `index.js` along with the event's arguments. Some functions require a reference to either the `socket` object or the `io` object, as well.

Here is the `onAddConnection()` function for `index.js`:

```js
const onAddConnection = (args, socket) => {
  // strip off any callback function to get properties for Redis
  const props = args.slice(0, -1);
  const ack = args.at(-1);
  const [country, nonce, lastDeliveredId] = props;
  jLog(props, 'props:');

  ae.addConnection(country, nonce)
    .then((id) => joinSocketRoom(socket, country, nonce, lastDeliveredId, id))
    .then((conn) => safeAck(ack, conn));
};
```

First, we separate the argument properties from the callback, then we pass the `country` and `nonce` properties to the Promise in the Redis `ae` client code.

The last Promise in the `addConnection` chain passes the results of the Promise to the `safeAck()` function that confirms the presence of a callback before using that callback to return results to the original caller (viz., `onAddConnection` in `tests.js`). Remember, the client code uses the results of the event's callback as the value of the Promise resolve() function; and the resolve() function returns the value to testAddConnctions() function on the client. A UI would use a different function, of course.

#### Summary

Here is summary of functions:

end user or test function => client Promise => socket event with callback => server event handler => server Promise => Redis Promise. 


### Conventions

Everything in AEgis and TQR are chained together either through socket events, Promise chains, or functional composition. 

By convention, we name events with minimal names such as '`addConnection`' (see above).

Any subsequent event handler maps an event name to an event handler by add 'on' to the event name. See `addConnection:onAddConnection` above.


## Testing
