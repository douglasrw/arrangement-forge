import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from '@/components/library/ProjectCard';
import { useProject } from '@/hooks/useProject';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useUiStore } from '@/store/ui-store';
import type { Project } from '@/types';

type SortKey = 'updatedAt' | 'name-asc' | 'name-desc' | 'genre' | 'key' | 'tempo';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { listProjects, createProject, deleteProject } = useProject();
  const systemStatus = useUiStore((state) => state.systemStatus);
  const errorMessage = useUiStore((state) => state.errorMessage);
  const setLibraryCount = useUiStore((state) => state.setLibraryCount);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const search = useDebounce(searchInput, 300);

  useEffect(() => {
    let active = true;

    void listProjects().then((loadedProjects) => {
      if (!active) return;
      setProjects(loadedProjects);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [listProjects]);

  async function handleRetry() {
    setLoading(true);
    const loadedProjects = await listProjects();
    setProjects(loadedProjects);
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    const id = await createProject();
    if (id) navigate(`/project/${id}`);
    else setCreating(false);
  }

  async function handleDelete(project: Project) {
    const deleted = await deleteProject(project.id);
    setDeleteTarget(null);
    if (!deleted) return;

    const nextProjects = projects.filter((candidate) => candidate.id !== project.id);
    setProjects(nextProjects);
    setLibraryCount(nextProjects.length);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.genre.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q)
        )
      : projects;

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'updatedAt':
          return b.updatedAt.localeCompare(a.updatedAt);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'genre':
          return a.genre.localeCompare(b.genre);
        case 'key':
          return a.key.localeCompare(b.key);
        case 'tempo':
          return a.tempo - b.tempo;
      }
    });
  }, [projects, search, sortKey]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Library</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
          <button
            data-testid="library-create-project"
            className="rounded px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <span className="inline-block h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              '+ New Project'
            )}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 max-w-6xl">
        {/* Search + Sort */}
        <div className="flex gap-3 items-center">
          <label htmlFor="library-search" className="sr-only">
            Search projects
          </label>
          <input
            id="library-search"
            data-testid="library-search-input"
            type="search"
            className="rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground w-64 focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search by name, genre, key..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <label htmlFor="library-sort" className="sr-only">
            Sort projects
          </label>
          <select
            id="library-sort"
            className="rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="updatedAt">Last Saved</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="genre">Genre</option>
            <option value="key">Key</option>
            <option value="tempo">Tempo</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* Error state */}
        {!loading && systemStatus === 'error' && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4"
            role="alert"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {projects.length === 0 ? 'Unable to load library' : 'Library action failed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage ??
                    'Arrangement Forge could not finish the requested library action.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && systemStatus !== 'error' && projects.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-muted-foreground text-lg">No projects yet.</p>
            <p className="text-muted-foreground/50 text-sm">Create your first arrangement!</p>
            <button
              className="rounded px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <span className="inline-block h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                '+ New Project'
              )}
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <p>No projects match "{search}"</p>
          </div>
        )}

        {/* Project grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <div key={project.id} data-testid="library-project-card" data-project-id={project.id}>
                <ProjectCard
                  project={project}
                  onOpen={() => navigate(`/project/${project.id}`)}
                  onDelete={() => setDeleteTarget(project)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Project"
        body={
          deleteTarget ? `Remove "${deleteTarget.name}" from your library.` : undefined
        }
        consequence="This permanently removes the project from your library. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
