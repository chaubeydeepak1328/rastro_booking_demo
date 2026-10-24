import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { colors } from '../theme';

export function Icon({ name, size = 22, color = colors.ink }) {
  const paths = {
    arrow: 'M5 12h14m-5-5 5 5-5 5', back: 'M19 12H5m5-5-5 5 5 5',
    plus: 'M12 5v14M5 12h14', check: 'm5 12 4 4L19 6',
    clock: 'M12 7v5l3 2', close: 'm6 6 12 12M6 18 18 6',
    pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z',
    list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    calendar: 'M8 2v4M16 2v4M3 10h18', edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Z',
    alert: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {name === 'clock' && <Circle cx="12" cy="12" r="9" />}
    {name === 'people' && <Circle cx="9" cy="7" r="4" />}
    {name === 'calendar' && <Rect x="3" y="4" width="18" height="17" rx="3" />}
    {name === 'pin' && <Circle cx="12" cy="10" r="2" />}
    <Path d={paths[name] || paths.list} />
  </Svg>;
}

export function Brand({ compact = false }) {
  return <View style={s.brand}>
    <View style={s.mark}><Svg width={26} height={26} viewBox="0 0 40 40" fill="none" accessible={false}>
      <Path d="M29 10H17a5 5 0 0 0 0 10h6a5 5 0 0 1 0 10H11" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />
    </Svg></View>
    {!compact && <View><Text style={s.brandName}>smartstaff<Text style={{ color: colors.primary }}>.</Text></Text><Text style={s.brandCaption}>A little less admin. A better shift.</Text></View>}
  </View>;
}

export function Button({ title, onPress, secondary = false, disabled = false, loading = false, icon = 'arrow' }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || loading) && s.disabled, pressed && s.pressed]}>
    {loading && <ActivityIndicator color={secondary ? colors.primary : '#FFFFFF'} />}
    <Text style={[s.buttonText, secondary && { color: colors.primary }]}>{title}</Text>
    {!loading && icon && <Icon name={icon} color={secondary ? colors.primary : '#FFFFFF'} size={19} />}
  </Pressable>;
}

export function Screen({ children, title = '', footer = null }) {
  return <SafeAreaView style={s.safe}>
    {title ? <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.iconButton}><Icon name="back" /></Pressable><Text style={s.headerTitle}>{title}</Text><Brand compact /></View> : null}
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>{children}</ScrollView>
      {footer && <View style={s.footer}><View style={s.footerInner}>{footer}</View></View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Steps({ current = 0 }) {
  return <View style={s.steps}>{['Request', 'Review', 'Partners'].map((label, index) => <View key={label} style={s.step}>
    <View style={[s.stepNumber, index <= current && s.stepActive]}>{index < current ? <Icon name="check" size={13} color="#FFFFFF" /> : <Text style={[s.stepDigit, index === current && { color: '#FFFFFF' }]}>{index + 1}</Text>}</View>
    <Text style={[s.stepLabel, index === current && { color: colors.ink, fontWeight: '600' }]}>{label}</Text>
    {index < 2 && <View style={s.stepLine} />}
  </View>)}</View>;
}

export function EmptyState({ icon = 'list', title, description, children = null }) {
  return <View style={s.empty}><View style={s.emptyIcon}><Icon name={icon} size={30} color={colors.primary} /></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyText}>{description}</Text>{children}</View>;
}

export function Notice({ text, error = false }) {
  return <View accessibilityLiveRegion="polite" style={[s.notice, error && { backgroundColor: colors.dangerSoft }]}><Text style={[s.noticeText, error && { color: colors.danger }]}>{text}</Text></View>;
}

export const ui = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 37, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase' },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 50, fontSize: 15, color: colors.ink },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  chip: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, paddingBottom: 36, gap: 24, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, mark: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.ink, fontSize: 23, fontWeight: '700', letterSpacing: -1 }, brandCaption: { color: colors.muted, fontSize: 9, marginTop: 2 },
  header: { width: '100%', maxWidth: 680, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 }, headerTitle: { flex: 1, color: colors.ink, fontWeight: '600', fontSize: 16 }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  button: { backgroundColor: colors.primary, minHeight: 54, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondary: { backgroundColor: colors.primarySoft }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  footer: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 24, paddingVertical: 14 }, footerInner: { width: '100%', maxWidth: 632, alignSelf: 'center', gap: 10 },
  steps: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }, step: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }, stepNumber: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#E5EAE5', alignItems: 'center', justifyContent: 'center' }, stepActive: { backgroundColor: colors.primary }, stepDigit: { fontSize: 11, fontWeight: '600', color: colors.muted }, stepLabel: { fontSize: 11, color: colors.muted }, stepLine: { height: 1, backgroundColor: colors.border, flex: 1, marginRight: 9 },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12, gap: 16 }, emptyIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { textAlign: 'center', fontSize: 22, fontWeight: '600', color: colors.ink, letterSpacing: -0.5 }, emptyText: { textAlign: 'center', color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 360 },
  notice: { padding: 16, backgroundColor: colors.warningSoft, borderRadius: 12 }, noticeText: { fontSize: 13, color: colors.warning, lineHeight: 20 },
});
