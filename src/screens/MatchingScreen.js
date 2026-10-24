import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { rankPartners } from '../services/matchingService';
import { Button, EmptyState, Icon, Notice, Screen, Steps, ui } from '../components/ui';
import { colors } from '../theme';

export default function MatchingScreen() {
  const { state, dispatch, saveRequest } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  const items = state.currentRequest.editedData?.items;

  if (!items?.length) {
    return (
      <Screen title="Partners">
        <EmptyState
          title="No request to match"
          description="Create a staffing request to get started."
        >
          <Button title="Create request" onPress={() => router.replace('/')} />
        </EmptyState>
      </Screen>
    );
  }

  // Compute matching results for each requirement item if not already computed
  const matchingData = items.map((item, index) => {
    const existing = state.currentRequest.matchingResults?.[index]?.matching;
    if (existing) return { item, matching: existing };
    return { item, matching: rankPartners(item) };
  });

  const selectedPartners = state.currentRequest.selectedPartners || {};

  const handleSelectPartner = (itemIndex, partner) => {
    dispatch({ type: 'SELECT_PARTNER', payload: { itemIndex, partner } });
  };

  const confirmBooking = async () => {
    if (saving) return;
    setSaving(true);
    setError('');

    // Ensure all items have a partner selected (default to top partner if not chosen)
    const finalized = { ...selectedPartners };
    matchingData.forEach((entry, idx) => {
      if (!finalized[idx] && entry.matching.results?.length > 0) {
        finalized[idx] = entry.matching.results[0].partner;
      }
    });

    try {
      await saveRequest('confirmed', finalized);
      router.replace('/history');
    } catch {
      setError('Could not confirm your booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveAsDraft = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await saveRequest('saved', selectedPartners);
      router.replace('/history');
    } catch {
      setError('Could not save your request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentMatch = matchingData[selectedTab] || matchingData[0];
  const { item: currentItem, matching } = currentMatch;
  const currentSelectedPartner =
    selectedPartners[selectedTab] || matching.results?.[0]?.partner || null;

  return (
    <Screen
      title="Matching partners"
      footer={
        <View style={{ gap: 10 }}>
          <Button
            title={saving ? 'Confirming booking…' : 'Confirm & Book Partners'}
            loading={saving}
            onPress={confirmBooking}
            icon="check"
          />
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              onPress={saveAsDraft}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>Save as Draft</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>Edit Requirements</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <Steps current={2} />

      <View style={{ gap: 6 }}>
        <Text style={ui.title}>Top matching{'\n'}partners.</Text>
        <Text style={ui.body}>
          Ranked using subcategory fit, distance, availability, and reliability score.
        </Text>
      </View>

      {/* Requirement Tabs if multiple items */}
      {items.length > 1 && (
        <View style={styles.tabContainer}>
          {items.map((it, idx) => {
            const isTabActive = selectedTab === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedTab(idx)}
                style={[styles.tab, isTabActive && styles.tabActive]}
              >
                <Text style={[styles.tabText, isTabActive && styles.tabTextActive]}>
                  #{idx + 1} {it.count}× {it.subcategory || 'Staff'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Active Requirement Card */}
      <View style={styles.requirementCard}>
        <View style={styles.requirementHeader}>
          <Text style={styles.requirementTitle}>
            Requirement {selectedTab + 1}: {currentItem.count} ×{' '}
            {currentItem.subcategory || 'Staff'}
          </Text>
          <View style={styles.itemTag}>
            <Text style={styles.itemTagText}>
              {currentItem.date} · {currentItem.startTime || '--:--'}–
              {currentItem.endTime || '--:--'}
            </Text>
          </View>
        </View>
        <View style={styles.requirementMeta}>
          <Icon name="pin" size={16} color={colors.primary} />
          <Text style={styles.requirementMetaText}>
            {currentItem.location || 'Delhi'}
            {currentItem.budgetPerDay ? ` · Budget: ₹${currentItem.budgetPerDay}/day` : ''}
          </Text>
        </View>
      </View>

      {/* No Match Edge Case Warning */}
      {!matching.hasGoodMatch && (
        <Notice
          text={
            matching.noMatchReason ||
            'No partners closely match this requirement. Top results shown below with trade-offs highlighted.'
          }
        />
      )}

      <Text style={ui.eyebrow}>TOP {matching.results.length} MATCHES</Text>

      {/* Partner Cards List */}
      <View style={{ gap: 14 }}>
        {matching.results.map((result) => {
          const { partner, totalScore, rank, isTied, tieBreakerInfo, explanation, components } =
            result;
          const isSelected = currentSelectedPartner?.id === partner.id;
          const scorePercent = Math.round(totalScore * 100);

          return (
            <Pressable
              key={partner.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelectPartner(selectedTab, partner)}
              style={[styles.partnerCard, isSelected && styles.partnerCardSelected]}
            >
              {/* Partner Card Header */}
              <View style={styles.partnerHeader}>
                <View style={styles.rankContainer}>
                  <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeTop]}>
                    <Text style={[styles.rankText, rank === 1 && styles.rankTextTop]}>
                      #{rank}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.partnerName}>{partner.name}</Text>
                    <Text style={styles.partnerRole}>
                      {partner.subcategory} · {partner.experienceYears} yrs exp
                    </Text>
                  </View>
                </View>

                {/* Score & Selection Pill */}
                <View style={styles.scoreContainer}>
                  <View style={styles.scorePill}>
                    <Text style={styles.scoreValue}>{scorePercent}%</Text>
                    <Text style={styles.scoreLabel}>match</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
                  </View>
                </View>
              </View>

              {/* Tie-breaker Notice if tied */}
              {isTied && tieBreakerInfo && (
                <View style={styles.tieBanner}>
                  <Text style={styles.tieText}>⚖️ {tieBreakerInfo}</Text>
                </View>
              )}

              {/* Mathematical Explanation (Formula-derived, not LLM) */}
              <View style={styles.explanationBox}>
                <Text style={styles.explanationText}>“{explanation}”</Text>
              </View>

              {/* Component Pills */}
              <View style={styles.componentPills}>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Fit</Text>
                  <Text style={styles.pillValue}>
                    {Math.round(components.subcategory.score * 100)}%
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Distance</Text>
                  <Text style={styles.pillValue}>
                    {components.distance.distanceKm != null
                      ? `${components.distance.distanceKm} km`
                      : 'Approx'}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Avail</Text>
                  <Text style={styles.pillValue}>
                    {components.availability.score === 1.0 ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>Rating</Text>
                  <Text style={styles.pillValue}>{partner.reliabilityScore}★</Text>
                </View>
                <View style={[styles.pill, { marginLeft: 'auto', backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.pillValue, { color: '#166534', fontWeight: '700' }]}>
                    ₹{partner.hourlyRate}/hr
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {error ? <Notice text={error} error /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  requirementCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  itemTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  requirementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementMetaText: {
    fontSize: 13,
    color: colors.muted,
  },
  partnerCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  partnerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FBFDFB',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EEF2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: {
    backgroundColor: colors.primary,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  rankTextTop: {
    color: '#FFFFFF',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  partnerRole: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scorePill: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tieBanner: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tieText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  explanationBox: {
    backgroundColor: '#F7FAF8',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  explanationText: {
    fontSize: 13,
    color: colors.ink,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  componentPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF3F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillLabel: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  pillValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  secondaryAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
