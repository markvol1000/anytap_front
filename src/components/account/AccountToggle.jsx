// Reusable on/off toggle for settings screens (2FA, biometric, notifications)
export function AccountToggle({ on, onToggle, ariaLabel, ariaLabelledBy, disabled = false }) {
  return (
    <button
      type="button"
      className={`portal-toggle ${on ? 'is-on' : 'is-off'}${disabled ? ' is-disabled' : ''}`}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      aria-pressed={on}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}>
      <span className="portal-toggle__knob" />
    </button>
  );
}
