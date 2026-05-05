import { Platform } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Repository } from '../db/repository';

let globalRepo: Repository | null = null;

export async function initDatabase(): Promise<Repository> {
  if (globalRepo) return globalRepo;

  if (Platform.OS === 'web') {
    // Web: use in-memory JS Map backend (no WASM dependency)
    const { createWebDatabase } = await import('../db/web');
    const webDb = createWebDatabase();
    globalRepo = await Repository.create(webDb);
  } else {
    // Native: use expo-sqlite with SQLite WASM
    const SQLite = require('expo-sqlite');
    const db = await SQLite.openDatabaseAsync('stickymem.db');
    globalRepo = await Repository.create({
      run: (sql: string, params?: any[]) => db.runAsync(sql, params),
      query: <T,>(sql: string, params?: any[]) => db.getAllAsync(sql, params) as Promise<T[]>,
    });
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
