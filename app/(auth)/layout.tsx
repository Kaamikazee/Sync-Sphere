const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex flex-col gap-3 justify-center items-center min-h-screen w-full md:p-6">
      <div className="absolute top-0 left-0 w-full flex justify-end">
        <div className="flex items-center gap-2 max-w-7xl p-4 md:p-6"></div>
      </div>
      {children}
    </main>
  );
};

export default layout;
