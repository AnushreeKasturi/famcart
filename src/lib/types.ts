import type { Timestamp } from 'firebase/firestore';

export type Profile = {
  uid: string;
  name: string;
  emoji: string;
  color: string;
  email: string | null;
};

export type Circle = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: Timestamp | null;
};

export type GroceryList = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp | null;
};

export type Item = {
  id: string;
  name: string;
  qty: string;
  note: string;
  addedBy: string;
  addedAt: Timestamp | null;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: Timestamp | null;
};
