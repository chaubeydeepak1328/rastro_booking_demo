import React, { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { callLLMForParsing } from '../services/llmService';
import { validateAndNormalizeParsedData } from '../services/parseService';
import { Brand, Button, Icon, Notice, Screen, Steps, ui } from '../components/ui';
import { colors } from '../theme';

export default function RequestScreen() {
  const { state, dispatch } = useAppContext();
  const [inputText, setInputText] = useState(state.currentRequest.rawText || '');
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (!inputText.trim() || state.isLoading) return;
    Keyboard.dismiss();
    dispatch({ type: 'SET_RAW_TEXT', payload: inputText.trim() });
    dispatch({ type: 'START_PARSING' });
    try {
      const result = await callLLMForParsing(inputText.trim(), state.apiKey);
         console.log("LLM RESPonse ",result)
      console.log("LLM RESPonse ",result?.data?.items)

      if (!result.success) throw new Error(result.error);
      const validated = validateAndNormalizeParsedData(result.data, inputText.trim());
      if (!validated.isValid) throw new Error(validated.errors.join(' '));
      dispatch({ type: 'PARSE_SUCCESS', payload: validated.data });
      router.push('/review');
    } catch (error) {
      dispatch({
        type: 'PARSE_ERROR',
        payload: error.message || 'Could not prepare your request. Please try again.',
      });
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.bottomNav}>
          <View style={styles.navActive}>
            <Icon name="plus" color={colors.primary} size={19} />
            <Text style={ui.link}>New request</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/history')}
            style={styles.navItem}
          >
            <Icon name="list" size={19} />
            <Text style={styles.navText}>My requests</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.top}>
        <Brand />
        <View style={styles.location}>
          <View style={styles.dot} />
          <Text style={styles.locationText}>DELHI</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={ui.eyebrow}>YOUR NEXT SHIFT, SORTED</Text>
        <Text style={styles.headline}>Good people.{'\n'}Great service.</Text>
        <Text style={styles.heroBody}>
          Tell us who you need. We’ll help you turn it into a clear staffing request.
        </Text>
      </View>

      <Steps />

      <View style={ui.card}>
        <View style={styles.cardHeading}>
          <Text style={ui.sectionTitle}>Who do you need?</Text>
          <View style={styles.smallIcon}>
            <Icon name="edit" size={18} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.helper}>Include the role, number of people, shift and location.</Text>

        <TextInput
          accessibilityLabel="Describe your staffing request"
          style={[
            styles.textArea,
            focused && styles.focused,
            state.isLoading && styles.textAreaDisabled,
          ]}
          placeholder="Describe your staffing needs…"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          maxLength={500}
          value={inputText}
          editable={!state.isLoading}
          blurOnSubmit={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            setInputText(text);
            if (state.error) dispatch({ type: 'CLEAR_ERROR' });
          }}
        />

        <View style={styles.inputMeta}>
          <Text style={styles.meta}>English or Hinglish</Text>
          <Text style={styles.meta}>{inputText.length}/500</Text>
        </View>


        {state.error && <Notice text={state.error} error />}

        <Button
          title={state.isLoading ? 'Processing' : 'Review request'}
          onPress={submit}
          disabled={!inputText.trim()}
          loading={state.isLoading}
        />

        <Text style={styles.reassurance}>You can edit every detail before continuing.</Text>
      </View>

      <View style={styles.guidance}>
        <View style={styles.guidanceIcon}>
          <Icon name="calendar" color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.guidanceTitle}>A few details go a long way</Text>
          <Text style={styles.helper}>
            A clear shift time and location help you find the right people for the job.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  location: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  locationText: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  hero: {
    paddingTop: 19,
    gap: 13,
  },
  headline: {
    fontSize: 43,
    lineHeight: 47,
    fontWeight: '700',
    letterSpacing: -1.8,
    color: colors.ink,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    maxWidth: 390,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  textArea: {
    minHeight: 154,
    padding: 16,
    borderRadius: 13,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    lineHeight: 25,
    color: colors.ink,
  },
  textAreaDisabled: {
    opacity: 0.65,
    backgroundColor: '#F0F2EF',
  },
  focused: {
    borderColor: colors.primary,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  meta: {
    fontSize: 11,
    color: colors.muted,
  },
  loaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  loaderSubtitle: {
    fontSize: 12,
    color: colors.ink,
    lineHeight: 17,
  },
  reassurance: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  guidance: {
    flexDirection: 'row',
    gap: 13,
    paddingHorizontal: 5,
  },
  guidanceIcon: {
    marginTop: 3,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  navActive: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
  },
  navItem: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
});
