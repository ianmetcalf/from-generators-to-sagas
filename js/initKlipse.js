function initKlipse(el) {
  const attrs = {
    'data-external-libs': [
      'lib/js/setimmediate.js',
    ].join(','),
  };

  if (el.getAttribute('data-external-libs')) {
    attrs['data-external-libs'] += `,${ el.getAttribute('data-external-libs') }`;
  }

  if (el.getAttribute('data-async-code')) {
    attrs['data-async-code'] = true;
  }

  el.innerHTML = `
    <iframe height="${ el.getAttribute('height') || '500px' }" width="100%" srcdoc="
      <pre><code class=&quot;klipse&quot; ${ formatAttributes(attrs) }>
        ${ el.innerHTML }
      </code></pre>

      <link rel=&quot;stylesheet&quot; type=&quot;text/css&quot; href=&quot;lib/css/codemirror.css&quot;>
      <link rel=&quot;stylesheet&quot; type=&quot;text/css&quot; href=&quot;lib/css/monokai.css&quot;>
      <style>
        .CodeMirror {
          font-size: 2em;
          padding: 2px;
          border: solid 1px #666;
        }
      </style>

      &lt;script&gt;
        window.klipse_settings = {
          selector_eval_js: &quot;.klipse&quot;,
          codemirror_options_in: {
            keyMap: &quot;vim&quot;,
            theme: &quot;monokai&quot;,
            autoCloseBrackets: true
          }
        };
      &lt;/script&gt;

      &lt;script src=&quot;lib/js/klipse_plugin.min.js&quot;&gt;&lt;/script&gt;
      &lt;script src=&quot;lib/js/vim.js&quot;&gt;&lt;/script&gt;
    "></iframe>
  `;

}

function formatAttributes(attrs) {
  return Object.keys(attrs).map(attr => `${ attr }=&quot;${ attrs[attr] }&quot;`).join('  ');
}
