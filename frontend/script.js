document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("mobileSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const closeButton = document.getElementById("sidebarClose");
  const sidebarLinks = document.querySelectorAll(".sidebar-links a");

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");
    sidebar.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    sidebar.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  menuToggle.addEventListener("click", () =>
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar()
  );
  closeButton.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
  sidebarLinks.forEach(link => link.addEventListener("click", closeSidebar));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
      closeSidebar();
      menuToggle.focus();
    }
  });

  // Animate statistics when they enter the viewport.
  document.querySelectorAll(".counter").forEach(counter => {
    const target = Number(counter.dataset.target);
    let animated = false;

    const observer = new IntersectionObserver((entries, currentObserver) => {
      if (!entries[0].isIntersecting || animated) return;
      animated = true;
      currentObserver.unobserve(counter);

      const duration = 1200;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        counter.textContent = Math.floor(target * progress).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
    }, { threshold: 0.3 });

    observer.observe(counter);
  });

  // Reveal sections as they enter the viewport.
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add("show"));
  }

  document.getElementById("currentYear").textContent = new Date().getFullYear();

  console.log("SkillConnect homepage JavaScript loaded successfully.");
});