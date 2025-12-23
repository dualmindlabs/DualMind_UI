import indexHtml from "./index.html";
import styleCss from "./style.css";
import scriptJs from "./script.js";

import aboutIndex from "./about/index.html";
import careersIndex from "./careers/index.html";
import howItWorksIndex from "./how-it-works/index.html";
import loginIndex from "./login/index.html";
import loginStyle from "./login/style.css";

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/style.css") {
      return new Response(styleCss, {
        headers: { "content-type": "text/css" },
      });
    }

    if (url.pathname === "/script.js") {
      return new Response(scriptJs, {
        headers: { "content-type": "application/javascript" },
      });
    }

    if (url.pathname === "/about/index.html") {
      return new Response(aboutIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/careers/index.html") {
      return new Response(careersIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/how-it-works/index.html") {
      return new Response(howItWorksIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login/index.html") {
      return new Response(loginIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login/style.css") {
      return new Response(loginStyle, {
        headers: { "content-type": "text/css" },
      });
    }

    // default → index.html
    return new Response(indexHtml, {
      headers: { "content-type": "text/html" },
    });
  },
};
