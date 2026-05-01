'use client';

import { useEffect } from 'react';
import { db } from './db';

export function StorageProvider({ children }) {
  useEffect(() => {
    db.bootstrap();
  }, []);
  return children;
}
