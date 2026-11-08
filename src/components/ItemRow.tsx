import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item, Profile } from '@/lib/types';
import { firstName, timeAgoLabel } from '@/lib/format';
import { colors, radius, space } from '@/theme';

export const ItemRow = memo(function ItemRow({
  item,
  adder,
  checker,
  meUid,
  onToggle,
  onEdit,
}: {
  item: Item;
  adder?: Profile;
  checker?: Profile;
  meUid: string;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
}) {
  const who = (p: Profile | undefined, uid: string | null) => (uid === meUid ? 'you' : firstName(p?.name));
  const subtitle = item.checked
    ? `Bought by ${who(checker, item.checkedBy)} · ${timeAgoLabel(item.checkedAt)}`
    : `Added by ${who(adder, item.addedBy)}`;
  const tint = item.checked ? checker?.color : adder?.color;

  return (
    <Pressable
      onPress={() => onToggle(item)}
      onLongPress={() => onEdit(item)}
      delayLongPress={350}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      accessibilityHint="Tap to tick off, long-press to edit"
      style={({ pressed }) => [s.row, item.checked && s.rowChecked, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.box, item.checked && s.boxChecked]}>
        {item.checked ? <Text style={s.tick}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <Text style={[s.name, item.checked && s.nameChecked]}>{item.name}</Text>
          {item.qty ? (
            <View style={[s.qty, item.checked && { backgroundColor: colors.border }]}>
              <Text style={[s.qtyText, item.checked && { color: colors.checked }]}>{item.qty}</Text>
            </View>
          ) : null}
        </View>
        {item.note ? <Text style={[s.note, item.checked && { color: colors.checked }]}>{item.note}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[s.dot, { backgroundColor: tint ?? colors.muted }]} />
          <Text style={s.meta}>{subtitle}</Text>
        </View>
      </View>
      <Pressable onPress={() => onEdit(item)} hitSlop={10} accessibilityLabel={`Edit ${item.name}`} style={s.more}>
        <Text style={{ color: colors.muted, fontSize: 18 }}>⋯</Text>
      </Pressable>
    </Pressable>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowChecked: { backgroundColor: 'transparent' },
  box: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  nameChecked: { color: colors.checked, textDecorationLine: 'line-through' },
  qty: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  qtyText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { color: colors.muted, fontSize: 12 },
  more: { paddingHorizontal: 4 },
});
