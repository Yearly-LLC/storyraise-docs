// In-memory stand-in for the Firebase 7 web SDK (app, auth, database, firestore,
// functions, storage, analytics), served in place of firebase-app.js during captures.
//
// Seed: window.__SR_FAKE_DB = { rtdb: {...tree}, fs: { 'o/x': {...}, 'o/x/constituents/C1': {...} },
//                               auth: { uid, email, displayName } }
// Reads come from the seed. Writes never leave the page: they are recorded in
// window.__SR_FAKE_WRITES and, for RTDB set/update, applied to the local tree so the
// app reads back what it wrote. Unknown API members are logged to
// window.__SR_FAKE_MISSING and answer with a harmless resolved chain.
(function () {
    if (window.firebase && window.firebase.__fake) return;
    const seed = window.__SR_FAKE_DB || { rtdb: {}, fs: {}, auth: null };
    const writes = (window.__SR_FAKE_WRITES = []);
    const missing = (window.__SR_FAKE_MISSING = new Set());
    const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    const split = (p) => String(p || '').split('/').filter(Boolean);
    const tick = (fn) => setTimeout(fn, 0);

    // Unknown members: a callable proxy that chains and resolves to undefined.
    function chain(name) {
        const f = function () { return chain(name); };
        return new Proxy(f, {
            get(t, k) {
                if (k === 'then') return (res) => Promise.resolve(undefined).then(res);
                if (k === 'catch' || k === 'finally') return () => Promise.resolve(undefined);
                if (typeof k === 'symbol') return undefined;
                return chain(`${name}.${String(k)}`);
            },
            apply() { return chain(name); },
        });
    }
    function lenient(obj, name) {
        return new Proxy(obj, {
            get(t, k) {
                if (k in t || typeof k === 'symbol' || k === 'then' || k === 'toJSON') return t[k];
                missing.add(`${name}.${String(k)}`);
                return chain(`${name}.${String(k)}`);
            },
        });
    }

    // ---------------- Realtime Database ----------------
    const tree = { root: clone(seed.rtdb) || {} };
    const getAt = (parts) => parts.reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree.root);
    const setAt = (parts, value) => {
        if (!parts.length) { tree.root = value; return; }
        let n = tree.root;
        for (const k of parts.slice(0, -1)) { if (!n[k] || typeof n[k] !== 'object') n[k] = {}; n = n[k]; }
        if (value === null || value === undefined) delete n[parts[parts.length - 1]]; else n[parts[parts.length - 1]] = value;
    };
    let pushCounter = 0;
    function dataSnapshot(key, value, ref) {
        const val = value === undefined ? null : value;
        return lenient({
            key,
            ref,
            val: () => clone(val),
            exportVal: () => clone(val),
            exists: () => val !== null,
            hasChildren: () => !!val && typeof val === 'object' && Object.keys(val).length > 0,
            hasChild: (p) => getIn(val, split(p)) !== undefined,
            numChildren: () => (val && typeof val === 'object' ? Object.keys(val).length : 0),
            child: (p) => dataSnapshot(split(p).slice(-1)[0], getIn(val, split(p)), ref && ref.child(p)),
            forEach: (cb) => {
                if (!val || typeof val !== 'object') return false;
                for (const k of orderKeys(val, ref && ref.__order)) { if (cb(dataSnapshot(k, val[k], ref && ref.child(k))) === true) return true; }
                return false;
            },
        }, 'DataSnapshot');
    }
    const getIn = (v, parts) => parts.reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), v);
    function orderKeys(val, order) {
        const keys = Object.keys(val);
        if (order && order.child) {
            keys.sort((a, b) => {
                const x = getIn(val[a], split(order.child)); const y = getIn(val[b], split(order.child));
                return x === y ? 0 : x === undefined ? -1 : y === undefined ? 1 : x < y ? -1 : 1;
            });
        }
        return keys;
    }
    function applyQuery(val, q) {
        if (!q || !val || typeof val !== 'object') return val;
        let keys = orderKeys(val, q);
        if (q.equalTo !== undefined && q.child) keys = keys.filter((k) => getIn(val[k], split(q.child)) === q.equalTo);
        if (q.limitToLast) keys = keys.slice(-q.limitToLast);
        if (q.limitToFirst) keys = keys.slice(0, q.limitToFirst);
        return Object.fromEntries(keys.map((k) => [k, val[k]]));
    }
    function dbRef(path, q) {
        const parts = split(path);
        const ref = {
            key: parts.length ? parts[parts.length - 1] : null,
            path: '/' + parts.join('/'),
            __order: q,
            toString: () => `fake://rtdb/${parts.join('/')}`,
            get parent() { return parts.length ? dbRef(parts.slice(0, -1).join('/')) : null; },
            get root() { return dbRef(''); },
            child: (p) => dbRef([...parts, ...split(p)].join('/')),
            once: (event, cb, errCb) => {
                const snap = dataSnapshot(ref.key, applyQuery(clone(getAt(parts)), q), ref);
                return new Promise((resolve) => tick(() => { if (typeof cb === 'function') cb(snap); resolve(snap); }));
            },
            on: (event, cb) => {
                if (event === 'value') tick(() => cb(dataSnapshot(ref.key, applyQuery(clone(getAt(parts)), q), ref)));
                else if (event === 'child_added') tick(() => {
                    const v = applyQuery(clone(getAt(parts)), q);
                    if (v && typeof v === 'object') for (const k of orderKeys(v, q)) cb(dataSnapshot(k, v[k], ref.child(k)));
                });
                return cb;
            },
            off: () => {},
            get: () => ref.once('value'),
            set: (value) => { writes.push({ db: 'rtdb', op: 'set', path: ref.path, value: clone(value) }); setAt(parts, clone(value)); return Promise.resolve(); },
            update: (value) => {
                writes.push({ db: 'rtdb', op: 'update', path: ref.path, value: clone(value) });
                for (const [k, v] of Object.entries(value || {})) setAt([...parts, ...split(k)], clone(v));
                return Promise.resolve();
            },
            remove: () => { writes.push({ db: 'rtdb', op: 'remove', path: ref.path }); return Promise.resolve(); },
            push: (value) => {
                const key = `-FAKE${String(++pushCounter).padStart(6, '0')}`;
                const child = ref.child(key);
                writes.push({ db: 'rtdb', op: 'push', path: child.path, value: clone(value) });
                const p = Promise.resolve(child);
                child.then = p.then.bind(p); child.catch = p.catch.bind(p);
                return child;
            },
            transaction: (fn) => { writes.push({ db: 'rtdb', op: 'transaction', path: ref.path }); return Promise.resolve({ committed: false }); },
            onDisconnect: () => lenient({ set: () => Promise.resolve(), remove: () => Promise.resolve(), update: () => Promise.resolve(), cancel: () => Promise.resolve() }, 'OnDisconnect'),
            orderByChild: (c) => dbRef(path, { ...(q || {}), child: c }),
            orderByKey: () => dbRef(path, { ...(q || {}) }),
            orderByValue: () => dbRef(path, { ...(q || {}) }),
            orderByPriority: () => dbRef(path, { ...(q || {}) }),
            equalTo: (v) => dbRef(path, { ...(q || {}), equalTo: v }),
            startAt: () => dbRef(path, q), endAt: () => dbRef(path, q), startAfter: () => dbRef(path, q), endBefore: () => dbRef(path, q),
            limitToLast: (n) => dbRef(path, { ...(q || {}), limitToLast: n }),
            limitToFirst: (n) => dbRef(path, { ...(q || {}), limitToFirst: n }),
            isEqual: (o) => o && o.path === ref.path,
        };
        return lenient(ref, 'Reference');
    }
    const databases = {};
    function database(app) {
        const name = (app && app.name) || '[DEFAULT]';
        if (!databases[name]) databases[name] = lenient({ ref: (p) => dbRef(p || ''), refFromURL: (u) => dbRef(new URL(u).pathname), goOffline() {}, goOnline() {}, app }, 'Database');
        return databases[name];
    }
    database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' }, increment: (n) => ({ '.sv': { increment: n } }) };

    // ---------------- Firestore ----------------
    const docs = clone(seed.fs) || {};
    const FieldValue = {
        serverTimestamp: () => ({ __fv: 'serverTimestamp' }),
        arrayUnion: (...a) => ({ __fv: 'arrayUnion', a }),
        arrayRemove: (...a) => ({ __fv: 'arrayRemove', a }),
        increment: (n) => ({ __fv: 'increment', n }),
        delete: () => ({ __fv: 'delete' }),
    };
    class Timestamp {
        constructor(s, ns) { this.seconds = s; this.nanoseconds = ns || 0; }
        toDate() { return new Date(this.seconds * 1000); }
        toMillis() { return this.seconds * 1000; }
        static now() { return Timestamp.fromMillis(Date.now()); }
        static fromDate(d) { return Timestamp.fromMillis(d.getTime()); }
        static fromMillis(ms) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
    }
    const FieldPath = { documentId: () => '__name__' };
    function docSnapshot(path) {
        const parts = split(path);
        const data = docs[parts.join('/')];
        return lenient({
            id: parts[parts.length - 1],
            exists: data !== undefined,
            ref: docRef(path),
            data: () => clone(data),
            get: (f) => getIn(data, String(f).split('.')),
            metadata: { hasPendingWrites: false, fromCache: false },
        }, 'DocumentSnapshot');
    }
    function fsWrite(op, path, value) { writes.push({ db: 'firestore', op, path, value: clone(value) }); return Promise.resolve(); }
    function docRef(path) {
        const parts = split(path);
        const ref = {
            id: parts[parts.length - 1],
            path: parts.join('/'),
            get parent() { return collRef(parts.slice(0, -1).join('/')); },
            collection: (c) => collRef([...parts, ...split(c)].join('/')),
            get: () => new Promise((r) => tick(() => r(docSnapshot(path)))),
            onSnapshot: (a, b) => { const cb = typeof a === 'function' ? a : b; tick(() => cb(docSnapshot(path))); return () => {}; },
            set: (v, o) => fsWrite('set', path, v),
            update: (v) => fsWrite('update', path, v),
            delete: () => fsWrite('delete', path),
            isEqual: (o) => o && o.path === ref.path,
        };
        return lenient(ref, 'DocumentReference');
    }
    function collRef(path, filters = [], limit = 0) {
        const parts = split(path);
        const prefix = parts.join('/') + '/';
        const list = () => {
            let ids = Object.keys(docs).filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'));
            let rows = ids.map((k) => ({ k, d: docs[k] }));
            for (const [f, op, v] of filters) {
                rows = rows.filter(({ k, d }) => {
                    const x = f === '__name__' ? k.slice(prefix.length) : getIn(d, String(f).split('.'));
                    if (op === '==') return x === v;
                    if (op === '!=') return x !== v;
                    if (op === 'array-contains') return Array.isArray(x) && x.includes(v);
                    if (op === 'array-contains-any') return Array.isArray(x) && v.some((y) => x.includes(y));
                    if (op === 'in') return v.includes(x);
                    if (op === '>=') return x >= v;
                    if (op === '<=') return x <= v;
                    if (op === '>') return x > v;
                    if (op === '<') return x < v;
                    return true;
                });
            }
            if (limit) rows = rows.slice(0, limit);
            const snaps = rows.map(({ k }) => docSnapshot(k));
            return lenient({ docs: snaps, size: snaps.length, empty: !snaps.length, forEach: (cb) => snaps.forEach(cb), docChanges: () => [] }, 'QuerySnapshot');
        };
        const ref = {
            id: parts[parts.length - 1],
            path: parts.join('/'),
            doc: (id) => docRef([...parts, id || `FAKE${String(++pushCounter).padStart(6, '0')}`].join('/')),
            add: (v) => { const r = ref.doc(); fsWrite('add', r.path, v); return Promise.resolve(r); },
            where: (f, op, v) => collRef(path, [...filters, [f, op, v]], limit),
            orderBy: () => collRef(path, filters, limit),
            limit: (n) => collRef(path, filters, n),
            limitToLast: (n) => collRef(path, filters, n),
            startAfter: () => collRef(path, filters, limit), startAt: () => collRef(path, filters, limit), endAt: () => collRef(path, filters, limit),
            select: () => collRef(path, filters, limit),
            get: () => new Promise((r) => tick(() => r(list()))),
            onSnapshot: (a, b) => { const cb = typeof a === 'function' ? a : b; tick(() => cb(list())); return () => {}; },
            count: () => ({ get: () => Promise.resolve({ data: () => ({ count: list().size }) }) }),
        };
        return lenient(ref, 'CollectionReference');
    }
    let firestoreInstance = null;
    function firestore() {
        if (!firestoreInstance) firestoreInstance = lenient({
            collection: (p) => collRef(p),
            doc: (p) => docRef(p),
            collectionGroup: (id) => collRef(`__group__/${id}`),
            batch: () => { const b = lenient({ set: () => b, update: () => b, delete: () => b, commit: () => Promise.resolve() }, 'WriteBatch'); return b; },
            runTransaction: (fn) => Promise.resolve(fn(lenient({ get: (r) => r.get(), set() {}, update() {}, delete() {} }, 'Transaction'))),
            settings() {}, enablePersistence: () => Promise.resolve(), clearPersistence: () => Promise.resolve(),
        }, 'Firestore');
        return firestoreInstance;
    }
    firestore.FieldValue = FieldValue;
    firestore.Timestamp = Timestamp;
    firestore.FieldPath = FieldPath;

    // ---------------- Auth ----------------
    const user = seed.auth ? lenient({
        uid: seed.auth.uid,
        email: seed.auth.email,
        displayName: seed.auth.displayName,
        isAnonymous: false,
        emailVerified: true,
        photoURL: null,
        providerData: [],
        metadata: { creationTime: 'Mon, 01 Jan 2024 00:00:00 GMT', lastSignInTime: new Date().toUTCString() },
        getIdToken: () => Promise.resolve('fake-id-token'),
        getIdTokenResult: () => Promise.resolve({ token: 'fake-id-token', claims: seed.auth.claims || {} }),
        reload: () => Promise.resolve(),
        updateProfile: () => Promise.resolve(),
    }, 'User') : null;
    const authInst = lenient({
        currentUser: user,
        onAuthStateChanged: (cb) => { tick(() => cb(user)); return () => {}; },
        onIdTokenChanged: (cb) => { tick(() => cb(user)); return () => {}; },
        setPersistence: () => Promise.resolve(),
        signInWithCustomToken: () => Promise.resolve({ user }),
        signInAnonymously: () => Promise.resolve({ user }),
        signOut: () => Promise.resolve(),
    }, 'Auth');
    function auth() { return authInst; }
    auth.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };
    auth.GoogleAuthProvider = function () { return lenient({ addScope() {}, setCustomParameters() {} }, 'Provider'); };
    auth.OAuthProvider = auth.GoogleAuthProvider;

    // ---------------- Functions / Storage / Analytics ----------------
    function functions() {
        return lenient({
            httpsCallable: (name) => (data) => { writes.push({ db: 'functions', op: 'call', path: name, value: clone(data) }); return Promise.resolve({ data: {} }); },
            useFunctionsEmulator() {},
        }, 'Functions');
    }
    function storageRef(p) {
        return lenient({
            fullPath: p, child: (c) => storageRef(`${p}/${c}`),
            getDownloadURL: () => Promise.reject(new Error('fake storage')),
            put: () => { writes.push({ db: 'storage', op: 'put', path: p }); return lenient({ on() {}, then: (r) => Promise.resolve({ ref: storageRef(p) }).then(r) }, 'UploadTask'); },
            listAll: () => Promise.resolve({ items: [], prefixes: [] }),
            delete: () => Promise.resolve(),
        }, 'StorageRef');
    }
    function storage() { return lenient({ ref: (p) => storageRef(p || ''), refFromURL: (u) => storageRef(u) }, 'Storage'); }
    function analytics() { return lenient({ logEvent() {}, setUserId() {}, setUserProperties() {}, setCurrentScreen() {} }, 'Analytics'); }

    const apps = [];
    const fb = {
        __fake: true,
        SDK_VERSION: '7.13.2',
        apps,
        initializeApp: (options, name) => {
            const app = lenient({ name: name || '[DEFAULT]', options: options || {}, auth, database: () => database(app), firestore, functions, storage, analytics, delete: () => Promise.resolve() }, 'App');
            apps.push(app);
            return app;
        },
        app: (name) => apps.find((a) => a.name === (name || '[DEFAULT]')) || apps[0],
        auth, database, firestore, functions, storage, analytics,
        messaging: () => chain('messaging'),
        performance: () => chain('performance'),
    };
    window.firebase = lenient(fb, 'firebase');
})();
