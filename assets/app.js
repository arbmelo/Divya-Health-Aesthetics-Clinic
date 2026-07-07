const PHONE_DISPLAY = "077409 84712";
const PHONE_E164 = "917740984712";
const SITE_CONFIG = window.DHA_CONFIG || {};
const GA_MEASUREMENT_ID = SITE_CONFIG.gaMeasurementId || "";
const BOOKING_EMBED_URL = SITE_CONFIG.bookingEmbedUrl || "";
const CLINIC_EMAIL = SITE_CONFIG.clinicEmail || "";
const BOOKING_EMAIL_ENDPOINT = SITE_CONFIG.bookingEmailEndpoint || "";

const track = (eventName, params = {}) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

const ready = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
};

ready(() => {
  const body = document.body;
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-primary-nav]");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      body.classList.toggle("nav-open", !isOpen);
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        menuToggle.setAttribute("aria-expanded", "false");
        body.classList.remove("nav-open");
      }
    });
  }

  document.querySelectorAll("[data-track]").forEach((item) => {
    item.addEventListener("click", () => {
      track(item.dataset.track, {
        label: item.dataset.trackLabel || item.textContent.trim(),
        page_path: window.location.pathname
      });
    });
  });

  setupRevealMotion();
  setupHeroMotion();
  setupImageFallbacks();
  setupFilters();
  setupFaqs();
  setupBooking();
  setupContactForm();
  setupCookieConsent();
  setupYear();
});

function setupRevealMotion() {
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function setupImageFallbacks() {
  document.querySelectorAll("img[data-fallback-src]").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        const fallback = image.getAttribute("data-fallback-src");
        if (fallback && image.src !== new URL(fallback, window.location.href).href) {
          image.src = fallback;
        }
      },
      { once: true }
    );
  });
}

function setupHeroMotion() {
  const hero = document.querySelector(".hero");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const update = () => {
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    hero.style.setProperty("--hero-scroll", progress.toFixed(3));
    ticking = false;
  };

  update();
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
}

function setupFilters() {
  const filterButtons = document.querySelectorAll("[data-filter]");
  const serviceCards = document.querySelectorAll("[data-category]");
  if (!filterButtons.length || !serviceCards.length) return;

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      serviceCards.forEach((card) => {
        const visible = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !visible);
      });
      track("service_filter", { filter });
    });
  });
}

function setupFaqs() {
  document.querySelectorAll("[data-faq]").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
    });
  });
}

function setupBooking() {
  const frame = document.querySelector("[data-booking-frame]");
  if (frame && BOOKING_EMBED_URL) {
    frame.src = BOOKING_EMBED_URL;
    frame.hidden = false;
  }

  const form = document.querySelector("[data-booking-form]");
  if (!form) return;

  const requestedService = new URLSearchParams(window.location.search).get("service");
  const serviceField = form.elements.service;
  if (requestedService && serviceField) {
    const option = Array.from(serviceField.options).find((item) => item.value === requestedService);
    if (option) {
      serviceField.value = requestedService;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (String(data.get("website") || "").trim()) return;

    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.disabled = true;
      button.textContent = "Booking...";
    }

    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const service = String(data.get("service") || "").trim();
    const date = String(data.get("date") || "").trim();
    const time = String(data.get("time") || "").trim();
    const notes = String(data.get("notes") || "").trim();

    if (BOOKING_EMAIL_ENDPOINT) {
      fetch(BOOKING_EMAIL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, service, date, time, notes, source: "website" }),
        keepalive: true
      }).catch(() => {});
    }

    track("form_submit", { form_name: "appointment_email_simulated" });
    track("email_click", { label: "booking_form" });

    setTimeout(() => {
      form.style.display = "none";
      const lede = document.querySelector(".booking-panel .lede");
      if (lede) lede.style.display = "none";
      const successMsg = document.getElementById("booking-success");
      if (successMsg) {
        successMsg.style.display = "block";
        successMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 1000);
  });
}

function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (String(data.get("website") || "").trim()) return;

    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const topic = String(data.get("topic") || "").trim();
    const messageBody = String(data.get("message") || "").trim();
    const message = [
      "Hello Divya Health & Aesthetics Clinic, I have an enquiry.",
      name ? `Name: ${name}` : "",
      phone ? `Phone: ${phone}` : "",
      topic ? `Topic: ${topic}` : "",
      messageBody ? `Message: ${messageBody}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    track("form_submit", { form_name: "contact_whatsapp" });
    window.location.href = `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(message)}`;
  });
}

function setupCookieConsent() {
  const banner = document.querySelector("[data-cookie-banner]");
  const accept = document.querySelector("[data-cookie-accept]");
  const decline = document.querySelector("[data-cookie-decline]");
  const saved = localStorage.getItem("dha_cookie_choice");

  if (saved === "accepted") {
    loadAnalytics();
    return;
  }

  if (!banner || saved === "declined") return;
  banner.classList.add("is-visible");

  accept?.addEventListener("click", () => {
    localStorage.setItem("dha_cookie_choice", "accepted");
    banner.classList.remove("is-visible");
    loadAnalytics();
    track("cookie_accept");
  });

  decline?.addEventListener("click", () => {
    localStorage.setItem("dha_cookie_choice", "declined");
    banner.classList.remove("is-visible");
  });
}

function loadAnalytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX" || window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true
  });
}

function setupYear() {
  document.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
}
