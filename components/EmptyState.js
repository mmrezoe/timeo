const EmptyState = ({
  icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-smooth-fade">
      <div className="w-20 h-20 rounded-2xl bg-dark-elevated flex items-center justify-center mb-6 transform transition-all duration-300 hover:scale-110">
        {icon ? (
          icon
        ) : (
          <svg
            className="w-10 h-10 text-text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title || "No data yet"}
      </h3>

      <p className="text-text-secondary text-center max-w-sm mb-6">
        {description || "Get started by adding your first item"}
      </p>

      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
