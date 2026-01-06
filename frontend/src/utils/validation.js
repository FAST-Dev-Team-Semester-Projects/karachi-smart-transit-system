export const required = (val) =>
  val === null || val === undefined || String(val).trim() === ""
    ? "Required"
    : null;
export const minLength = (len) => (val) =>
  String(val || "").length < len ? `Must be at least ${len} characters` : null;
export const isEmail = (val) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val || "")) ? null : "Invalid email";
export const isNumeric = (val) =>
  /^-?\d+(\.\d+)?$/.test(String(val || "")) ? null : "Must be a number";

export const validate = (form, rules) => {
  const errors = {};
  for (const key of Object.keys(rules)) {
    const validators = Array.isArray(rules[key]) ? rules[key] : [rules[key]];
    for (const v of validators) {
      const err = v(form[key]);
      if (err) {
        errors[key] = err;
        break;
      }
    }
  }
  return errors;
};
