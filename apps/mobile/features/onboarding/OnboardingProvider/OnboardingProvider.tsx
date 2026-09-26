import { ONBOARDING_STEPS } from '@yemesek/legal';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';
import { readIntroSeen, writeIntroSeen } from '../storage';

type OnboardingContextValue = {
  show: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('OnboardingProvider missing');
  return value;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const forced = useRef(false);
  const step = ONBOARDING_STEPS[index] ?? ONBOARDING_STEPS[0];
  const last = index >= ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    let live = true;
    void readIntroSeen().then((seen) => {
      if (!live || forced.current) return;
      if (!seen) setOpen(true);
    });
    return () => {
      live = false;
    };
  }, []);

  function show() {
    forced.current = true;
    setIndex(0);
    setOpen(true);
  }

  function dismiss() {
    setOpen(false);
    setIndex(0);
    void writeIntroSeen();
  }

  return (
    <OnboardingContext.Provider value={{ show }}>
      {children}
      <Modal visible={open} animationType="fade" transparent onRequestClose={dismiss} statusBarTranslucent>
        <View style={styles.backdrop}>
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.top}>
              <Text style={styles.kicker}>
                {step.kicker} · {index + 1}/{ONBOARDING_STEPS.length}
              </Text>
              <Pressable accessibilityLabel="Atla" hitSlop={8} onPress={dismiss}>
                <Text style={styles.skip}>Atla</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={styles.title} accessibilityRole="header">
                {step.title}
              </Text>
              {step.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.copy}>
                  {paragraph}
                </Text>
              ))}
            </ScrollView>
            <View style={styles.actions}>
              {index > 0 ? (
                <Pressable style={styles.ghost} accessibilityLabel="Geri" onPress={() => setIndex((current) => current - 1)}>
                  <Text style={styles.ghostText}>Geri</Text>
                </Pressable>
              ) : null}
              {last ? (
                <Pressable style={styles.primary} accessibilityLabel="Anladım" onPress={dismiss}>
                  <Text style={styles.primaryText}>Anladım</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.primary}
                  accessibilityLabel="İleri"
                  onPress={() => setIndex((current) => current + 1)}
                >
                  <Text style={styles.primaryText}>İleri</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </OnboardingContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 46, 46, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxHeight: '88%',
    backgroundColor: colors.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  kicker: { color: colors.chili, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', flex: 1 },
  skip: { color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' },
  body: { paddingTop: 16, paddingBottom: 8, gap: 8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  copy: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  primary: { backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  primaryText: { color: colors.card, fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  ghostText: { color: colors.ink, fontWeight: '700' },
});
