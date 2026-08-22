/** @type {import('tailwindcss').Config} */
module.exports = {
  // يمسح ملفات الصفحات نفسها — بما فيها أصناف Tailwind المكتوبة داخل قوالب
  // الجافاسكربت (template literals)، لأنها تظهر كنص داخل نفس الملف.
  content: ['./public/**/*.html'],
  theme: { extend: {} },
  plugins: [],
};
