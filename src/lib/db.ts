import { useEffect, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Circle, GroceryList, Item, Profile } from './types';

// ---------- refs ----------

const userRef = (uid: string) => doc(db, 'users', uid);
const circleRef = (circleId: string) => doc(db, 'circles', circleId);
const inviteRef = (code: string) => doc(db, 'invites', code);
const listsCol = (circleId: string) => collection(db, 'circles', circleId, 'lists');
const listRef = (circleId: string, listId: string) => doc(db, 'circles', circleId, 'lists', listId);
const itemsCol = (circleId: string, listId: string) =>
  collection(db, 'circles', circleId, 'lists', listId, 'items');
const itemRef = (circleId: string, listId: string, itemId: string) =>
  doc(db, 'circles', circleId, 'lists', listId, 'items', itemId);

// Pending server timestamps read back as an estimate instead of null.
const snapOpts = { serverTimestamps: 'estimate' } as const;

function fromDoc<T>(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data(snapOpts) } as T;
}

// ---------- invite codes ----------

// No 0/O/1/I/L so codes are easy to read out loud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length = 6) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function freshInviteCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await getDoc(inviteRef(code));
    if (!existing.exists()) return code;
  }
  throw new Error('Could not generate an invite code, please try again.');
}

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---------- profile ----------

