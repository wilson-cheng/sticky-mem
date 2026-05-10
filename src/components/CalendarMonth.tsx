import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { DailyStats } from '../types';

interface Props {
  stats: DailyStats[];
  questionsPerDay: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDays(year: number, month: number) {
  // Returns array of { day: number | null } for the calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  // Padding for first week
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete the last week
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarMonth({ stats, questionsPerDay }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = getMonthDays(year, month);
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const getDayStatus = (day: number): 'none' | 'partial' | 'complete' => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = stats.find(s => s.date === dateStr);
    if (!entry || entry.totalReviewed === 0) return 'none';
    if (entry.totalReviewed >= questionsPerDay) return 'complete';
    return 'partial';
  };

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <View key={`e-${idx}`} style={styles.dayCell} />;
          }
          const status = getDayStatus(day);
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear();

          return (
            <View key={`d-${day}`} style={styles.dayCell}>
              <View
                style={[
                  styles.dayCircle,
                  status === 'complete' && styles.dayComplete,
                  status === 'partial' && styles.dayPartial,
                  isToday && styles.dayTodayBorder,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    status !== 'none' && { color: '#fff' },
                  ]}
                >
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 30;

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fff',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f5',
  },
  navArrow: {
    fontSize: 20,
    lineHeight: 22,
    color: '#555',
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekday: {
    width: CIRCLE_SIZE,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayComplete: {
    backgroundColor: '#1B5E20', // dark green
  },
  dayPartial: {
    backgroundColor: '#81C784', // light green
  },
  dayTodayBorder: {
    borderWidth: 2,
    borderColor: '#7C4DFF',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
