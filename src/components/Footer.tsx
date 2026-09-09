export function Footer() {
  return (
    <footer className="mt-24 border-t border-border px-6 py-10 md:px-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="label">KAREER GUIDE — AI JOB SEARCH & CAREER ROADMAPS</p>
        <p className="label text-muted-foreground">
          © {new Date().getFullYear()} KAREERGUIDE.IN · BUILT FOR STUDENTS & PROFESSIONALS
        </p>
      </div>
    </footer>
  );
}
