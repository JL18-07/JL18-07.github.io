(function () {
  "use strict";

  
  var GITHUB_USERNAME = "JL18-07";
  var PROJECTS_URL = "projects.json";
  var REPOS_URL =
    "https://api.github.com/users/" + GITHUB_USERNAME +
    "/repos?sort=updated&per_page=5";

  
  function $(id) {
    return document.getElementById(id);
  }

  
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  
  function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }
  function loadSetting(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  
  function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : "#";
  }

  
  $("year").textContent = new Date().getFullYear();

  
  var navToggle = $("navToggle");
  var navLinks = $("navLinks");

  function setMenu(open) {
    navLinks.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navToggle.textContent = open ? "Close" : "Menu";
  }

  navToggle.addEventListener("click", function () {
    setMenu(!navLinks.classList.contains("is-open"));
  });

  
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  
  var sectionLinks = navLinks.querySelectorAll('a[href^="#"]');
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          sectionLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main section[id]").forEach(function (section) {
      observer.observe(section);
    });
  }

  
  var themeToggle = $("themeToggle");
  var root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var goingDark = theme === "light";
    
    themeToggle.textContent = goingDark ? "Dark" : "Light";
    themeToggle.setAttribute(
      "aria-label",
      goingDark ? "Switch to dark theme" : "Switch to light theme"
    );
  }

  var savedTheme = loadSetting("theme");
  if (savedTheme !== "light" && savedTheme !== "dark") {
    savedTheme =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    saveSetting("theme", next);
  });

  
  var tagline = $("tagline");
  var fullText = tagline.getAttribute("data-text") || tagline.textContent;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion) {
    var charIndex = 0;
    tagline.textContent = "";
    tagline.classList.add("is-typing");

    (function typeNext() {
      if (charIndex < fullText.length) {
        charIndex += 1;
        tagline.textContent = fullText.slice(0, charIndex);
        setTimeout(typeNext, 70);
      } else {
        
        setTimeout(function () { tagline.classList.remove("is-typing"); }, 1500);
      }
    })();
  }

  
  var projectsGrid = $("projectsGrid");
  var filterBar = $("filterBar");
  var allProjects = [];
  var activeFilter = "All";

  function showProjectsMessage(text) {
    projectsGrid.innerHTML = "";
    projectsGrid.appendChild(el("p", "status status--error", text));
    filterBar.innerHTML = "";
  }

  function createProjectCard(project) {
    var card = el("article", "project-card");

    
    if (project.screenshot) {
      var img = el("img", "project-card__img");
      img.src = "images/" + project.screenshot;
      img.alt = "Screenshot of " + project.title;
      img.loading = "lazy";
      img.addEventListener("error", function () { img.remove(); });
      card.appendChild(img);
    }

    var body = el("div", "project-card__body");
    body.appendChild(el("h3", "", project.title));
    body.appendChild(el("p", "", project.description));

    var techList = el("ul", "tag-list");
    (project.technologies || []).forEach(function (tech) {
      techList.appendChild(el("li", "", tech));
    });
    body.appendChild(techList);

    var role = el("p", "project-card__role");
    role.appendChild(el("strong", "", "My role: "));
    role.appendChild(document.createTextNode(project.role || ""));
    body.appendChild(role);

    var link = el("a", "project-card__link", "View on GitHub");
    link.href = safeUrl(project.link);
    link.target = "_blank";
    link.rel = "noopener";
    body.appendChild(link);

    card.appendChild(body);
    return card;
  }

  function renderProjects() {
    projectsGrid.innerHTML = "";
    var visible = allProjects.filter(function (p) {
      return activeFilter === "All" || (p.technologies || []).indexOf(activeFilter) !== -1;
    });

    if (visible.length === 0) {
      projectsGrid.appendChild(el("p", "status", "No projects use " + activeFilter + " yet."));
      return;
    }
    visible.forEach(function (project) {
      projectsGrid.appendChild(createProjectCard(project));
    });
  }

  function renderFilters() {
    var techs = [];
    allProjects.forEach(function (p) {
      (p.technologies || []).forEach(function (t) {
        if (techs.indexOf(t) === -1) techs.push(t);
      });
    });
    techs.sort();
    techs.unshift("All");

    filterBar.innerHTML = "";
    techs.forEach(function (tech) {
      var btn = el("button", "filter__btn", tech);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(tech === activeFilter));
      if (tech === activeFilter) btn.classList.add("is-active");
      filterBar.appendChild(btn);
    });
  }

  filterBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter__btn");
    if (!btn) return;
    activeFilter = btn.textContent;
    filterBar.querySelectorAll(".filter__btn").forEach(function (b) {
      var isActive = b === btn;
      b.classList.toggle("is-active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
    renderProjects();
  });

  fetch(PROJECTS_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      allProjects = Array.isArray(data) ? data : data.projects;
      if (!Array.isArray(allProjects) || allProjects.length === 0) {
        throw new Error("No projects in file");
      }
      renderFilters();
      renderProjects();
    })
    .catch(function (error) {
      console.warn("Projects could not be loaded:", error.message);
      showProjectsMessage(
        "Projects could not be loaded right now. Please refresh the page or try again later."
      );
    });

  
  var reposList = $("reposList");

  function showReposMessage(text) {
    reposList.innerHTML = "";
    reposList.appendChild(el("li", "status status--error", text));
  }

  fetch(REPOS_URL, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (repos) {
      reposList.innerHTML = "";
      if (!Array.isArray(repos) || repos.length === 0) {
        reposList.appendChild(el("li", "status", "No public repositories to show yet."));
        return;
      }
      repos.forEach(function (repo) {
        var item = el("li");
        var link = el("a", "", repo.name);
        link.href = safeUrl(repo.html_url);
        link.target = "_blank";
        link.rel = "noopener";
        item.appendChild(link);
        item.appendChild(el("span", "repo__lang", repo.language || "No language detected"));
        reposList.appendChild(item);
      });
    })
    .catch(function (error) {
      console.warn("GitHub data unavailable:", error.message);
      showReposMessage(
        "GitHub data is unavailable right now. The request limit may have been reached; try again later."
      );
    });

  
  var form = $("contactForm");
  var success = $("formSuccess");
  var fields = ["name", "email", "message"];

  function setError(id, text) {
    $(id + "Error").textContent = text;
    $(id).closest(".form__field").classList.toggle("has-error", text !== "");
    $(id).setAttribute("aria-invalid", text !== "" ? "true" : "false");
  }

  function validateField(id) {
    var value = $(id).value.trim();
    var error = "";

    if (value === "") {
      error = "Please enter your " + id + ".";
    } else if (id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      error = "Enter a valid email address, like name@example.com.";
    }
    setError(id, error);
    return error === "";
  }

  // Re-check a field as the user fixes it
  fields.forEach(function (id) {
    $(id).addEventListener("input", function () {
      if ($(id + "Error").textContent !== "") validateField(id);
      success.hidden = true;
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    success.hidden = true;

    // Validate every field (no short-circuit so all errors show)
    var allValid = fields.map(validateField).every(Boolean);

    if (!allValid) {
      // Move focus to the first field with an error
      var firstBad = fields.filter(function (id) {
        return $(id + "Error").textContent !== "";
      })[0];
      $(firstBad).focus();
      return;
    }

    // The site has no back end, so the message is not sent anywhere.
    form.reset();
    fields.forEach(function (id) { setError(id, ""); });
    success.hidden = false;
  });

  
  var toTop = $("toTop");

  function updateToTop() {
    toTop.hidden = window.scrollY < 400;
  }
  window.addEventListener("scroll", updateToTop, { passive: true });
  updateToTop();

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
})();
