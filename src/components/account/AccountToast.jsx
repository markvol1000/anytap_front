// Portal toast notification — shown briefly at top of screen
export function AccountToast({ msg }) {
  if (!msg) return null;
  return <div className="portal-toast" role="status">{msg}</div>;
}
