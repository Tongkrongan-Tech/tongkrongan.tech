// Bootstrap tema dan bahasa sebelum bundel React dimuat. Berkas terpisah agar CSP tidak perlu
// 'unsafe-inline' (#79). Dimuat sebagai skrip klasik (bukan defer) supaya tidak ada kedipan tema.
// Daftar THEMES wajib sinkron dengan src/lib/prefs.tsx (dijaga tes).
;(function () {
  var THEMES = ['light', 'dark', 'kopi', 'mint', 'grape', 'ocean'];
  try {
    var t = localStorage.getItem('tt.theme');
    var ok = THEMES.indexOf(t) > -1;
    document.documentElement.dataset.theme = ok ? t : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var l = localStorage.getItem('tt.lang');
    if (l) document.documentElement.lang = l;
  } catch (e) {}
})();
