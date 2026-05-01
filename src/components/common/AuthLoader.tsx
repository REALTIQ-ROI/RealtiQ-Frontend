const AuthLoader = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center gap-4"
    style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}
  >
    <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
    <p className="text-slate-500 text-sm font-medium">Please wait...</p>
  </div>
);

export default AuthLoader;
