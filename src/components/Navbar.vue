<template>
<nav class="navbar navbar-dark bg-dark navbar-professional">
  <div class="container-fluid px-3 px-md-4">
    <a class="navbar-brand d-flex align-items-center py-2" href="#hero">
      <i class="bi bi-qr-code-scan brand-icon me-2"></i>
      <span class="pk-brand-text">Peshkash</span>
    </a>
    <button class="navbar-toggler border-0 px-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasDarkNavbar" aria-controls="offcanvasDarkNavbar" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="offcanvas offcanvas-end text-bg-dark" tabindex="-1" id="offcanvasDarkNavbar" aria-labelledby="offcanvasDarkNavbarLabel">
      <div class="offcanvas-header">
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
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
/* Professional navbar with box shadow - slimmer design */
.navbar-professional {
  padding: 0.25rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

@media (min-width: 768px) {
  .navbar-professional {
    padding: 0.35rem 0;
  }
}

/* Brand styling */
.navbar-brand {
  padding: 0.25rem 0;
  margin-right: 1rem;
  transition: opacity 0.3s ease;
}

.navbar-brand:hover {
  opacity: 0.85;
}

.brand-icon {
  font-size: 1.35rem;
  color: #bd945a;
}

@media (min-width: 768px) {
  .brand-icon {
    font-size: 1.5rem;
  }
}

/* Brand text - Dancing Script (original font) with responsive sizing - more elegant */
.pk-brand-text {
  font-family: 'Dancing Script', 'Brush Script MT', cursive;
  font-size: 1.6rem;
  font-weight: 400;
}

@media (min-width: 768px) {
  .pk-brand-text {
    font-size: 1.8rem;
  }
}

/* Nav links with hover effects - slimmer */
.navbar-nav .nav-link {
  font-size: 0.95rem;
  padding: 0.6rem 0.9rem;
  margin: 0.2rem 0;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
}

@media (min-width: 768px) {
  .navbar-nav .nav-link {
    font-size: 1rem;
    padding: 0.5rem 1rem;
  }
}

.navbar-nav .nav-link:hover {
  color: #bd945a;
  background-color: rgba(189, 148, 90, 0.08);
  transform: translateX(3px);
}

.navbar-nav .nav-link:active {
  color: #d4a76a;
}

/* Offcanvas professional styling - lighter */
.offcanvas-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem 1.5rem;
}

.offcanvas-body {
  padding: 1rem 1.5rem;
}

/* Toggler enhancements - slimmer */
.navbar-toggler {
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  transition: all 0.3s ease;
}

.navbar-toggler:hover {
  border-color: #bd945a !important;
  background-color: rgba(189, 148, 90, 0.08);
}

.navbar-toggler:focus {
  box-shadow: 0 0 0 0.15rem rgba(189, 148, 90, 0.2);
}
</style>
