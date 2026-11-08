import { ScrollView, Text } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveProfile } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { ProfileForm } from '@/components/ProfileForm';
import { Button, styles } from '@/components/ui';
import { space } from '@/theme';

export default function Onboarding() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>Pick a name and avatar so your family knows who added or bought what.</Text>
      <ProfileForm
        submitLabel="Continue"
        initial={{ name: user.email?.split('@')[0] ?? '' }}
        onSubmit={(v) => saveProfile(user.uid, { ...v, email: user.email })}
      />
      <Button title="Sign out" variant="ghost" onPress={() => signOut(auth)} />
    </ScrollView>
  );
}
