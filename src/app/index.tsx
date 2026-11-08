import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { useMe } from '@/context/AuthContext';
import { useMyCircles, useProfiles } from '@/lib/db';
import type { Circle } from '@/lib/types';
import { Avatar, Button, Card, ErrorText, Loading, styles } from '@/components/ui';
import { colors, space } from '@/theme';

export default function Home() {
  const { uid, profile } = useMe();
  const circles = useMyCircles(uid);
  const allMemberIds = [...new Set(circles.data.flatMap((c) => c.memberIds))];
  const profiles = useProfiles(allMemberIds);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/profile" asChild>
              <Pressable accessibilityLabel="Your profile" hitSlop={8}>
                <Avatar emoji={profile.emoji} color={profile.color} size={34} />
              </Pressable>
            </Link>
          ),
        }}
      />
      {circles.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={circles.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListHeaderComponent={
            <View style={{ gap: space.xs, marginBottom: space.sm }}>
              <Text style={styles.h1}>Hi {profile.name} 👋</Text>
              <Text style={styles.muted}>
                {circles.data.length ? 'Your circles' : 'Create a circle for your family, or join one with a code.'}
              </Text>
              <ErrorText>{circles.error}</ErrorText>
            </View>
          }
          renderItem={({ item }) => (
            <CircleCard circle={item} profiles={profiles.data} onPress={() => router.push(`/circle/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
              <Text style={{ fontSize: 64 }}>👨‍👩‍👧‍👦</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Button title="+ Create a circle" onPress={() => router.push('/new-circle')} />
              <Button title="Join with a code" variant="secondary" onPress={() => router.push('/join')} />
            </View>
          }
        />
      )}
    </View>
  );
}

function CircleCard({
  circle,
  profiles,
  onPress,
}: {
  circle: Circle;
  profiles: Record<string, { emoji: string; color: string }>;
  onPress: () => void;
}) {
  const shown = circle.memberIds.slice(0, 5);
  const extra = circle.memberIds.length - shown.length;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Card style={s.card}>
        <View style={{ flex: 1, gap: space.sm }}>
          <Text style={s.name}>{circle.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {shown.map((id, i) => (
              <View key={id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar emoji={profiles[id]?.emoji} color={profiles[id]?.color} size={30} />
              </View>
            ))}
            <Text style={[styles.muted, { marginLeft: space.sm }]}>
              {extra > 0 ? `+${extra} · ` : ''}
              {circle.memberIds.length} {circle.memberIds.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 24, color: colors.muted }}>›</Text>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
});
