const StatsCard = ({
  icon,
  title,
  value,
  subtitle,
  badge,
  trend,
  gradient = "from-accent-primary to-accent-primary-hover"
}) => {
  return (
    <div className="card-premium hover-glow animate-smooth-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-glow-sm`}>
          {icon}
        </div>
        {badge && (
          <div className="badge badge-primary">
            {badge}
          </div>
        )}
      </div>

      <div className="text-3xl font-bold text-text-primary mb-1 font-mono">
        {value}
      </div>

      <div className="text-text-secondary text-sm">
        {subtitle}
      </div>

      {trend && (
        <div className="mt-4 flex items-center text-accent-secondary text-sm">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={trend.direction === 'up' ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"}
            />
          </svg>
          <span className={trend.direction === 'up' ? 'text-accent-secondary' : 'text-accent-danger'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
