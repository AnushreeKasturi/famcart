import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item, Profile } from '@/lib/types';
import { firstName, timeAgoLabel } from '@/lib/format';
import { Button, ErrorText, Input } from '@/components/ui';
import { colors, radius, space } from '@/theme';

export function EditItemModal({
  item,
  adder,
  onClose,
  onSave,
  onDelete,
}: {
  item: Item | null;
  adder?: Profile;
  onClose: () => void;
  onSave: (item: Item, v: { name: string; qty: string; note: string }) => Promise<void>;
  onDelete: (item: Item) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQty(item.qty);
      setNote(item.note);
      setError(null);
    }
  }, [item]);

  async function save() {
    if (!item) return;
    if (!name.trim()) {
      setError('Item name can’t be empty.');
      return;
    }
    try {
      await onSave(item, { name, qty, note });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal visible={item != null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Edit item</Text>
          {item ? (
            <Text style={{ color: colors.muted }}>
              Added by {firstName(adder?.name)} · {timeAgoLabel(item.addedAt)}
            </Text>
          ) : null}
          <Input label="Item" value={name} onChangeText={setName} maxLength={80} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Input label="Quantity" value={qty} onChangeText={setQty} placeholder="e.g. 2 kg" maxLength={20} />
            </View>
          </View>
          <Input label="Note" value={note} onChangeText={setNote} placeholder="Brand, size, anything…" maxLength={120} />
          <ErrorText>{error}</ErrorText>
          <Button title="Save" onPress={save} />
          <Button
            title="Delete item"
            variant="danger"
            onPress={async () => {
              if (!item) return;
              await onDelete(item);
              onClose();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
});
