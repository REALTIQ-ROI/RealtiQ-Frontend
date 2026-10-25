import AdminLayout from '../../../components/layout/AdminLayout';

const ManageKyc = () => (
  <AdminLayout>
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Compliance review</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-primary">Verification Cases</h1>
        <p className="mt-2 text-sm text-secondary">Review is scoped to the current staff profile and assigned case authority.</p>
      </header>
      <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
        <h2 className="text-xl font-extrabold">Case review unavailable</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
          The supported queue is GET /api/admin/verification-cases. This frontend has no current-case DTO or evidence viewer contract, and the one-use challenge exchange needed for claim and decision is not documented. The old user-ID KYC review endpoint rejects the current workflow, so no decision or raw identity document is shown here.
        </p>
      </section>
    </main>
  </AdminLayout>
);

export default ManageKyc;
