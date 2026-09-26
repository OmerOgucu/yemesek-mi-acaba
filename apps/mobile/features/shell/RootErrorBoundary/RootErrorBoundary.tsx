import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[mobile] ekran hatası', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Ekran açılamadı</Text>
        <Text style={styles.body}>Beklenmeyen bir hata oldu. Uygulama kapanmadı. Tekrar dene.</Text>
        <Pressable style={styles.button} accessibilityLabel="Tekrar dene" onPress={() => this.setState({ failed: false })}>
          <Text style={styles.buttonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: 24 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  body: { color: colors.muted, marginTop: 8 },
  button: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { color: colors.card, fontWeight: '700' },
});
