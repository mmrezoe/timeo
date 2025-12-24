import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="ml-20 min-h-screen">
        <div className="container-premium py-12">
          <div className="animate-smooth-fade">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
