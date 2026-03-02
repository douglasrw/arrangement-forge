import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { listProjects, createProject, deleteProject } = useProject();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const search = useDebounce(searchInput, 300);

  useEffect(() => {
    listProjects().then((p) => {
      setProjects(p);
      setLoading(false);
    });
  }, [listProjects]);

  async function handleCreate() {
    setCreating(true);
    const id = await createProject();
    if (id) navigate(`/project/${id}`);
    else setCreating(false);
  }

  async function handleDelete(project: Project) {
    await deleteProject(project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setDeleteTarget(null);
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
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-base-content">My Library</h1>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-ghost text-base-content/50"
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating
              ? <span className="loading loading-spinner loading-xs" />
              : '+ New Project'}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 max-w-6xl">
        {/* Search + Sort */}
        <div className="flex gap-3 items-center">
          <input
            type="search"
            className="input input-sm input-bordered w-64"
            placeholder="Search by name, genre, key..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="select select-sm select-bordered"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="updatedAt">Last Edited</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="genre">Genre</option>
            <option value="key">Key</option>
            <option value="tempo">Tempo</option>
          </select>
          <span className="text-xs text-base-content/40">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-base-content/50 text-lg">No projects yet.</p>
            <p className="text-base-content/30 text-sm">Create your first arrangement!</p>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? <span className="loading loading-spinner loading-sm" /> : '+ New Project'}
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-base-content/40">
            <p>No projects match "{search}"</p>
          </div>
        )}

        {/* Project grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="card bg-base-200 border border-base-300 hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="card-body p-4 gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base-content text-sm leading-tight line-clamp-2 flex-1">
                      {project.name}
                    </h3>
                    <button
                      className="btn btn-ghost btn-xs text-base-content/30 hover:text-error shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      title="Delete project"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="badge badge-sm badge-ghost">{project.genre}</span>
                    <span className="badge badge-sm badge-ghost">{project.key}</span>
                    <span className="badge badge-sm badge-ghost">{project.tempo} BPM</span>
                    {project.hasArrangement && (
                      <span className="badge badge-sm badge-primary">Generated</span>
                    )}
                  </div>

                  <p className="text-xs text-base-content/30 mt-1">
                    {formatDate(project.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
