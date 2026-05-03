'use client';
import { createContext, useContext } from 'react';

export const AdminShellContext = createContext({
  editorMode: false,
  setEditorMode: () => {},
});

export const useAdminShell = () => useContext(AdminShellContext);
