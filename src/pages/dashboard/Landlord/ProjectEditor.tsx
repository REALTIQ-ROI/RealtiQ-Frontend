import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ProjectForm from '../../../components/project/ProjectForm';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService, type CreateProjectRequest } from '../../../services/projectService';

const ProjectEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, loading, error, execute } = useAsync(() => projectService.getProjectManage(id!), isEdit);

  const handleSubmit = async (payload: CreateProjectRequest) => {
    try {
      const response = isEdit && id
        ? await projectService.updateProject(id, payload)
        : await projectService.createProject(payload);
      toast.success(isEdit ? 'Project updated.' : 'Project created.');
      navigate(`/dashboard/landlord/projects/${response.project._id}`);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to save project.');
      throw raw;
    }
  };

  return (
    <LandlordPortalLayout active="projects" title={isEdit ? 'Edit Project' : 'Create Project'}>
      <main className="mx-auto max-w-6xl p-8 lg:p-12">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tight">{isEdit ? 'Edit Project' : 'Create Project'}</h1>
          <p className="mt-2 text-sm text-secondary">RealTIQ automatically assigns this project to your signed-in landlord account.</p>
        </header>
        {loading ? <LoadingState label="Loading project..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error ? (
          <ProjectForm initialData={data?.project} onSubmit={handleSubmit} submitLabel={isEdit ? 'Save Project' : 'Create Project'} />
        ) : null}
      </main>
    </LandlordPortalLayout>
  );
};

export default ProjectEditor;
