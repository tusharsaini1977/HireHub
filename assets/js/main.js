(function () {
  const STORAGE_KEY = "hirehub-saved-jobs";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function getSavedIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function setSavedIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function showToast(message) {
    const toast = qs("#hh-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2200);
  }

  function initNav() {
    const toggle = qs("[data-nav-toggle]");
    const nav = qs("#site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  function jobCardMarkup(job, savedIds) {
    const saved = savedIds.indexOf(job.id) !== -1;
    return (
      '<article class="hh-card job-card" data-job-id="' + job.id + '">' +
        '<div class="job-card-top">' +
          '<div class="d-flex gap-3 min-w-0">' +
            '<div class="company-mark" style="background:' + job.color + '">' + job.initials + "</div>" +
            '<div class="job-meta-head">' +
              '<p class="company-name">' + job.company + "</p>" +
              '<h3 class="job-title">' + job.title + "</h3>" +
            "</div>" +
          "</div>" +
          '<button class="save-btn" type="button" data-save-job="' + job.id + '" aria-pressed="' + saved + '" aria-label="' + (saved ? "Unsave" : "Save") + " " + job.title + '">' +
            '<i class="' + (saved ? "bi bi-bookmark-fill" : "bi bi-bookmark") + '"></i>' +
          "</button>" +
        "</div>" +
        '<div class="job-tags">' +
          '<span class="badge-hh badge-navy">' + job.type + "</span>" +
          '<span class="badge-hh badge-blue">' + job.experience + "</span>" +
          '<span class="badge-hh badge-teal">' + job.category + "</span>" +
        "</div>" +
        '<div class="job-facts">' +
          '<div><i class="bi bi-geo-alt"></i>' + job.location + "</div>" +
          (job.salary ? "<div><i class=\"bi bi-currency-rupee\"></i>" + job.salary + "</div>" : "") +
        "</div>" +
        '<div class="job-card-actions">' +
          '<a class="btn btn-hh-primary" href="job.html?id=' + encodeURIComponent(job.id) + '">View Details</a>' +
          '<a class="btn btn-hh-ghost" href="jobs.html">Similar Jobs</a>' +
        "</div>" +
      "</article>"
    );
  }

  function renderJobGroups() {
    const data = window.HIREHUB_DATA;
    if (!data) return;
    const savedIds = getSavedIds();

    const featured = qs("[data-job-list='featured']");
    if (featured) {
      featured.innerHTML = data.jobs
        .filter(function (job) { return job.featured; })
        .map(function (job) { return jobCardMarkup(job, savedIds); })
        .join("");
    }

    const latest = qs("[data-job-list='latest']");
    if (latest) {
      latest.innerHTML = data.jobs
        .filter(function (job) { return job.latest; })
        .map(function (job) { return jobCardMarkup(job, savedIds); })
        .join("");
    }

    const all = qs("[data-job-list='all']");
    if (all) {
      const params = new URLSearchParams(window.location.search);
      const q = (params.get("q") || "").trim().toLowerCase();
      const loc = (params.get("location") || "").trim().toLowerCase();
      const filtered = data.jobs.filter(function (job) {
        const hay = (job.title + " " + job.company + " " + job.category + " " + job.skills.join(" ")).toLowerCase();
        const locHay = job.location.toLowerCase();
        const qOk = !q || hay.indexOf(q) !== -1;
        const locOk = !loc || locHay.indexOf(loc) !== -1;
        return qOk && locOk;
      });
      const note = qs("[data-search-summary]");
      if (note) {
        if (q || loc) {
          note.textContent = "Showing " + filtered.length + " demonstration listing" + (filtered.length === 1 ? "" : "s") + " matching your search. No database was queried.";
        } else {
          note.textContent = "Showing all demonstration listings. These roles are sample data for UI review.";
        }
      }
      all.innerHTML = filtered.length
        ? filtered.map(function (job) { return jobCardMarkup(job, savedIds); }).join("")
        : '<p class="muted">No demonstration listings match those terms. Try “analyst”, “designer”, or leave the fields blank.</p>';
    }
  }

  function renderEmployers() {
    const mount = qs("[data-employer-list]");
    const data = window.HIREHUB_DATA;
    if (!mount || !data) return;
    mount.innerHTML = data.employers.map(function (employer) {
      return (
        '<a class="hh-card employer-card" href="companies.html">' +
          '<div class="company-mark" style="background:' + employer.color + '">' + employer.initials + "</div>" +
          "<strong>" + employer.name + "</strong>" +
          "<small>" + employer.roles + "</small>" +
        "</a>"
      );
    }).join("");
  }

  function bindSaveButtons() {
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-save-job]");
      if (!btn) return;
      const id = btn.getAttribute("data-save-job");
      const ids = getSavedIds();
      const index = ids.indexOf(id);
      if (index === -1) {
        ids.push(id);
        btn.setAttribute("aria-pressed", "true");
        btn.innerHTML = '<i class="bi bi-bookmark-fill"></i>';
        showToast("Job saved on this device. This is demonstration storage only.");
      } else {
        ids.splice(index, 1);
        btn.setAttribute("aria-pressed", "false");
        btn.innerHTML = '<i class="bi bi-bookmark"></i>';
        showToast("Job removed from saved list.");
      }
      setSavedIds(ids);
    });
  }

  function initSearch() {
    const form = qs("[data-job-search]");
    if (!form) return;
    const keyword = qs("#search-keyword", form);
    const location = qs("#search-location", form);
    const feedback = qs("[data-search-feedback]");
    const keywordError = qs("#keyword-error");
    const locationError = qs("#location-error");

    qsa("[data-search-chip]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        keyword.value = chip.getAttribute("data-search-chip");
        keyword.focus();
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const q = keyword.value.trim();
      const loc = location.value.trim();
      keyword.classList.remove("is-invalid");
      location.classList.remove("is-invalid");
      if (keywordError) keywordError.classList.remove("show");
      if (locationError) locationError.classList.remove("show");
      if (feedback) {
        feedback.classList.remove("show", "success", "error");
        feedback.textContent = "";
      }

      if (!q && !loc) {
        keyword.classList.add("is-invalid");
        location.classList.add("is-invalid");
        if (keywordError) keywordError.classList.add("show");
        if (locationError) locationError.classList.add("show");
        if (feedback) {
          feedback.classList.add("show", "error");
          feedback.textContent = "Enter a job title, skill, company, or location to search the demonstration listings.";
        }
        keyword.focus();
        return;
      }

      const jobs = (window.HIREHUB_DATA && window.HIREHUB_DATA.jobs) || [];
      const matches = jobs.filter(function (job) {
        const hay = (job.title + " " + job.company + " " + job.category + " " + job.skills.join(" ")).toLowerCase();
        const locHay = job.location.toLowerCase();
        return (!q || hay.indexOf(q.toLowerCase()) !== -1) && (!loc || locHay.indexOf(loc.toLowerCase()) !== -1);
      });

      if (feedback) {
        feedback.classList.add("show", "success");
        feedback.textContent = "Found " + matches.length + " demonstration listing" + (matches.length === 1 ? "" : "s") + ". Opening the jobs page with your filters. This does not query a live database.";
      }

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (loc) params.set("location", loc);
      window.setTimeout(function () {
        window.location.href = "jobs.html?" + params.toString();
      }, 450);
    });
  }

  function initJobDetail() {
    const mount = qs("[data-job-detail]");
    if (!mount || !window.HIREHUB_DATA) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const job = window.HIREHUB_DATA.jobs.filter(function (item) { return item.id === id; })[0];
    if (!job) {
      mount.innerHTML = '<div class="hh-card prose-card"><h1>Listing not found</h1><p class="muted">That demonstration job is unavailable. Return to <a href="jobs.html">Find Jobs</a>.</p></div>';
      return;
    }
    const saved = getSavedIds().indexOf(job.id) !== -1;
    mount.innerHTML =
      '<article class="hh-card prose-card">' +
        '<p class="eyebrow">Demonstration listing</p>' +
        '<div class="d-flex gap-3 align-items-start mb-3">' +
          '<div class="company-mark" style="background:' + job.color + '">' + job.initials + "</div>" +
          "<div><p class=\"company-name mb-0\">" + job.company + "</p><h1 class=\"job-title\">" + job.title + "</h1></div>" +
        "</div>" +
        '<div class="job-tags mb-3">' +
          '<span class="badge-hh badge-navy">' + job.type + "</span>" +
          '<span class="badge-hh badge-blue">' + job.experience + "</span>" +
          '<span class="badge-hh badge-teal">' + job.category + "</span>" +
        "</div>" +
        "<p><i class=\"bi bi-geo-alt\"></i> " + job.location + (job.salary ? " · " + job.salary : "") + "</p>" +
        "<p>This page is a frontend preview of a job detail view. Application, employer verification, and database updates are not enabled in this phase.</p>" +
        "<p><strong>Skills shown for UI:</strong> " + job.skills.join(", ") + "</p>" +
        '<div class="d-flex flex-wrap gap-2 mt-3">' +
          '<button class="btn btn-hh-primary" type="button" data-save-job="' + job.id + '" aria-pressed="' + saved + '">' + (saved ? "Saved" : "Save job") + "</button>" +
          '<a class="btn btn-hh-ghost" href="jobs.html">Back to jobs</a>' +
        "</div>" +
      "</article>";
  }

  function initDemoForms() {
    qsa("[data-demo-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const box = form.querySelector("[data-form-feedback]");
        if (box) {
          box.classList.add("show", "success");
          box.textContent = "This is a frontend-only form. No account was created and nothing was sent to a server.";
        }
        showToast("Frontend demo only — no backend action was taken.");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    renderJobGroups();
    renderEmployers();
    bindSaveButtons();
    initSearch();
    initJobDetail();
    initDemoForms();
  });
})();
