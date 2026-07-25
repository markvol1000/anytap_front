/** Keep validation tooltips in English (never browser locale). */

function isField(el) {
  return el instanceof HTMLInputElement
    || el instanceof HTMLSelectElement
    || el instanceof HTMLTextAreaElement;
}

function englishValidityMessage(el) {
  const { validity: v } = el;
  if (v.valid) return '';

  if (v.valueMissing) {
    if (el.type === 'checkbox') return 'Please check this box to continue.';
    if (el.tagName === 'SELECT') return 'Please select an option.';
    return 'Please fill out this field.';
  }

  if (el.type === 'email') {
    return 'Please enter a complete email address (e.g. you@example.com).';
  }

  if (v.tooShort) return `Please use at least ${el.minLength} characters.`;
  if (v.tooLong) return `Please use no more than ${el.maxLength} characters.`;
  if (v.rangeUnderflow) return `Please enter a value of at least ${el.min}.`;
  if (v.rangeOverflow) return `Please enter a value of no more than ${el.max}.`;
  if (v.stepMismatch) return 'Please enter a valid value.';
  if (v.patternMismatch) return 'Please match the requested format.';
  if (v.typeMismatch) return 'Please enter a value in the correct format.';
  if (v.badInput) return 'Please enter a valid value.';

  return 'Please check this value.';
}

export function onFieldInvalid(e) {
  const el = e.currentTarget;
  el.setCustomValidity(englishValidityMessage(el));
  e.preventDefault();
}

export function onFieldInput(e) {
  e.currentTarget.setCustomValidity('');
}

export function onFormInvalid(e) {
  e.preventDefault();
  if (isField(e.target)) onFieldInvalid({ ...e, currentTarget: e.target });
}

export function onFormInput(e) {
  if (isField(e.target)) e.target.setCustomValidity('');
}

function reportFirstInvalid(form) {
  for (const field of form.querySelectorAll('input, select, textarea')) {
    if (!isField(field) || !field.willValidate) continue;
    if (!field.checkValidity()) {
      field.setCustomValidity(englishValidityMessage(field));
      field.reportValidity();
      return true;
    }
  }
  return false;
}

/** Use with noValidate forms so tooltips stay in English. */
export function handleEnglishSubmit(onValid) {
  return (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (reportFirstInvalid(form)) return;
    onValid(e);
  };
}

/** Per-field — attach to every validated input/select/textarea. */
export const englishFieldProps = {
  lang: 'en',
  onInvalid: onFieldInvalid,
  onInput: onFieldInput,
};

export const englishFormProps = {
  lang: 'en',
  noValidate: true,
  onInvalidCapture: onFormInvalid,
  onInput: onFormInput,
};
