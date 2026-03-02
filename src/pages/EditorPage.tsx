import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useProject } from '@/hooks/useProject';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { loadProject } = useProject();

  useEffect(() => {
    if (id) loadProject(id);
  }, [id, loadProject]);

  return <AppShell />;
}
