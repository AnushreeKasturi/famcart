// Security rules tests. Run with: npm run test:rules
// (starts the Firestore emulator, needs Java installed)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

let env;
const MOM = 'mom', DAD = 'dad', ME = 'me', STRANGER = 'stranger';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'famcart-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => env?.cleanup());

const as = (uid) => env.authenticatedContext(uid).firestore();

// Mirrors createCircle() in src/lib/db.ts
async function createCircle(db, uid, id = 'c1', code = 'ABC234') {
  const b = writeBatch(db);
  b.set(doc(db, 'circles', id), { name: 'Home', ownerId: uid, memberIds: [uid], inviteCode: code, createdAt: new Date() });
  b.set(doc(db, 'invites', code), { circleId: id, createdBy: uid });
  b.set(doc(db, 'circles', id, 'lists', 'l1'), { name: 'Groceries', createdBy: uid, createdAt: new Date() });
  await b.commit();
}

beforeEach(async () => {
  await env.clearFirestore();
});

describe('circles', () => {
  test('owner creates circle, invite and first list in one batch', async () => {
    await assertSucceeds(createCircle(as(MOM), MOM));
  });

  test('cannot create a circle on behalf of someone else', async () => {
    await assertFails(setDoc(doc(as(STRANGER), 'circles', 'x'), { name: 'X', ownerId: MOM, memberIds: [MOM], inviteCode: 'Q' }));
  });

  test('join with code, then read lists; stranger cannot read', async () => {
    await createCircle(as(MOM), MOM);
    const dad = as(DAD);
    await assertFails(getDoc(doc(dad, 'circles', 'c1')));
    const invite = await assertSucceeds(getDoc(doc(dad, 'invites', 'ABC234')));
    await assertSucceeds(updateDoc(doc(dad, 'circles', invite.data().circleId), { memberIds: arrayUnion(DAD) }));
    await assertSucceeds(getDocs(collection(dad, 'circles', 'c1', 'lists')));
    await assertFails(getDocs(collection(as(STRANGER), 'circles', 'c1', 'lists')));
  });

  test('invites cannot be listed', async () => {
    await createCircle(as(MOM), MOM);
    await assertFails(getDocs(collection(as(STRANGER), 'invites')));
  });

  test('joining cannot add other people or change the name', async () => {
    await createCircle(as(MOM), MOM);
    const dad = as(DAD);
    await assertFails(updateDoc(doc(dad, 'circles', 'c1'), { memberIds: arrayUnion(DAD, STRANGER) }));
    await assertFails(updateDoc(doc(dad, 'circles', 'c1'), { memberIds: arrayUnion(DAD), name: 'Hacked' }));
  });

  test('my circles query works for members only', async () => {
    await createCircle(as(MOM), MOM);
    const q = (db, uid) => getDocs(query(collection(db, 'circles'), where('memberIds', 'array-contains', uid)));
    const res = await assertSucceeds(q(as(MOM), MOM));
    if (res.size !== 1) throw new Error('expected 1 circle');
    // Querying for someone else's circles is rejected.
    await assertFails(q(as(STRANGER), MOM));
  });

  test('member can leave, but cannot remove others; owner can remove', async () => {
    await createCircle(as(MOM), MOM);
    await updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayUnion(DAD) });
    await updateDoc(doc(as(ME), 'circles', 'c1'), { memberIds: arrayUnion(ME) });
    await assertFails(updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayRemove(ME) }));
    await assertFails(updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayRemove(MOM) }));
    await assertSucceeds(updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayRemove(DAD) }));
    await assertSucceeds(updateDoc(doc(as(MOM), 'circles', 'c1'), { memberIds: arrayRemove(ME) }));
    await assertFails(getDoc(doc(as(ME), 'circles', 'c1')));
  });

  test('owner cannot remove themselves or add members directly', async () => {
    await createCircle(as(MOM), MOM);
    await assertFails(updateDoc(doc(as(MOM), 'circles', 'c1'), { memberIds: arrayRemove(MOM) }));
    await assertFails(updateDoc(doc(as(MOM), 'circles', 'c1'), { memberIds: arrayUnion(STRANGER) }));
  });

  test('only owner renames, regenerates code, deletes', async () => {
    await createCircle(as(MOM), MOM);
    await updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayUnion(DAD) });
    await assertFails(updateDoc(doc(as(DAD), 'circles', 'c1'), { name: 'Dad' }));
    await assertSucceeds(updateDoc(doc(as(MOM), 'circles', 'c1'), { name: 'Our Home' }));

    const mom = as(MOM);
    const b = writeBatch(mom);
    b.delete(doc(mom, 'invites', 'ABC234'));
    b.set(doc(mom, 'invites', 'XYZ789'), { circleId: 'c1', createdBy: MOM });
    b.update(doc(mom, 'circles', 'c1'), { inviteCode: 'XYZ789' });
    await assertSucceeds(b.commit());

    await assertFails(deleteDoc(doc(as(DAD), 'circles', 'c1')));
    await assertSucceeds(deleteDoc(doc(as(MOM), 'circles', 'c1')));
  });

  test("cannot create an invite pointing at someone else's circle", async () => {
    await createCircle(as(MOM), MOM);
    await assertFails(setDoc(doc(as(STRANGER), 'invites', 'EVIL22'), { circleId: 'c1', createdBy: STRANGER }));
  });
});

