import { useId } from 'react';
import { englishFieldProps } from '../utils/formValidation.js';

function fieldClass(filled, className, error) {
  return [
    'outline-field',
    filled && 'outline-field--filled',
    error && 'outline-field--error',
    className,
  ].filter(Boolean).join(' ');
}

/** Fieldset + legend notch — border gaps at label without background fill (MUI-style). */
function OutlineFieldFrame({ label, filled, className, error, children }) {
  return (
    <fieldset className={fieldClass(filled, className, error)}>
      <legend className="outline-field__legend">{label}</legend>
      <span className="outline-field__rest-label" aria-hidden="true">{label}</span>
      {children}
    </fieldset>
  );
}

function OutlineInput({ label, filled, error, className = '', ...props }) {
  const id = useId();
  return (
    <OutlineFieldFrame label={label} filled={filled} error={error} className={className}>
      <input id={id} placeholder=" " {...englishFieldProps} {...props} />
    </OutlineFieldFrame>
  );
}

function OutlineSelect({ label, filled = true, className = '', children, ...props }) {
  const id = useId();
  return (
    <OutlineFieldFrame label={label} filled={filled} className={['outline-field--select', className].filter(Boolean).join(' ')}>
      <select id={id} {...englishFieldProps} {...props}>{children}</select>
    </OutlineFieldFrame>
  );
}

function OutlinePasswordInput({
  label,
  value,
  onChange,
  visible = false,
  onToggle,
  toggleable = true,
  error = false,
  wrapClass = 'password-wrap',
  toggleClass = 'password-wrap__toggle',
  autoComplete = 'current-password',
  ToggleIcon,
  ...props
}) {
  const id = useId();
  const filled = value.length > 0;
  const inputType = toggleable && visible ? 'text' : 'password';

  return (
    <div className={wrapClass}>
      <OutlineFieldFrame label={label} filled={filled} error={error} className="outline-field--password">
        <input
          id={id}
          type={inputType}
          placeholder=" "
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          {...englishFieldProps}
          {...props}
        />
      </OutlineFieldFrame>
      {toggleable ? (
        <button
          type="button"
          className={toggleClass}
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}>
          {ToggleIcon ? <ToggleIcon visible={visible} /> : null}
        </button>
      ) : (
        <span className={`${toggleClass} password-wrap__toggle--static`} aria-hidden="true">
          {ToggleIcon ? <ToggleIcon visible={false} /> : null}
        </span>
      )}
    </div>
  );
}

export { OutlineInput, OutlineSelect, OutlinePasswordInput, OutlineFieldFrame };
