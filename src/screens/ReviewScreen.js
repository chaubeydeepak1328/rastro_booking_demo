import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { rankPartners } from '../services/matchingService';
import { Button, EmptyState, Icon, Notice, Screen, Steps, ui } from '../components/ui';
import { colors } from '../theme';
import { validateRequestItems } from '../services/requestValidation';

const ROLES = [
  'Chinese Chef',
  'Tandoor Chef',
  'Pastry Chef',
  'General Cook',
  'Waiter',
  'Cleaner',
  'Helper',
];

const COMMON_LOCATIONS = [
  'Connaught Place',
  'Rajouri Garden',
  'Pitampura',
  'Karol Bagh',
  'Saket',
  'Lajpat Nagar',
];

const SHIFT_PRESETS = [
  { label: 'Dinner (18:00–23:00)', start: '18:00', end: '23:00' },
  { label: 'Late (19:00–00:00)', start: '19:00', end: '00:00' },
  { label: 'Morning (08:00–16:00)', start: '08:00', end: '16:00' },
  { label: 'Lunch (11:00–16:00)', start: '11:00', end: '16:00' },
];

export default function ReviewScreen() {
  const { state, dispatch } = useAppContext();
  const data = state.currentRequest.editedData;
  const [reviewed, setReviewed] = useState(false);
  const [errors, setErrors] = useState([]);

  if (!data?.items?.length) {
    return (
      <Screen title="Review request">
        <EmptyState
          title="Start with a request"
          description="Tell us what your next shift needs, then review the details here."
        >
          <Button title="Create request" onPress={() => router.replace('/')} />
        </EmptyState>
      </Screen>
    );
  }

  const update = (itemIndex, field, value) => {
    dispatch({ type: 'UPDATE_EDITED_FIELD', payload: { itemIndex, field, value } });
    setReviewed(false);
    setErrors([]);
  };

  const getUncertainty = (itemIndex, field) => {
    return data.uncertainFields?.find(
      (entry) => entry.itemIndex === itemIndex && entry.field === field
    );
  };

  const continueToPartners = () => {
    const problems = validateRequestItems(data.items);
    setErrors(problems);
    if (problems.length || !reviewed) return;

    dispatch({
      type: 'SET_MATCHING_RESULTS',
      payload: data.items.map((item) => ({ item, matching: rankPartners(item) })),
    });
    router.push('/matching');
  };

  const renderField = (
    item,
    index,
    key,
    label,
    placeholder,
    keyboardType = 'default',
    flex = 1
  ) => {
    const uncertainty = getUncertainty(index, key);
    const isUncertain = Boolean(uncertainty);

    return (
      <View key={key} style={[styles.field, { flex }]}>
        <View style={styles.fieldHeader}>
          <Text style={ui.label}>{label}</Text>
          {isUncertain && (
            <View style={styles.uncertainBadge}>
              <Icon name="alert" size={13} color={colors.warning} />
              <Text style={styles.uncertainBadgeText}>Needs review</Text>
            </View>
          )}
        </View>

        <TextInput
          accessibilityLabel={`${label}, requirement ${index + 1}`}
          style={[ui.input, isUncertain && styles.inputUncertain]}
          value={item[key] == null ? '' : String(item[key])}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          blurOnSubmit={false}
          keyboardType={/** @type {import('react-native').KeyboardTypeOptions} */ (keyboardType)}
          onChangeText={(value) => update(index, key, value)}
        />

        {isUncertain && (
          <View style={styles.uncertainReasonBox}>
            <Text style={styles.uncertainReasonText}>{uncertainty.reason}</Text>
            {uncertainty.suggestion != null && uncertainty.suggestion !== item[key] && (
              <Pressable
                accessibilityRole="button"
                onPress={() => update(index, key, String(uncertainty.suggestion))}
                style={styles.suggestionPill}
              >
                <Text style={styles.suggestionPillText}>
                  {`💡 1-tap accept: "${uncertainty.suggestion}"`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen
      title="Review request"
      footer={
        <Button
          title="Find matching partners"
          onPress={continueToPartners}
          disabled={!reviewed}
        />
      }
    >
      <Steps current={1} />

      <View style={{ gap: 8 }}>
        <Text style={ui.title}>Let’s get the{'\n'}details right.</Text>
        <Text style={ui.body}>
          Review what was parsed from your request. Highlighted fields need your confirmation.
        </Text>
      </View>

      {/* Action Request Notice */}
      {data.isActionRequest && (
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Icon name="alert" color={colors.primary} size={20} />
            <Text style={styles.actionTitle}>Action Request: {data.actionType?.toUpperCase()}</Text>
          </View>
          <Text style={styles.actionBody}>
            {data.actionType === 'cancel'
              ? 'You requested to cancel or modify a previous booking. A new replacement request is being prepared below.'
              : 'You requested a modification to an existing booking.'}
          </Text>
        </View>
      )}

      {/* Follow-up Questions Card */}
      {data.followUpQuestions && data.followUpQuestions.length > 0 && (
        <View style={styles.followUpCard}>
          <View style={styles.followUpHeader}>
            <Icon name="alert" color={colors.warning} size={20} />
            <Text style={styles.followUpTitle}>Clarification needed</Text>
          </View>
          <Text style={styles.followUpIntro}>
            Some details in your request were ambiguous. Please check these points:
          </Text>
          {data.followUpQuestions.map((question, qIdx) => (
            <View key={qIdx} style={styles.questionRow}>
              <Text style={styles.questionBullet}>•</Text>
              <Text style={styles.questionText}>{question}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Unresolved Uncertain Fields Overview */}
      {data.uncertainFields?.length > 0 && (
        <Notice
          text={`${data.uncertainFields.length} field(s) were inferred or missing. Check the highlighted boxes below before continuing.`}
        />
      )}

      {/* Request Items */}
      {data.items.map((item, index) => {
        const roleUncertainty = getUncertainty(index, 'subcategory') || getUncertainty(index, 'role');

        return (
          <View style={ui.card} key={index}>
            <View style={ui.row}>
              <View style={styles.number}>
                <Text style={ui.link}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={[ui.sectionTitle, { flex: 1 }]}>Staff requirement</Text>
              {data.items.length > 1 && (
                <Pressable
                  style={styles.remove}
                  accessibilityRole="button"
                  accessibilityLabel={'Remove requirement ' + (index + 1)}
                  onPress={() => {
                    dispatch({ type: 'REMOVE_ITEM', payload: index });
                    setReviewed(false);
                  }}
                >
                  <Icon name="close" size={18} />
                </Pressable>
              )}
            </View>

            {/* Role Selection (1 tap) */}
            <View style={{ gap: 8 }}>
              <View style={styles.fieldHeader}>
                <Text style={ui.label}>Role & Subcategory</Text>
                {roleUncertainty && (
                  <View style={styles.uncertainBadge}>
                    <Icon name="alert" size={13} color={colors.warning} />
                    <Text style={styles.uncertainBadgeText}>Inferred role</Text>
                  </View>
                )}
              </View>

              {roleUncertainty && (
                <Text style={styles.uncertainReasonText}>{roleUncertainty.reason}</Text>
              )}

              <View style={styles.roles}>
                {ROLES.map((role) => {
                  const isSelected = item.subcategory === role;
                  return (
                    <Pressable
                      key={role}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => update(index, 'subcategory', role)}
                      style={[ui.chip, isSelected && ui.chipActive]}
                    >
                      <Text style={[styles.chipText, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

           
              {renderField(item, index, 'count', 'People', 'Number', 'number-pad', 1)}
              {renderField(item, index, 'date', 'Date', 'YYYY-MM-DD', 'default', 2)}

            {/* Date Quick Shortcuts */}
            <View style={styles.quickShortcuts}>
              <Text style={styles.quickLabel}>Quick date:</Text>
              <Pressable
                style={styles.quickChip}
                onPress={() => update(index, 'date', new Date().toISOString().split('T')[0])}
              >
                <Text style={styles.quickChipText}>Today</Text>
              </Pressable>
              <Pressable
                style={styles.quickChip}
                onPress={() =>
                  update(
                    index,
                    'date',
                    new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  )
                }
              >
                <Text style={styles.quickChipText}>Tomorrow</Text>
              </Pressable>
              <Pressable
                style={styles.quickChip}
                onPress={() => {
                  const now = new Date();
                  const dist = (6 - now.getDay() + 7) % 7 || 7;
                  const sat = new Date(now.getTime() + dist * 86400000);
                  update(index, 'date', sat.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickChipText}>This Sat</Text>
              </Pressable>
              <Pressable
                style={styles.quickChip}
                onPress={() => {
                  const now = new Date();
                  const dist = (7 - now.getDay() + 7) % 7 || 7;
                  const sun = new Date(now.getTime() + dist * 86400000);
                  update(index, 'date', sun.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickChipText}>This Sun</Text>
              </Pressable>
            </View>

            {/* Time Window */}
            <View style={styles.fieldRow}>
              {renderField(item, index, 'startTime', 'Start time', 'HH:MM')}
              {renderField(item, index, 'endTime', 'End time', 'HH:MM')}
            </View>

            {/* Shift Presets (1 tap) */}
            <View style={styles.quickShortcuts}>
              <Text style={styles.quickLabel}>Shift presets:</Text>
              {SHIFT_PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={styles.quickChip}
                  onPress={() => {
                    update(index, 'startTime', preset.start);
                    update(index, 'endTime', preset.end);
                  }}
                >
                  <Text style={styles.quickChipText}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Location */}
            {renderField(item, index, 'location', 'Location', 'Delhi area name')}

            {/* Location Quick Shortcuts */}
            <View style={styles.quickShortcuts}>
              <Text style={styles.quickLabel}>Delhi hubs:</Text>
              {COMMON_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  style={[styles.quickChip, item.location === loc && styles.quickChipActive]}
                  onPress={() => update(index, 'location', loc)}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      item.location === loc && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Daily Budget & Special Notes */}
            {renderField(
              item,
              index,
              'budgetPerDay',
              'Daily budget · optional',
              'Amount in ₹',
              'numeric'
            )}
            {renderField(
              item,
              index,
              'specialNotes',
              'Notes · optional',
              'Special requirements or instructions'
            )}
          </View>
        );
      })}

      <Button
        title="Add another role"
        secondary
        icon="plus"
        onPress={() => {
          dispatch({ type: 'ADD_ITEM' });
          setReviewed(false);
        }}
      />

      {errors.length > 0 && <Notice error text={errors.join('\n')} />}

      {/* Verification Checkbox (Rubric Step 3) */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: reviewed }}
        onPress={() => setReviewed(!reviewed)}
        style={styles.reviewCheck}
      >
        <View
          style={[
            styles.checkbox,
            reviewed && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          {reviewed && <Icon name="check" size={15} color="#FFFFFF" />}
        </View>
        <Text style={[ui.body, { flex: 1, color: colors.ink, fontWeight: '500' }]}>
          I’ve verified the roles, dates, shift hours and locations are correct.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  number: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  field: {
    minWidth: 0,
    gap: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputUncertain: {
    borderColor: '#D97706',
    borderWidth: 1.8,
    backgroundColor: '#FFFDF5',
  },
  uncertainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uncertainBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  uncertainReasonBox: {
    gap: 4,
    marginTop: 2,
  },
  uncertainReasonText: {
    fontSize: 12,
    color: colors.warning,
    lineHeight: 16,
  },
  suggestionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  quickShortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 4,
  },
  quickLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginRight: 2,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EDF2EE',
  },
  quickChipActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 11,
    color: colors.ink,
  },
  actionCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  followUpCard: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  followUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followUpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  followUpIntro: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
  },
  questionBullet: {
    fontSize: 14,
    color: colors.warning,
    lineHeight: 18,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
    lineHeight: 18,
  },
  reviewCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
