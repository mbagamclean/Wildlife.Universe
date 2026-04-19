export function GlassPanel({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`glass rounded-2xl ${className}`}>
      {children}
    </Tag>
  );
}
