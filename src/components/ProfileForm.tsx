import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, ErrorText, Input, SectionTitle } from '@/components/ui';
import { avatarColors, avatarEmojis, colors, radius, space } from '@/theme';

export type ProfileValues = { name: string; emoji: string; color: string };

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<ProfileValues>;
  submitLabel: string;
  onSubmit: (v: ProfileValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? avatarEmojis[0]);
  const [color, setColor] = useState(initial?.color ?? avatarColors[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), emoji, color });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar emoji={emoji} color={color} size={88} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{name.trim() || 'Your name'}</Text>
      </View>

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="What should your family see?"
        autoCapitalize="words"
        maxLength={30}
      />

      <SectionTitle>Avatar</SectionTitle>
      <View style={s.grid}>
        {avatarEmojis.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[s.emojiCell, e === emoji && { borderColor: color, backgroundColor: color + '22' }]}
          >
            <Text style={{ fontSize: 26 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Colour</SectionTitle>
      <View style={s.grid}>
        {avatarColors.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            accessibilityLabel={`Colour ${c}`}
            style={[s.colorCell, { backgroundColor: c }, c === color && s.colorSelected]}
          />
        ))}
      </View>

      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCell: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 4, borderColor: colors.card, outlineWidth: 2, outlineColor: colors.text, outlineStyle: 'solid' },
});
