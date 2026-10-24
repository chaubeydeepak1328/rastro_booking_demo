import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { Button, EmptyState, Icon, Notice, Screen, ui } from '../components/ui';
import { colors } from '../theme';

export default function HistoryScreen() {
  const { state, dispatch, ready, cancelRequest } = useAppContext();
  const [query, setQuery] = useState('');

  const create = () => {
    dispatch({ type: 'RESET_CURRENT' });
    router.replace('/');
  };

  const requests = state.savedRequests.filter((request) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const itemsStr = JSON.stringify(request.editedData?.items || '').toLowerCase();
    const partnersStr = JSON.stringify(request.selectedPartners || '').toLowerCase();
    const statusStr = (request.status || '').toLowerCase();
    return itemsStr.includes(q) || partnersStr.includes(q) || statusStr.includes(q);
  });

  const handleCancelBooking = (requestId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This will update the status to Cancelled.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelRequest(requestId),
        },
      ]
    );
  };

  return (
    <Screen
      title="My requests"
      footer={<Button title="New staffing request" icon="plus" onPress={create} />}
    >
      <View style={{ gap: 8 }}>
        <Text style={ui.title}>Your staffing,{'\n'}in one place.</Text>
        <Text style={ui.body}>
          Track confirmed bookings, review assigned partners, or edit saved drafts.
        </Text>
      </View>

      {state.error && <Notice text={state.error} error />}

      {!ready ? (
        <Text style={ui.body}>Loading your requests…</Text>
      ) : state.savedRequests.length === 0 ? (
        <EmptyState
          icon="list"
          title="A fresh start"
          description="Your saved and confirmed staffing requests will appear here. Create your first request to get started."
        />
      ) : (
        <>
          <TextInput
            accessibilityLabel="Search requests"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by role, partner name, or location"
            placeholderTextColor={colors.muted}
            blurOnSubmit={false}
            style={ui.input}
          />

          <Text style={ui.eyebrow}>
            {requests.length} {requests.length === 1 ? 'REQUEST' : 'REQUESTS'}
          </Text>

          {requests.length === 0 && (
            <EmptyState
              title="No matching requests found"
              description="Try searching with a different term."
            />
          )}

          {requests.map((request) => {
            const isConfirmed = request.status === 'confirmed';
            const isCancelled = request.status === 'cancelled';
            const assignedPartners = request.selectedPartners
              ? Object.values(request.selectedPartners)
              : [];

            return (
              <Pressable
                key={request.id}
                accessibilityRole="button"
                accessibilityLabel={
                  'Request: ' +
                  request.editedData.items.map((item) => item.subcategory || 'Staff').join(', ')
                }
                onPress={() => {
                  dispatch({ type: 'LOAD_REQUEST', payload: request });
                  router.push('/review');
                }}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                {/* Header: Status Badge & Timestamp */}
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <View
                    style={[
                      styles.badge,
                      isConfirmed
                        ? styles.badgeConfirmed
                        : isCancelled
                        ? styles.badgeCancelled
                        : styles.badgeSaved,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isConfirmed
                          ? styles.badgeTextConfirmed
                          : isCancelled
                          ? styles.badgeTextCancelled
                          : styles.badgeTextSaved,
                      ]}
                    >
                      {isConfirmed ? '✓ Confirmed' : isCancelled ? '✕ Cancelled' : 'Saved Draft'}
                    </Text>
                  </View>

                  <Text style={styles.date}>
                    {new Date(request.confirmedAt || request.savedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {/* Items Description */}
                {request.editedData.items.map((item, index) => (
                  <View key={index} style={{ gap: 4 }}>
                    <Text style={styles.itemTitle}>
                      {item.count} × {item.subcategory || 'Staff'}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      {item.location || 'Delhi'} · {item.date} ({item.startTime}–{item.endTime})
                    </Text>
                  </View>
                ))}

                {/* Assigned Partners Section if confirmed */}
                {isConfirmed && assignedPartners.length > 0 && (
                  <View style={styles.assignedSection}>
                    <Text style={styles.assignedHeading}>ASSIGNED PARTNER(S):</Text>
                    {assignedPartners.map((partner, pIdx) => (
                      <View key={pIdx} style={styles.partnerRow}>
                        <Icon name="people" size={16} color={colors.primary} />
                        <Text style={styles.partnerNameText}>{partner.name}</Text>
                        <Text style={styles.partnerDetailText}>
                          ({partner.subcategory} · {partner.reliabilityScore}★ · ₹
                          {partner.hourlyRate}/hr)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Footer Controls */}
                <View style={[ui.row, { justifyContent: 'space-between', marginTop: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={ui.link}>View & edit details</Text>
                    <Icon name="arrow" size={16} color={colors.primary} />
                  </View>

                  {isConfirmed && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelBooking(request.id);
                      }}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel booking</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeSaved: {
    backgroundColor: colors.primarySoft,
  },
  badgeConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  badgeCancelled: {
    backgroundColor: colors.dangerSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSaved: {
    color: colors.primary,
  },
  badgeTextConfirmed: {
    color: '#15803D',
  },
  badgeTextCancelled: {
    color: colors.danger,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  assignedSection: {
    backgroundColor: '#F7FAF8',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 6,
  },
  assignedHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  partnerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  partnerDetailText: {
    fontSize: 12,
    color: colors.muted,
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
});
