import Link from 'next/link';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const router = useRouter();

  const menuItems = [
    {
      name: 'Home',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Timer',
      path: '/timer',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Goals',
      path: '/goals',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      path: '/report',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-dark-surface border-r border-dark-border z-50">
      <div className="flex flex-col items-center py-8 space-y-2">
        {/* Logo */}
        <div className="mb-8 group cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-primary-hover flex items-center justify-center transform transition-all duration-300 ease-smooth group-hover:scale-110 group-hover:shadow-glow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center space-y-2 w-full px-3">
          {menuItems.map((item) => {
            const isActive = router.pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    relative w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer
                    transform transition-all duration-300 ease-smooth
                    group
                    ${
                      isActive
                        ? 'bg-accent-primary text-white shadow-glow-md'
                        : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface-hover'
                    }
                  `}
                  title={item.name}
                >
                  {/* Icon */}
                  <div
                    className={`
                      transform transition-all duration-300 ease-smooth
                      ${isActive ? '' : 'group-hover:scale-110'}
                    `}
                  >
                    {item.icon}
                  </div>

                  {/* Hover tooltip */}
                  <div
                    className={`
                      absolute left-full ml-4 px-3 py-2 rounded-lg
                      bg-dark-elevated border border-dark-border-light shadow-premium
                      text-text-primary text-sm font-medium whitespace-nowrap
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transform translate-x-2 group-hover:translate-x-0
                      transition-all duration-250 ease-smooth
                      pointer-events-none z-50
                    `}
                  >
                    {item.name}
                    {/* Tooltip arrow */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-dark-elevated" />
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-primary rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