describe('items', () => {
  const item = (uid) => ({
    name: 'Milk', qty: '2', note: '', addedBy: uid, addedAt: new Date(),
    checked: false, checkedBy: null, checkedAt: null,
  });

  test('members add and tick items; strangers cannot', async () => {
    await createCircle(as(MOM), MOM);
    await updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayUnion(DAD) });
    const ref = (db) => doc(db, 'circles', 'c1', 'lists', 'l1', 'items', 'i1');
    await assertSucceeds(setDoc(ref(as(MOM)), item(MOM)));
    await assertSucceeds(updateDoc(ref(as(DAD)), { checked: true, checkedBy: DAD, checkedAt: new Date() }));
    await assertFails(getDoc(ref(as(STRANGER))));
    await assertFails(updateDoc(ref(as(STRANGER)), { checked: false }));
    await assertFails(setDoc(doc(as(STRANGER), 'circles', 'c1', 'lists', 'l1', 'items', 'i2'), item(STRANGER)));
  });

  test('cannot add an item as someone else or rewrite who added it', async () => {
    await createCircle(as(MOM), MOM);
    await updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayUnion(DAD) });
    const ref = (db, id) => doc(db, 'circles', 'c1', 'lists', 'l1', 'items', id);
    await assertFails(setDoc(ref(as(DAD), 'i1'), item(MOM)));
    await setDoc(ref(as(MOM), 'i2'), item(MOM));
    await assertFails(updateDoc(ref(as(DAD), 'i2'), { addedBy: DAD }));
  });

  test('members can create, rename and delete lists', async () => {
    await createCircle(as(MOM), MOM);
    await updateDoc(doc(as(DAD), 'circles', 'c1'), { memberIds: arrayUnion(DAD) });
    const l = doc(as(DAD), 'circles', 'c1', 'lists', 'l2');
    await assertSucceeds(setDoc(l, { name: 'Party', createdBy: DAD, createdAt: new Date() }));
    await assertSucceeds(updateDoc(l, { name: 'Diwali party' }));
    await assertSucceeds(deleteDoc(l));
    await assertFails(setDoc(doc(as(STRANGER), 'circles', 'c1', 'lists', 'l3'), { name: 'x', createdBy: STRANGER }));
  });
});

describe('profiles', () => {
  test('write own profile only; any signed-in user can read', async () => {
    await assertSucceeds(setDoc(doc(as(MOM), 'users', MOM), { name: 'Mom', emoji: '👩', color: '#fff', email: null }));
    await assertFails(setDoc(doc(as(DAD), 'users', MOM), { name: 'Not mom', emoji: '', color: '', email: null }));
    await assertSucceeds(getDoc(doc(as(DAD), 'users', MOM)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users', MOM)));
  });
});
