import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Platform, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brew } from '../../types';
import { getBrew, deleteBrew } from '../../lib/brews';
import RadarChart from '../../components/RadarChart';
import StarRating from '../../components/StarRating';

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function BrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [brew, setBrew] = useState<Brew | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrew(id).then(setBrew).finally(() => setLoading(false));
  }, [id]);

  async function confirmDelete() {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete this brew log?')) return;
      await deleteBrew(id);
      router.replace('/(tabs)');
    } else {
      Alert.alert('Delete Brew', 'Are you sure you want to delete this brew log?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteBrew(id);
            router.replace('/(tabs)');
          },
        },
      ]);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5A2B" />
      </View>
    );
  }

  if (!brew) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Brew not found.</Text>
      </View>
    );
  }

  const date = new Date(brew.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photo */}
      {brew.photo_url ? (
        <Image source={{ uri: brew.photo_url }} style={styles.heroPhoto} resizeMode="contain" />
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.coffeeName}>{brew.coffee_name}</Text>
        {brew.roaster ? <Text style={styles.roaster}>{brew.roaster}</Text> : null}
        <Text style={styles.date}>{date}</Text>
        {brew.rating ? (
          <View style={{ marginTop: 8 }}>
            <StarRating value={brew.rating} readonly />
          </View>
        ) : null}
      </View>

      {/* Brew info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brew Info</Text>
        <InfoRow label="Method" value={brew.brew_method} />
        {brew.origin ? <InfoRow label="Origin" value={brew.origin} /> : null}
        {brew.roast_level ? <InfoRow label="Roast" value={brew.roast_level} /> : null}
        {brew.varietal ? <InfoRow label="Varietal" value={brew.varietal} /> : null}
        {brew.processing_method ? <InfoRow label="Processing" value={brew.processing_method} /> : null}
        {brew.grind_size ? <InfoRow label="Grind Size" value={brew.grind_size} /> : null}
        {brew.water_temp_c ? <InfoRow label="Water Temp" value={`${brew.water_temp_c}°C`} /> : null}
        {brew.dose_g ? <InfoRow label="Dose" value={`${brew.dose_g}g`} /> : null}
        {brew.yield_g ? <InfoRow label="Yield" value={`${brew.yield_g}g`} /> : null}
        {brew.brew_time_s ? <InfoRow label="Brew Time" value={`${brew.brew_time_s}s`} /> : null}
      </View>

      {/* Flavor profile radar */}
      {brew.flavor_profile ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flavor Profile</Text>
          <View style={styles.radarWrapper}>
            <RadarChart profile={brew.flavor_profile} size={280} />
          </View>
        </View>
      ) : null}

      {/* Tasting notes */}
      {brew.flavor_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flavor Notes</Text>
          <Text style={styles.notes}>{brew.flavor_notes}</Text>
        </View>
      ) : null}

      {brew.general_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{brew.general_notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/brew/edit/${id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.editButtonText}>Edit Brew</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} activeOpacity={0.85}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  content: { paddingBottom: 48 },
  heroPhoto: { width: '100%', maxHeight: 360, backgroundColor: '#F5EFE6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFE6' },
  error: { color: '#8C7B6E', fontSize: 16 },

  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coffeeName: { fontSize: 22, fontWeight: '800', color: '#4A3728' },
  roaster: { fontSize: 14, color: '#8C7B6E', marginTop: 4 },
  date: { fontSize: 13, color: '#B0A090', marginTop: 6 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8B5A2B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5EFE6' },
  infoLabel: { fontSize: 14, color: '#8C7B6E' },
  infoValue: { fontSize: 14, color: '#4A3728', fontWeight: '600' },

  radarWrapper: { alignItems: 'center', paddingVertical: 8 },

  notes: { fontSize: 15, color: '#4A3728', lineHeight: 22 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginHorizontal: 20 },
  editButton: {
    flex: 1,
    backgroundColor: '#8B5A2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: '#CC4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#CC4444', fontSize: 15, fontWeight: '600' },
});
