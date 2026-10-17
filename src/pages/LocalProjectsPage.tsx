import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLocalProjects } from '../hooks/useLocalProjects';
import { useCreateLocalProject } from '../hooks/useCreateLocalProject';
import { LOCAL_ROOT } from '../services/appModeService';

const titleFromFileName = (name: string) => name.replace(/\.[^.]+$/, '');

export const LocalProjectsPage = () => {
  const navigate = useNavigate();
  const { projects, error: listError } = useLocalProjects();
  const createLocalProject = useCreateLocalProject();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const onFileChange = (selected: File | null) => {
    setFile(selected);
    if (selected && !title.trim()) setTitle(titleFromFileName(selected.name));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setCreateError(null);
    setIsCreating(true);
    try {
      const project = await createLocalProject(title, file);
      navigate(`${LOCAL_ROOT}/edit/${project.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8">
        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Open a local file</h1>
          <p className="mt-1 text-sm text-gray-500">
            Transcribe an audio or video file from this device. Nothing is uploaded, and no account is needed.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              disabled={isCreating}
              data-testid="local-file-input"
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-ki-blue file:px-4 file:py-2 file:text-white"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              disabled={isCreating}
              data-testid="local-title-input"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {createError && <p className="text-sm text-red-600" role="alert">{createError}</p>}
            <button
              type="submit"
              disabled={!file || !title.trim() || isCreating}
              data-testid="local-create-button"
              className="inline-flex items-center gap-2 rounded-lg bg-ki-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              {isCreating ? 'Reading the file…' : 'Start transcribing'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">On this device</h2>
          {listError && <p className="mt-2 text-sm text-red-600">{listError}</p>}
          {projects && projects.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No local transcriptions yet.</p>
          )}
          <ul className="mt-2 divide-y divide-gray-200 bg-white border border-gray-200 rounded-lg" data-testid="local-project-list">
            {projects?.map((project) => (
              <li key={project.id}>
                <Link
                  to={`${LOCAL_ROOT}/edit/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{project.title}</span>
                  <span className="text-sm text-gray-500">
                    {project.lengthFriendly} · {project.data.regionCount ?? 0} regions
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
