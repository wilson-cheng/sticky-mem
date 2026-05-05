import { useEffect, useState, useRef } from 'react';
import { Repository } from '../db/repository';

let globalRepo: Repository | null = null;

export async function initDatabase(): Promise<Repository> {
  if (globalRepo) return globalRepo;

  // In native mode, we'd use expo-sqlite. For web, we could use wa-sqlite.
  // For now, this uses a polymorphic approach — web Expo builds may use SQLite polyfill.
  try {
    const SQLite = require('expo-sqlite');
    const db = await SQLite.openDatabaseAsync('stickymem.db');
    globalRepo = await Repository.create({
      run: (sql: string, params?: any[]) => db.runAsync(sql, params),
      query: <T,>(sql: string, params?: any[]) => db.getAllAsync(sql, params) as Promise<T[]>,
    });
  } catch (e) {
    console.warn('expo-sqlite not available, using in-memory fallback:', e);
    // In-memory fallback for web — uses a simple JS Map implementation
    const { createWebDatabase } = await import('../db/web');
    const webDb = createWebDatabase();
    globalRepo = await Repository.create(webDb);
  }

  return globalRepo;
}

export function useDatabase(): Repository | null {
  const [repo, setRepo] = useState<Repository | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initDatabase().then(setRepo).catch(console.error);
  }, []);

  return repo;
}
