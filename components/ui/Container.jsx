export function Container({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`mx-auto w-[90%] lg:w-[85%] max-w-[1560px] ${className}`}>
      {children}
    </Tag>
  );
}