export async function saveProfile(
  uid: string,
  data: { name: string; emoji: string; color: string; email: string | null },
) {
  await setDoc(userRef(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ---------- circles ----------

export async function createCircle(uid: string, name: string) {
  const code = await freshInviteCode();
  const cRef = doc(collection(db, 'circles'));
  const firstList = doc(listsCol(cRef.id));
  const batch = writeBatch(db);
  batch.set(cRef, {
    name: name.trim(),
    ownerId: uid,
    memberIds: [uid],
    inviteCode: code,
    createdAt: serverTimestamp(),
  });
  batch.set(inviteRef(code), { circleId: cRef.id, createdBy: uid });
  batch.set(firstList, { name: 'Groceries', createdBy: uid, createdAt: serverTimestamp() });
  await batch.commit();
  return cRef.id;
}

export async function joinCircle(uid: string, rawCode: string) {
  const code = normalizeCode(rawCode);
  if (code.length !== 6) throw new Error('Invite codes are 6 characters long.');
  const invite = await getDoc(inviteRef(code));
  if (!invite.exists()) throw new Error('No circle found with that code. Check it and try again.');
  const circleId = invite.data().circleId as string;
  await updateDoc(circleRef(circleId), { memberIds: arrayUnion(uid) });
  return circleId;
}

export async function renameCircle(circleId: string, name: string) {
  await updateDoc(circleRef(circleId), { name: name.trim() });
}

export async function leaveCircle(circleId: string, uid: string) {
  await updateDoc(circleRef(circleId), { memberIds: arrayRemove(uid) });
}

export async function removeMember(circleId: string, memberUid: string) {
  await updateDoc(circleRef(circleId), { memberIds: arrayRemove(memberUid) });
}

export async function regenerateInviteCode(circle: Circle, uid: string) {
  const code = await freshInviteCode();
  const batch = writeBatch(db);
  batch.delete(inviteRef(circle.inviteCode));
  batch.set(inviteRef(code), { circleId: circle.id, createdBy: uid });
  batch.update(circleRef(circle.id), { inviteCode: code });
  await batch.commit();
  return code;
}

/** Deletes a circle with all of its lists and items. Owner only. */
export async function deleteCircle(circle: Circle) {
  const refs = [];
  const lists = await getDocs(listsCol(circle.id));
  for (const l of lists.docs) {
    const items = await getDocs(itemsCol(circle.id, l.id));
    refs.push(...items.docs.map((d) => d.ref));
    refs.push(l.ref);
  }
  await commitDeletes(refs);
  const batch = writeBatch(db);
  batch.delete(inviteRef(circle.inviteCode));
  batch.delete(circleRef(circle.id));
  await batch.commit();
}

async function commitDeletes(refs: { path: string }[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    for (const r of refs.slice(i, i + 400)) batch.delete(doc(db, r.path));
    await batch.commit();
  }
}

// ---------- lists ----------

export async function createList(circleId: string, uid: string, name: string) {
  const ref = doc(listsCol(circleId));
  await setDoc(ref, { name: name.trim(), createdBy: uid, createdAt: serverTimestamp() });
  return ref.id;
}

export async function renameList(circleId: string, listId: string, name: string) {
  await updateDoc(listRef(circleId, listId), { name: name.trim() });
}

export async function deleteList(circleId: string, listId: string) {
  const items = await getDocs(itemsCol(circleId, listId));
  await commitDeletes([...items.docs.map((d) => d.ref), listRef(circleId, listId)]);
}

// ---------- items ----------

export function addItem(
  circleId: string,
  listId: string,
  uid: string,
  data: { name: string; qty?: string; note?: string },
) {
  // Not awaited by callers: Firestore applies the write locally right away and
  // syncs in the background, so adding works with a bad connection too.
  return setDoc(doc(itemsCol(circleId, listId)), {
    name: data.name.trim(),
    qty: (data.qty ?? '').trim(),
    note: (data.note ?? '').trim(),
    addedBy: uid,
    addedAt: serverTimestamp(),
    checked: false,
    checkedBy: null,
    checkedAt: null,
  });
}

export function setItemChecked(circleId: string, listId: string, itemId: string, uid: string, checked: boolean) {
  return updateDoc(itemRef(circleId, listId, itemId), {
    checked,
    checkedBy: checked ? uid : null,
    checkedAt: checked ? serverTimestamp() : null,
  });
}

export function updateItem(
  circleId: string,
  listId: string,
  itemId: string,
  data: { name: string; qty: string; note: string },
) {
  return updateDoc(itemRef(circleId, listId, itemId), {
    name: data.name.trim(),
    qty: data.qty.trim(),
    note: data.note.trim(),
  });
}

export function deleteItem(circleId: string, listId: string, itemId: string) {
  return deleteDoc(itemRef(circleId, listId, itemId));
}

export async function clearBought(circleId: string, listId: string, items: Item[]) {
  await commitDeletes(items.filter((i) => i.checked).map((i) => itemRef(circleId, listId, i.id)));
}

// ---------- live hooks ----------

type Live<T> = { data: T; loading: boolean; error: string | null };

function useLive<T>(
  initial: T,
  deps: unknown[],
  subscribe: ((onData: (d: T) => void, onError: (e: Error) => void) => () => void) | null,
): Live<T> {
  const [state, setState] = useState<Live<T>>({ data: initial, loading: true, error: null });
  useEffect(() => {
    if (!subscribe) {
      setState({ data: initial, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    return subscribe(
      (data) => setState({ data, loading: false, error: null }),
      (e) => setState((s) => ({ ...s, loading: false, error: e.message })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useProfileDoc(uid: string | null | undefined) {
  return useLive<Profile | null>(
    null,
    [uid],
    uid
      ? (onData, onError) =>
          onSnapshot(
            userRef(uid),
            (s) => onData(s.exists() ? ({ uid: s.id, ...s.data() } as Profile) : null),
            onError,
          )
      : null,
  );
}

export function useMyCircles(uid: string | null | undefined) {
  return useLive<Circle[]>(
    [],
    [uid],
    uid
      ? (onData, onError) =>
          onSnapshot(
            query(collection(db, 'circles'), where('memberIds', 'array-contains', uid)),
            (s) => {
              const circles = s.docs.map((d) => fromDoc<Circle>(d));
              circles.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
              onData(circles);
            },
            onError,
          )
      : null,
  );
}

export function useCircle(circleId: string | undefined) {
  return useLive<Circle | null>(
    null,
    [circleId],
    circleId
      ? (onData, onError) =>
          onSnapshot(circleRef(circleId), (s) => onData(s.exists() ? fromDoc<Circle>(s) : null), onError)
      : null,
  );
}

export function useLists(circleId: string | undefined) {
  return useLive<GroceryList[]>(
    [],
    [circleId],
    circleId
      ? (onData, onError) =>
          onSnapshot(
            query(listsCol(circleId), orderBy('createdAt', 'asc')),
            (s) => onData(s.docs.map((d) => fromDoc<GroceryList>(d))),
            onError,
          )
      : null,
  );
}

export function useList(circleId: string | undefined, listId: string | undefined) {
  return useLive<GroceryList | null>(
    null,
    [circleId, listId],
    circleId && listId
      ? (onData, onError) =>
          onSnapshot(
            listRef(circleId, listId),
            (s) => onData(s.exists() ? fromDoc<GroceryList>(s) : null),
            onError,
          )
      : null,
  );
}

export function useItems(circleId: string | undefined, listId: string | undefined) {
  return useLive<Item[]>(
    [],
    [circleId, listId],
    circleId && listId
      ? (onData, onError) =>
          onSnapshot(
            query(itemsCol(circleId, listId), orderBy('addedAt', 'asc')),
            (s) => onData(s.docs.map((d) => fromDoc<Item>(d))),
            onError,
          )
      : null,
  );
}

/** Live profiles for a set of user ids, keyed by uid. */
export function useProfiles(uids: string[]) {
  const key = [...uids].sort().join(',');
  return useLive<Record<string, Profile>>(
    {},
    [key],
    uids.length
      ? (onData, onError) => {
          // Firestore 'in' queries take at most 30 values.
          const chunks: string[][] = [];
          const sorted = key.split(',');
          for (let i = 0; i < sorted.length; i += 30) chunks.push(sorted.slice(i, i + 30));
          const parts: Record<string, Profile>[] = chunks.map(() => ({}));
          const unsubs = chunks.map((ids, idx) =>
            onSnapshot(
              query(collection(db, 'users'), where(documentId(), 'in', ids)),
              (s) => {
                const map: Record<string, Profile> = {};
                s.docs.forEach((d) => (map[d.id] = { uid: d.id, ...d.data() } as Profile));
                parts[idx] = map;
                onData(Object.assign({}, ...parts));
              },
              onError,
            ),
          );
          return () => unsubs.forEach((u) => u());
        }
      : null,
  );
}
