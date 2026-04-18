import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';

const staticInquiries = [
  {
    id: 'static-1',
    initials: 'ES',
    initialsClass: 'bg-secondary-container text-on-secondary-fixed',
    name: 'Eleanor Shellstrop',
    preview: '"I would like to schedule a private viewing for this Saturday..."',
    propertyImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCNk1ZIzn84JqGp-XdLiuixo6v4N-MsZgRDfcKZwXqRXdyV0-dkOtEogDMI6CBM5BdQuUhMZtngjQTHwHs9zHaSQhRZNyEZKqBHvTImd87h_xfJw6xQrT99wBf55c_Qe4vawWSDE6c4rJWr7kwma9op9XMP4vT5EfQ-YUCsCcIPBbxhKQr9Vy1ZfMntq7e9P0CkDc64o_Ewvc3BWap4IM7PsFkkyu7xnJUpf0w7p7lsI2QbBDQ65KQuxAPB3EXYDxWekJreh4oDQ',
    propertyName: 'The Glass Pavilion',
    landlordImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBWtNzF2eB_SIrYNfzk4KJlm6yhv3KHwL6OYwgvZK4aD0hVWgeQoJX8DJ8MPGNK2-bpHX4o-RgvwLfYihF3O44NN12P1H2jkIU2-fIXZnkN8WPUA_lD3l8Bk0_yEk3A8RpJ0d21z7joQavI0qCyLTN4xiWlpAjhBbE15_dsF_ZrFBQOgFiqy55xpNRViYgzbDjM_G1IX7JUjJ1n5dMYm1lvuyV4POFP99O2VJd2Sqrasace5Zh83Tj7gSF3y8EbwngASihXINULVQ',
    landlordName: 'Marcus Aurelius',
    timestamp: 'Today, 10:45 AM',
    statusBadge: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">NEW</span>,
    rowClass: 'bg-surface-container-lowest hover:bg-white transition-all group border border-transparent hover:border-slate-100',
    opacity: '',
  },
  {
    id: 'static-2',
    initials: 'JM',
    initialsClass: 'bg-slate-200 text-slate-500',
    name: 'Julian Manning',
    preview: '"Is the security deposit negotiable for a 24-month lease?"',
    propertyImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAAfy76qi-YAb9TYdJ9q-SBjGTgudkpb8v56NGhOBD3r5km4PiWnVNdCGke3D4P8Xd24S8xEbN5Ju2HJ6Ksz1hnHUzu3j1T2djDxVljsOUqShWOCY4z7iEZ6Clhp_IQGiKrcwFYyCSkrdiI7gGVUvorGXuua7JfiIv07EduPWmxt4uRoePuyG6HRe45daMIz16sfxRexGvKx1DfKAi9a7w1ftOTUy7hFKNVrd2F03nqvCANU2OE7dbuJvo4RVkjxN8zruZxDhbL5Q',
    propertyName: 'Brutalist Heights',
    landlordImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuApD-C0zdsxcgNBnNInNB-RwcTbYkitDa8AiZwVn0adwr1m8ZP91HYbP0df0OPpXkCZBw5mazAfyBRLhMTSkefLbxjK5Bra9O5C-AUutXD8YxRgt49lFUA8K0DyJdOnYp5cCm0qnHHJgmOG4AQv8eLIKkCmtTS1oVLA50MfT-rGY96f1bXDNL7BxGAtQl9d1ghx6gJ3xcSXsGjVt7Mm3GxALVYImomKplPykZo6mwpj5VGqmg6X3kExGats2NKi2SwtYOuDbAlxhg',
    landlordName: 'Sarah Connor',
    timestamp: 'Yesterday, 04:20 PM',
    statusBadge: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-fixed">
        RESPONDED
      </span>
    ),
    rowClass: 'bg-surface-container-low/40 border border-transparent',
    opacity: 'opacity-60',
  },
  {
    id: 'static-3',
    initials: 'KL',
    initialsClass: 'bg-slate-900 text-white',
    name: 'Kendrick Lamar',
    preview: '"Looking for more photos of the master bathroom suite."',
    propertyImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAp2_IWbjtcdTz8svl0Vy3I3CdJOnZ_ReePOfacr9SgrvUVgXDX-2Km8Sxgtf62wbLgdD0He4AtVXHCdBRtFschn1szCnM3uAscN2OZe7EfyLrLIdUa8wWVw6-QPEbSZabVzF4UX5xEDMHv1BKvB7jRhaheU1p_yvgLQ-6nOX0trCvthv7CY_bPCKPKRxgj8wkhOVWT3ANSi1Drh2KURaRxnfHkm9FQdMfLus59eOjzxOe1NbC26q65Z3CxeIU3ACr3ZdQg2jTq2A',
    propertyName: 'Marble Estate',
    landlordImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBvdx_A93d4XmDAe3OMUgBGGYZM6dSqxBP0mn_4ZdmiMX6rJyDYV1qzzogKGAHZcKlNZPRhWrsPgsUVuHpVs1WfrFXaP1EU1Fg_B1tdHEzOPvuC2MoRwWuuiEbklvjRNU3qYuQePw6tjcDMQeCx5QqAcc65vdYeecYHrAgL4TP6dnyfRHDEXx0iLmA7v8R6c4CDlbatRTPRYWIGQnw-TnUDKvyM1eCf8JCE8c2cOEjy6Kh39vzMTlop2QjzzO_if6nT8y5piKBJqA',
    landlordName: 'Marcus Aurelius',
    timestamp: 'Dec 12, 2023',
    statusBadge: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">NEW</span>,
    rowClass: 'bg-surface-container-lowest hover:bg-white transition-all group border border-transparent hover:border-slate-100',
    opacity: '',
  },
  {
    id: 'static-4',
    initials: 'BP',
    initialsClass: 'bg-slate-300 text-slate-600',
    name: 'Beth Phoenix',
    preview: '"Withdrawal of inquiry: found another property."',
    propertyImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDoyU3OlUW7ytnjg8riB_zjCsRE90718JEX0qHt18dOyHWU3AzkK7MF9ORP7u6-LCb139EfAFV4WdSdGAYskdCNQLkZvjCCSufCD6K6Bt8-KSn1OzfUwM5QvzLk1LESI_gcZ6ivBKTEN_WnsJkNZxagE6bGckXGObmvJoyOrld1GZ4sfu3VTI5-gE4dUV_eCYN4XkmL6YMyt-IXgBMkCGnvz7ArhguG4XjuMgL_jU9hk2iihbGin93yCh2VpKie-aX62iIkfF154A',
    propertyName: 'Garden Terrace',
    landlordImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIhSPaMDFOzVghKol2XjJoGZ7sWhIcQq5rQ54UumT3R_8DOYSaoFEwLb2LHJ9b-EqfqM3J7W3MvywvhgrTy2ptDaL1TTwMfG9fh1iZtZ31WOUhYjj322c5ai1-tdjZw4X_wS054AItTTRPdXmW650fL9oA5W5TJw94pL6QwWxDNumosaeuP9fFZqPcMuJ-LsXtpwePNyhXSbwZz9MpfkmLB6yF2d2wwYhKwSPskDdna45lwpgCGttecTBSV2vcVROh9RZhUONkbw',
    landlordName: 'Sarah Connor',
    timestamp: 'Nov 28, 2023',
    statusBadge: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-secondary">
        ARCHIVED
      </span>
    ),
    rowClass: 'bg-surface-container-low/40 border border-transparent grayscale opacity-50',
    opacity: '',
  },
];

