import indexHtml from "./index.html";
import styleCss from "./style.css";

import aboutIndex from "./about/index.html";
import careersIndex from "./careers/index.html";
import howItWorksIndex from "./how-it-works/index.html";
import loginIndex from "./login/index.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/style.css") {
      return new Response(styleCss, {
        headers: { "content-type": "text/css" },
      });
    }

    if (url.pathname === "/about" || url.pathname === "/about/") {
      return new Response(aboutIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/about/index.html") {
      return new Response(aboutIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/careers" || url.pathname === "/careers/") {
      return new Response(careersIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/careers/index.html") {
      return new Response(careersIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/how-it-works" || url.pathname === "/how-it-works/") {
      return new Response(howItWorksIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/how-it-works/index.html") {
      return new Response(howItWorksIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login" || url.pathname === "/login/") {
      return new Response(loginIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login/index.html") {
      return new Response(loginIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    // default → index.html
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(indexHtml, {
        headers: { "content-type": "text/html" },
      });
    }

    // Everything else (theme.js, script.js, images, login/style.css, etc.)
    // should be served by the static assets handler.
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
