import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveProfile } from '@/lib/db';
import { useMe } from '@/context/AuthContext';
import { ProfileForm } from '@/components/ProfileForm';
import { Button, styles } from '@/components/ui';
import { space } from '@/theme';

export default function ProfileScreen() {
  const { user, profile } = useMe();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <ProfileForm
        initial={profile}
        submitLabel="Save"
        onSubmit={async (v) => {
          await saveProfile(user.uid, { ...v, email: user.email });
          router.back();
        }}
      />
      <Text style={[styles.muted, { textAlign: 'center' }]}>Signed in as {user.email}</Text>
      <Button title="Sign out" variant="danger" onPress={() => signOut(auth)} />
    </ScrollView>
  );
}
