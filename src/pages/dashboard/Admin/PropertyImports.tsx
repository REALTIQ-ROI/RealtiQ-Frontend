import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService, type ProjectImportListResponse } from '../../../services/projectService';
import type { ProjectImportSession } from '../../../types';
import { formatDate, labelize } from '../../../utils/projectFormatters';

const rowStatusClass = (status: string) =>
  status === 'imported' || status === 'valid'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'invalid' || status === 'failed'
      ? 'bg-red-50 text-red-700'
      : 'bg-surface-container-low text-secondary';

const AdminPropertyImports = () => {
  const { importId } = useParams();
  const { data, loading, error, execute } = useAsync(
    (): Promise<ProjectImportSession | ProjectImportListResponse> => importId
      ? projectService.getAdminPropertyImport(importId)
      : projectService.listAdminPropertyImports({ page: 1, limit: 50 }),
    true,
  );

  if (importId) {
    const session = data && 'rows' in data ? data : null;
    return (
      <AdminLayout>
        <main className="mx-auto max-w-7xl space-y-6 p-8">
          <Link to="/dashboard/admin/property-imports" className="text-sm font-bold text-primary hover:underline">Back to imports</Link>
          {loading ? <LoadingState label="Loading import session..." /> : null}
          {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
          {!loading && !error && session ? (
            <>
              <header className="rounded-xl bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">{session.originalFileName || session.importSessionId}</p>
                <h1 className="mt-2 text-3xl font-black">Property import inspection</h1>
                <p className="mt-2 text-sm text-secondary">{session.project.name || session.project.id} - {labelize(session.status)} - uploaded {formatDate(session.uploadedAt)}</p>
              </header>
              <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(session.summary).map(([key, value]) => <div key={key} className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{labelize(key)}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
              </section>
              <section className="overflow-x-auto rounded-xl bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-xs uppercase tracking-widest text-secondary"><tr><th className="p-3">Row</th><th className="p-3">Status</th><th className="p-3">Title</th><th className="p-3">Messages</th><th className="p-3">Property</th></tr></thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {session.rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="p-3 font-bold">{row.rowNumber}</td>
                        <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${rowStatusClass(row.status)}`}>{labelize(row.status)}</span></td>
                        <td className="p-3">{String(row.data?.title ?? 'Untitled')}</td>
                        <td className="p-3 text-xs text-secondary">{row.errors.length} errors / {row.warnings.length} warnings</td>
                        <td className="p-3 font-mono text-xs">{row.property || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}
        </main>
      </AdminLayout>
    );
  }

  const list = data && 'imports' in data ? data.imports : [];
  return (
    <AdminLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-8">
        <header>
          <h1 className="text-4xl font-black tracking-tight">Property Imports</h1>
          <p className="mt-2 text-sm text-secondary">Read-only inspection of project bulk property imports.</p>
        </header>
        {loading ? <LoadingState label="Loading property imports..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error ? (
          <section className="overflow-x-auto rounded-xl bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-widest text-secondary"><tr><th className="p-4">File</th><th className="p-4">Status</th><th className="p-4">Rows</th><th className="p-4">Uploaded</th><th className="p-4 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-outline-variant/10">
                {list.map((item) => (
                  <tr key={item._id}>
                    <td className="p-4 font-bold">{item.originalFileName || item._id}</td>
                    <td className="p-4">{labelize(item.status)}</td>
                    <td className="p-4">{item.importedRows}/{item.totalRows} imported</td>
                    <td className="p-4">{formatDate(item.uploadedAt)}</td>
                    <td className="p-4 text-right"><Link to={`/dashboard/admin/property-imports/${item._id}`} className="text-sm font-bold text-primary hover:underline">View</Link></td>
                  </tr>
                ))}
                {!list.length ? <tr><td colSpan={5} className="p-10 text-center text-secondary">No imports found.</td></tr> : null}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </AdminLayout>
  );
};

export default AdminPropertyImports;
