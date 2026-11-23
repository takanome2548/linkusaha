export function AuthMessage({ searchParams }) {
  if (searchParams?.error) return <div className="notice error" role="alert">{searchParams.error}</div>;
  if (searchParams?.message) return <div className="notice success" role="status">{searchParams.message}</div>;
  return null;
}
