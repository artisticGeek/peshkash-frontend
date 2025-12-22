<template>
<nav class="navbar navbar-dark bg-dark navbar-professional">
  <div class="container-fluid px-3 px-md-4">
    <a class="navbar-brand d-flex align-items-center py-2" href="#hero">
      <i class="bi bi-qr-code-scan brand-icon"></i>
      <span class="pk-brand-text">Peshkash</span>
    </a>
    <button class="navbar-toggler border-0 px-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasDarkNavbar" aria-controls="offcanvasDarkNavbar" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="offcanvas offcanvas-end text-bg-dark" tabindex="-1" id="offcanvasDarkNavbar" aria-labelledby="offcanvasDarkNavbarLabel">
      <div class="offcanvas-header px-4 py-4">
        <h5 class="offcanvas-title pk-brand-text" id="offcanvasDarkNavbarLabel">Peshkash</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body px-4">
        <ul class="navbar-nav justify-content-end flex-grow-1">
          <li class="nav-item">
            <a class="nav-link py-3" href="#why">Why</a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="#solutions">Solutions</a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="#pricing">Pricing</a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="#contact">Contact</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</nav>
</template>

<style scoped>
/* Import classical serif font */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

/* Enhanced navbar with professional spacing */
.navbar-professional {
  padding: 0.5rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (min-width: 768px) {
  .navbar-professional {
    padding: 0.75rem 0;
  }
}

/* Brand styling with classical font */
.navbar-brand {
  padding: 0.5rem 0;
  margin-right: 1rem;
  transition: opacity 0.3s ease;
}

.navbar-brand:hover {
  opacity: 0.85;
}

.brand-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #bd945a;
}

@media (min-width: 768px) {
  .brand-icon {
    font-size: 1.75rem;
    margin-right: 1rem;
  }
}

.pk-brand-text {
  font-family: 'Playfair Display', 'Georgia', serif;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #ffffff;
}

@media (min-width: 768px) {
  .pk-brand-text {
    font-size: 1.75rem;
    letter-spacing: 1px;
  }
}

/* Nav links with better spacing */
.navbar-nav .nav-link {
  font-family: 'Playfair Display', 'Georgia', serif;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.3px;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
}

@media (min-width: 768px) {
  .navbar-nav .nav-link {
    font-size: 1.1rem;
    padding: 0.5rem 1.25rem;
  }
}

.navbar-nav .nav-link:hover {
  color: #bd945a;
  background-color: rgba(189, 148, 90, 0.1);
  transform: translateX(4px);
}

.navbar-nav .nav-link:active {
  color: #d4a76a;
}

/* Offcanvas enhancements */
.offcanvas-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #bd945a;
}

.offcanvas-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.offcanvas-body {
  padding-top: 1.5rem;
}

/* Toggler improvements */
.navbar-toggler {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s ease;
}

.navbar-toggler:hover {
  border-color: #bd945a !important;
  background-color: rgba(189, 148, 90, 0.1);
}

.navbar-toggler:focus {
  box-shadow: 0 0 0 0.2rem rgba(189, 148, 90, 0.25);
}
</style>
