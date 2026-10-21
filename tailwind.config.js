/** @type {import('tailwindcss').Config} */
// 화면은 index.html 한 파일. JS 안의 클래스 문자열(결과 색상 등)도 이 파일에서 찾는다.
module.exports = {
  content: ['./index.html'],
  theme: { extend: {} },
  plugins: [],
};
