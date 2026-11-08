import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMe } from '@/context/AuthContext';
import {
  addItem,
  clearBought,
  deleteItem,
  deleteList,
  renameList,
  setItemChecked,
  updateItem,
  useCircle,
  useItems,
  useList,
  useProfiles,
} from '@/lib/db';
import type { Item } from '@/lib/types';
import { confirm, notify, tapFeedback } from '@/lib/confirm';
import { ItemRow } from '@/components/ItemRow';
import { EditItemModal } from '@/components/EditItemModal';
import { Button, ErrorText, Input, Loading, styles } from '@/components/ui';
import { colors, radius, space } from '@/theme';

export default function ListScreen() {
  const { circleId, listId } = useLocalSearchParams<{ circleId: string; listId: string }>();
  const { uid } = useMe();
  const circle = useCircle(circleId);
  const list = useList(circleId, listId);
  const items = useItems(circleId, listId);
  const profiles = useProfiles(circle.data?.memberIds ?? []);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [showBought, setShowBought] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editingList, setEditingList] = useState(false);
  const [listName, setListName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<TextInputInstance>(null);

  const { toBuy, bought } = useMemo(() => {
    const toBuy = items.data.filter((i) => !i.checked);
    const bought = items.data
      .filter((i) => i.checked)
      .sort((a, b) => (b.checkedAt?.toMillis() ?? 0) - (a.checkedAt?.toMillis() ?? 0));
    return { toBuy, bought };
  }, [items.data]);

  const onToggle = useCallback(
    (item: Item) => {
      tapFeedback();
      setItemChecked(circleId, listId, item.id, uid, !item.checked).catch((e) => setError(e.message));
    },
    [circleId, listId, uid],
  );
  const onEdit = useCallback((item: Item) => setEditing(item), []);

  function submitItem() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    const same = items.data.find((i) => i.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (same && !same.checked) {
      notify('Already on the list', `"${same.name}" is already on the list.`);
      return;
    }
    if (same && same.checked) {
      // Bought before; put it back on the list instead of making a duplicate.
      setItemChecked(circleId, listId, same.id, uid, false).catch((e) => setError(e.message));
      if (qty.trim() && qty.trim() !== same.qty) {
        updateItem(circleId, listId, same.id, { name: same.name, qty, note: same.note }).catch((e) => setError(e.message));
      }
    } else {
      addItem(circleId, listId, uid, { name: trimmed, qty }).catch((e) => setError(e.message));
    }
    tapFeedback();
    setName('');
    setQty('');
    nameRef.current?.focus();
  }

  if (circle.loading || list.loading) return <Loading />;
  if (!circle.data || !list.data) {
    return (
      <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
        <Text style={styles.muted}>This list was deleted.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const sections = [
    { key: 'toBuy', title: '', data: toBuy },
    ...(bought.length ? [{ key: 'bought', title: `Bought (${bought.length})`, data: showBought ? bought : [] }] : []),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          title: list.data.name,
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setListName(list.data!.name);
                setEditingList((v) => !v);
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                {editingList ? 'Done' : 'Edit'}
              </Text>
            </Pressable>
          ),
        }}
      />

      {editingList ? (
        <View style={s.editBar}>
          <Input value={listName} onChangeText={setListName} maxLength={40} placeholder="List name" />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              title="Save name"
              style={{ flex: 1 }}
              disabled={!listName.trim() || listName.trim() === list.data.name}
              onPress={() =>
                renameList(circleId, listId, listName)
                  .then(() => setEditingList(false))
                  .catch((e) => setError(e.message))
              }
            />
            <Button
              title="Delete list"
              variant="danger"
              style={{ flex: 1 }}
              onPress={async () => {
                if (await confirm('Delete list?', `"${list.data!.name}" and all its items will be deleted for everyone.`, 'Delete', true)) {
                  try {
                    await deleteList(circleId, listId);
                    router.back();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }
              }}
            />
          </View>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<ErrorText>{items.error ?? error}</ErrorText>}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            adder={profiles.data[item.addedBy]}
            checker={item.checkedBy ? profiles.data[item.checkedBy] : undefined}
            meUid={uid}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.key === 'bought' ? (
            <View style={s.boughtHeader}>
              <Pressable onPress={() => setShowBought((v) => !v)} hitSlop={8} style={{ flex: 1 }}>
                <Text style={s.boughtTitle}>
                  {showBought ? '▾' : '▸'} {section.title}
                </Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={async () => {
                  if (await confirm('Clear bought items?', 'Removes all ticked items from this list for everyone.', 'Clear')) {
                    clearBought(circleId, listId, items.data).catch((e) => setError(e.message));
                  }
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Clear</Text>
              </Pressable>
            </View>
          ) : toBuy.length === 0 && !items.loading ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>{bought.length ? '🎉' : '🧺'}</Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                {bought.length ? 'Everything is bought!' : 'Nothing here yet. Add the first item below.'}
              </Text>
            </View>
          ) : null
        }
      />

      <View style={[s.addBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <TextInput
          ref={nameRef}
          value={name}
          onChangeText={setName}
          placeholder="Add an item…"
          placeholderTextColor={colors.muted}
          style={[s.addInput, { flex: 1 }]}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submitItem}
          maxLength={80}
        />
        <TextInput
          value={qty}
          onChangeText={setQty}
          placeholder="Qty"
          placeholderTextColor={colors.muted}
          style={[s.addInput, { width: 70 }]}
          returnKeyType="done"
          onSubmitEditing={submitItem}
          maxLength={20}
        />
        <Pressable
          onPress={submitItem}
          disabled={!name.trim()}
          accessibilityLabel="Add item"
          style={({ pressed }) => [s.addBtn, !name.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '600', marginTop: -2 }}>+</Text>
        </Pressable>
      </View>

      <EditItemModal
        item={editing}
        adder={editing ? profiles.data[editing.addedBy] : undefined}
        onClose={() => setEditing(null)}
        onSave={(item, v) => updateItem(circleId, listId, item.id, v)}
        onDelete={(item) => deleteItem(circleId, listId, item.id)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  editBar: { padding: space.lg, gap: space.sm, borderBottomWidth: 1, borderColor: colors.border },
  boughtHeader: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, marginBottom: space.xs },
  boughtTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  addBar: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  addInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
