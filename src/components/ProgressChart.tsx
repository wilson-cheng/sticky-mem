import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface DataPoint {
  date: string;
  accuracy: number;
}

interface Props {
  data: DataPoint[];
}

export default function ProgressChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data yet. Start reviewing to see your progress!</Text>
      </View>
    );
  }

  const reversed = [...data].reverse();
  const labels = reversed.map(d => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const values = reversed.map(d => Math.round(d.accuracy * 100));

  const thinLabels = labels.map((l, i) => {
    if (i === 0 || i === labels.length - 1 || i % Math.max(1, Math.floor(labels.length / 5)) === 0) {
      return l;
    }
    return '';
  });

  const maxVal = Math.max(...values, 100);
  const barWidth = (Dimensions.get('window').width - 80) / Math.max(values.length, 1);

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {values.map((v, i) => {
          const pctHeight = (v / maxVal) * 140;
          return (
            <View key={i} style={styles.barGroup}>
              <View style={[styles.bar, { height: Math.max(pctHeight, 4), width: Math.max(barWidth - 4, 8) }]} />
              {thinLabels[i] ? (
                <Text style={styles.label}>{thinLabels[i]}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.yAxis}>
        <Text style={styles.yLabel}>{maxVal}%</Text>
        <Text style={styles.yLabel}>0%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 2,
    height: 160, paddingTop: 16, flex: 1,
  },
  barGroup: { alignItems: 'center', flex: 1 },
  bar: {
    backgroundColor: '#4A90D9', borderRadius: 4,
  },
  label: { fontSize: 9, color: '#888', marginTop: 4 },
  yAxis: { justifyContent: 'space-between', height: 160, paddingLeft: 4 },
  yLabel: { fontSize: 10, color: '#AAA' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
});
