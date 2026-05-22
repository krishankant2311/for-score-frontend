export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.55_0.14_230/0.35),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_50%,oklch(0.4_0.1_255/0.4),transparent)] px-4 py-8">
      <div className="flex min-h-[600px] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-card shadow-[var(--shadow-premium)] md:flex-row">
        {/* Left section - Login form (wider) */}
        <div className="flex-1 flex flex-col  p-8 md:p-10 lg:p-12  justify-center">
          {children}
        </div>

        {/* Right section - Image (narrower) */}
        <div className="relative w-full md:w-[50%] min-h-[300px] md:min-h-0">
          <img
            src="/login.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center rounded-b-[24px] md:rounded-b-none md:rounded-r-[24px]"
          />
        </div>
      </div>
    </div>
  );
}
