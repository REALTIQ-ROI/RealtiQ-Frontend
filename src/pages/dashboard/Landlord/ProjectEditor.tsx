import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ProjectForm from '../../../components/project/ProjectForm';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { projectService, type CreateProjectRequest, type UpdateProjectRequest } from '../../../services/projectService';
import type { ProjectDetail } from '../../../types';
import { buildProjectEditPatch } from '../../../utils/projectEditPatch';

const apiErrorText = (raw: unknown): string => raw instanceof ApiRequestError && raw.code
  ? `${raw.message} (${raw.code})`
  : raw instanceof Error ? raw.message : 'Unable to save project.';

const projectFieldErrors = (raw: unknown): Record<string, string> => raw instanceof ApiRequestError
  ? Object.fromEntries((raw.fieldErrors ?? []).filter((item) => item.path && item.msg).map((item) => [item.path!.replace(/^canonicalFields\./, ''), item.msg!]))
  : {};

const ProjectEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, loading, error, execute } = useAsync(() => projectService.getProjectManage(id!), isEdit);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [versionConflict, setVersionConflict] = useState(false);
  const stepUp = useBoundStepUp<{ project: ProjectDetail }>();

  const finishSave = (project: ProjectDetail) => {
    toast.success(isEdit ? 'Project changes saved.' : 'Project created.');
    navigate(`/dashboard/landlord/projects/${project._id}`);
  };

  const beginRequiredStepUp = async (method: 'POST' | 'PATCH', path: string, body: CreateProjectRequest | UpdateProjectRequest, label: string) => {
    await stepUp.begin({
      method,
      path,
      body,
      label,
      execute: async (challengeId, exactBody) => {
        try {
          const result = method === 'POST'
            ? await projectService.createProject(exactBody as CreateProjectRequest, challengeId)
            : await projectService.updateProject(id!, exactBody as UpdateProjectRequest, challengeId);
          finishSave(result.project);
          return result;
        } catch (raw) {
          setServerErrors(projectFieldErrors(raw));
          throw raw;
        }
      },
    });
  };

  const handleSubmit = async (payload: CreateProjectRequest) => {
    setSubmitError(null);
    setServerErrors({});
    setVersionConflict(false);
    if (!isEdit) {
      try {
        const response = await projectService.createProject(payload);
        finishSave(response.project);
      } catch (raw) {
        if (raw instanceof ApiRequestError && raw.code === 'AUTH_STEP_UP_REQUIRED') {
          await beginRequiredStepUp('POST', '/api/projects', payload, 'Create this project');
          return;
        }
        setServerErrors(projectFieldErrors(raw));
        setSubmitError(apiErrorText(raw));
      }
      return;
    }

    const project = data?.project;
    if (!project || typeof project.version !== 'number') {
      setSubmitError('The current project version is unavailable. Refresh before saving.');
      return;
    }
    const body = buildProjectEditPatch(project, payload, project.version);
    if (Object.keys(body).length === 1) {
      toast.info('No project changes to save.');
      return;
    }
    const path = `/api/projects/${encodeURIComponent(project._id)}`;
    try {
      const response = await projectService.updateProject(project._id, body);
      finishSave(response.project);
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'AUTH_STEP_UP_REQUIRED') {
        await beginRequiredStepUp('PATCH', path, body, 'Save these project changes');
        return;
      }
      if (raw instanceof ApiRequestError && raw.status === 409) {
        setVersionConflict(true);
        setSubmitError(`${apiErrorText(raw)} The form draft is preserved. Refresh the project before submitting again.`);
        return;
      }
      setServerErrors(projectFieldErrors(raw));
      setSubmitError(apiErrorText(raw));
    }
  };

  return (
    <LandlordPortalLayout active="projects" title={isEdit ? 'Edit Project' : 'Create Project'}>
      <main className="mx-auto max-w-6xl p-8 lg:p-12">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tight">{isEdit ? 'Edit Project' : 'Create Project'}</h1>
          <p className="mt-2 text-sm text-secondary">RealtIQ automatically assigns this project to your signed-in landlord account.</p>
        </header>
        {loading ? <LoadingState label="Loading project..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error ? (
          <>
            {isEdit ? <p className="mb-4 text-sm text-secondary">Changes are saved against the current project version. If the server requires additional verification, the same request is protected by a one-use authenticator challenge.</p> : null}
            {submitError || (!stepUp.challenge && stepUp.error) ? <p role="alert" className="mb-4 rounded-lg bg-error-container p-4 text-sm text-on-error-container">{submitError ?? stepUp.error}</p> : null}
            {versionConflict ? <button type="button" className="mb-4 text-sm font-bold text-primary underline" onClick={() => { if (window.confirm('Reload the latest project version and discard this unsaved form draft?')) window.location.reload(); }}>Reload latest project and discard draft</button> : null}
            {submitError?.includes('current project version') ? <button type="button" className="mb-4 text-sm font-bold text-primary underline" onClick={() => void execute()}>Refresh project data</button> : null}
            <ProjectForm initialData={data?.project} onSubmit={handleSubmit} submitLabel={isEdit ? 'Save Project' : 'Create Project'} preserveEmptyValues={isEdit} isLoading={stepUp.busy || Boolean(stepUp.challenge)} serverErrors={serverErrors} />
          </>
        ) : null}
      </main>
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={async (code) => {
        const result = await stepUp.complete(code);
        if (!result.ok) return false;
        return true;
      }} />
    </LandlordPortalLayout>
  );
};

export default ProjectEditor;
