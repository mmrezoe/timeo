const PageHeader = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-center justify-between mb-8 animate-smooth-slide-up">
      <div>
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-secondary text-lg">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
