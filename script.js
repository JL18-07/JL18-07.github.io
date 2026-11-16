(function () {
  "use strict";

  // Settings used to load project data and the account's latest public repositories.
  const GITHUB_USERNAME = "JL18-07";
  const PROJECTS_URL = "projects.json";
  const REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`;

  // Shortcuts for finding elements by ID and creating safe text-based DOM elements.
  const $ = (id) => document.getElementById(id);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Save and load visitor preferences without breaking the page if storage is unavailable.
  const saveSetting = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage issues in private browsing or restricted environments.
    }
  };

  const loadSetting = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };

  // Only allow HTTP(S) links; use a harmless placeholder for anything else.
  const safeUrl = (url) => (/^https?:\/\//i.test(url) ? url : "#");

  // Update the footer's year to the current year automatically.
  const year = $("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Mobile navigation: open/close the menu and keep its accessibility state in sync.
  const navToggle = $("navToggle");
  const navLinks = $("navLinks");

  const setMenu = (isOpen) => {
    if (!navLinks || !navToggle) return;

    navLinks.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    navToggle.textContent = isOpen ? "Close" : "Menu";
  };

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      setMenu(!navLinks.classList.contains("is-open"));
    });

    // Close the mobile menu after a visitor chooses a navigation link.
    navLinks.addEventListener("click", (event) => {
      if (event.target.tagName === "A") {
        setMenu(false);
      }
    });
  }

  // Escape closes the mobile menu, if it is open.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  // Highlight the navigation link for the section currently in view.
  const sectionLinks = navLinks ? navLinks.querySelectorAll('a[href^="#"]') : [];

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          sectionLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-active", isActive);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    document.querySelectorAll("main section[id]").forEach((section) => {
      observer.observe(section);
    });
  }

  // Apply the saved color theme, or use the visitor's device preference on first visit.
  const themeToggle = $("themeToggle");
  const root = document.documentElement;

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const isLight = theme === "light";

    if (themeToggle) {
      themeToggle.textContent = isLight ? "Dark" : "Light";
      themeToggle.setAttribute(
        "aria-label",
        isLight ? "Switch to dark theme" : "Switch to light theme"
      );
    }
  };

  let savedTheme = loadSetting("theme");
  if (savedTheme !== "light" && savedTheme !== "dark") {
    savedTheme =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }
  applyTheme(savedTheme);

  // Let visitors switch themes and remember their choice for the next visit.
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      saveSetting("theme", nextTheme);
    });
  }

  // Animate the tagline one character at a time unless reduced motion is requested.
  const tagline = $("tagline");
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (tagline) {
    const fullText = tagline.getAttribute("data-text") || tagline.textContent;

    if (!reduceMotion) {
      let charIndex = 0;
      tagline.textContent = "";
      tagline.classList.add("is-typing");

      const typeNext = () => {
        if (charIndex < fullText.length) {
          charIndex += 1;
          tagline.textContent = fullText.slice(0, charIndex);
          setTimeout(typeNext, 70);
        } else {
          setTimeout(() => {
            tagline.classList.remove("is-typing");
          }, 1500);
        }
      };

      typeNext();
    }
  }

  // Project data and the controls that filter the displayed project cards.
  const projectsGrid = $("projectsGrid");
  const filterBar = $("filterBar");
  let allProjects = [];
  let activeFilter = "All";

  // Replace the project area with an error message if the project file cannot load.
  const showProjectsMessage = (text) => {
    if (!projectsGrid) return;

    projectsGrid.innerHTML = "";
    projectsGrid.appendChild(el("p", "status status--error", text));

    if (filterBar) {
      filterBar.innerHTML = "";
    }
  };

  // Build one project card, including its image, description, technology tags, role, and link.
  const createProjectCard = (project) => {
    const card = el("article", "project-card");

    if (project.screenshot) {
      const img = el("img", "project-card__img");
      img.src = `images/${project.screenshot}`;
      img.alt = `Screenshot of ${project.title}`;
      img.loading = "lazy";
      img.addEventListener("error", () => {
        img.remove();
      });
      card.appendChild(img);
    }

    const body = el("div", "project-card__body");
    body.appendChild(el("h3", "", project.title));
    body.appendChild(el("p", "", project.description));

    const techList = el("ul", "tag-list");
    (project.technologies || []).forEach((tech) => {
      techList.appendChild(el("li", "", tech));
    });
    body.appendChild(techList);

    const role = el("p", "project-card__role");
    role.appendChild(el("strong", "", "My role: "));
    role.appendChild(document.createTextNode(project.role || ""));
    body.appendChild(role);

    const link = el("a", "project-card__link", "View on GitHub");
    link.href = safeUrl(project.link);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    body.appendChild(link);

    card.appendChild(body);
    return card;
  };

  // Redraw the project grid to show only projects matching the selected technology filter.
  const renderProjects = () => {
    if (!projectsGrid) return;

    projectsGrid.innerHTML = "";

    const visible = allProjects.filter((project) => {
      const technologies = project.technologies || [];
      return activeFilter === "All" || technologies.includes(activeFilter);
    });

    if (visible.length === 0) {
      projectsGrid.appendChild(
        el("p", "status", `No projects use ${activeFilter} yet.`)
      );
      return;
    }

    visible.forEach((project) => {
      projectsGrid.appendChild(createProjectCard(project));
    });
  };

  // Create one filter button for each unique technology listed in the project data.
  const renderFilters = () => {
    if (!filterBar) return;

    const techs = [...new Set(allProjects.flatMap((project) => project.technologies || []))];
    techs.sort();
    techs.unshift("All");

    filterBar.innerHTML = "";

    techs.forEach((tech) => {
      const btn = el("button", "filter__btn", tech);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(tech === activeFilter));

      if (tech === activeFilter) {
        btn.classList.add("is-active");
      }

      filterBar.appendChild(btn);
    });
  };

  // When a technology filter is clicked, update its selected state and redraw the cards.
  if (filterBar) {
    filterBar.addEventListener("click", (event) => {
      const btn = event.target.closest(".filter__btn");
      if (!btn) return;

      activeFilter = btn.textContent;

      filterBar.querySelectorAll(".filter__btn").forEach((button) => {
        const isActive = button === btn;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      renderProjects();
    });
  }

  // Fetch project information from projects.json, then create filters and project cards.
  if (projectsGrid) {
    fetch(PROJECTS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        allProjects = Array.isArray(data) ? data : data.projects;

        if (!Array.isArray(allProjects) || allProjects.length === 0) {
          throw new Error("No projects in file");
        }

        renderFilters();
        renderProjects();
      })
      .catch((error) => {
        console.warn("Projects could not be loaded:", error.message);
        showProjectsMessage(
          "Projects could not be loaded right now. Please refresh the page or try again later."
        );
      });
  }

  // Display the latest public repositories in the repositories section.
  const reposList = $("reposList");

  // Show a helpful message in the repository list if GitHub's API request fails.
  const showReposMessage = (text) => {
    if (!reposList) return;

    reposList.innerHTML = "";
    reposList.appendChild(el("li", "status status--error", text));
  };

  if (reposList) {
    fetch(REPOS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((repos) => {
        reposList.innerHTML = "";

        if (!Array.isArray(repos) || repos.length === 0) {
          reposList.appendChild(
            el("li", "status", "No public repositories to show yet.")
          );
          return;
        }

        repos.forEach((repo) => {
          const item = el("li");
          const link = el("a", "", repo.name);
          link.href = safeUrl(repo.html_url);
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          item.appendChild(link);
          item.appendChild(
            el("span", "repo__lang", repo.language || "No language detected")
          );

          reposList.appendChild(item);
        });
      })
      .catch((error) => {
        console.warn("GitHub data unavailable:", error.message);
        showReposMessage(
          "GitHub data is unavailable right now. The request limit may have been reached; try again later."
        );
      });
  }

  // Contact form validation and feedback shown beside the form fields.
  const form = $("contactForm");
  const successMessage = $("formSuccess");
  const formFields = ["name", "email", "message"];

  // Set a field's error text and update its visual and screen-reader error state.
  const setError = (fieldId, text) => {
    const field = $(fieldId);
    const errorNode = $(fieldId + "Error");

    if (!field || !errorNode) return;

    errorNode.textContent = text;
    field.closest(".form__field").classList.toggle("has-error", text !== "");
    field.setAttribute("aria-invalid", text !== "" ? "true" : "false");
  };

  // Check that a field is filled in and, for email, has a valid-looking address.
  const validateField = (fieldId) => {
    const field = $(fieldId);
    if (!field) return true;

    const value = field.value.trim();
    let error = "";

    if (value === "") {
      error = `Please enter your ${fieldId}.`;
    } else if (fieldId === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      error = "Enter a valid email address, like name@example.com.";
    }

    setError(fieldId, error);
    return error === "";
  };

  if (form) {
    // Re-check fields with existing errors while the visitor edits them; hide old success feedback.
    formFields.forEach((fieldId) => {
      const field = $(fieldId);
      if (!field) return;

      field.addEventListener("input", () => {
        if ($(fieldId + "Error").textContent !== "") {
          validateField(fieldId);
        }

        if (successMessage) {
          successMessage.hidden = true;
        }
      });
    });

    // Validate all fields on submit, focus the first invalid field, or show success feedback.
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (successMessage) {
        successMessage.hidden = true;
      }

      const allValid = formFields.map(validateField).every(Boolean);

      if (!allValid) {
        const firstBadField = formFields.find((fieldId) => $(fieldId + "Error").textContent !== "");
        if (firstBadField) {
          $(firstBadField).focus();
        }
        return;
      }

      form.reset();
      formFields.forEach((fieldId) => setError(fieldId, ""));

      if (successMessage) {
        successMessage.hidden = false;
      }
    });
  }

  // Show the back-to-top button after scrolling down and return smoothly to the page top.
  const toTop = $("toTop");

  const updateToTop = () => {
    if (!toTop) return;
    toTop.hidden = window.scrollY < 400;
  };

  if (toTop) {
    window.addEventListener("scroll", updateToTop, { passive: true });
    updateToTop();

    toTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }
})();
