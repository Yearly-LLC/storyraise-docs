// Modular (v9+) Firebase API over the in-memory fake in fake-firebase.js.
//
// The Collect app bundles the modular SDK into main.js, so it cannot be swapped at the
// script tag the way the builder's Firebase 7 is. harness.mjs patches main.js as it is
// served: the five firebase/* module factories in webpack's registry are replaced with
// ones that export window.__SR_FAKE_MODULAR, defined here. Every call lands on the same
// in-memory RTDB / Firestore / auth, so nothing reaches production.
(function () {
    const fb = window.firebase; // the fake compat SDK from fake-firebase.js
    const missing = window.__SR_FAKE_MISSING;
    const writes = window.__SR_FAKE_WRITES;
    let defaultApp = null;
    const appOf = () => defaultApp || (defaultApp = fb.initializeApp({}));

    // A modular snapshot: exists() is a method (compat Firestore has a boolean).
    const wrapDocSnap = (s) => ({
        id: s.id, ref: s.ref, metadata: s.metadata,
        exists: () => s.exists, data: () => s.data(), get: (f) => s.get(f),
    });
    const wrapQuerySnap = (q) => ({
        docs: q.docs.map(wrapDocSnap), size: q.size, empty: q.empty,
        forEach: (cb) => q.docs.map(wrapDocSnap).forEach(cb), docChanges: () => [],
    });
    const path = (args) => args.filter((a) => typeof a === 'string').join('/');

    const app = {
        initializeApp: (opts, name) => (defaultApp = fb.initializeApp(opts, name)),
        getApp: () => appOf(),
        getApps: () => fb.apps,
        SDK_VERSION: '11.10.0',
    };

    const database = {
        getDatabase: () => fb.database(appOf()),
        ref: (db, p) => (db && db.ref ? db.ref(p || '') : fb.database().ref(p || '')),
        child: (r, p) => r.child(p),
        get: (r) => r.once('value'),
        set: (r, v) => r.set(v),
        update: (r, v) => r.update(v),
        remove: (r) => r.remove(),
        push: (r, v) => (v === undefined ? r.push() : r.push(v)),
        onValue: (r, cb) => { r.on('value', cb); return () => {}; },
        onChildAdded: (r, cb) => { r.on('child_added', cb); return () => {}; },
        onChildChanged: () => () => {},
        onChildRemoved: () => () => {},
        off: () => {},
        query: (r) => r,
        orderByChild: () => null, equalTo: () => null, limitToLast: () => null,
        serverTimestamp: () => ({ '.sv': 'timestamp' }),
    };

    const firestore = {
        getFirestore: () => fb.firestore(),
        // collection(db, 'o', slug, 'constituents') or collection(docRef, 'sub').
        collection: (base, ...rest) => {
            const prefix = base === fb.firestore() ? '' : String(base.path) + '/';
            return fb.firestore().collection(prefix + path(rest));
        },
        // doc(db, 'o', slug), doc(collRef, id), or doc(collRef) for a new id.
        doc: (base, ...rest) => {
            if (base === fb.firestore()) return fb.firestore().doc(path(rest));
            return rest.length ? base.doc(path(rest)) : base.doc();
        },
        getDoc: (d) => d.get().then(wrapDocSnap),
        getDocs: (q) => q.get().then(wrapQuerySnap),
        setDoc: (d, v, o) => d.set(v, o),
        updateDoc: (d, v) => d.update(v),
        deleteDoc: (d) => d.delete(),
        addDoc: (c, v) => c.add(v),
        onSnapshot: (r, cb) => r.onSnapshot((s) => cb(s.docs ? wrapQuerySnap(s) : wrapDocSnap(s))),
        query: (c) => c, where: () => null, orderBy: () => null, limit: () => null,
        arrayUnion: (...a) => ({ __fv: 'arrayUnion', a }),
        arrayRemove: (...a) => ({ __fv: 'arrayRemove', a }),
        serverTimestamp: () => ({ __fv: 'serverTimestamp' }),
        increment: (n) => ({ __fv: 'increment', n }),
    };

    const storage = {
        getStorage: () => fb.storage(),
        ref: (st, p) => fb.storage().ref(p || ''),
        uploadString: (r) => { writes.push({ db: 'storage', op: 'uploadString', path: r.fullPath }); return Promise.resolve({ ref: r }); },
        uploadBytes: (r) => { writes.push({ db: 'storage', op: 'uploadBytes', path: r.fullPath }); return Promise.resolve({ ref: r }); },
        uploadBytesResumable: (r) => r.put(),
        // An upload "succeeds" with the local photo the harness names, so previews render.
        getDownloadURL: () => (window.__SR_FAKE_DOWNLOAD_URL ? Promise.resolve(window.__SR_FAKE_DOWNLOAD_URL) : Promise.reject(new Error('fake storage'))),
    };

    const authInst = () => fb.auth();
    function Provider() { return { addScope() {}, setCustomParameters() {} }; }
    const auth = {
        getAuth: () => authInst(),
        onAuthStateChanged: (a, cb) => authInst().onAuthStateChanged(cb),
        signInWithCustomToken: () => Promise.resolve({ user: authInst().currentUser }),
        signInWithEmailAndPassword: () => Promise.resolve({ user: authInst().currentUser }),
        signInWithPopup: () => Promise.resolve({ user: authInst().currentUser }),
        setPersistence: () => Promise.resolve(),
        browserLocalPersistence: 'local',
        signOut: () => Promise.resolve(),
        sendPasswordResetEmail: () => Promise.resolve(),
        GoogleAuthProvider: Provider,
        EmailAuthProvider: { credential: () => ({}) },
        PhoneAuthProvider: Provider,
        PhoneMultiFactorGenerator: { assertion: () => ({}) },
        RecaptchaVerifier: function () { return { render: () => Promise.resolve(0), clear() {} }; },
        getMultiFactorResolver: () => ({ hints: [], resolveSignIn: () => Promise.resolve({}) }),
        reauthenticateWithCredential: () => Promise.resolve({}),
        reauthenticateWithPopup: () => Promise.resolve({}),
    };

    const lenientModule = (name, m) => new Proxy(m, {
        get(t, k) { if (k in t || typeof k === 'symbol') return t[k]; missing.add(`modular.${name}.${String(k)}`); return () => Promise.resolve(); },
    });
    window.__SR_FAKE_MODULAR = {
        app: lenientModule('app', app), database: lenientModule('database', database),
        firestore: lenientModule('firestore', firestore), storage: lenientModule('storage', storage),
        auth: lenientModule('auth', auth),
    };
})();