const ManageInquiries = () => {
  const { data, execute } = useAsync(() => inquiryService.getInquiries(), true);
  const hasRealData = (data ?? []).length > 0;

  return (
    <AdminLayout>
      <div className="min-h-screen">
        {/* Page Content */}
        <div className="pt-8 px-8 pb-12">
          {/* Header Section */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary mb-2 block">
                System Intelligence
              </span>
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary leading-none">
                Inquiries Feed
              </h2>
              <p className="text-secondary mt-3 max-w-xl font-body">
                Monitor and manage all prospective leads across your entire architectural portfolio in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-full">
              <button className="px-6 py-2 bg-white text-primary font-bold text-sm rounded-full shadow-sm">
                All Time
              </button>
              <button className="px-6 py-2 text-secondary font-medium text-sm rounded-full hover:bg-white/50 transition-colors">
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Filters & Stats Bento Row */}
          <div className="grid grid-cols-12 gap-6 mb-8">
            {/* Active Filters */}
            <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-xl p-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Filter By:</span>
              </div>
              <div className="relative">
                <select className="appearance-none bg-surface-container-lowest text-sm font-medium border-none py-2 pl-4 pr-10 rounded-full focus:ring-2 focus:ring-surface-tint/10 cursor-pointer">
                  <option>Property: All Listings</option>
                  <option>The Glass Pavilion</option>
                  <option>Brutalist Heights</option>
                  <option>Mid-Century Oasis</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">
                  keyboard_arrow_down
                </span>
              </div>
              <div className="relative">
                <select className="appearance-none bg-surface-container-lowest text-sm font-medium border-none py-2 pl-4 pr-10 rounded-full focus:ring-2 focus:ring-surface-tint/10 cursor-pointer">
                  <option>Status: New</option>
                  <option>Status: Responded</option>
                  <option>Status: Archived</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">
                  keyboard_arrow_down
                </span>
              </div>
              <div className="h-8 w-px bg-slate-300/50 mx-2" />
              <button className="text-xs font-bold text-primary hover:underline underline-offset-4">
                Clear All Filters
              </button>
            </div>

            {/* Small Stats Card */}
            <div className="col-span-12 lg:col-span-4 bg-primary-container text-white rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-primary-container mb-1">Response Rate</p>
                <p className="text-3xl font-extrabold tracking-tighter">94.2%</p>
              </div>
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined">bolt</span>
              </div>
            </div>
          </div>

          {/* Inquiries List */}
          <div className="space-y-4">
            {/* Header Labels */}
            <div className="grid grid-cols-12 gap-4 px-6 mb-2">
              <div className="col-span-4 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">
                Inquirer / Message Preview
              </div>
              <div className="col-span-3 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">
                Property Intent
              </div>
              <div className="col-span-2 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">
                Assigned Landlord
              </div>
              <div className="col-span-2 text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">
                Timestamp
              </div>
              <div className="col-span-1" />
            </div>

            {hasRealData
              ? (data ?? []).map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="grid grid-cols-12 items-center gap-4 bg-surface-container-lowest hover:bg-white transition-all p-6 rounded-xl group border border-transparent hover:border-slate-100"
                  >
                    <div className="col-span-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed font-bold text-xs">
                        {inquiry.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">{inquiry.fullName}</h4>
                        <p className="text-xs text-secondary truncate max-w-[200px]">{inquiry.message}</p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <span className="text-xs font-bold text-primary">—</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-secondary">—</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-secondary">—</span>
                    </div>
                    <div className="col-span-1 flex justify-end gap-2 items-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inquiry.status === 'open'
                            ? 'bg-primary text-white'
                            : 'bg-surface-container-highest text-secondary'
                        }`}
                      >
                        {inquiry.status === 'open' ? 'NEW' : 'CLOSED'}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          await inquiryService.updateInquiryStatus(inquiry.id, inquiry.status === 'open' ? 'closed' : 'open');
                          await execute();
                        }}
                      >
                        Toggle
                      </Button>
                    </div>
                  </div>
                ))
              : staticInquiries.map((inq) => (
                  <div key={inq.id} className={`grid grid-cols-12 items-center gap-4 p-6 rounded-xl ${inq.rowClass}`}>
                    <div className="col-span-4 flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${inq.initialsClass}`}
                      >
                        {inq.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">{inq.name}</h4>
                        <p className="text-xs text-secondary truncate max-w-[200px]">{inq.preview}</p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className={`flex items-center gap-3 ${inq.opacity}`}>
                        <div className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img alt="Property" className="w-full h-full object-cover" src={inq.propertyImg} />
                        </div>
                        <span className="text-xs font-bold text-primary">{inq.propertyName}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <img alt="Landlord" className="w-6 h-6 rounded-full" src={inq.landlordImg} />
                      <span className="text-xs font-medium text-secondary">{inq.landlordName}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-secondary">{inq.timestamp}</span>
                    </div>
                    <div className="col-span-1 flex justify-end">{inq.statusBadge}</div>
                  </div>
                ))}
          </div>

          {/* Load More Section */}
          <div className="mt-12 text-center">
            <button className="px-8 py-3 bg-white text-primary text-xs font-bold uppercase tracking-widest rounded-lg border-2 border-slate-100 hover:border-primary transition-all">
              Load Older Inquiries
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageInquiries;
