<template>
<nav class="navbar navbar-dark bg-dark">
  <div class="container-fluid">
    <a class="navbar-brand d-flex align-items-center" href="#hero">
      <i class="bi bi-qr-code-scan me-2"></i>
      <span class="pk-brand-text"> &nbsp; peshkash</span>
    </a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasDarkNavbar" aria-controls="offcanvasDarkNavbar" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="offcanvas offcanvas-end text-bg-dark" tabindex="-1" id="offcanvasDarkNavbar" aria-labelledby="offcanvasDarkNavbarLabel">
      <div class="offcanvas-header">
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        <ul class="navbar-nav justify-content-end flex-grow-1 pe-3">
          <li class="nav-item">
            <a class="nav-link" href="#why">Why</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#solutions">Solutions</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#pricing">Pricing</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#contact">Contact</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</nav>
</template>

<style scoped>
.navbar-nav .nav-link {
  transition: color 0.3s;
}

.navbar-nav .nav-link:hover {
  color: #ffd700;
}

.pk-brand-text {
  font-family: 'Brush Script MT';
  font-size: 2.0rem;
}
</style>
